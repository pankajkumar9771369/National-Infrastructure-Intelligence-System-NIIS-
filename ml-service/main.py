"""
FastAPI ML Microservice — Smart City Infrastructure Risk Dashboard
Exposes prediction endpoints for infrastructure health analysis.
"""
import os
import sys
import joblib
import numpy as np
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from models.risk_formula import compute_risk_score, estimate_budget, LOAD_FACTORS, MATERIAL_FACTORS, ENV_FACTORS, DESIGN_LIFE
from models.train import train_models
from models.budget_optimizer import optimize_budget, BudgetConstraints, StructureInput
from models.retraining import retrain, compute_drift_report


MODELS_DIR = os.path.join(os.path.dirname(__file__), "models", "saved")

app = FastAPI(
    title="Smart City Infrastructure ML Service",
    description="ML microservice for infrastructure risk assessment and deterioration modeling",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global model registry ──────────────────────────────────────────────────
models = {}
scaler = None


def load_models():
    global models, scaler
    if not os.path.exists(MODELS_DIR) or not os.listdir(MODELS_DIR):
        print("No trained models found. Training now...")
        train_models()

    model_files = {
        "condition_rf": "condition_random_forest.pkl",
        "condition_lr": "condition_linear_regression.pkl",
        "condition_gb": "condition_gradient_boosting.pkl",
        "maintenance_rf": "maintenance_random_forest.pkl",
        "maintenance_lr": "maintenance_linear_regression.pkl",
        "maintenance_gb": "maintenance_gradient_boosting.pkl",
        "deterioration_rf": "deterioration_random_forest.pkl",
        "deterioration_lr": "deterioration_linear_regression.pkl",
        "deterioration_gb": "deterioration_gradient_boosting.pkl",
    }

    for key, filename in model_files.items():
        path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(path):
            models[key] = joblib.load(path)

    scaler_path = os.path.join(MODELS_DIR, "scaler.pkl")
    if os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)

    print(f"Loaded {len(models)} models successfully.")


@app.on_event("startup")
async def startup_event():
    load_models()


# ─── Pydantic Schemas ────────────────────────────────────────────────────────
class InfrastructureInput(BaseModel):
    # ── Core fields (required) ──────────────────────────────────
    age: int = Field(..., ge=0, le=150, description="Age of structure in years")
    traffic_load: str = Field(..., description="light/medium/heavy/extreme")
    material: str = Field(..., description="concrete/steel/composite/masonry/asphalt")
    env_exposure: str = Field(..., description="low/medium/high/severe")

    # ── Condition input (optional — used in confidence/deterioration) ───────
    structural_condition: Optional[float] = Field(None, ge=0, le=10)
    area_sqft: Optional[float] = Field(1000.0)
    model_type: Optional[str] = Field("random_forest")

    # ── Climate / disaster fields ──────────────────────────────────────────
    climate_zone: Optional[str] = Field("semi-arid")
    flood_risk: Optional[str] = Field("low")
    seismic_zone: Optional[str] = Field("II")
    annual_rainfall_mm: Optional[int] = Field(700)

    # ── Government form — Section A (Identification) ───────────────────────
    structure_type: Optional[str] = Field("bridge", description="bridge/road/flyover/tunnel")
    route_type: Optional[str] = Field("national_highway")

    # ── Government form — Section C (Structural) ───────────────────────────
    num_spans: Optional[int] = Field(1, ge=0, description="Number of spans")
    design_life: Optional[int] = Field(70, description="Design life in years")
    num_lanes: Optional[int] = Field(2, description="Number of lanes")
    length_m: Optional[float] = Field(None)
    width_m: Optional[float] = Field(None)
    superstructure_type: Optional[str] = Field(None, description="PSC Girder/Steel Truss/Box Girder/RCC Slab/Cable Stayed")
    foundation_type: Optional[str] = Field(None, description="Well/Pile/Open/Raft")
    scour_risk: Optional[float] = Field(0.0, ge=0.0, le=1.0)
    coastal_exposure: Optional[float] = Field(0.0, ge=0.0, le=1.0)

    # ── Government form — Section D (Traffic) ─────────────────────────────
    aadt: Optional[int] = Field(None, description="Average Annual Daily Traffic")

    # ── Government form — Section E (Inspection) ──────────────────────────
    major_defect: Optional[str] = Field("none", description="none/cracks/corrosion/settlement/scour/spalling")

    # ── Road-specific (Section C) ─────────────────────────────────────────
    pci: Optional[float] = Field(0.0, ge=0.0, le=100.0, description="Pavement Condition Index (roads only)")
    pavement_type: Optional[str] = Field(None, description="flexible/rigid/composite")

    # ── Tunnel-specific (Section C) ───────────────────────────────────────
    safety_score: Optional[float] = Field(0.0, ge=0.0, le=10.0, description="Safety audit score (tunnels only)")

    class Config:
        json_schema_extra = {
            "example": {
                "age": 40, "traffic_load": "heavy", "material": "concrete",
                "env_exposure": "high", "structural_condition": 5.8,
                "structure_type": "bridge", "route_type": "national_highway",
                "num_spans": 18, "design_life": 100, "num_lanes": 4,
                "superstructure_type": "PSC Girder", "foundation_type": "Well Foundation",
                "seismic_zone": "III", "flood_risk": "high", "scour_risk": 0.6,
                "climate_zone": "coastal", "annual_rainfall_mm": 2167,
                "major_defect": "cracks", "aadt": 45000
            }
        }


class BatchInput(BaseModel):
    structures: List[InfrastructureInput]


# ─── Government-form feature encoders ───────────────────────────────────────
_SEISMIC  = {"II": 0.05, "III": 0.15, "IV": 0.30, "V": 0.50}
_FLOOD    = {"negligible": 0.0, "low": 0.05, "medium": 0.15, "high": 0.30, "very_high": 0.50}
_ROUTE    = {"national_highway": 1.0, "expressway": 1.0, "state_highway": 0.7,
             "district_road": 0.4, "city": 0.3}
_TYPE     = {"bridge": 1.0, "tunnel": 0.9, "flyover": 0.7, "road": 0.4, "overpass": 0.7}
_SUPER    = {"PSC Girder": 0.9, "Steel Truss": 0.7, "Box Girder": 0.95,
             "RCC Slab": 0.85, "Cable Stayed": 0.75}
_FOUND    = {"Well Foundation": 1.0, "Pile Foundation": 0.9,
             "Open Foundation": 0.75, "Raft": 0.85}
_DEFECT   = {"none": 0.0, "cracks": 0.3, "corrosion": 0.5,
             "settlement": 0.6, "scour": 0.8, "spalling": 0.4}
_PAVEMENT = {"rigid": 0.3, "composite": 0.5, "flexible": 0.7}


# ─── Helper: Prepare 20-feature government-grade vector ──────────────────────
def prepare_features(inp: InfrastructureInput, risk_score: float) -> np.ndarray:
    raw = np.array([[
        inp.age,
        LOAD_FACTORS.get(inp.traffic_load, 0.5),
        MATERIAL_FACTORS.get(inp.material, 0.7),
        ENV_FACTORS.get(inp.env_exposure, 0.3),
        risk_score,
        # Government form fields
        _SEISMIC.get(inp.seismic_zone or "II", 0.05),
        _FLOOD.get(inp.flood_risk or "low", 0.05),
        _ROUTE.get(inp.route_type or "national_highway", 0.5),
        _TYPE.get(inp.structure_type or "bridge", 1.0),
        float(inp.num_spans or 1),
        float(inp.design_life or DESIGN_LIFE.get(inp.material, 70)),
        float(inp.num_lanes or 2),
        _SUPER.get(inp.superstructure_type or "", 0.80),
        _FOUND.get(inp.foundation_type or "", 0.85),
        _DEFECT.get(inp.major_defect or "none", 0.0),
        float(inp.scour_risk or 0.0),
        float(inp.coastal_exposure or 0.0),
        float(inp.pci or 0.0),
        _PAVEMENT.get(inp.pavement_type or "", 0.5),
        float(inp.safety_score or 0.0),
    ]])
    if scaler:
        try:
            return scaler.transform(raw)
        except Exception:
            pass  # scaler from old 5-feature model — retrain needed
    return raw


def get_model(prefix: str, model_type: str):
    suffix = {"random_forest": "rf", "linear_regression": "lr", "gradient_boosting": "gb"}.get(model_type, "rf")
    key = f"{prefix}_{suffix}"
    return models.get(key)


def run_prediction(inp: InfrastructureInput) -> dict:
    # Step 1: Climate-adaptive civil engineering risk score
    risk_data = compute_risk_score(
        inp.age, inp.traffic_load, inp.material, inp.env_exposure,
        climate_zone=inp.climate_zone or "semi-arid",
        flood_risk=inp.flood_risk or "low",
        seismic_zone=inp.seismic_zone or "II",
        annual_rainfall_mm=inp.annual_rainfall_mm or 700
    )

    # Step 2: Prepare ML features
    X = prepare_features(inp, risk_data["risk_score"])
    model_type = inp.model_type or "random_forest"

    # Step 3: ML predictions
    cond_model = get_model("condition", model_type)
    maint_model = get_model("maintenance", model_type)
    detr_model = get_model("deterioration", model_type)

    predicted_condition = float(np.clip(cond_model.predict(X)[0], 0, 10)) if cond_model else None
    predicted_maintenance_year = int(np.clip(maint_model.predict(X)[0], 2024, 2060)) if maint_model else None
    deterioration_rate = float(np.clip(detr_model.predict(X)[0], 0, 1)) if detr_model else None

    # Step 4: Years to critical (condition < 4)
    current_cond = inp.structural_condition or predicted_condition or 5.0
    years_to_critical = None
    if deterioration_rate and deterioration_rate > 0:
        years_to_critical = max(0.0, round((current_cond - 4.0) / deterioration_rate, 1))

    # Step 5: Budget estimate
    budget = estimate_budget(risk_data["risk_level"], inp.area_sqft or 1000.0)

    # Step 6: Deterioration curve (next 20 years)
    design_life = DESIGN_LIFE.get(inp.material, 70)
    future_years = list(range(0, 21, 2))
    deterioration_curve = []
    for y in future_years:
        cond = max(0, round(current_cond - (deterioration_rate or 0.1) * y, 2))
        deterioration_curve.append({"year_offset": y, "condition": cond})

    # Step 7: Confidence intervals using RF tree variance
    confidence = {"low": None, "high": None, "std": None, "confidence_pct": None}
    cond_rf = get_model("condition", "random_forest")
    X_feat  = prepare_features(inp, risk_data["risk_score"])
    if cond_rf and hasattr(cond_rf, "estimators_"):
        tree_preds = np.array([tree.predict(X_feat)[0] for tree in cond_rf.estimators_])
        std        = float(np.std(tree_preds))
        mean_pred  = float(np.mean(tree_preds))
        conf_pct   = round(max(0, min(100, 100 - (std / 10) * 100)), 1)
        confidence = {
            "low":            round(max(0, mean_pred - 1.96 * std), 2),
            "high":           round(min(10, mean_pred + 1.96 * std), 2),
            "std":            round(std, 4),
            "confidence_pct": conf_pct,    # how confident the model is (0-100)
        }

    return {
        **risk_data,
        "predicted_condition_rating": round(predicted_condition, 2) if predicted_condition else None,
        "predicted_maintenance_year": predicted_maintenance_year,
        "deterioration_rate": round(deterioration_rate, 5) if deterioration_rate else None,
        "years_to_critical": years_to_critical,
        "model_used": model_type,
        "budget_estimate": budget,
        "deterioration_curve": deterioration_curve,
        "confidence": confidence,
    }


# ─── Routes ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models_loaded": len(models),
        "service": "NIIS ML Service v2.0 — Climate-Adaptive + Confidence Intervals"
    }


@app.post("/predict")
def predict_single(inp: InfrastructureInput):
    """Predict infrastructure health metrics for a single structure."""
    try:
        result = run_prediction(inp)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-predict")
def predict_batch(batch: BatchInput):
    """Predict infrastructure health metrics for multiple structures."""
    try:
        results = [run_prediction(s) for s in batch.structures]
        return {"success": True, "count": len(results), "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/risk-score")
def risk_score_only(inp: InfrastructureInput):
    """Calculate civil engineering risk score only (no ML)."""
    try:
        risk_data = compute_risk_score(inp.age, inp.traffic_load, inp.material, inp.env_exposure)
        budget = estimate_budget(risk_data["risk_level"], inp.area_sqft or 1000.0)
        return {"success": True, "data": {**risk_data, "budget_estimate": budget}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model-info")
def model_info():
    """Return information about loaded models."""
    return {
        "loaded_models": list(models.keys()),
        "scaler_loaded": scaler is not None,
        "available_model_types": ["random_forest", "linear_regression", "gradient_boosting"]
    }



# ─── Budget Optimizer ────────────────────────────────────────
class BudgetOptimizationRequest(BaseModel):
    structures: List[StructureInput]
    constraints: BudgetConstraints

@app.post("/optimize/budget")
def run_budget_optimization(req: BudgetOptimizationRequest):
    """
    NIIS Policy-Grade Budget Optimizer.
    Allocates maintenance budget across structures for maximum risk reduction.
    """
    try:
        result = optimize_budget(req.structures, req.constraints)
        return {"success": True, "data": result.dict()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Phase 2: Retraining + Drift Detection ───────────────────
class RetrainRequest(BaseModel):
    trigger: str = Field("manual", description="manual / inspection_logged / scheduled")
    notes: str = Field("", description="Free-text note for version history")

class DriftRequest(BaseModel):
    predictions: List[dict]   # [{infrastructure_id, predicted_condition_rating, ...}]
    inspections: List[dict]   # [{infrastructure_id, observed_condition, ...}]

@app.post("/retrain")
def trigger_retrain(req: RetrainRequest):
    """
    Trigger model retraining. Compares new R² vs current, auto-promotes if better.
    Returns full version report including metrics comparison.
    """
    try:
        report = retrain(trigger=req.trigger, notes=req.notes)
        # Reload models in-process if promoted
        if report["auto_promoted"]:
            load_models()
        return {"success": True, "data": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/drift-report")
def drift_report_simple():
    """
    Quick drift summary from saved metadata.
    Full drift needs prediction + inspection pairs — use POST /drift-report for that.
    """
    import os, json
    meta_path = os.path.join(MODELS_DIR, "model_metrics.json")
    if not os.path.exists(meta_path):
        return {"success": False, "message": "No model metrics found. Run /retrain first."}
    with open(meta_path) as f:
        meta = json.load(f)
    return {"success": True, "data": meta}


@app.post("/drift-report")
def compute_drift(req: DriftRequest):
    """
    Compare ML predictions vs real inspection observations.
    Returns MAE, bias, worst cases, and drift recommendation.
    """
    try:
        report = compute_drift_report(req.predictions, req.inspections)
        return {"success": True, "data": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Phase 1: Real Data Ingestion ────────────────────────────
class IngestRequest(BaseModel):
    records: List[dict]   # Pre-parsed records from parse_nhai.py
    dry_run: bool = False

@app.post("/ingest/nhai-csv")
def ingest_nhai(req: IngestRequest):
    """
    Accept pre-parsed NHAI records (from parse_nhai.py output).
    Backend calls this to ingest real data into the training pipeline.
    Returns validation summary.
    """
    try:
        import sys as _sys
        _sys.path.insert(0, os.path.join(os.path.dirname(__file__), "data", "pipeline"))
        from validate_schema import validate_dataset
        report = validate_dataset(req.records)
        if not req.dry_run:
            # Save to real/ directory for merge_datasets.py
            import json
            out = os.path.join(os.path.dirname(__file__), "data", "real", "ingested_records.json")
            os.makedirs(os.path.dirname(out), exist_ok=True)
            existing = []
            if os.path.exists(out):
                with open(out) as f:
                    existing = json.load(f).get("records", [])
            existing.extend(report.get("valid_records") or [])
            with open(out, "w") as f:
                json.dump({"records": existing, "total": len(existing)}, f)
            report["saved_to"] = out
        return {"success": True, "data": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
