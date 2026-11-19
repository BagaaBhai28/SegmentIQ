# Project roadmap

| Stage | Goal | Status | Notes |
|---|---|---|---|
| 1. Scope and repository | Define the demo and organize the codebase | Complete | Current structure and setup are documented in the README. |
| 2. Dataset review | Audit the supplied personal-finance CSV | Complete for review | The file remains local, its provenance/license are unverified, and it is not used by the deployed app. |
| 3. Reproducible ML demo | Generate data, evaluate cluster counts, train and infer | Complete | The app uses a seeded, 1,600-profile synthetic scenario dataset and excludes its archetype label from model features. |
| 4. API and UI | Validate profiles and budgets and present a combined report | Complete | The form supports full and budget-only reports. FastAPI processes submissions without storing profiles. |
| 5. Deployment | Publish the app and connect Git-based deployments | Complete | Vercel builds from `main`; deployment steps are tied to the root Python configuration. |
| 6. Survey budget comparison | Add an empirical reference for monthly budgets | Complete | The bundled comparison uses three budget groups from eligible SEBI Investor Survey 2025 interviews. The original workbook stays outside the repo. |
| 7. Model validation | Assess usefulness on verified observations with domain review | Future | Evaluate applicability to people without a portfolio and validate any proposed individual investor segmentation separately. |
| 8. Product expansion | Consider persistence, accounts, or additional views | Deferred | Requires a clear user need plus privacy, access-control, and data-retention design. |

The four simulated groups describe generated investor scenarios. The three survey groups describe household budget patterns in the eligible reference sample.
