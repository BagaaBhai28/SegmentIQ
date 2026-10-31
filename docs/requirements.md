# Requirements and project scope

## Current purpose

Provide an academic demonstration of how an unsupervised clustering pipeline can transform a validated financial profile into an exploratory group match and descriptive summary.

## Current capabilities

- Reproducibly generate a clearly labeled synthetic investor-profile dataset.
- Compare candidate cluster counts and seed stability using a documented preprocessing contract.
- Accept and validate a profile through a FastAPI API and browser form.
- Return the cluster assignment and descriptive reference statistics without saving the submitted profile.
- Show clear caveats that the result is synthetic and not a validated investor assessment.
- Deploy the application to Vercel from the GitHub repository.

## Out of scope

- Investor suitability, personalized investment recommendations, or financial advice.
- Claims that the generated groups describe real investors.
- Market prediction, portfolio optimization, or live market data.
- User accounts, profile history, or persistence in a database.
- Redistribution of the source CSV without verified provenance and licensing.

## Data and evaluation requirements for future changes

- Record provenance, license, collection method, and whether every field is observed, derived, or simulated.
- Keep any raw source file unchanged and out of Git unless its license explicitly permits publication.
- Document cleaning rules and compare their effects rather than silently changing records.
- Choose features and cluster count from repeatable evaluation, stability, cluster sizes, and domain usefulness; do not target a preferred K by adding random fields.
- Keep training and inference feature names, order, encoders, and model artifacts in one shared contract.
- Reinterpret cluster names whenever the model or source data changes; cluster IDs are arbitrary.
- Preserve a no-persistence default until data retention and privacy needs have been designed.
