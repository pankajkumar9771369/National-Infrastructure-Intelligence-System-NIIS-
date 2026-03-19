"""
NIIS Real-Time Retraining Engine — Phase 2
Triggered when:
  a) A new inspection record is logged (admin logs inspection via API)
  b) POST /retrain is called manually
  c) (Future) Quarterly cron job

Features:
  - Retrains all 9 models on latest data
  - Computes R² and RMSE for each model type
  - Compares new vs current model accuracy
  - Auto-promotes if new model is better (by composite R² gain > PROMOTION_THRESHOLD)
  - Logs version to model_versions table for traceability
  - Returns full comparison report
"""
import os
import sys
import json
import joblib
import numpy as np
import logging
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score

log = logging.getLogger("retraining")

MODELS_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved")
DATA_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
PROMOTION_THRESHOLD = 0.005   # auto-promote if R² improves by ≥ 0.5%

MATERIAL_ENC = {"concrete": 0.7, "steel": 0.3, "composite": 0.5, "masonry": 0.9, "asphalt": 0.65}
LOAD_ENC     = {"light": 0.2, "medium": 0.5, "heavy": 0.8, "extreme": 1.0}
ENV_ENC      = {"low": 0.1, "medium": 0.3, "high": 0.6, "severe": 1.0}


def prepare_features_df(df):
    """Convert raw DataFrame into ML feature matrix."""
    import pandas as pd
    df = df.copy()
    df["material_enc"] = df["material"].str.lower().map(MATERIAL_ENC).fillna(0.7)
    df["load_enc"]     = df["traffic_load"].str.lower().map(LOAD_ENC).fillna(0.5)
    df["env_enc"]      = df["env_exposure"].str.lower().map(ENV_ENC).fillna(0.3)
    df["risk_score"]   = pd.to_numeric(df.get("risk_score", 50), errors="coerce").fillna(50)
    df["age_years"]    = pd.to_numeric(df["age_years"], errors="coerce").fillna(20)
    df["climate_f"]    = pd.to_numeric(df.get("climate_factor", 0.3), errors="coerce").fillna(0.3)
    
    X = df[["age_years", "load_enc", "material_enc", "env_enc", "risk_score", "climate_f"]].values
    y_cond  = pd.to_numeric(df.get("structural_condition", 6.0), errors="coerce").fillna(6.0).values
    y_maint = pd.to_numeric(df.get("maintenance_year",    2028), errors="coerce").fillna(2028).values
    y_detr  = pd.to_numeric(df.get("deterioration_rate",  0.1), errors="coerce").fillna(0.1).values
    return X, y_cond, y_maint, y_detr


def train_all(X_train, y_cond, y_maint, y_detr, X_test=None, y_cond_t=None, y_maint_t=None, y_detr_t=None):
    """Train all 9 models. Returns dict of {model_key: model} and metrics."""
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test) if X_test is not None else X_train_s

    configs = {
        "rf": RandomForestRegressor(n_estimators=200, max_depth=12, min_samples_leaf=2, random_state=42, n_jobs=-1),
        "lr": LinearRegression(),
        "gb": GradientBoostingRegressor(n_estimators=150, max_depth=5, learning_rate=0.08, random_state=42),
    }

    targets = {
        "condition":    (y_cond, y_cond_t if y_cond_t is not None else y_cond),
        "maintenance":  (y_maint, y_maint_t if y_maint_t is not None else y_maint),
        "deterioration":(y_detr, y_detr_t if y_detr_t is not None else y_detr),
    }

    models, metrics = {}, {}
    for tname, (y_tr, y_te) in targets.items():
        metrics[tname] = {}
        for mname, clf in configs.items():
            key = f"{tname}_{mname}"
            clf.fit(X_train_s, y_tr)
            preds = clf.predict(X_test_s)
            r2   = round(float(r2_score(y_te, preds)), 4)
            rmse = round(float(np.sqrt(mean_squared_error(y_te, preds))), 4)
            models[key]               = clf
            metrics[tname][mname]     = {"r2": r2, "rmse": rmse}

    return models, scaler, metrics


def load_training_data():
    """Load merged training data (real + synthetic) or fall back to synthetic."""
    import pandas as pd
    merged = os.path.join(DATA_DIR, "merged_training_data.csv")
    synthetic = os.path.join(DATA_DIR, "synthetic", "training_data.csv")

    if os.path.exists(merged):
        df = pd.read_csv(merged)
        source = "merged (real + synthetic)"
    elif os.path.exists(synthetic):
        df = pd.read_csv(synthetic)
        source = "synthetic only"
    else:
        # Generate fresh synthetic dataset if nothing exists
        sys.path.insert(0, DATA_DIR)
        from generate_data import generate_dataset
        df = generate_dataset(1000)
        os.makedirs(os.path.join(DATA_DIR, "synthetic"), exist_ok=True)
        df.to_csv(synthetic, index=False)
        source = "freshly generated synthetic"

    log.info(f"Training data source: {source}, rows: {len(df)}")
    return df, source


def get_current_metrics():
    """Load current model metrics from saved metadata file (if exists)."""
    meta_path = os.path.join(MODELS_DIR, "model_metrics.json")
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            return json.load(f)
    return None


def save_metrics(metrics: dict, version: str):
    """Persist metrics alongside models for future comparisons."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    meta = {"version": version, "metrics": metrics, "trained_at": datetime.utcnow().isoformat()}
    with open(os.path.join(MODELS_DIR, "model_metrics.json"), "w") as f:
        json.dump(meta, f, indent=2)


def compute_composite_r2(metrics: dict) -> float:
    """Weighted composite R² across all models (RF primary)."""
    scores = []
    for tname in ["condition", "maintenance", "deterioration"]:
        for mname in ["rf", "gb", "lr"]:
            weight = 3 if mname == "rf" else (2 if mname == "gb" else 1)
            r2 = metrics.get(tname, {}).get(mname, {}).get("r2", 0)
            scores.append(weight * max(r2, 0))
    return round(sum(scores) / (3 * (3 + 2 + 1)), 4)


def retrain(trigger: str = "manual", notes: str = "") -> dict:
    """
    Full retraining pipeline.
    Returns a report dict with version, metrics, promotion decision.
    """
    log.info(f"Starting retraining — trigger: {trigger}")
    df, source = load_training_data()
    X, y_cond, y_maint, y_detr = prepare_features_df(df)

    n_records = len(X)
    X_train, X_test, yc_tr, yc_te, ym_tr, ym_te, yd_tr, yd_te = train_test_split(
        X, y_cond, y_maint, y_detr, test_size=0.2, random_state=42
    )

    new_models, new_scaler, new_metrics = train_all(
        X_train, yc_tr, ym_tr, yd_tr, X_test, yc_te, ym_te, yd_te
    )

    new_r2      = compute_composite_r2(new_metrics)
    current     = get_current_metrics()
    current_r2  = compute_composite_r2(current["metrics"]) if current else 0.0
    improvement = round(new_r2 - current_r2, 4)
    promote     = improvement >= PROMOTION_THRESHOLD or current is None

    # Version string: vMAJOR.MINOR.PATCH
    now = datetime.utcnow()
    version = f"v{now.strftime('%Y%m%d.%H%M')}"

    report = {
        "version":            version,
        "trigger":            trigger,
        "notes":              notes or source,
        "training_records":   n_records,
        "data_source":        source,
        "new_composite_r2":   new_r2,
        "prev_composite_r2":  current_r2,
        "improvement":        improvement,
        "auto_promoted":      promote,
        "promotion_threshold":PROMOTION_THRESHOLD,
        "metrics":            new_metrics,
        "trained_at":         now.isoformat() + "Z",
    }

    if promote:
        log.info(f"Promoting new model {version} (R² {current_r2:.4f} → {new_r2:.4f}, +{improvement:.4f})")
        os.makedirs(MODELS_DIR, exist_ok=True)

        # Save all 9 models
        model_files = {
            "condition_random_forest":       "condition_rf",
            "condition_linear_regression":   "condition_lr",
            "condition_gradient_boosting":   "condition_gb",
            "maintenance_random_forest":     "maintenance_rf",
            "maintenance_linear_regression": "maintenance_lr",
            "maintenance_gradient_boosting": "maintenance_gb",
            "deterioration_random_forest":   "deterioration_rf",
            "deterioration_linear_regression": "deterioration_lr",
            "deterioration_gradient_boosting": "deterioration_gb",
        }
        for fname, key in model_files.items():
            joblib.dump(new_models[key], os.path.join(MODELS_DIR, f"{fname}.pkl"))

        joblib.dump(new_scaler, os.path.join(MODELS_DIR, "scaler.pkl"))
        save_metrics(new_metrics, version)
        report["message"] = "✅ Models promoted. Reload ML service to activate."
    else:
        log.info(f"Not promoting — improvement {improvement:.4f} below threshold {PROMOTION_THRESHOLD}")
        report["message"] = f"ℹ️ New model NOT promoted (improvement {improvement:.4f} < threshold {PROMOTION_THRESHOLD})"

    return report


def compute_drift_report(predictions: list, inspections: list) -> dict:
    """
    Drift Detection: compare ML predictions vs real inspection observations.
    
    predictions: list of {infrastructure_id, predicted_condition_rating, ...}
    inspections: list of {infrastructure_id, observed_condition, ...}
    """
    if not inspections:
        return {"drift_detected": False, "message": "No inspection data for drift comparison"}

    pred_map = {p["infrastructure_id"]: p for p in predictions}
    errors = []
    for ins in inspections:
        infra_id = ins.get("infrastructure_id")
        pred = pred_map.get(infra_id)
        if pred and pred.get("predicted_condition_rating") is not None:
            err = float(ins["observed_condition"]) - float(pred["predicted_condition_rating"])
            errors.append({"infra_id": infra_id, "error": round(err, 3)})

    if not errors:
        return {"drift_detected": False, "message": "No matching prediction-inspection pairs"}

    errs      = [e["error"] for e in errors]
    mae       = round(float(np.mean(np.abs(errs))), 3)
    bias      = round(float(np.mean(errs)), 3)           # systematic over/under prediction
    std       = round(float(np.std(errs)), 3)
    max_err   = round(float(np.max(np.abs(errs))), 3)

    # Drift thresholds (tunable)
    DRIFT_MAE_THRESHOLD  = 1.5   # 1.5 condition points on 0-10 scale
    DRIFT_BIAS_THRESHOLD = 1.0   # systematic bias of 1 point

    drift = mae > DRIFT_MAE_THRESHOLD or abs(bias) > DRIFT_BIAS_THRESHOLD

    return {
        "drift_detected":   drift,
        "n_compared":       len(errors),
        "mae":              mae,
        "bias":             bias,
        "std":              std,
        "max_error":        max_err,
        "mae_threshold":    DRIFT_MAE_THRESHOLD,
        "bias_threshold":   DRIFT_BIAS_THRESHOLD,
        "recommendation":   "🔴 Retrain recommended — significant drift" if drift else "🟢 Model stable — no action needed",
        "worst_cases":      sorted(errors, key=lambda x: abs(x["error"]), reverse=True)[:5],
    }
