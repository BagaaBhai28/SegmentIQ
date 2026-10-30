"""Assign one synthetic investor profile using the saved SegmentIQ model."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ARTIFACTS = ROOT / "ml/artifacts"


def predict_profile(profile: dict[str, Any], artifacts_dir: Path = DEFAULT_ARTIFACTS) -> dict[str, Any]:
    contract = json.loads((artifacts_dir / "feature_contract.json").read_text(encoding="utf-8"))
    numeric = contract["numeric_features"]
    categorical = contract["categorical_features"]
    required = numeric + categorical
    missing = [name for name in required if name not in profile]
    if missing:
        raise ValueError(f"Profile is missing required fields: {missing}")

    row: dict[str, Any] = {}
    for field in numeric:
        try:
            value = float(profile[field])
        except (TypeError, ValueError) as error:
            raise ValueError(f"{field} must be numeric") from error
        if not np.isfinite(value):
            raise ValueError(f"{field} must be finite")
        row[field] = value
    for field in categorical:
        value = str(profile[field])
        allowed = contract["categorical_values"][field]
        if value not in allowed:
            raise ValueError(f"{field} must be one of: {', '.join(allowed)}")
        row[field] = value

    fitted = joblib.load(artifacts_dir / "investor_segment_pipeline.joblib")
    transformed = fitted["preprocessor"].transform(pd.DataFrame([row], columns=required))
    cluster_id = int(fitted["model"].predict(transformed)[0])
    centroid = fitted["model"].cluster_centers_[cluster_id]
    distance = float(np.linalg.norm(centroid - transformed[0]))
    pca = joblib.load(artifacts_dir / "pca_projection.joblib")
    projection = pca.transform(transformed)[0]
    profiles = json.loads((artifacts_dir / "cluster_profiles.json").read_text(encoding="utf-8"))
    cluster = profiles[str(cluster_id)]
    return {
        "cluster_id": cluster_id,
        "segment_name": cluster["display_name"],
        "distance_to_centroid": distance,
        "distance_note": "Distance in standardized feature space; it is not a probability or confidence score.",
        "pca_coordinates": {"x": float(projection[0]), "y": float(projection[1])},
        "cluster_profile": cluster,
        "disclaimer": "This is an exploratory assignment using synthetic scenario data, not a validated investor assessment or financial advice.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="JSON file with all model profile fields")
    parser.add_argument("--artifacts-dir", type=Path, default=DEFAULT_ARTIFACTS)
    args = parser.parse_args()
    profile = json.loads(args.input.read_text(encoding="utf-8"))
    print(json.dumps(predict_profile(profile, args.artifacts_dir), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
