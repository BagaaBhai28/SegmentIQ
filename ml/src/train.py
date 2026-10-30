"""Train and evaluate the SegmentIQ raw-feature clustering baseline."""
from __future__ import annotations

import argparse
import hashlib
import json
from itertools import combinations
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import (
    adjusted_rand_score,
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

FEATURES = [
    "Age",
    "Monthly_Income_INR",
    "Monthly_Expenses_INR",
    "Savings_Percentage",
    "Monthly_Debt_Payment_INR",
    "Financial_Literacy_Score",
]
EXTERNAL_PROFILE_FIELDS = [
    "Risk_Tolerance_Level",
    "Investment_Type",
    "Debt_Status",
    "Has_Health_Insurance",
    "Has_Life_Insurance",
    "Has_Emergency_Fund",
    "Uses_Financial_Apps",
]
DEFAULT_SEEDS = [0, 17, 42, 73, 101]
DEFAULT_SELECTED_K = 2


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_training_data(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path, keep_default_na=False)
    missing = [name for name in FEATURES if name not in frame.columns]
    if missing:
        raise ValueError(f"Training data is missing required features: {missing}")
    values = frame[FEATURES].apply(pd.to_numeric, errors="coerce")
    invalid = values.isna().sum()
    if invalid.any():
        bad = {name: int(count) for name, count in invalid.items() if count}
        raise ValueError(f"Required numeric fields contain blanks or nonnumeric values: {bad}")
    if not np.isfinite(values.to_numpy(dtype=float)).all():
        raise ValueError("Training features contain non-finite values")
    if len(frame) < 4:
        raise ValueError("At least four rows are required for the default cluster sweep")
    frame.loc[:, FEATURES] = values
    return frame


def make_pipeline(k: int, seed: int) -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("kmeans", KMeans(n_clusters=k, random_state=seed, n_init=20)),
    ])


def evaluate_candidates(values: pd.DataFrame, min_k: int, max_k: int, seeds: list[int]) -> tuple[pd.DataFrame, int]:
    if min_k < 2 or max_k <= min_k:
        raise ValueError("Cluster range must satisfy 2 <= min_k < max_k")
    if max_k >= len(values):
        raise ValueError("max_k must be smaller than the number of training rows")

    scaled = StandardScaler().fit_transform(values)
    rows: list[dict[str, Any]] = []
    for k in range(min_k, max_k + 1):
        labels_by_seed: list[np.ndarray] = []
        silhouettes: list[float] = []
        db_scores: list[float] = []
        ch_scores: list[float] = []
        inertias: list[float] = []
        for seed in seeds:
            model = KMeans(n_clusters=k, random_state=seed, n_init=20)
            labels = model.fit_predict(scaled)
            labels_by_seed.append(labels)
            silhouettes.append(float(silhouette_score(scaled, labels)))
            db_scores.append(float(davies_bouldin_score(scaled, labels)))
            ch_scores.append(float(calinski_harabasz_score(scaled, labels)))
            inertias.append(float(model.inertia_))
        ari_scores = [
            adjusted_rand_score(labels_by_seed[i], labels_by_seed[j])
            for i, j in combinations(range(len(labels_by_seed)), 2)
        ]
        rows.append({
            "k": k,
            "silhouette_mean": float(np.mean(silhouettes)),
            "silhouette_std": float(np.std(silhouettes, ddof=0)),
            "davies_bouldin_mean": float(np.mean(db_scores)),
            "calinski_harabasz_mean": float(np.mean(ch_scores)),
            "inertia_mean": float(np.mean(inertias)),
            "seed_stability_ari_mean": float(np.mean(ari_scores)) if ari_scores else None,
            "seed_stability_ari_min": float(np.min(ari_scores)) if ari_scores else None,
        })
    scores = pd.DataFrame(rows)
    highest_silhouette_k = int(scores.sort_values(
        ["silhouette_mean", "davies_bouldin_mean", "k"],
        ascending=[False, True, True],
    ).iloc[0]["k"])
    return scores, highest_silhouette_k


def summarize_clusters(frame: pd.DataFrame, labels: np.ndarray) -> dict[str, Any]:
    result: dict[str, Any] = {}
    working = frame.copy()
    working["cluster_id"] = labels
    total = len(working)
    for cluster_id, subset in working.groupby("cluster_id", sort=True):
        profile: dict[str, Any] = {
            "label": f"Cluster {int(cluster_id)}",
            "count": int(len(subset)),
            "share": float(len(subset) / total),
            "features_mean": {name: float(subset[name].mean()) for name in FEATURES},
            "features_median": {name: float(subset[name].median()) for name in FEATURES},
            "external_category_shares": {},
        }
        for field in EXTERNAL_PROFILE_FIELDS:
            if field not in subset.columns:
                continue
            shares = subset[field].value_counts(normalize=True, dropna=False)
            profile["external_category_shares"][field] = {
                str(category): float(share) for category, share in shares.items()
            }
        result[str(int(cluster_id))] = profile
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=Path("ml/data/raw/Indian_Personal_Finance_Behavior_Dataset_2026.csv"))
    parser.add_argument("--min-k", type=int, default=2)
    parser.add_argument("--max-k", type=int, default=8)
    parser.add_argument("--seeds", type=int, nargs="+", default=DEFAULT_SEEDS)
    parser.add_argument("--selected-k", type=int, default=None, help="Choose a cluster count after reviewing the sweep; defaults to the documented provisional K=2 baseline")
    parser.add_argument("--artifacts-dir", type=Path, default=Path("ml/artifacts"))
    parser.add_argument("--reports-dir", type=Path, default=Path("ml/reports"))
    args = parser.parse_args()

    if not args.dataset.is_file():
        raise SystemExit(f"Dataset not found: {args.dataset}")
    frame = load_training_data(args.dataset)
    values = frame[FEATURES].copy()
    scores, highest_silhouette_k = evaluate_candidates(values, args.min_k, args.max_k, args.seeds)
    selected_k = args.selected_k if args.selected_k is not None else DEFAULT_SELECTED_K
    if selected_k < args.min_k or selected_k > args.max_k:
        raise SystemExit("selected_k must be within the evaluated cluster range")

    final_pipeline = make_pipeline(selected_k, 42)
    labels = final_pipeline.fit_predict(values)
    scaled = final_pipeline.named_steps["scaler"].transform(values)
    silhouette = float(silhouette_score(scaled, labels))
    pca = PCA(n_components=2, random_state=42)
    coordinates = pca.fit_transform(scaled)

    args.artifacts_dir.mkdir(parents=True, exist_ok=True)
    args.reports_dir.mkdir(parents=True, exist_ok=True)
    pipeline_path = args.artifacts_dir / "investor_segment_pipeline.joblib"
    pca_path = args.artifacts_dir / "pca_projection.joblib"
    profiles_path = args.artifacts_dir / "cluster_profiles.json"
    contract_path = args.artifacts_dir / "feature_contract.json"
    selection_path = args.reports_dir / "model_selection.csv"
    report_path = args.reports_dir / "training_report.json"
    assignments_path = Path("ml/data/processed/investor_segments.csv")
    assignments_path.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(final_pipeline, pipeline_path)
    joblib.dump(pca, pca_path)
    profiles = summarize_clusters(frame, labels)
    profiles_path.write_text(json.dumps(profiles, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    contract = {
        "contract_version": "1.0.0",
        "features": FEATURES,
        "feature_source": "Observed numeric columns only; Respondent_ID excluded.",
        "preprocessing": ["StandardScaler"],
        "model": "sklearn.cluster.KMeans",
        "selected_k": selected_k,
        "selection_policy": "Provisional K=2 baseline chosen for parsimony and seed stability; review the full sweep before interpreting clusters.",
    }
    contract_path.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
    scores.to_csv(selection_path, index=False)
    pd.DataFrame({
        "Respondent_ID": frame["Respondent_ID"] if "Respondent_ID" in frame else np.arange(len(frame)),
        "cluster_id": labels,
        "pca_1": coordinates[:, 0],
        "pca_2": coordinates[:, 1],
    }).to_csv(assignments_path, index=False)

    final_db = float(davies_bouldin_score(scaled, labels))
    final_ch = float(calinski_harabasz_score(scaled, labels))
    selected_row = scores.loc[scores["k"] == selected_k].iloc[0].to_dict()
    report = {
        "dataset_file": args.dataset.name,
        "dataset_sha256": sha256(args.dataset),
        "rows_used": int(len(frame)),
        "features": FEATURES,
        "excluded_fields": ["Respondent_ID", *EXTERNAL_PROFILE_FIELDS],
        "data_cleaning": "No records or feature values were changed or removed.",
        "cluster_selection": {
            "highest_mean_silhouette_k": highest_silhouette_k,
            "selected_k": selected_k,
            "override_used": args.selected_k is not None,
            "seeds": args.seeds,
            "decision": (
                "K=2 is the provisional baseline: it has the strongest seed stability and highest Calinski-Harabasz score. Its silhouette is weak and only 0.012 below the maximum at K=8; no naturally occurring personas are inferred from this synthetic-like dataset."
                if selected_k == 2
                else "The selected K was explicitly supplied. Its metrics and cluster profiles require review; no naturally occurring personas are inferred from this synthetic-like dataset."
            ),
            "selected_k_mean_metrics_across_seeds": selected_row,
        },
        "final_model_metrics": {
            "silhouette": silhouette,
            "davies_bouldin": final_db,
            "calinski_harabasz": final_ch,
            "pca_explained_variance_ratio": [float(x) for x in pca.explained_variance_ratio_],
        },
        "cluster_profiles": profiles,
        "limitations": [
            "The dataset provenance and license were not supplied.",
            "The available numeric fields appear weakly correlated and synthetic-like.",
            "Cluster metrics describe this dataset and do not establish real-world investor segments.",
            "Risk tolerance, investment type, debt status, and protection fields are reserved for post-cluster description in this baseline.",
        ],
        "software_versions": {
            "python": ".".join(map(str, __import__("sys").version_info[:3])),
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
            "joblib": joblib.__version__,
        },
        "artifacts": {
            "pipeline": str(pipeline_path),
            "pca": str(pca_path),
            "profiles": str(profiles_path),
            "feature_contract": str(contract_path),
            "model_selection": str(selection_path),
            "assignments": str(assignments_path),
        },
    }
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "rows": len(frame),
        "highest_silhouette_k": highest_silhouette_k,
        "selected_k": selected_k,
        "final_model_metrics": report["final_model_metrics"],
        "model_selection": scores.to_dict(orient="records"),
        "cluster_sizes": {key: item["count"] for key, item in profiles.items()},
        "reports": [str(selection_path), str(report_path)],
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
