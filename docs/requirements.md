# Requirements and scope

## Purpose

Build an academic demonstration that groups financial profiles using unsupervised learning and explains the resulting groups with transparent descriptive summaries.

## Core requirements

- Accept a documented and validated financial profile.
- Apply exactly the preprocessing and feature order used during model training.
- Return a cluster assignment and descriptive, non-advisory explanation.
- Show how the profile compares with the reference cluster statistics.
- Provide visual summaries once the inference contract is stable.

## Later requirements

- User registration, login, profile history, and persistent storage.
- Responsive React application and dashboard.
- Deployment and academic report, diagrams, and viva material.

## Out of scope for the first version

- Personalized portfolio recommendations.
- Market prediction or real-time market data.
- Claims that clusters establish an individual's true risk tolerance.

## Data and evaluation requirements

- Record dataset provenance, license, and whether observations are synthetic.
- Separate observed fields from simulated or engineered fields.
- Keep raw source data unchanged and document every cleaning decision.
- Select features and cluster count based on reproducible evaluation, not inherited hard-coded choices.
- Report cluster sizes, multiple metrics, stability, and known limitations.
- Keep training and inference feature schemas identical.
