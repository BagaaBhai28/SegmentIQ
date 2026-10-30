# Dataset report

## Audit status

**Stage 2 complete.** This report was prepared from the supplied CSV using `ml/src/audit_dataset.py`. The audit preserves the source values; it does not clean or remove any rows. The raw file is kept locally under `ml/data/raw/` and is excluded from Git.

Dataset file: `Indian_Personal_Finance_Behavior_Dataset_2026.csv`  
Shape: 1,000 rows × 20 columns (one respondent ID, six numeric fields, and 13 categorical/binary fields).  
Source URL and license: not supplied with the file. Verify these before redistribution. Based on the generated-looking distributions and the prior project context, this project will treat the file as synthetic for the prototype unless its provenance is established.

## Field inventory

### Numeric fields

| Field | Min | Median | Max | Notes |
|---|---:|---:|---:|---|
| `Age` | 21 | 41 | 59 | Years |
| `Monthly_Income_INR` | 15,203 | 108,439.5 | 199,844 | INR/month |
| `Monthly_Expenses_INR` | 10,060 | 81,921.5 | 149,993 | INR/month |
| `Savings_Percentage` | 5 | 26.5 | 49 | Percentage points |
| `Monthly_Debt_Payment_INR` | 5 | 23,117 | 49,979 | INR/month |
| `Financial_Literacy_Score` | 1 | 5 | 10 | Score |

The numeric fields are nearly symmetric (skew between approximately -0.084 and +0.121) and pairwise correlations are very small (absolute values below 0.05). This is consistent with independent synthetic generation, but is not proof of the source process.

### Categorical and binary fields

`Gender`, `City_Tier`, `Employment_Type`, `Investment_Type`, `Has_Health_Insurance`, `Has_Life_Insurance`, `Has_Emergency_Fund`, `Debt_Status`, `Uses_Financial_Apps`, `Primary_Financial_Goal`, `Risk_Tolerance_Level`, `Savings_Channel`, and `Region`.

`Respondent_ID` ranges from 1 to 1,000 and is unique. There are no duplicate IDs or duplicate rows.

## Missing values and consistency checks

The raw file has no blank cells. `Investment_Type` has 155 literal `None` values; pandas' default CSV settings parse that string as missing, so the audit reads the file with `keep_default_na=False`. The project must decide whether `None` means “no investment reported” or “unknown” before encoding this field.

The audit found:

- 345 records where monthly expenses exceed monthly income while savings percentage is positive.
- 252 records labeled `Debt_Status == "No Debt"` with a positive monthly debt payment.

These are review flags, not automatic deletion or correction instructions. The raw data remains unchanged. Any handling must be justified, documented, and compared with a run that retains the original values.

## Fit for the project

The dataset does not contain `Monthly_SIP`, asset-allocation percentages, or `Investment_Experience_Years`. Those fields must not be generated and then described as observed facts. If a future UI needs example values, keep them explicitly simulated and outside the trained feature set.

The available columns can support an educational pipeline exercise, but the weak correlations, uniform-looking distributions, and consistency flags make strong claims about real investor segments inappropriate without verified provenance and better data.

## Initial modeling contract proposal

- Exclude `Respondent_ID` because it is an identifier, not a behavioral feature.
- Start with the six observed numeric columns only. Apply a fitted scaler inside a reproducible pipeline.
- Keep `Risk_Tolerance_Level`, `Investment_Type`, `Debt_Status`, and protection/behavior fields for post-cluster description and external checks in the first baseline.
- Do not drop or rewrite inconsistent records by default. Compare a documented cleaning sensitivity run only after the baseline is measured.
- Evaluate multiple cluster counts, multiple metrics, cluster sizes, and seed stability. If separation remains weak, report that honestly rather than forcing personas.

This is a provisional training baseline. The API and frontend input contract must match the final evaluated pipeline exactly.

## Reproduce the audit

From the repository root, run:

```powershell
python ml/src/audit_dataset.py
```

This writes `ml/reports/dataset_audit.json`. The raw CSV is intentionally not committed; place the licensed source file at the documented raw-data path before rerunning.
