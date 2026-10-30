# Architecture (planned)

## Components

- `ml/`: dataset inspection, feature preparation, model evaluation, and reusable inference pipeline.
- `backend/`: FastAPI endpoints, request validation, model loading, and later persistence/authentication.
- `frontend/`: React profile input, results, comparisons, and visualizations.
- `docs/`: requirements, architecture, and data/model audit records.

## Data flow

1. A profile is validated against the versioned feature contract.
2. The backend applies the persisted preprocessing pipeline and predicts a cluster.
3. The backend returns the cluster identifier, descriptive label, and reference statistics.
4. The frontend presents the result with a clear explanation of limitations.
5. Persistence and account history are added only after privacy and access-control requirements are designed.

## Model boundary

Training and inference must share one versioned preprocessing and feature contract. Prefer saving one scikit-learn `Pipeline` with Joblib rather than separately managing inconsistent transformations. PCA may support visual exploration, but should not silently alter inference behavior unless that is explicitly part of the contract.

## Planned directories

```text
backend/app/{api,core,database,models,schemas,services}/
frontend/
ml/{data/raw,data/processed,notebooks,src,artifacts,reports}/
docs/
```

Raw data, private profiles, secrets, and generated model artifacts are ignored by default. Add only files whose provenance, license, and sharing status are understood.
