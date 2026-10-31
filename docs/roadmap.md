# Project roadmap

| Stage | Goal | Status | Notes |
|---|---|---|---|
| 1. Scope and repository | Define the demo and organize the codebase | Complete | Current structure and setup are documented in the README. |
| 2. Dataset review | Audit the supplied personal-finance CSV | Complete for review | The file remains local, its provenance/license are unverified, and it is not used by the deployed app. |
| 3. Reproducible ML demo | Generate data, evaluate cluster counts, train and infer | Complete | The app uses a seeded, 1,600-profile synthetic scenario dataset and excludes its archetype label from model features. |
| 4. API and UI | Validate profiles and present simulated cluster summaries | Complete | FastAPI serves a plain HTML/CSS/JavaScript explorer; profiles are not persisted. |
| 5. Deployment | Publish the app and connect Git-based deployments | Complete | Vercel builds from `main`; deployment steps are tied to the root Python configuration. |
| 6. Empirical data readiness | Establish data provenance and evaluate an appropriate real dataset | Deferred | Resume when a suitable, licensed dataset is selected. Do not assume the current CSV represents real investors. |
| 7. Model validation | Assess usefulness on verified observations with domain review | Future | Revisit feature selection, cluster count, stability, interpretation, and fairness after stage 6. |
| 8. Product expansion | Consider persistence, accounts, or additional views | Deferred | Requires a clear user need plus privacy, access-control, and data-retention design. |

The current four-group UI is a synthetic demonstration. It must not be presented as evidence that real investors naturally form four segments.
