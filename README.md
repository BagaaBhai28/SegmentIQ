# SegmentIQ

SegmentIQ is a college project exploring investor segmentation from financial and behavioral profile data. The intended product is a web application that assigns a profile to a segment discovered by an unsupervised model, then presents a descriptive summary and comparisons with the reference segments.

> Segment labels are descriptive interpretations of clusters. They are not validated measures of risk tolerance and are not investment recommendations.

## Project status

This repository was initialized from the project brief shared in the Gemini conversation. The shared conversation reports prior notebook work and model results, but its notebook, dataset, and exported artifacts were not available for independent inspection when this repository was created. Treat those results as unverified until the source files are added and the pipeline is reproduced here.

Current focus: establish a reproducible data and ML baseline before building the API or UI.

## Planned stack

- ML and data: Python, pandas, NumPy, scikit-learn, Joblib
- API: FastAPI
- Web: React, Tailwind CSS, Recharts
- Persistence and authentication (later stage): PostgreSQL, SQLAlchemy, bcrypt, JWT

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
  data/         Local datasets; excluded from Git by default
  notebooks/    Exploratory notebooks
  src/          Reusable training and inference code
  artifacts/    Locally generated model artifacts; excluded from Git by default
  reports/      Generated analysis outputs
 docs/          Project requirements, architecture, and dataset audit notes
```

## Data and model integrity

The shared chat describes the supplied `Indian_Personal_Finance_Behavior_Dataset_2026.csv` as synthetic. It also describes engineered SIP, allocation, and investment-experience fields derived from existing columns. Such derived values must be clearly marked as simulated and can encode the rules used to generate them. They cannot independently validate real-world investor behavior.

Do not report model scores, cluster profiles, or artifacts as verified until they are reproduced from the actual source data and code. See [dataset audit notes](docs/dataset-audit-notes.md).

## Local setup

The ML environment and commands will be documented once the dataset and feature contract are available. Do not commit credentials, private user profiles, raw datasets, or generated model files. See `.env.example` for configuration placeholders.
