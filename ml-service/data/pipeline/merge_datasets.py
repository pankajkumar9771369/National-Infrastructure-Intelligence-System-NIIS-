"""
NIIS — Dataset Merger
Combines real NHAI records with synthetic generated data for model training.

Strategy:
  - Real records are weighted 3x over synthetic (more credible ground truth)
  - Deduplicates by (name, city, construction_year)
  - Outputs a merged CSV ready for train.py

Usage:
  python merge_datasets.py
  python merge_datasets.py --real data/real/parsed_bridges.json --weight 5
"""
import json
import csv
import os
import argparse
import logging
import pandas as pd
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("merge_datasets")

DATA_DIR     = os.path.join(os.path.dirname(__file__), "..")
REAL_DIR     = os.path.join(DATA_DIR, "real")
SYNTHETIC_DIR= os.path.join(DATA_DIR, "synthetic")
OUTPUT_PATH  = os.path.join(DATA_DIR, "merged_training_data.csv")

# Columns used for model training
TRAINING_COLS = [
    "age_years", "material_encoded", "load_encoded", "env_encoded", "risk_score",
    "structural_condition", "climate_factor",
    # targets
    "structural_condition",   # → condition model
    "maintenance_year",       # → maintenance model  
    "deterioration_rate",     # → deterioration model
    # metadata
    "data_quality", "source",
]

MATERIAL_ENC = {"concrete": 0.7, "steel": 0.3, "composite": 0.5, "masonry": 0.9, "asphalt": 0.65}
LOAD_ENC     = {"light": 0.2, "medium": 0.5, "heavy": 0.8, "extreme": 1.0}
ENV_ENC      = {"low": 0.1, "medium": 0.3, "high": 0.6, "severe": 1.0}
FLOOD_ENC    = {"very_high": 1.0, "high": 0.75, "medium": 0.45, "low": 0.15, "negligible": 0.0}
SEISMIC_ENC  = {"V": 1.0, "IV": 0.75, "III": 0.45, "II": 0.15}
CLIMATE_MUL  = {"coastal": 1.30, "tropical": 1.20, "highland": 1.10, "semi-arid": 1.05, "arid": 1.0}


def encode_record(rec: dict) -> dict:
    """Add numeric encodings needed for ML training."""
    age     = int(rec.get("age_years") or 20)
    mat     = str(rec.get("material", "concrete")).lower()
    load    = str(rec.get("traffic_load", "medium")).lower()
    env     = str(rec.get("env_exposure", "medium")).lower()
    flood   = str(rec.get("flood_risk", "low")).lower()
    seismic = str(rec.get("seismic_zone", "II"))
    climate = str(rec.get("climate_zone", "semi-arid")).lower()
    rain    = float(rec.get("annual_rainfall_mm") or 700)

    mat_enc = MATERIAL_ENC.get(mat, 0.7)
    load_enc= LOAD_ENC.get(load, 0.5)
    env_enc = ENV_ENC.get(env, 0.3)

    # Climate factor (matches risk_formula.py)
    flood_f   = FLOOD_ENC.get(flood, 0.15)
    seismic_f = SEISMIC_ENC.get(seismic, 0.15)
    rain_f    = min(rain / 2500.0, 1.0)
    climate_f = (0.45 * flood_f) + (0.35 * seismic_f) + (0.20 * rain_f)

    zone_mul  = CLIMATE_MUL.get(climate, 1.05)
    design_life = {"steel": 75, "composite": 80, "concrete": 70, "asphalt": 20, "masonry": 100}.get(mat, 70)
    age_factor  = min(age / design_life, 1.0)

    base_risk = (0.30 * age_factor + 0.22 * load_enc + 0.18 * mat_enc + 0.15 * env_enc + 0.15 * climate_f) * 100
    risk_score = min(base_risk * zone_mul, 100.0)

    cond = float(rec.get("structural_condition") or 10 - risk_score / 10)
    detr = round(max(0.01, (risk_score / 100) * 0.5), 4)
    maint_year = int(datetime.now().year + max(0, (cond - 4.0) / max(detr, 0.01)))

    return {
        **rec,
        "material_encoded":    round(mat_enc, 4),
        "load_encoded":        round(load_enc, 4),
        "env_encoded":         round(env_enc, 4),
        "climate_factor":      round(climate_f, 4),
        "zone_multiplier":     round(zone_mul, 4),
        "risk_score":          round(risk_score, 2),
        "structural_condition": round(cond, 2),
        "maintenance_year":    maint_year,
        "deterioration_rate":  detr,
        "source":              rec.get("data_quality", "synthetic"),
    }


def load_real_records(json_path: str) -> list:
    """Load parsed NHAI JSON records."""
    if not os.path.exists(json_path):
        log.warning(f"Real data file not found: {json_path}")
        return []
    with open(json_path) as f:
        data = json.load(f)
    records = data.get("records", data) if isinstance(data, dict) else data
    for r in records:
        r["data_quality"] = "real"
    log.info(f"Loaded {len(records)} real records")
    return records


def load_synthetic_records(csv_path: str) -> list:
    """Load existing synthetic CSV."""
    if not os.path.exists(csv_path):
        log.warning(f"Synthetic CSV not found: {csv_path}")
        return []
    records = []
    with open(csv_path) as f:
        for row in csv.DictReader(f):
            row["data_quality"] = "synthetic"
            records.append(row)
    log.info(f"Loaded {len(records)} synthetic records")
    return records


def deduplicate(records: list) -> list:
    """Remove duplicates by (name, city, construction_year)."""
    seen, unique = set(), []
    for r in records:
        key = (
            str(r.get("name", "")).lower().strip(),
            str(r.get("city", "")).lower().strip(),
            str(r.get("construction_year", "")),
        )
        if key not in seen:
            seen.add(key)
            unique.append(r)
    removed = len(records) - len(unique)
    if removed:
        log.info(f"Removed {removed} duplicates")
    return unique


def merge(real_path: str, synthetic_path: str, real_weight: int = 3) -> pd.DataFrame:
    """
    Merge real + synthetic. Real records are duplicated `real_weight` times
    so the model learns from them more strongly.
    """
    real      = load_real_records(real_path)
    synthetic = load_synthetic_records(synthetic_path)

    # Encode all records
    all_real = [encode_record(r) for r in real]
    all_syn  = [encode_record(r) for r in synthetic]

    # Weight real records
    weighted_real = all_real * real_weight

    combined = weighted_real + all_syn
    combined = deduplicate(combined)

    df = pd.DataFrame(combined)
    df["data_quality"] = df.get("data_quality", "synthetic")
    
    real_count = len(real)
    syn_count  = len(synthetic)
    log.info(f"Merged: {real_count} real (×{real_weight}) + {syn_count} synthetic = {len(df)} total training rows")
    return df, real_count, syn_count


def main():
    parser = argparse.ArgumentParser(description="NIIS Dataset Merger")
    parser.add_argument("--real",      default=os.path.join(REAL_DIR, "parsed_bridges.json"))
    parser.add_argument("--synthetic", default=os.path.join(SYNTHETIC_DIR, "training_data.csv"))
    parser.add_argument("--output",    default=OUTPUT_PATH)
    parser.add_argument("--weight",    type=int, default=3, help="Multiplier for real records")
    args = parser.parse_args()

    df, real_n, syn_n = merge(args.real, args.synthetic, args.weight)
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    df.to_csv(args.output, index=False)
    
    print(f"\n✅ Merged dataset saved → {args.output}")
    print(f"   Real records:      {real_n} (×{args.weight} weighted)")
    print(f"   Synthetic records: {syn_n}")
    print(f"   Total rows:        {len(df)}")
    print(f"\n   Run training:  python models/train.py --data {args.output}")


if __name__ == "__main__":
    main()
