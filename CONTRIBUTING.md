# Contributing to SegmentIQ

## Start here

1. Read the [project README](README.md) and [scope](docs/requirements.md).
2. Create the Python 3.13 virtual environment and install `ml/requirements.txt` as described in the README.
3. Generate the synthetic data and model artifacts before starting the API.
4. Keep changes within the relevant area: `backend/` for API behavior, `frontend/` for the browser UI, `ml/src/` for data/model logic, and `docs/` for project documentation.

## Keep the app and model in sync

The UI profile fields, `InvestorProfile` in `backend/main.py`, the model feature lists in `ml/src/train.py`, and `ml/examples/profile.json` form one interface. If a field changes, update all of them together. Regenerate the local data and artifacts using the documented pipeline so predictions use the new feature contract.

## Data and generated files

- Do not commit `.env` files, credentials, local virtual environments, generated models, processed row-level data, or the Vercel upload bundle.
- Do not add the personal-finance source CSV unless its provenance and redistribution license are verified and the project explicitly intends to publish it.
- Keep generated or engineered values clearly distinguished from observed data.
- Do not silently remove or repair rows; document and compare any data-quality decisions.
- Keep aggregate experiment reports free of row-level personal records.

## Documentation

Update the README, architecture, scope, or roadmap whenever the app’s user-facing behavior, API, data source, model contract, or deployment process changes. Keep claims proportional to the available evidence; generated scenarios are not empirical investor research.

## Before sharing a change

- Review `git diff` and `git status` to confirm generated and local-only files are not staged.
- Run the relevant local checks for changed application code and note their results in the change summary.
- For model changes, regenerate the model and review cluster-count metrics, cluster sizes, and interpretation caveats.
- For deployment changes, confirm the intended branch, Vercel project, and runtime configuration.
