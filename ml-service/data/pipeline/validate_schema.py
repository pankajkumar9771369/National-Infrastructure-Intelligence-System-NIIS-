"""
NIIS — Schema Validator for Ingested Data
Runs after parse_nhai.py to ensure all required fields are present
before merging into the training dataset.

Usage:
  python validate_schema.py --input data/real/parsed_bridges.json
  python validate_schema.py --input data/real/parsed_bridges.json --strict
"""
import json
import sys
import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("validate_schema")

# ─── Field Definitions ────────────────────────────────────────────────────────

REQUIRED_FIELDS = {
    "name":               (str, None),
    "age_years":          (int, None),     # cannot be None
    "material":           (str, ["concrete", "steel", "composite", "masonry", "asphalt"]),
    "traffic_load":       (str, ["light", "medium", "heavy", "extreme"]),
    "env_exposure":       (str, ["low", "medium", "high", "severe"]),
    "structural_condition": (float, None),  # 0-10
}

OPTIONAL_FIELDS = {
    "city":               (str, None),
    "state":              (str, None),
    "route_type":         (str, ["national_highway", "state_highway", "district_road", "city", "expressway"]),
    "economic_importance":(str, ["critical", "high", "medium", "low"]),
    "climate_zone":       (str, ["coastal", "tropical", "highland", "semi-arid", "arid"]),
    "seismic_zone":       (str, ["II", "III", "IV", "V"]),
    "flood_risk":         (str, ["very_high", "high", "medium", "low", "negligible"]),
    "latitude":           (float, None),
    "longitude":          (float, None),
    "length_meters":      (float, None),
    "annual_rainfall_mm": (int, None),
    "nearest_hospital_km":(float, None),
}

RANGE_CHECKS = {
    "age_years":           (0, 200),
    "structural_condition":(0, 10),
    "latitude":            (-90, 90),
    "longitude":           (-180, 180),
    "length_meters":       (1, 100000),
    "annual_rainfall_mm":  (0, 12000),
}


def validate_record(rec: dict, idx: int) -> list:
    """Return list of issues for one record. Empty = valid."""
    issues = []

    # Required field checks
    for field, (ftype, allowed) in REQUIRED_FIELDS.items():
        val = rec.get(field)
        if val is None or val == "":
            issues.append(f"MISSING required field '{field}'")
            continue
        if allowed and str(val).lower() not in [str(a).lower() for a in allowed]:
            issues.append(f"INVALID value '{val}' for '{field}' — allowed: {allowed}")

    # Optional field allowed-value checks
    for field, (ftype, allowed) in OPTIONAL_FIELDS.items():
        val = rec.get(field)
        if val is not None and allowed:
            if str(val).lower() not in [str(a).lower() for a in allowed]:
                issues.append(f"WARN: unexpected value '{val}' for '{field}'")

    # Range checks
    for field, (lo, hi) in RANGE_CHECKS.items():
        val = rec.get(field)
        if val is not None:
            try:
                fval = float(val)
                if not (lo <= fval <= hi):
                    issues.append(f"OUT OF RANGE: '{field}' = {fval} (expected {lo}–{hi})")
            except (ValueError, TypeError):
                issues.append(f"NON-NUMERIC: '{field}' = {val!r}")

    return issues


def validate_dataset(records: list, strict: bool = False) -> dict:
    """Validate all records. Returns quality report."""
    valid, invalid, warnings = [], [], []

    for i, rec in enumerate(records):
        issues = validate_record(rec, i)
        errors   = [x for x in issues if not x.startswith("WARN")]
        warns    = [x for x in issues if x.startswith("WARN")]

        if errors:
            invalid.append({"index": i, "name": rec.get("name", f"Row-{i}"), "errors": errors})
        else:
            valid.append(rec)
        if warns:
            warnings.append({"index": i, "name": rec.get("name", f"Row-{i}"), "warnings": warns})

    total        = len(records)
    valid_count  = len(valid)
    quality_pct  = round(100 * valid_count / total, 1) if total else 0

    report = {
        "total":         total,
        "valid":         valid_count,
        "invalid":       len(invalid),
        "warnings":      len(warnings),
        "quality_pct":   quality_pct,
        "quality_grade": "A" if quality_pct >= 90 else "B" if quality_pct >= 75 else "C" if quality_pct >= 60 else "D",
        "invalid_detail":invalid[:20],       # show first 20 errors
        "warning_detail":warnings[:20],
        "valid_records": valid if not strict else None,
    }
    return report


def main():
    parser = argparse.ArgumentParser(description="NIIS Schema Validator")
    parser.add_argument("--input", required=True, help="Parsed JSON from parse_nhai.py")
    parser.add_argument("--strict", action="store_true", help="Fail if quality < 80%")
    args = parser.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    records = data.get("records", data) if isinstance(data, dict) else data
    report  = validate_dataset(records)

    print(f"\n{'='*50}")
    print(f"  NIIS Data Quality Report")
    print(f"{'='*50}")
    print(f"  Total records:   {report['total']}")
    print(f"  Valid:           {report['valid']}  ({report['quality_pct']}%)")
    print(f"  Invalid:         {report['invalid']}")
    print(f"  Warnings:        {report['warnings']}")
    print(f"  Quality Grade:   {report['quality_grade']}")
    print(f"{'='*50}\n")

    if report["invalid_detail"]:
        print("First issues:")
        for d in report["invalid_detail"][:5]:
            print(f"  [{d['name']}]: {'; '.join(d['errors'])}")

    if args.strict and report["quality_pct"] < 80:
        print("❌ Quality below 80% — failing in strict mode")
        sys.exit(1)

    print(f"\n✅ Quality grade: {report['quality_grade']} ({report['quality_pct']}%)")
    return report


if __name__ == "__main__":
    main()
