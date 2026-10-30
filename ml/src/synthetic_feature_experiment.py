"""Add seeded synthetic investor attributes to a local copy and compare clustering."""
from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.metrics import (
    adjusted_rand_score,
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "ml/data/raw/Indian_Personal_Finance_Behavior_Dataset_2026.csv"
DERIVED = ROOT / "ml/data/processed/synthetic_investor_features.csv"
REPORT = ROOT / "ml/reports/synthetic_feature_experiment.json"
SEED = 20261031
SEEDS = [0, 17, 42, 73, 101]
K_VALUES = range(2, 9)
BASE_NUMERIC = [
    "Age", "Monthly_Income_INR", "Monthly_Expenses_INR",
    "Savings_Percentage", "Monthly_Debt_Payment_INR", "Financial_Literacy_Score",
]
SYNTHETIC_NUMERIC = [
    "Synthetic_Monthly_Investment_INR",
    "Synthetic_Investment_Horizon_Years",
    "Synthetic_Investment_Experience_Years",
]
SYNTHETIC_CATEGORICAL = [
    "Synthetic_Risk_Profile",
    "Synthetic_Investment_Goal",
    "Synthetic_Preferred_Asset_Class",
    "Synthetic_Investment_Frequency",
    "Synthetic_Liquidity_Need",
]


def add_synthetic_fields(frame: pd.DataFrame) -> pd.DataFrame:
    """Append reproducible, independent draws; never infer synthetic fields from labels."""
    missing = [name for name in BASE_NUMERIC if name not in frame.columns]
    if missing:
        raise ValueError(f"Source data is missing baseline fields: {missing}")
    rng = np.random.default_rng(SEED)
    result = frame.copy()
    row_count = len(result)
    result["Synthetic_Monthly_Investment_INR"] = rng.lognormal(
        mean=np.log(8000), sigma=0.8, size=row_count
    ).round(0).clip(500, 100000)
    result["Synthetic_Investment_Horizon_Years"] = rng.choice(
        [1, 3, 5, 10, 15, 20], size=row_count, p=[.08, .14, .20, .27, .19, .12]
    )
    result["Synthetic_Investment_Experience_Years"] = rng.integers(0, 26, size=row_count)
    result["Synthetic_Risk_Profile"] = rng.choice(
        ["Conservative", "Moderate", "Growth", "Aggressive"],
        size=row_count, p=[.24, .38, .27, .11],
    )
    result["Synthetic_Investment_Goal"] = rng.choice(
        ["Retirement", "Wealth creation", "Emergency reserve", "Home purchase", "Education"],
        size=row_count, p=[.25, .34, .17, .14, .10],
    )
    result["Synthetic_Preferred_Asset_Class"] = rng.choice(
        ["Mutual funds", "Direct equity", "Fixed income", "Gold", "Pension products"],
        size=row_count, p=[.39, .19, .20, .11, .11],
    )
    result["Synthetic_Investment_Frequency"] = rng.choice(
        ["Monthly SIP", "Quarterly", "Occasional lump sum"],
        size=row_count, p=[.61, .12, .27],
    )
    result["Synthetic_Liquidity_Need"] = rng.choice(
        ["Low", "Medium", "High"], size=row_count, p=[.35, .45, .20]
    )
    return result


def evaluate(matrix: np.ndarray, representation: str) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for k in K_VALUES:
        labels_for_seed: list[np.ndarray] = []
        silhouettes: list[float] = []
        db_scores: list[float] = []
        ch_scores: list[float] = []
        for seed in SEEDS:
            labels = KMeans(n_clusters=k, random_state=seed, n_init=20).fit_predict(matrix)
            labels_for_seed.append(labels)
            silhouettes.append(float(silhouette_score(matrix, labels)))
            db_scores.append(float(davies_bouldin_score(matrix, labels)))
            ch_scores.append(float(calinski_harabasz_score(matrix, labels)))
        aris = [
            adjusted_rand_score(labels_for_seed[a], labels_for_seed[b])
            for a, b in combinations(range(len(SEEDS)), 2)
        ]
        rows.append({
            "representation": representation,
            "k": k,
            "silhouette_mean": float(np.mean(silhouettes)),
            "davies_bouldin_mean": float(np.mean(db_scores)),
            "calinski_harabasz_mean": float(np.mean(ch_scores)),
            "seed_stability_ari_mean": float(np.mean(aris)),
            "seed_stability_ari_min": float(np.min(aris)),
        })
    return rows


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Source CSV not found: {SOURCE}")
    source = pd.read_csv(SOURCE, keep_default_na=False)
    augmented = add_synthetic_fields(source)
    DERIVED.parent.mkdir(parents=True, exist_ok=True)
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    augmented.to_csv(DERIVED, index=False)

    base = source[BASE_NUMERIC].apply(pd.to_numeric, errors="raise")
    base_matrix = StandardScaler().fit_transform(base)
    augmented_numeric = augmented[BASE_NUMERIC + SYNTHETIC_NUMERIC].copy()
    preprocess = ColumnTransformer([
        ("numeric", StandardScaler(), BASE_NUMERIC + SYNTHETIC_NUMERIC),
        ("categorical", OneHotEncoder(handle_unknown="ignore", sparse_output=False), SYNTHETIC_CATEGORICAL),
    ])
    augmented_matrix = preprocess.fit_transform(augmented_numeric.join(augmented[SYNTHETIC_CATEGORICAL]))

    rows = evaluate(base_matrix, "original_six_numeric") + evaluate(
        augmented_matrix, "original_plus_synthetic_investor_fields"
    )
    best_by_silhouette = {}
    best_by_davies_bouldin = {}
    for representation in {row["representation"] for row in rows}:
        candidates = [row for row in rows if row["representation"] == representation]
        best_by_silhouette[representation] = max(candidates, key=lambda row: row["silhouette_mean"])["k"]
        best_by_davies_bouldin[representation] = min(candidates, key=lambda row: row["davies_bouldin_mean"])["k"]

    report = {
        "experiment": "seeded random synthetic investor features appended to a derived dataset copy",
        "source_rows": int(len(source)),
        "seed": SEED,
        "synthetic_fields": {
            "numeric": SYNTHETIC_NUMERIC,
            "categorical": SYNTHETIC_CATEGORICAL,
            "generation": "Independent seeded random draws from documented plausible ranges/categories; no synthetic values are actual respondent observations.",
        },
        "preprocessing": "StandardScaler for numeric features; one-hot encoding for unordered categories",
        "selection_rule": "No single selected K: report silhouette maximum and Davies-Bouldin minimum separately because metrics can disagree.",
        "best_k_by_metric": {
            "silhouette_maximizing_k": best_by_silhouette,
            "davies_bouldin_minimizing_k": best_by_davies_bouldin,
        },
        "scores": rows,
        "derived_dataset_path": str(DERIVED.relative_to(ROOT)),
        "integrity_note": "Original source file was read only and not modified. Derived row-level data is written beneath ignored ml/data/processed/.",
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "best_k_by_metric": report["best_k_by_metric"],
        "scores": rows,
        "derived_dataset": str(DERIVED),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
