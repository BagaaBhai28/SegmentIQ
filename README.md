# SegmentIQ

SegmentIQ is an interactive demonstration of investor-profile clustering. It currently runs on a reproducible, generated dataset of 1,600 profiles with four simulated archetypes. The archetype label is excluded from model features; it is used only to check how closely the unsupervised clusters recover the generated groups.

This is a synthetic demo. Its four groups are not evidence that real investors naturally form these segments, and results are not financial advice or a validated risk assessment. The original supplied CSV remains local but is not used by this demo.

## Run locally

From PowerShell at the repository root:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv\Scripts\python.exe ml/src/generate_synthetic_dataset.py
.\.venv\Scripts\python.exe ml/src/train.py
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Open `http://127.0.0.1:8000` for the profile explorer or `http://127.0.0.1:8000/docs` for the API. The interface does not save submitted profiles.

The generated dataset, trained model artifacts, and row-level cluster assignments are kept under ignored paths in `ml/data/processed/` and `ml/artifacts/`. Run the generator and training commands after cloning the repository.

## Profile fields

The form uses age, city tier, employment, income, expenses, savings rate, debt status and payment, monthly SIP, equity/FD/debt allocations, investing experience, financial literacy, risk tolerance, and primary goal. Allocations must total 100%; debt payment must be zero for the no-debt selection.
