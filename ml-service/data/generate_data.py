"""
Government-Grade Infrastructure Dataset Generator — NIIS v2
Generates realistic civil engineering records using all 4 asset types:
Bridge / Road / Flyover / Tunnel — each with type-specific features.
Training features mirror the government form fields.
"""
import numpy as np
import pandas as pd
import random
import os

random.seed(42)
np.random.seed(42)

# ── Categorical encodings ───────────────────────────────────────
MATERIALS        = ["concrete", "steel", "composite", "masonry", "asphalt"]
TRAFFIC_LOADS    = ["light", "medium", "heavy", "extreme"]
ENV_EXPOSURES    = ["low", "medium", "high", "severe"]
STRUCTURE_TYPES  = ["bridge", "road", "flyover", "tunnel"]
ROUTE_TYPES      = ["national_highway", "state_highway", "district_road", "city", "expressway"]
SEISMIC_ZONES    = ["II", "III", "IV", "V"]
FLOOD_LEVELS     = ["negligible", "low", "medium", "high", "very_high"]
SUPERSTRUCT      = ["PSC Girder", "Steel Truss", "Box Girder", "RCC Slab", "Cable Stayed"]
FOUNDATION       = ["Well Foundation", "Pile Foundation", "Open Foundation", "Raft"]
AGENCIES         = ["NHAI", "NHIDCL", "PWD", "BRO", "MCGM", "BBMP", "Other"]
DEFECTS          = ["none", "cracks", "corrosion", "settlement", "scour", "spalling"]
PAVEMENT_TYPES   = ["flexible", "rigid", "composite"]

LOAD_FACTORS     = {"light": 0.2, "medium": 0.5, "heavy": 0.8, "extreme": 1.0}
MATERIAL_FACTORS = {"steel": 0.30, "composite": 0.45, "concrete": 0.65,
                    "asphalt": 0.60, "masonry": 0.85}
ENV_FACTORS      = {"low": 0.10, "medium": 0.30, "high": 0.60, "severe": 1.00}
DESIGN_LIFE      = {"steel": 75, "composite": 80, "concrete": 70,
                    "asphalt": 20, "masonry": 100}
SEISMIC_FACTORS  = {"II": 0.05, "III": 0.15, "IV": 0.30, "V": 0.50}
FLOOD_FACTORS    = {"negligible": 0.0, "low": 0.05, "medium": 0.15,
                    "high": 0.30, "very_high": 0.50}
SUPERSTRUCT_DUR  = {"PSC Girder": 0.9, "Steel Truss": 0.7, "Box Girder": 0.95,
                    "RCC Slab": 0.85, "Cable Stayed": 0.75}
FOUND_DUR        = {"Well Foundation": 1.0, "Pile Foundation": 0.9,
                    "Open Foundation": 0.75, "Raft": 0.85}


# ── Physics-based risk formula ──────────────────────────────────
def compute_risk(age, material, traffic_load, env_exposure,
                 seismic_zone="II", flood_risk="low",
                 num_spans=1, design_life=None, superstructure=None,
                 foundation=None, scour_risk=0.0, coastal=0.0):
    dl      = design_life or DESIGN_LIFE[material]
    af      = min(age / dl, 1.0)
    lf      = LOAD_FACTORS[traffic_load]
    mf      = MATERIAL_FACTORS[material]
    ef      = ENV_FACTORS[env_exposure]
    sf      = SEISMIC_FACTORS.get(seismic_zone, 0.05)
    ff      = FLOOD_FACTORS.get(flood_risk, 0.10)
    span_f  = min(num_spans / 50.0, 0.5)          # more spans → more joints → more risk
    sd      = SUPERSTRUCT_DUR.get(superstructure, 0.80) if superstructure else 0.80
    fd      = FOUND_DUR.get(foundation, 0.85) if foundation else 0.85
    struct_vuln = (1 - sd * fd) * 0.3             # structural vulnerability term

    raw = (0.30 * af + 0.20 * lf + 0.15 * mf + 0.15 * ef +
           0.07 * sf + 0.07 * ff + 0.03 * span_f +
           0.03 * struct_vuln + 0.05 * scour_risk + 0.02 * coastal)
    return min(round(raw * 100, 2), 100.0)


def generate_condition(risk_score, noise=0.7):
    base = 10.0 - (risk_score / 100) * 9.0
    return round(max(0.5, min(10.0, base + np.random.normal(0, noise))), 2)


def predict_maintenance_year(age, risk_score, material, design_life, base_year=2024):
    remaining_frac = max(0.05, 1.0 - age / design_life)
    years_rem = remaining_frac * design_life * (1.0 - risk_score / 150)
    return min(int(base_year + max(0, years_rem)), base_year + 30)


def compute_deterioration_rate(age, risk_score, material, design_life):
    base_rate = 10.0 / design_life
    risk_mul  = 1.0 + (risk_score / 100) * 1.5
    return round(base_rate * risk_mul, 5)


# ── Encodings for sklearn (numeric) ────────────────────────────
def encode_seismic(z):     return SEISMIC_FACTORS.get(str(z), 0.05)
def encode_flood(f):       return FLOOD_FACTORS.get(str(f), 0.10)
def encode_route(r):
    return {"national_highway": 1.0, "expressway": 1.0, "state_highway": 0.7,
            "district_road": 0.4, "city": 0.3}.get(r, 0.5)
def encode_struct(s):      return SUPERSTRUCT_DUR.get(s, 0.80)
def encode_found(f):       return FOUND_DUR.get(f, 0.85)
def encode_type(t):        return {"bridge": 1.0, "tunnel": 0.9, "flyover": 0.7, "road": 0.4}.get(t, 0.5)
def encode_defect(d):      return {"none": 0.0, "cracks": 0.3, "corrosion": 0.5,
                                   "settlement": 0.6, "scour": 0.8, "spalling": 0.4}.get(d, 0.0)
def encode_pavement(p):    return {"rigid": 0.3, "composite": 0.5, "flexible": 0.7}.get(p, 0.5)


def generate_dataset(n=1200):
    records = []
    for _ in range(n):
        struct_type  = random.choice(STRUCTURE_TYPES)
        material     = random.choice(MATERIALS)
        traffic_load = random.choice(TRAFFIC_LOADS)
        env_exposure = random.choice(ENV_EXPOSURES)
        seismic_zone = random.choice(SEISMIC_ZONES)
        flood_risk   = random.choice(FLOOD_LEVELS)
        route_type   = random.choice(ROUTE_TYPES)

        dl  = DESIGN_LIFE[material]
        age = random.randint(1, int(dl * 0.92))

        # ── Type-specific fields ──────────────────────────────
        if struct_type == "bridge":
            num_spans      = random.randint(1, 120)
            design_life    = random.choice([50, 75, 100])
            superstructure = random.choice(SUPERSTRUCT)
            foundation     = random.choice(FOUNDATION)
            num_lanes      = random.choice([2, 4, 6])
            aadt           = random.randint(5000, 200000)
            length_m       = random.uniform(30, 6000)
            width_m        = random.uniform(7, 25)
            scour_risk     = random.uniform(0, 1)
            coastal        = random.uniform(0, 0.5)
            pci            = None
            safety_score   = None
            pavement_type  = None

        elif struct_type == "road":
            num_spans      = random.randint(0, 2)
            design_life    = random.choice([15, 20, 30])
            superstructure = None
            foundation     = None
            num_lanes      = random.choice([2, 4, 6, 8])
            aadt           = random.randint(500, 150000)
            length_m       = random.uniform(1000, 50000)
            width_m        = random.uniform(5.5, 16)
            scour_risk     = 0.0
            coastal        = random.uniform(0, 0.3)
            pci            = round(random.uniform(20, 100), 1)  # Pavement Condition Index
            safety_score   = None
            pavement_type  = random.choice(PAVEMENT_TYPES)

        elif struct_type == "flyover":
            num_spans      = random.randint(3, 25)
            design_life    = random.choice([50, 75])
            superstructure = random.choice(SUPERSTRUCT[:4])
            foundation     = random.choice(FOUNDATION[:3])
            num_lanes      = random.choice([2, 4, 6])
            aadt           = random.randint(20000, 300000)
            length_m       = random.uniform(200, 3000)
            width_m        = random.uniform(10, 22)
            scour_risk     = 0.0
            coastal        = random.uniform(0, 0.3)
            pci            = None
            safety_score   = None
            pavement_type  = None

        else:  # tunnel
            num_spans      = 0
            design_life    = random.choice([75, 100, 120])
            superstructure = None
            foundation     = random.choice(FOUNDATION[1:])
            num_lanes      = random.choice([1, 2])
            aadt           = random.randint(500, 30000)
            length_m       = random.uniform(200, 10000)
            width_m        = random.uniform(7, 14)
            scour_risk     = 0.0
            coastal        = 0.0
            pci            = None
            safety_score   = round(random.uniform(5, 10), 1)  # 0-10 safety audit
            pavement_type  = None

        major_defect = random.choice(DEFECTS)
        # Defect degrades condition independently
        defect_penalty = encode_defect(major_defect) * random.uniform(0.5, 1.5)

        risk_score = compute_risk(
            age, material, traffic_load, env_exposure,
            seismic_zone, flood_risk, num_spans, design_life,
            superstructure, foundation, scour_risk, coastal
        )
        # PCI-adjusted condition for roads
        if pci is not None:
            base_cond = (pci / 100) * 10.0
        else:
            base_cond = None

        condition  = generate_condition(risk_score, noise=0.65)
        if base_cond is not None:
            condition = round(0.6 * base_cond + 0.4 * condition, 2)
        condition  = max(0.5, min(10.0, condition - defect_penalty * 0.3))

        maintenance_year    = predict_maintenance_year(age, risk_score, material, design_life)
        deterioration_rate  = compute_deterioration_rate(age, risk_score, material, design_life)
        years_to_critical   = max(0, round((6.0 - condition) / deterioration_rate, 1)) if deterioration_rate > 0 else 999

        records.append({
            # ── Core fields ──────────────────────────────────
            "age_years":           age,
            "material":            material,
            "traffic_load":        traffic_load,
            "env_exposure":        env_exposure,
            "structure_type":      struct_type,
            "route_type":          route_type,
            "seismic_zone":        seismic_zone,
            "flood_risk":          flood_risk,

            # ── Structural fields ─────────────────────────────
            "num_spans":           num_spans,
            "design_life":         design_life,
            "num_lanes":           num_lanes,
            "length_m":            round(length_m, 1),
            "width_m":             round(width_m, 2),
            "aadt":                aadt,
            "scour_risk":          round(scour_risk, 3),
            "coastal_exposure":    round(coastal, 3),
            "superstructure_type": superstructure or "N/A",
            "foundation_type":     foundation or "N/A",
            "major_defect":        major_defect,
            "pavement_type":       pavement_type or "N/A",

            # ── Type-specific ─────────────────────────────────
            "pci":           pci if pci is not None else 0.0,
            "safety_score":  safety_score if safety_score is not None else 0.0,

            # ── Targets ──────────────────────────────────────
            "risk_score":           round(risk_score, 2),
            "health_score":         round(100 - risk_score, 2),
            "structural_condition": round(condition, 2),
            "maintenance_year":     maintenance_year,
            "deterioration_rate":   deterioration_rate,
            "years_to_critical":    years_to_critical,

            # ── Encoded numerics for sklearn ──────────────────
            "load_encoded":         LOAD_FACTORS[traffic_load],
            "material_encoded":     MATERIAL_FACTORS[material],
            "env_encoded":          ENV_FACTORS[env_exposure],
            "seismic_encoded":      encode_seismic(seismic_zone),
            "flood_encoded":        encode_flood(flood_risk),
            "route_encoded":        encode_route(route_type),
            "type_encoded":         encode_type(struct_type),
            "superstruct_encoded":  encode_struct(superstructure),
            "foundation_encoded":   encode_found(foundation),
            "defect_encoded":       encode_defect(major_defect),
            "pavement_encoded":     encode_pavement(pavement_type),
        })

    df = pd.DataFrame(records)
    return df


if __name__ == "__main__":
    df = generate_dataset(1200)
    os.makedirs("data", exist_ok=True)
    df.to_csv("data/infrastructure_dataset.csv", index=False)
    print(f"Generated {len(df)} records with {len(df.columns)} features.")
    print(df.describe())
