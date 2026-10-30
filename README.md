# SegmentIQ

SegmentIQ is a college project exploring investor segmentation from financial and behavioral profile data. The intended product is a web application that assigns a profile to a segment discovered by an unsupervised model, then presents a descriptive summary and comparisons with the reference segments.

> Segment labels are descriptive interpretations of clusters. They are not validated measures of risk tolerance and are not investment recommendations.

## Current progress

Stages 1–3 are complete for a demo baseline: requirements/setup, dataset audit, and a reproducible ML pipeline with numeric-vs-mixed feature comparison. The current data does not support real-world investor personas. See the [staged roadmap](docs/roadmap.md) and [model report](docs/model_report.md).

The supplied dataset has no source URL or license bundled with it and appears synthetic-like. This project treats it as an educational prototype dataset; its results do not support claims about real-world Indian investors.

The raw CSV is kept locally at `ml/data/raw/Indian_Personal_Finance_Behavior_Dataset_2026.csv` and is excluded from Git. Generated model artifacts and row-level predictions are also local and ignored. Aggregate reports and reproducible source scripts are committed.

## Planned stack

- ML and data: Python, pandas, NumPy, scikit-learn, Joblib
- API (planned): FastAPI
- Web (planned): React, Tailwind CSS, Recharts
- Persistence and authentication (planned): PostgreSQL, SQLAlchemy, bcrypt, JWT

## Intended stages

1. Confirm requirements, repository structure, and development setup.
2. Inspect and document the dataset, its provenance, quality, and usable features.
3. Build and evaluate a reproducible clustering pipeline.
4. Interpret clusters and produce defensible summaries and visualizations.
5. Add a FastAPI inference API.
6. Add persistence and authentication after the ML contract stabilizes.
7. Build the React interface and dashboard.
8. Integrate the application, then review behavior, security, and data handling.
9. Prepare deployment and academic documentation.

## Repository layout

```text
frontend/       React application (planned)
backend/        FastAPI application (planned)
ml/
  data/raw/     Local source CSV; excluded from Git
  data/processed/ Local generated row-level outputs; excluded from Git
  notebooks/    Exploratory notebooks
  src/          Dataset audit, model training, and inference code
  artifacts/    Locally generated model artifacts; excluded from Git
  reports/      Aggregate audit and training reports
  examples/     Non-personal sample inference input
docs/           Scope, architecture, roadmap, and audit reports
```

## Data and model integrity

The source CSV does not contain Monthly SIP, asset-allocation, or investment-experience columns. The baseline therefore uses only six observed numeric fields and does not synthesize missing fields as if they were observed behavior.

The audit found internal consistency flags in the raw source. The baseline preserves these records and values rather than silently cleaning them. See the [dataset report](docs/dataset_report.md) and [notebook audit](docs/notebook-audit.md).

Model-selection metrics are weak; K=2 is diagnostic only and outputs neutral cluster IDs, not investor personas. A mixed-feature experiment performed worse. SEBI's 2025 Investor Survey respondent data is identified as a candidate for a separate empirical-data audit before further segmentation claims. See the [ML baseline report](docs/model_report.md).

## Local setup

Use Python 3.13 or newer. From PowerShell at the repository root:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv\Scripts\python.exe ml/src/audit_dataset.py
.\.venv\Scripts\python.exe ml/src/train.py
.\.venv\Scripts\python.exe ml/src/predict.py --input ml/examples/profile.json
```

Place the source CSV at `ml/data/raw/Indian_Personal_Finance_Behavior_Dataset_2026.csv` before running the audit or training scripts.

Never commit passwords, JWT secrets, database credentials, or private user profiles. Review source-data provenance and license before redistribution. See `.env.example` for configuration placeholders.
