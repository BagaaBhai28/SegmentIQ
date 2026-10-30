# Dataset audit notes

These notes capture claims made in the shared Gemini project conversation. The underlying CSV and notebook were not available in the share page for independent verification. Treat all counts and statistics below as reported, not independently confirmed.

## Dataset described in the conversation

- File name: `Indian_Personal_Finance_Behavior_Dataset_2026.csv`
- Reported size: 1,000 rows and 20 columns (including an ID)
- Reported missing values: 155 in `Investment_Type`; the conversation says the literal value `None` may have been parsed as missing by pandas.
- Reported duplicates: none
- Reported numerical fields: `Age`, `Monthly_Income_INR`, `Monthly_Expenses_INR`, `Savings_Percentage`, `Monthly_Debt_Payment_INR`, and `Financial_Literacy_Score`
- The proposed PPT fields `Monthly_SIP`, portfolio allocation percentages, and investment experience were not present in the described raw CSV.

## Reported quality concerns

The conversation describes the numeric columns as independently generated from uniform distributions, with near-zero pairwise correlations. It also reports:

- 345 records where expenses exceed income while savings percentage is positive.
- 252 records marked `Debt_Status == "No Debt"` with a positive debt payment.

These conditions should be checked against the actual data before deciding whether to correct, exclude, retain, or otherwise model the records. Do not silently alter them.

## Synthetic feature concern

The conversation later chose to derive SIP, asset allocation, and investment experience from savings, risk tolerance, and age. It then reports that these engineered fields were used in a four-cluster K-Means model. Because the generated fields are functions of rules chosen by the project, clustering on them risks reproducing those rules rather than discovering independent behavioral structure.

If retained for a demonstration, label these fields as simulated, document the generation formulas and assumptions, and avoid claims of empirical or predictive validation. Prefer observed features for any conclusions about the dataset itself.

## Model claims requiring reproduction

The conversation reports `K=4`, silhouette score `0.1297`, Davies–Bouldin score `1.9381`, and four named cluster personas. These claims need to be reproduced from the actual notebook/data and evaluated on the final documented feature set. The choice of `K` should not be accepted solely because it was hardcoded or used in an earlier iteration.

Standardization puts features on comparable scales; it does not by itself establish that clusters are meaningful or well separated. Report multiple appropriate metrics, stability checks, cluster sizes, and the limitations of synthetic data.

## Next audit steps

1. Add the source dataset and notebook locally in an appropriate ignored data location.
2. Verify dataset origin, license, schema, parsing of literal `None`, row counts, and duplicates.
3. Recompute missingness, ranges, distributions, correlations, and the reported contradictions.
4. Record explicit data-cleaning decisions and preserve an auditable raw copy locally.
5. Decide whether the initial model uses observed fields only or includes clearly simulated fields.
6. Freeze one feature contract shared by training and later inference.
7. Re-run model selection and validation on that contract before publishing cluster labels or metrics.
