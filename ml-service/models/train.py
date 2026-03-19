"""
ML Model Training Script — NIIS v2 Government-Grade Feature Set
Trains 9 models (3 algorithms × 3 targets) using government form fields.
Feature set mirrors actual Bridge / Road / Flyover / Tunnel data.
"""
import os
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.generate_data import generate_dataset

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved")

# ── Government-grade feature set ────────────────────────────────
# These mirror the actual fields collected via the 4 form types.
# Encoded numerics are used; categorical fields have been mapped to 0-1 range.
FEATURES = [
    # Core physical features
    "age_years",            # Years since construction
    "load_encoded",         # Traffic load: light=0.2 … extreme=1.0
    "material_encoded",     # Material durability factor
    "env_encoded",          # Environmental exposure severity
    "risk_score",           # Composite risk (from formula)

    # Government form — structural fields
    "seismic_encoded",      # Seismic zone factor (BIS IS-1893)
    "flood_encoded",        # Flood risk level
    "route_encoded",        # Route type importance (NH=1.0…City=0.3)
    "type_encoded",         # Structure type (bridge=1.0…road=0.4)
    "num_spans",            # Number of spans (bridges/flyovers)
    "design_life",          # Intended design life (15–120 yr)
    "num_lanes",            # Carriageway lanes
    "superstruct_encoded",  # Superstructure durability
    "foundation_encoded",   # Foundation type strength

    # Inspection & condition signals
    "defect_encoded",       # Major defect severity (0=none…0.8=scour)
    "scour_risk",           # River scour risk (bridges)
    "coastal_exposure",     # Coastal salt exposure factor

    # Road-specific
    "pci",                  # Pavement Condition Index (0–100); 0 for non-roads
    "pavement_encoded",     # Pavement type (rigid=0.3…flexible=0.7)

    # Tunnel-specific
    "safety_score",         # Safety audit score (0–10); 0 for non-tunnels
]


def train_models():
    os.makedirs(MODELS_DIR, exist_ok=True)

    print("🏗️  Generating government-grade training dataset (1200 records)...")
    df = generate_dataset(1200)
    print(f"   Dataset: {len(df)} records × {len(FEATURES)} features")
    print(f"   Types  : {df['structure_type'].value_counts().to_dict()}")

    X = df[FEATURES].values
    y_cond  = df["structural_condition"].values
    y_maint = df["maintenance_year"].values
    y_detr  = df["deterioration_rate"].values

    # Scale all features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    joblib.dump(scaler,   os.path.join(MODELS_DIR, "scaler.pkl"))
    joblib.dump(FEATURES, os.path.join(MODELS_DIR, "features.pkl"))

    def train_and_evaluate(X_tr, y, target_name):
        X_train, X_test, y_train, y_test = train_test_split(
            X_tr, y, test_size=0.2, random_state=42
        )
        models = {
            "linear_regression": LinearRegression(),
            "random_forest":     RandomForestRegressor(
                n_estimators=200, max_depth=12,
                min_samples_split=5, random_state=42, n_jobs=-1
            ),
            "gradient_boosting": GradientBoostingRegressor(
                n_estimators=200, max_depth=5,
                learning_rate=0.08, subsample=0.85, random_state=42
            ),
        }

        best_r2 = -999
        results = {}
        for name, model in models.items():
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
            r2   = float(r2_score(y_test, y_pred))
            results[name] = {"rmse": round(rmse, 4), "r2": round(r2, 4)}
            marker = " ★" if r2 > best_r2 else ""
            print(f"   [{target_name}] {name:<22} RMSE={rmse:.4f}  R²={r2:.4f}{marker}")
            if r2 > best_r2:
                best_r2 = r2
            joblib.dump(model, os.path.join(MODELS_DIR, f"{target_name}_{name}.pkl"))

        print(f"   → Best R² for {target_name}: {best_r2:.4f}")
        return results

    print("\n📊 Training Condition Rating models (target: structural_condition 0-10)...")
    cond_results = train_and_evaluate(X_scaled, y_cond, "condition")

    print("\n📅 Training Maintenance Year models (target: predicted_maintenance_year)...")
    maint_results = train_and_evaluate(X_scaled, y_maint, "maintenance")

    print("\n📉 Training Deterioration Rate models (target: annual_condition_loss)...")
    detr_results = train_and_evaluate(X_scaled, y_detr, "deterioration")

    print(f"\n✅ All 9 models saved → {MODELS_DIR}")
    print(f"   Features used: {len(FEATURES)}")
    for f in FEATURES:
        print(f"     • {f}")

    return {
        "condition_rating":   cond_results,
        "maintenance_year":   maint_results,
        "deterioration_rate": detr_results,
    }


if __name__ == "__main__":
    results = train_models()
    print("\n✅ Training complete!")
