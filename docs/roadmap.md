# Project roadmap

| Stage | Goal | Status | Notes |
|---|---|---|---|
| 1. Scope and setup | Define project scope and repository setup | Complete | College-project demo scope |
| 2. Dataset audit | Review the supplied CSV | Complete | Original CSV remains local; current demo uses a separate generated dataset |
| 3. ML pipeline | Generate data, compare K, train, and predict | Complete | Seeded 1,600-profile simulation; silhouette selected K=4; archetype field excluded from training |
| 4. Cluster interpretation | Summarize and name simulated groups | Complete | Names map to generated archetypes; not real investor personas |
| 5. Backend API | Provide health, segment, and prediction routes | Complete | FastAPI validates profile fields and returns cluster summaries |
| 6. Persistence and authentication | Store profiles and protect accounts | Deferred | This demo does not save submitted profiles, so accounts and a database are unnecessary for the current flow |
| 7. Frontend | Provide a usable profile form and results view | Complete | Responsive browser UI served by the API |
| 8. Integration | Connect UI, API, and model | Complete | Profile form calls the same trained pipeline |
| 9. Quality and security | Validate inputs and failure behavior | Complete for demo | Bounds, category values, allocation totals, and debt consistency are validated; API returns 422 for invalid profiles |
| 10. Deployment | Prepare a hosted deployment | Pending | Local run instructions are in the README |

The synthetic archetypes are useful for exercising the application. They do not establish that real investors form four naturally occurring groups. The real dataset can replace the simulation when one is selected and audited.
