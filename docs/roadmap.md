# Project roadmap

Work proceeds one stage at a time. A stage is marked complete only after its listed deliverables are present and reviewed.

| Stage | Goal | Status | Exit condition |
|---|---|---|---|
| 1. Scope and setup | Define MVP, stack, repository structure, and handling rules | Complete | Requirements, architecture, and repo baseline documented |
| 2. Dataset audit | Inspect source, schema, quality, provenance, and feature fit | Complete | Reproducible audit script and dataset report available; raw source remains local/ignored |
| 3. ML pipeline | Compare valid feature representations and evaluate a reproducible baseline | Complete (demo baseline) | Feature choice, metrics, stability, profiles, and inference contract reviewed; limits documented |
| 4. Cluster interpretation | Decide whether groups merit descriptive labels and build analytics outputs | Pending | Profiles and visualizations validated; limitations explicit |
| 5. Backend API | Serve validated profile inference through FastAPI | Pending | API contract matches the saved model pipeline |
| 6. Database and authentication | Persist user profiles/results and protect account access | Pending | Auth, ownership checks, migrations, and secrets handling implemented |
| 7. Frontend | Build responsive profile entry and results views | Pending | Core flow usable and accessible |
| 8. Integration | Connect frontend, API, database, and model inference | Pending | End-to-end flow works with consistent schemas and errors |
| 9. Quality and security | Verify data validation, authorization, privacy, and failure behavior | Pending | Verification evidence documented and issues addressed |
| 10. Deployment and academic docs | Prepare deployment configuration and project/viva material | Pending | Reproducible setup, deployment notes, diagrams, and limitations complete |

## Current decisions and blockers

- The supplied dataset is treated as a synthetic-like prototype source; it does not support real-world investor claims.
- No generated SIP, allocation, or experience fields will be used as if they were observed.
- Dataset source URL/license is unknown. This does not block an explicitly synthetic educational prototype, but it must be resolved before redistribution or claims of empirical validity.
- The six-numeric-field K=2 result is a diagnostic baseline, not the final segmentation. A mixed financial/behavioral experiment performed worse; see `docs/model_report.md`.
- SEBI published a 2025 Investor Survey report and respondent-data download. Audit its fields, sampling, missing data, and terms before deciding whether it replaces the supplied CSV for empirical segmentation.
