"""
NIIS Budget Optimization Engine
Uses Linear Programming (Knapsack variant) to allocate infrastructure
maintenance budgets for maximum risk reduction.

Input:  Budget cap (INR Crore) + list of structures with risk + cost
Output: Optimal structure selection with risk reduction projections
"""
from typing import List, Optional
from pydantic import BaseModel, Field
import numpy as np


# ─── Input/Output Models ─────────────────────────────────────
class StructureInput(BaseModel):
    id: int
    name: str
    city: str
    state: str
    route_type: str = "city"
    economic_importance: str = "medium"
    risk_score: float
    risk_level: str
    estimated_cost_inr_crore: float
    risk_reduction_points: Optional[float] = None
    maintenance_type: str = "preventive"
    planned_year: Optional[int] = None


class BudgetConstraints(BaseModel):
    total_budget_inr_crore: float = Field(..., description="Total budget in INR Crore")
    min_critical_structures: int = Field(0, description="Min critical structures that MUST be selected")
    prioritize_national_highways: bool = Field(True, description="Give bonus weight to NH structures")
    prioritize_high_economic_importance: bool = Field(True, description="Weight economic importance")
    max_single_city_allocation_pct: Optional[float] = Field(None, description="Max % of budget for one city (0-100)")
    year_filter: Optional[int] = Field(None, description="Only consider structures planned for this year")


class OptimizationResult(BaseModel):
    run_id: str
    budget_inr_crore: float
    selected_structures: List[dict]
    deferred_structures: List[dict]
    total_cost_inr_crore: float
    budget_utilization_pct: float
    total_risk_before: float
    total_risk_after: float
    risk_reduction_points: float
    risk_reduction_pct: float
    structures_selected: int
    structures_deferred: int
    year_wise_schedule: dict
    city_allocation: dict
    optimization_method: str
    constraints_applied: dict


# ─── Priority Score Weights ───────────────────────────────────
ROUTE_WEIGHTS = {
    "national_highway": 1.5,
    "expressway": 1.4,
    "state_highway": 1.2,
    "district_road": 1.0,
    "city": 0.9,
}

ECONOMIC_WEIGHTS = {
    "critical": 1.5,
    "high": 1.25,
    "medium": 1.0,
    "low": 0.75,
}


def compute_priority_score(structure: StructureInput, constraints: BudgetConstraints) -> float:
    """
    Compute the composite priority score for a structure.
    Higher = should be selected first.
    Formula: risk_score × route_weight × economic_weight / cost
    """
    route_w = ROUTE_WEIGHTS.get(structure.route_type, 1.0) if constraints.prioritize_national_highways else 1.0
    econ_w = ECONOMIC_WEIGHTS.get(structure.economic_importance, 1.0) if constraints.prioritize_high_economic_importance else 1.0

    # Risk reduction per crore — efficiency metric
    expected_reduction = structure.risk_reduction_points or (structure.risk_score * 0.3)
    cost = max(structure.estimated_cost_inr_crore, 0.01)  # avoid div by zero

    priority = (structure.risk_score * route_w * econ_w * expected_reduction) / cost
    return round(priority, 4)


def optimize_budget(
    structures: List[StructureInput],
    constraints: BudgetConstraints
) -> OptimizationResult:
    """
    Greedy + Constraint-Aware Budget Optimizer.

    Algorithm:
    1. Score every structure by risk-reduction-per-crore (efficiency ratio)
    2. Apply mandatory constraints (critical structures MUST be selected)
    3. Greedily select highest-efficiency structures within budget
    4. Apply city concentration limits if specified
    5. Return full optimization report with traceability
    """
    import uuid
    import math
    from datetime import datetime

    run_id = f"OPT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{str(uuid.uuid4())[:6].upper()}"
    budget = constraints.total_budget_inr_crore
    remaining = budget

    # Filter by year if specified
    candidates = structures
    if constraints.year_filter:
        candidates = [s for s in structures if s.planned_year == constraints.year_filter]
        if not candidates:
            candidates = structures  # fallback if no match

    # Step 1: Score all structures
    scored = []
    for s in candidates:
        score = compute_priority_score(s, constraints)
        scored.append((score, s))

    # Step 2: Mandatory critical structures first
    mandatory = []
    optional = []
    for score, s in scored:
        if s.risk_level == "critical" and constraints.min_critical_structures > 0:
            mandatory.append((score, s))
        else:
            optional.append((score, s))

    mandatory.sort(key=lambda x: -x[0])
    optional.sort(key=lambda x: -x[0])

    selected = []
    deferred = []
    city_spend = {}
    total_risk_reduction = 0.0
    total_cost = 0.0

    # Process mandatory first
    mandatory_count = 0
    for score, s in mandatory:
        if mandatory_count >= constraints.min_critical_structures:
            optional.insert(0, (score, s))  # move rest to optional
            continue
        if s.estimated_cost_inr_crore <= remaining:
            # City cap check
            if constraints.max_single_city_allocation_pct:
                city_cap = budget * (constraints.max_single_city_allocation_pct / 100)
                current_city_spend = city_spend.get(s.city, 0)
                if current_city_spend + s.estimated_cost_inr_crore > city_cap:
                    deferred.append(s)
                    continue
            city_spend[s.city] = city_spend.get(s.city, 0) + s.estimated_cost_inr_crore
            remaining -= s.estimated_cost_inr_crore
            total_cost += s.estimated_cost_inr_crore
            total_risk_reduction += s.risk_reduction_points or (s.risk_score * 0.3)
            selected.append({"structure": s, "priority_score": score, "mandatory": True})
            mandatory_count += 1
        else:
            deferred.append(s)

    # Greedy pass on optional
    for score, s in optional:
        if s.estimated_cost_inr_crore <= remaining:
            if constraints.max_single_city_allocation_pct:
                city_cap = budget * (constraints.max_single_city_allocation_pct / 100)
                if city_spend.get(s.city, 0) + s.estimated_cost_inr_crore > city_cap:
                    deferred.append(s)
                    continue
            city_spend[s.city] = city_spend.get(s.city, 0) + s.estimated_cost_inr_crore
            remaining -= s.estimated_cost_inr_crore
            total_cost += s.estimated_cost_inr_crore
            total_risk_reduction += s.risk_reduction_points or (s.risk_score * 0.3)
            selected.append({"structure": s, "priority_score": score, "mandatory": False})
        else:
            deferred.append(s)

    # Compute aggregate metrics
    total_risk_before = sum(s.risk_score for _, s in scored)
    total_risk_after = max(0, total_risk_before - total_risk_reduction)
    risk_reduction_pct = (total_risk_reduction / total_risk_before * 100) if total_risk_before > 0 else 0

    # Year-wise schedule
    year_schedule = {}
    for item in selected:
        s = item["structure"]
        yr = str(s.planned_year or 2025)
        if yr not in year_schedule:
            year_schedule[yr] = {"count": 0, "cost_crore": 0.0, "structures": []}
        year_schedule[yr]["count"] += 1
        year_schedule[yr]["cost_crore"] = round(year_schedule[yr]["cost_crore"] + s.estimated_cost_inr_crore, 2)
        year_schedule[yr]["structures"].append(s.name)

    return OptimizationResult(
        run_id=run_id,
        budget_inr_crore=budget,
        selected_structures=[
            {
                "id": item["structure"].id,
                "name": item["structure"].name,
                "city": item["structure"].city,
                "state": item["structure"].state,
                "route_type": item["structure"].route_type,
                "economic_importance": item["structure"].economic_importance,
                "risk_score": item["structure"].risk_score,
                "risk_level": item["structure"].risk_level,
                "cost_crore": item["structure"].estimated_cost_inr_crore,
                "risk_reduction": round(item["structure"].risk_reduction_points or item["structure"].risk_score * 0.3, 2),
                "priority_score": item["priority_score"],
                "mandatory": item["mandatory"],
                "maintenance_type": item["structure"].maintenance_type,
                "planned_year": item["structure"].planned_year,
            }
            for item in selected
        ],
        deferred_structures=[
            {
                "id": s.id,
                "name": s.name,
                "city": s.city,
                "risk_score": s.risk_score,
                "cost_crore": s.estimated_cost_inr_crore,
                "reason": "Budget exhausted" if remaining < s.estimated_cost_inr_crore else "City cap reached"
            }
            for s in deferred
        ],
        total_cost_inr_crore=round(total_cost, 2),
        budget_utilization_pct=round((total_cost / budget) * 100, 1),
        total_risk_before=round(total_risk_before, 2),
        total_risk_after=round(total_risk_after, 2),
        risk_reduction_points=round(total_risk_reduction, 2),
        risk_reduction_pct=round(risk_reduction_pct, 2),
        structures_selected=len(selected),
        structures_deferred=len(deferred),
        year_wise_schedule=year_schedule,
        city_allocation={city: round(spend, 2) for city, spend in city_spend.items()},
        optimization_method="greedy_priority_weighted",
        constraints_applied={
            "total_budget_inr_crore": budget,
            "min_critical_structures": constraints.min_critical_structures,
            "prioritize_national_highways": constraints.prioritize_national_highways,
            "prioritize_high_economic_importance": constraints.prioritize_high_economic_importance,
            "max_single_city_allocation_pct": constraints.max_single_city_allocation_pct,
            "year_filter": constraints.year_filter,
        }
    )
