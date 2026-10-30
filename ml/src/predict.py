"""Assign one financial profile using the saved SegmentIQ model pipeline."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

DEFAULT_ARTIFACTS = Path("ml/artifacts")


def predict_profile(profile: dict[str, Any], artifacts_dir: Path = DEFAULT_ARTIFACTS) -> dict[str, Any]:
    contract = json.loads((artifacts_dir / "feature_contract.json").read_text(encoding="utf-8"))
    features = contract["features"]
    missing = [name for name in features if name not in profile]
    if missing:
        raise ValueError(f"Profile is missing required features: {missing}")
    try:
        row = pd.DataFrame([{name: float(profile[name]) for name in features}], columns=features)
    except (TypeError, ValueError) as error:
        raise ValueError("All model features must be numeric") from error
    values = row.to_numpy(dtype=float)
    if not np.isfinite(values).all():
        raise ValueError("Model features must be finite numbers")

    pipeline = joblib.load(artifacts_dir / "investor_segment_pipeline.joblib")
    pca = joblib.load(artifacts_dir / "pca_projection.joblib")
    profiles = json.loads((artifacts_dir / "cluster_profiles.json").read_text(encoding="utf-8"))
    cluster_id = int(pipeline.predict(row)[0])
    scaled = pipeline.named_steps["scaler"].transform(row)
    centers = pipeline.named_steps["kmeans"].cluster_centers_
    distance = float(np.linalg.norm(centers[cluster_id] - scaled[0]))
    projection = pca.transform(scaled)[0]
    return {
        "cluster_id": cluster_id,
        "cluster_label": profiles[str(cluster_id)]["label"],
        "distance_to_centroid": distance,
        "distance_interpretation": "Standardized-space distance; it is not a probability or confidence score.",
        "pca_coordinates": {"x": float(projection[0]), "y": float(projection[1])},
        "model_contract_version": contract["contract_version"],
        "disclaimer": "Exploratory segment assignment on a synthetic-like dataset; not financial advice or a validated risk assessment.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="JSON file containing the six required numeric fields")
    parser.add_argument("--artifacts-dir", type=Path, default=DEFAULT_ARTIFACTS)
    args = parser.parse_args()
    profile = json.loads(args.input.read_text(encoding="utf-8"))
    result = predict_profile(profile, args.artifacts_dir)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
