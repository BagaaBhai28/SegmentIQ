"""Train SegmentIQ on the reproducible synthetic archetype dataset."""
from __future__ import annotations

import argparse
import json
from itertools import combinations
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.decomposition import PCA
from sklearn.metrics import adjusted_rand_score, silhouette_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET = ROOT / "ml/data/processed/synthetic_archetype_dataset.csv"
DEFAULT_ARTIFACTS = ROOT / "ml/artifacts"
NUMERIC_FEATURES = [
    "Age", "Monthly_Income_INR", "Monthly_Expenses_INR", "Savings_Percentage",
    "Monthly_Debt_Payment_INR", "Monthly_SIP", "Equity_Allocation_Pct",
    "FD_Allocation_Pct", "Debt_Allocation_Pct", "Investment_Experience_Years",
    "Financial_Literacy_Score",
]
CATEGORICAL_FEATURES = [
    "City_Tier", "Employment_Type", "Debt_Status", "Risk_Tolerance_Level",
    "Primary_Financial_Goal",
]
TARGET_FIELD = "Synthetic_Archetype"
SEEDS = [0, 17, 42, 73, 101]


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer([
        ("numeric", StandardScaler(), NUMERIC_FEATURES),
        ("categorical", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
    ])


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.is_file():
        raise FileNotFoundError(
            f"Synthetic dataset not found: {path}. Run ml/src/generate_synthetic_dataset.py first."
        )
    frame = pd.read_csv(path, keep_default_na=False)
    required = NUMERIC_FEATURES + CATEGORICAL_FEATURES + [TARGET_FIELD]
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise ValueError(f"Dataset is missing required fields: {missing}")
    frame[NUMERIC_FEATURES] = frame[NUMERIC_FEATURES].apply(pd.to_numeric, errors="raise")
    if not np.isfinite(frame[NUMERIC_FEATURES].to_numpy(dtype=float)).all():
        raise ValueError("Numeric features contain non-finite values")
    if frame[CATEGORICAL_FEATURES + [TARGET_FIELD]].eq("").any().any():
        raise ValueError("Categorical features contain blank values")
    return frame


def cluster_profiles(frame: pd.DataFrame, labels: np.ndarray) -> dict[str, Any]:
    labeled = frame.copy()
    labeled["cluster_id"] = labels
    profiles: dict[str, Any] = {}
    for cluster_id, group in labeled.groupby("cluster_id", sort=True):
        archetype = group[TARGET_FIELD].value_counts(normalize=True)
        profiles[str(int(cluster_id))] = {
            "cluster_id": int(cluster_id),
            "display_name": str(archetype.index[0]),
            "synthetic_label_share": float(archetype.iloc[0]),
            "size": int(len(group)),
            "share": float(len(group) / len(labeled)),
            "numeric_means": {field: float(group[field].mean()) for field in NUMERIC_FEATURES},
            "category_shares": {
                field: {str(value): float(share) for value, share in group[field].value_counts(normalize=True).items()}
                for field in CATEGORICAL_FEATURES
            },
        }
    return profiles


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--min-k", type=int, default=2)
    parser.add_argument("--max-k", type=int, default=8)
    parser.add_argument("--artifacts-dir", type=Path, default=DEFAULT_ARTIFACTS)
    args = parser.parse_args()

    frame = load_dataset(args.dataset)
    if args.min_k < 2 or args.max_k < args.min_k or args.max_k >= len(frame):
        raise ValueError("Require 2 <= min_k <= max_k < number of rows")
    x = make_preprocessor().fit_transform(frame[NUMERIC_FEATURES + CATEGORICAL_FEATURES])
    results: list[dict[str, float | int]] = []
    labels_by_k: dict[int, list[np.ndarray]] = {}
    for k in range(args.min_k, args.max_k + 1):
        scores: list[float] = []
        labels_by_k[k] = []
        for seed in SEEDS:
            model = KMeans(n_clusters=k, random_state=seed, n_init=30)
            labels = model.fit_predict(x)
            labels_by_k[k].append(labels)
            scores.append(float(silhouette_score(x, labels)))
        stability = [
            adjusted_rand_score(labels_by_k[k][left], labels_by_k[k][right])
            for left, right in combinations(range(len(SEEDS)), 2)
        ]
        results.append({
            "k": k,
            "silhouette_mean": float(np.mean(scores)),
            "stability_ari_mean": float(np.mean(stability)),
        })

    selected = max(results, key=lambda item: (item["silhouette_mean"], item["stability_ari_mean"]))
    selected_k = int(selected["k"])
    pipeline = make_preprocessor()
    training_matrix = pipeline.fit_transform(frame[NUMERIC_FEATURES + CATEGORICAL_FEATURES])
    model = KMeans(n_clusters=selected_k, random_state=42, n_init=30)
    labels = model.fit_predict(training_matrix)
    silhouette = float(silhouette_score(training_matrix, labels))
    recovery_ari = float(adjusted_rand_score(frame[TARGET_FIELD], labels))
    profiles = cluster_profiles(frame, labels)
    pca = PCA(n_components=2, random_state=42).fit(training_matrix)
    coordinates = pca.transform(training_matrix)

    args.artifacts_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump({"preprocessor": pipeline, "model": model}, args.artifacts_dir / "investor_segment_pipeline.joblib")
    joblib.dump(pca, args.artifacts_dir / "pca_projection.joblib")
    (args.artifacts_dir / "cluster_profiles.json").write_text(
        json.dumps(profiles, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    contract = {
        "contract_version": "2.0.0",
        "selected_k": selected_k,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "categorical_values": {
            field: sorted(str(value) for value in frame[field].unique())
            for field in CATEGORICAL_FEATURES
        },
        "excluded_from_model": [TARGET_FIELD],
        "selection_method": "Highest mean silhouette across K=2..8 over five seeds; synthetic label excluded from features.",
        "dataset_kind": "Synthetic scenario data; archetype names identify simulated groups only.",
    }
    (args.artifacts_dir / "feature_contract.json").write_text(
        json.dumps(contract, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    assignment_path = ROOT / "ml/data/processed/investor_segments.csv"
    pd.DataFrame({
        "cluster_id": labels,
        "synthetic_archetype": frame[TARGET_FIELD],
        "pca_1": coordinates[:, 0],
        "pca_2": coordinates[:, 1],
    }).to_csv(assignment_path, index=False)
    print(json.dumps({
        "selected_k": selected_k,
        "silhouette": silhouette,
        "synthetic_archetype_recovery_ari": recovery_ari,
        "cluster_sizes": {cluster: profile["size"] for cluster, profile in profiles.items()},
        "candidate_scores": results,
    }, indent=2))


if __name__ == "__main__":
    main()
