"""
NIIS Real Data Pipeline — Phase 1
NHAI Bridge Data Parser

Parses:
  1. CSV exports from NHAI Annual Reports / Data.gov.in
  2. (Skeleton) PDF parsing using pdfplumber when real PDFs arrive

Usage:
  python parse_nhai.py --input data/real/nhai_sample_bridges.csv --output data/real/parsed_bridges.json
  python parse_nhai.py --input report.pdf --format pdf
"""
import csv
import json
import re
import sys
import os
import argparse
import logging
from datetime import datetime, date

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("parse_nhai")

# ─── Field Normalisation Maps ─────────────────────────────────────────────────

MATERIAL_MAP = {
    "rcc": "concrete", "reinforced cement concrete": "concrete", "psc": "concrete",
    "prestressed concrete": "concrete", "rc": "concrete", "cc": "concrete",
    "steel": "steel", "steel girder": "steel", "ms": "steel",
    "composite": "composite", "comp": "composite",
    "stone masonry": "masonry", "brick masonry": "masonry", "masonry": "masonry",
    "stone": "masonry", "brick": "masonry",
    "asphalt": "asphalt", "bituminous": "asphalt", "flexible": "asphalt",
}

LOAD_MAP = {
    "irc class 70r": "extreme", "70r": "extreme", "class 70r": "extreme",
    "irc class aa": "heavy", "class aa": "heavy", "aa": "heavy",
    "irc class a": "medium", "class a": "medium",
    "irc class b": "light", "class b": "light",
    "extreme": "extreme", "heavy": "heavy", "medium": "medium", "light": "light",
}

ENV_MAP = {
    "coastal": "severe", "marine": "severe", "severe": "severe",
    "industrial": "high", "urban": "high", "high": "high",
    "rural": "medium", "medium": "medium",
    "low": "low", "normal": "low", "interior": "low",
}

ROUTE_MAP = {
    "nh": "national_highway", "national highway": "national_highway",
    "sh": "state_highway", "state highway": "state_highway",
    "mdr": "district_road", "major district road": "district_road", "district": "district_road",
    "urban": "city", "city": "city", "municipal": "city",
    "expressway": "expressway",
}

CLIMATE_ZONE_MAP = {
    "mumbai": "coastal", "chennai": "coastal", "kolkata": "coastal",
    "visakhapatnam": "coastal", "kochi": "coastal", "goa": "coastal",
    "delhi": "semi-arid", "jaipur": "arid", "ahmedabad": "arid", "jodhpur": "arid",
    "bangalore": "tropical", "hyderabad": "semi-arid", "pune": "semi-arid",
    "lucknow": "semi-arid", "patna": "semi-arid", "varanasi": "semi-arid",
    "manali": "highland", "shimla": "highland", "dehradun": "highland",
}

SEISMIC_MAP = {
    "bihar": "IV", "assam": "V", "j&k": "V", "gujarat": "III", "himachal pradesh": "IV",
    "uttarakhand": "IV", "delhi": "IV", "northeast": "V",
    "maharashtra": "III", "karnataka": "II", "tamil nadu": "II", "andhra pradesh": "II",
    "rajasthan": "II", "madhya pradesh": "II", "uttar pradesh": "II", "kerala": "III",
    "west bengal": "III", "odisha": "III", "telangana": "II",
}

FLOOD_RISK_MAP = {
    "assam": "very_high", "bihar": "very_high", "west bengal": "high",
    "odisha": "high", "uttar pradesh": "medium", "gujarat": "medium",
    "maharashtra": "medium", "delhi": "high", "kerala": "high",
    "rajasthan": "low", "madhya pradesh": "low", "karnataka": "low",
    "tamil nadu": "medium", "andhra pradesh": "medium", "telangana": "low",
}


def normalise(val: str, mapping: dict, default: str = None) -> str:
    """Case-insensitive lookup in normalisation map."""
    v = str(val).strip().lower()
    return mapping.get(v, default or v)


def parse_year(val) -> int:
    """Extract 4-digit year from various formats."""
    if not val:
        return None
    s = str(val).strip()
    m = re.search(r"\b(19[5-9]\d|20[0-2]\d)\b", s)
    if m:
        return int(m.group())
    return None


def parse_float(val, default=None):
    try:
        return float(str(val).replace(",", "").strip()) if val else default
    except (ValueError, TypeError):
        return default


def infer_design_life(material: str) -> int:
    return {"steel": 75, "composite": 80, "concrete": 70, "asphalt": 20, "masonry": 100}.get(material, 70)


def parse_csv_record(row: dict, row_num: int) -> dict:
    """
    Convert one CSV row (NHAI format) to our NIIS schema dict.
    Handles flexible / missing column names.
    """
    name         = row.get("bridge_name") or row.get("name") or row.get("structure_name") or f"Bridge-{row_num}"
    city         = (row.get("city") or row.get("district") or "Unknown").strip().title()
    state        = (row.get("state") or row.get("state_name") or "Unknown").strip().title()
    const_year   = parse_year(row.get("construction_year") or row.get("year_built") or row.get("year"))
    age_years    = int(datetime.now().year) - const_year if const_year else None
    material_raw = row.get("material") or row.get("superstructure_material") or ""
    material     = normalise(material_raw, MATERIAL_MAP, "concrete")
    load_raw     = row.get("traffic_load") or row.get("design_load") or row.get("load_class") or ""
    traffic_load = normalise(load_raw, LOAD_MAP, "medium")
    env_raw      = row.get("env_exposure") or row.get("environment") or row.get("exposure") or ""
    env_exposure = normalise(env_raw, ENV_MAP, "medium")
    route_raw    = row.get("route_type") or row.get("highway_type") or row.get("road_class") or ""
    route_type   = normalise(route_raw, ROUTE_MAP, "city")
    condition    = parse_float(row.get("condition_rating") or row.get("structural_condition") or row.get("condition"))
    length_m     = parse_float(row.get("length_m") or row.get("length_meters") or row.get("span_m"))
    width_m      = parse_float(row.get("width_m") or row.get("width_meters"))
    lat          = parse_float(row.get("latitude") or row.get("lat"))
    lng          = parse_float(row.get("longitude") or row.get("lng") or row.get("long"))
    hospital_km  = parse_float(row.get("nearest_hospital_km") or row.get("hospital_km"))
    rainfall_mm  = parse_float(row.get("annual_rainfall_mm") or row.get("rainfall_mm"))
    replace_cost = parse_float(row.get("replacement_cost_crore") or row.get("cost_crore"))
    economic_imp = row.get("economic_importance") or "high"
    # Infer from state if not provided
    city_lower   = city.lower()
    state_lower  = state.lower()
    climate_zone = row.get("climate_zone") or CLIMATE_ZONE_MAP.get(city_lower) or CLIMATE_ZONE_MAP.get(state_lower, "semi-arid")
    seismic_zone = row.get("seismic_zone") or SEISMIC_MAP.get(state_lower, "II")
    flood_risk   = row.get("flood_risk") or FLOOD_RISK_MAP.get(state_lower, "low")

    return {
        "name": name.strip(),
        "type": row.get("type", "bridge").lower(),
        "area": city,
        "city": city,
        "state": state,
        "latitude": lat,
        "longitude": lng,
        "age_years": age_years,
        "construction_year": const_year,
        "material": material,
        "traffic_load": traffic_load,
        "env_exposure": env_exposure,
        "structural_condition": condition if condition is not None else 6.0,
        "length_meters": length_m,
        "width_meters": width_m,
        "route_type": route_type,
        "economic_importance": economic_imp.lower(),
        "nearest_hospital_km": hospital_km,
        "climate_zone": climate_zone,
        "seismic_zone": seismic_zone,
        "flood_risk": flood_risk,
        "annual_rainfall_mm": int(rainfall_mm) if rainfall_mm else None,
        "replacement_cost_crore": replace_cost,
        "description": f"NHAI data record. Source: {row.get('source', 'NHAI Annual Report')}",
        "data_quality": "real",   # flag: real vs synthetic
    }


def parse_csv(filepath: str) -> list:
    """Parse a CSV file and return list of NIIS-format records."""
    records, errors = [], []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, 1):
            try:
                rec = parse_csv_record(row, i)
                records.append(rec)
            except Exception as e:
                errors.append({"row": i, "error": str(e)})
                log.warning(f"Row {i} error: {e}")
    log.info(f"Parsed {len(records)} records, {len(errors)} errors")
    return records, errors


def parse_pdf(filepath: str) -> list:
    """
    PDF parser skeleton — plug in real NHAI PDF when available.
    Requires: pip install pdfplumber
    """
    try:
        import pdfplumber
    except ImportError:
        log.error("pdfplumber not installed. Run: pip install pdfplumber")
        return [], []

    records, errors = [], []
    with pdfplumber.open(filepath) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            tables = page.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue
                headers = [str(h).strip().lower().replace(" ", "_") for h in table[0] if h]
                for i, row in enumerate(table[1:], 1):
                    try:
                        row_dict = dict(zip(headers, [str(c or "").strip() for c in row]))
                        rec = parse_csv_record(row_dict, i)
                        records.append(rec)
                    except Exception as e:
                        errors.append({"page": page_num, "row": i, "error": str(e)})
    log.info(f"PDF: parsed {len(records)} records from {len(pdf.pages)} pages")
    return records, errors


def main():
    parser = argparse.ArgumentParser(description="NIIS NHAI Data Parser")
    parser.add_argument("--input", required=True, help="Input CSV or PDF file")
    parser.add_argument("--output", default="data/real/parsed_bridges.json", help="Output JSON file")
    parser.add_argument("--format", choices=["csv", "pdf"], default="csv")
    args = parser.parse_args()

    if args.format == "pdf" or args.input.lower().endswith(".pdf"):
        records, errors = parse_pdf(args.input)
    else:
        records, errors = parse_csv(args.input)

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump({"records": records, "errors": errors, "total": len(records)}, f, indent=2, default=str)

    print(f"\n✅ Parsed {len(records)} records → {args.output}")
    print(f"⚠️  {len(errors)} errors")
    return records


if __name__ == "__main__":
    main()
