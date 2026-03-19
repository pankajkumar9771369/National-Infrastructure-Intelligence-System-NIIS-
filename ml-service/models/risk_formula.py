"""
NIIS Climate-Adaptive Civil Engineering Risk Index
Risk Score = f(Age, Load, Material, Environment, Climate)

Standard Weights (Phase 1):
  Age Factor           → 30%
  Load Factor          → 22%
  Material Factor      → 18%
  Environmental Factor → 15%
  Climate Factor       → 15%   ← NEW

Climate penalty is then applied as a multiplier (1.0 – 1.35)
"""

# ─── Factor Tables (Civil Engineering Standards) ────────────
LOAD_FACTORS = {
    "light": 0.2,
    "medium": 0.5,
    "heavy": 0.8,
    "extreme": 1.0
}

MATERIAL_FACTORS = {
    "steel": 0.3,
    "composite": 0.5,
    "concrete": 0.7,
    "asphalt": 0.65,
    "masonry": 0.9
}

ENV_FACTORS = {
    "low": 0.1,
    "medium": 0.3,
    "high": 0.6,
    "severe": 1.0
}

# Design life per material (years)
DESIGN_LIFE = {
    "steel": 75,
    "composite": 80,
    "concrete": 70,
    "asphalt": 20,
    "masonry": 100
}

# ─── Climate Factors ─────────────────────────────────────────
# Flood risk: accelerates degradation (corrosion, foundation erosion)
FLOOD_RISK_FACTORS = {
    "very_high": 1.0,
    "high": 0.75,
    "medium": 0.45,
    "low": 0.15,
    "negligible": 0.0
}

# Seismic zone (BIS IS-1893): structural vulnerability premium
SEISMIC_FACTORS = {
    "V":  1.0,   # Very high damage risk
    "IV": 0.75,  # High damage risk
    "III": 0.45, # Moderate damage risk
    "II": 0.15,  # Low damage risk
}

# Climate zone: corrosion rate multiplier applied to final score
CLIMATE_ZONE_PENALTY = {
    "coastal":    1.30,  # Salt air corrosion — severe
    "tropical":   1.20,  # High humidity + monsoon
    "highland":   1.10,  # Freeze-thaw cycles
    "semi-arid":  1.05,  # Moderate
    "arid":       1.0,   # Lowest deterioration
}

# ─── Per-unit Repair Costs (USD / INR Crore approximate) ────
COST_PER_SQFT = {
    "routine":     12,
    "preventive":  45,
    "major_repair": 150,
    "replacement": 400
}


def compute_climate_factor(
    flood_risk: str = "low",
    seismic_zone: str = "II",
    annual_rainfall_mm: int = 800
) -> float:
    """
    Composite climate vulnerability factor (0–1).
    Combines flood risk, seismic vulnerability, and rainfall intensity.
    """
    flood_f   = FLOOD_RISK_FACTORS.get(flood_risk, 0.15)
    seismic_f = SEISMIC_FACTORS.get(seismic_zone, 0.15)

    # Rainfall normalised: >2500mm = 1.0 (Kerala/Mumbai coastal), ~600mm = 0.4
    rainfall_f = min(annual_rainfall_mm / 2500.0, 1.0)

    # Weighted composite
    climate_factor = (0.45 * flood_f) + (0.35 * seismic_f) + (0.20 * rainfall_f)
    return round(min(climate_factor, 1.0), 4)


def compute_risk_score(
    age: int,
    traffic_load: str,
    material: str,
    env_exposure: str,
    # Climate inputs (optional — defaults to moderate)
    climate_zone: str = "semi-arid",
    flood_risk: str = "low",
    seismic_zone: str = "II",
    annual_rainfall_mm: int = 700
) -> dict:
    """
    NIIS Climate-Adaptive Risk Score (0–100).
    Returns factor breakdown for full traceability.
    """
    max_age     = DESIGN_LIFE.get(material, 80)
    age_factor  = min(age / max_age, 1.0)
    load_factor = LOAD_FACTORS.get(traffic_load, 0.5)
    mat_factor  = MATERIAL_FACTORS.get(material, 0.7)
    env_factor  = ENV_FACTORS.get(env_exposure, 0.3)

    # Climate factor
    climate_factor  = compute_climate_factor(flood_risk, seismic_zone, annual_rainfall_mm)
    zone_multiplier = CLIMATE_ZONE_PENALTY.get(climate_zone, 1.05)

    # Phase 1 weighted formula (climate-adaptive)
    base_risk = (
        0.30 * age_factor  +
        0.22 * load_factor +
        0.18 * mat_factor  +
        0.15 * env_factor  +
        0.15 * climate_factor
    ) * 100

    # Apply climate zone multiplier (coastal structures get extra penalty)
    risk_score   = min(round(base_risk * zone_multiplier, 2), 100.0)
    health_score = round(100.0 - risk_score, 2)

    # Risk level classification
    if risk_score >= 75:
        risk_level = "critical"
    elif risk_score >= 55:
        risk_level = "high"
    elif risk_score >= 35:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return {
        "risk_score":      risk_score,
        "health_score":    health_score,
        "risk_level":      risk_level,
        "age_factor":      round(age_factor, 4),
        "load_factor":     round(load_factor, 4),
        "material_factor": round(mat_factor, 4),
        "env_factor":      round(env_factor, 4),
        "climate_factor":  round(climate_factor, 4),
        "zone_multiplier": round(zone_multiplier, 4),
        "design_life_years": max_age
    }


def estimate_budget(risk_level: str, area_sqft: float = 1000.0) -> dict:
    """
    Estimate maintenance budget based on risk level and structural area.
    Returns USD and approximate INR crore values.
    """
    maintenance_map = {
        "critical": "replacement",
        "high":     "major_repair",
        "moderate": "preventive",
        "low":      "routine"
    }
    maintenance_type = maintenance_map.get(risk_level, "routine")
    cost_per_sqft    = COST_PER_SQFT[maintenance_type]
    estimated_cost   = round(area_sqft * cost_per_sqft, 2)

    # Approx INR Crore conversion (1 USD ≈ 83 INR, 1 Crore = 10M INR)
    inr_crore = round((estimated_cost * 83) / 10_000_000, 4)

    urgency_year = {
        "critical": 2025,
        "high":     2026,
        "moderate": 2027,
        "low":      2028
    }.get(risk_level, 2028)

    return {
        "maintenance_type":      maintenance_type,
        "estimated_cost_usd":    estimated_cost,
        "estimated_cost_inr_crore": inr_crore,
        "cost_per_sqft":         cost_per_sqft,
        "planned_year":          urgency_year
    }
