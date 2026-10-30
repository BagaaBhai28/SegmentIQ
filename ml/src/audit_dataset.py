"""Audit the source financial-behavior CSV without modifying its records."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

EXPECTED_NUMERIC = [
    "Age",
    "Monthly_Income_INR",
    "Monthly_Expenses_INR",
    "Savings_Percentage",
    "Monthly_Debt_Payment_INR",
    "Financial_Literacy_Score",
]
EXPECTED_CATEGORICAL = [
    "Gender",
    "City_Tier",
    "Employment_Type",
    "Investment_Type",
    "Has_Health_Insurance",
    "Has_Life_Insurance",
    "Has_Emergency_Fund",
    "Debt_Status",
    "Uses_Financial_Apps",
    "Primary_Financial_Goal",
    "Risk_Tolerance_Level",
    "Savings_Channel",
    "Region",
]
PROPOSED_BUT_ABSENT = [
    "Monthly_SIP",
    "Equity_Allocation_Pct",
    "FD_Allocation_Pct",
    "Debt_Allocation_Pct",
    "Investment_Experience_Years",
]


def json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return None if not np.isfinite(value) else float(value)
    if pd.isna(value):
        return None
    return value


def audit(dataset_path: Path) -> dict[str, Any]:
    # Preserve the literal string "None" so it can be distinguished from a blank.
    frame = pd.read_csv(dataset_path, keep_default_na=False)
    numeric_cols = [c for c in EXPECTED_NUMERIC if c in frame.columns]
    category_cols = [c for c in EXPECTED_CATEGORICAL if c in frame.columns]
    absent_expected = [c for c in EXPECTED_NUMERIC + EXPECTED_CATEGORICAL if c not in frame.columns]

    numeric = frame[numeric_cols].apply(pd.to_numeric, errors="coerce")
    actual_missing = {
        col: int((frame[col].astype(str).str.strip() == "").sum())
        for col in frame.columns
    }
    literal_none = {
        col: int((frame[col].astype(str).str.strip().str.casefold() == "none").sum())
        for col in frame.columns
    }

    ranges: dict[str, Any] = {}
    for col in numeric_cols:
        series = numeric[col]
        ranges[col] = {
            "min": series.min(),
            "median": series.median(),
            "mean": series.mean(),
            "max": series.max(),
            "skew": series.skew(),
        }

    category_counts = {
        col: {str(k): int(v) for k, v in frame[col].value_counts(dropna=False).items()}
        for col in category_cols
    }

    checks: dict[str, Any] = {}
    if {"Monthly_Expenses_INR", "Monthly_Income_INR"}.issubset(numeric.columns):
        expense_exceeds_income = numeric["Monthly_Expenses_INR"] > numeric["Monthly_Income_INR"]
        checks["expenses_exceed_income"] = int(expense_exceeds_income.sum())
        if "Savings_Percentage" in numeric.columns:
            checks["expenses_exceed_income_and_positive_savings"] = int(
                (expense_exceeds_income & (numeric["Savings_Percentage"] > 0)).sum()
            )
    if {"Debt_Status", "Monthly_Debt_Payment_INR"}.issubset(frame.columns):
        no_debt = frame["Debt_Status"].astype(str).str.strip().str.casefold() == "no debt"
        debt_payment = pd.to_numeric(frame["Monthly_Debt_Payment_INR"], errors="coerce")
        checks["no_debt_with_positive_payment"] = int((no_debt & (debt_payment > 0)).sum())
        checks["no_debt_records"] = int(no_debt.sum())

    id_summary: dict[str, Any] = {}
    if "Respondent_ID" in frame.columns:
        respondent_ids = frame["Respondent_ID"]
        id_summary = {
            "unique": int(respondent_ids.nunique(dropna=False)),
            "duplicates": int(respondent_ids.duplicated().sum()),
            "min": respondent_ids.min(),
            "max": respondent_ids.max(),
        }

    correlations = numeric.corr().round(4).where(lambda x: x.notna(), None).to_dict()
    return json_safe({
        "dataset_file": dataset_path.name,
        "provenance": {
            "source_url": None,
            "license": None,
            "status": "Not supplied with the CSV; verify before redistribution or real-world claims.",
            "interpretation": "Numeric distributions appear synthetic-like; this is an observation, not proof of origin.",
        },
        "shape": {"rows": len(frame), "columns": len(frame.columns)},
        "columns": list(frame.columns),
        "dtypes": {col: str(dtype) for col, dtype in frame.dtypes.items()},
        "expected_columns_missing": absent_expected,
        "proposed_features_absent": [c for c in PROPOSED_BUT_ABSENT if c not in frame.columns],
        "blank_values_by_column": actual_missing,
        "literal_none_by_column": literal_none,
        "duplicate_rows": int(frame.duplicated().sum()),
        "respondent_id": id_summary,
        "numeric_summary": ranges,
        "numeric_correlations": correlations,
        "category_counts": category_counts,
        "consistency_checks": checks,
        "cleaning_policy": "No rows or values were changed by this audit.",
    })


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dataset",
        type=Path,
        default=Path("ml/data/raw/Indian_Personal_Finance_Behavior_Dataset_2026.csv"),
    )
    parser.add_argument("--output", type=Path, default=Path("ml/reports/dataset_audit.json"))
    args = parser.parse_args()
    if not args.dataset.is_file():
        raise SystemExit(f"Dataset not found: {args.dataset}")
    report = audit(args.dataset)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "dataset": report["dataset_file"],
        "shape": report["shape"],
        "missing_columns": report["expected_columns_missing"],
        "proposed_features_absent": report["proposed_features_absent"],
        "checks": report["consistency_checks"],
        "output": str(args.output),
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
