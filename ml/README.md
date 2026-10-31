# Machine-learning workflow

This directory contains the synthetic-data and unsupervised-learning workflow used by the SegmentIQ demo. Begin with the [repository README](../README.md) for full-stack setup.

## Reproduce the model

Run these commands from the repository root after installing `ml/requirements.txt`:

```powershell
python ml/src/generate_synthetic_dataset.py
python ml/src/train.py
python ml/src/predict.py --input ml/examples/profile.json
```

The generator uses a fixed seed and creates 1,600 profiles across four simulated scenarios. The trainer uses 11 numeric fields and 5 categorical fields, scales/encodes them, evaluates K=2 through K=8 using five seeds, and chooses the candidate with the highest mean silhouette score (seed stability breaks ties). It then fits the inference model, creates descriptive summaries, and writes a versioned feature contract. The synthetic scenario label is excluded from the feature matrix.

## Outputs

These paths are local/generated and ignored by Git:

- `ml/data/processed/synthetic_archetype_dataset.csv`: generated training data.
- `ml/data/processed/investor_segments.csv`: row assignments and PCA coordinates.
- `ml/artifacts/investor_segment_pipeline.joblib`: fitted preprocessor and K-Means model.
- `ml/artifacts/pca_projection.joblib`: projection used for exploratory coordinates.
- `ml/artifacts/cluster_profiles.json`: numeric summaries and category shares for each cluster.
- `ml/artifacts/feature_contract.json`: model feature names, allowed categories, selected K, and data-kind declaration.
- `ml/reports/`: checked-in aggregate experiment summaries; do not place row-level personal records here.

`ml/src/audit_dataset.py` audits a separately supplied CSV; it does not feed the current app’s generator or model. Keep the raw file under the ignored `ml/data/raw/` path. Verify source, license, parsing, and data quality before using it in a future model.

## Interpretation guardrails

- Synthetic archetype names describe the generator’s assumptions, not observed market personas.
- K-Means cluster IDs can change between model versions and have no inherent ordering.
- Silhouette and stability are diagnostics; they do not prove business usefulness or empirical validity.
- PCA coordinates are a lossy two-dimensional view of the transformed features.
- Centroid distance is not a probability, model confidence, or risk score.
- Do not add random columns to make the selected K larger.

When changing fields, update the generator, model contract, API schema, frontend form, example profile, and tests together. Regenerate local artifacts after changing the model.
