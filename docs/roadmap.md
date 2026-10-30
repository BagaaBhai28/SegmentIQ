# Project roadmap

Work proceeds one stage at a time. A stage is marked complete only after its listed deliverables are present and reviewed.

| Stage | Goal | Status | Exit condition |
|---|---|---|---|
| 1. Scope and setup | Define MVP, stack, repository structure, and handling rules | Complete | Requirements, architecture, and repo baseline documented |
| 2. Dataset audit | Inspect source, schema, quality, provenance, and feature fit | Complete | Reproducible audit script and dataset report available; raw source remains local/ignored |
| 3. ML pipeline | Train and evaluate a reproducible baseline on the agreed feature contract | In progress | Script/notebook, metrics, stability results, profiles, and model artifacts reproducible |
| 4. Cluster interpretation | Decide whether groups merit descriptive labels and build analytics outputs | Pending | Profiles and visualizations validated; limitations explicit |
| 5. Backend API | Serve validated profile inference through FastAPI | Pending | API contract matches the saved model pipeline |
| 6. Database and authentication | Persist user profiles/results and protect account access | Pending | Auth, ownership checks, migrations, and secrets handling implemented |
| 7. Frontend | Build responsive profile entry and results views | Pending | Core flow usable and accessible |
| 8. Integration | Connect frontend, API, database, and model inference | Pending | End-to-end flow works with consistent schemas and errors |
| 9. Quality and security | Verify data validation, authorization, privacy, and failure behavior | Pending | Verification evidence documented and issues addressed |
| 10. Deployment and academic docs | Prepare deployment configuration and project/viva material | Pending | Reproducible setup, deployment notes, diagrams, and limitations complete |

## Current decisions and blockers

- The supplied dataset is treated as synthetic for this prototype unless its source/license is confirmed.
- No generated SIP, allocation, or experience fields will be used as if they were observed.
- Dataset source URL/license is unknown. This does not block an explicitly synthetic educational prototype, but it must be resolved before redistribution or claims of empirical validity.
- The ML stage is now in progress using the six raw numeric fields as a baseline. Weak clustering is a possible valid outcome.
