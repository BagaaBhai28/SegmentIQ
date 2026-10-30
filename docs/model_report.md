# ML baseline report

## Stage 3 result

The reproducible baseline in `ml/src/train.py` uses the six numeric fields already present in the source CSV. It excludes `Respondent_ID`, performs no record deletion or value correction, scales the inputs, evaluates K=2 through K=8 across five random seeds, and saves one scikit-learn pipeline plus its feature contract.

The provisional baseline uses K=2 only as a diagnostic reference. Across five seeds it has mean ARI 0.991 and the highest Calinski–Harabasz score, while the highest mean silhouette belongs to K=8. The scores are weak and metrics disagree. K=2 is not asserted to be the objectively correct number of investor segments; increasing K would only create more groups, not establish more useful investor personas.

## Model-selection sweep

| K | Mean silhouette | Mean Davies–Bouldin | Mean Calinski–Harabasz | Mean seed ARI |
|---:|---:|---:|---:|---:|
| 2 | 0.1276 | 2.5350 | 148.2282 | 0.9912 |
| 3 | 0.1204 | 2.1767 | 134.6763 | 0.5500 |
| 4 | 0.1277 | 1.9735 | 128.6865 | 0.4943 |
| 5 | 0.1295 | 1.8170 | 122.4534 | 0.4206 |
| 6 | 0.1342 | 1.7037 | 119.3110 | 0.4313 |
| 7 | 0.1395 | 1.6094 | 116.2271 | 0.4744 |
| 8 | 0.1398 | 1.6174 | 111.8650 | 0.5116 |

The final K=2 model reports silhouette 0.1276, Davies–Bouldin 2.5352, and Calinski–Harabasz 148.2295. The first two PCA components explain 35.5% of variance, so a two-dimensional chart is only a partial view of the data.

## K=2 descriptive profile

| Field | Cluster 0 (484 rows, 48.4%) | Cluster 1 (516 rows, 51.6%) |
|---|---:|---:|
| Mean age | 30.2 | 50.1 |
| Mean monthly income | ₹106,483 | ₹111,731 |
| Mean monthly expenses | ₹84,680 | ₹75,747 |
| Mean savings percentage | 26.9% | 26.7% |
| Mean monthly debt payment | ₹22,172 | ₹25,777 |
| Mean literacy score | 5.53 | 5.50 |
| High risk-tolerance share | 20.9% | 21.3% |

The clearest distinction is age. Other numeric averages and the external risk-tolerance mix are close. Since age accounts for much of the separation and the data looks synthetic-like, these groups do not justify behavioral persona names. The application should display neutral cluster identifiers and explain the limits.

## Feature representation comparison

The follow-up experiment compared the six numeric fields against those same fields plus eight observed categories: investment type, debt status, insurance, emergency fund, app usage, financial goal, and savings channel. Categories were one-hot encoded; risk tolerance was held out for external comparison. Neither representation changed or removed rows.

| Representation | Best mean silhouette (K) | Davies–Bouldin at that K | Mean seed ARI |
|---|---:|---:|---:|
| Six numeric fields | 0.1398 (K=8) | 1.6174 | 0.5116 |
| Numeric + observed categories | 0.0678 (K=2) | 3.5973 | 0.9826 |

The mixed representation did not improve separation. Its stable K=2 assignment is not evidence of meaningful segments: silhouette and Davies–Bouldin are substantially worse. The current CSV therefore does not support an investor segmentation claim. Keep K as an evaluated choice, not a target to force; improving the source variables and data quality matters more than choosing K=4 or K=6.

## Recommended data change

SEBI has published the 2025 Investor Survey report and a separate respondent-data download. This is a stronger candidate source for the next modeling stage because it is specifically about Indian investor behavior. Before replacing the supplied CSV, inspect the downloaded files, data dictionary, sampling structure, missingness, licensing/usage terms, and whether investor and non-investor responses can be analyzed appropriately. Use the respondent data only after that audit; do not assume that the survey's variables or terms match this project's current schema. [SEBI Investor Survey 2025 materials](https://www.sebi.gov.in/reports-and-statistics/research/jan-2026/investor-survey-2025-_99170.html)

As a complementary source, MoSPI's NSS 77th-round Debt and Investment survey offers household-level asset and debt information, but is broader household finance rather than securities-investor behavior. [MoSPI/NSSO study metadata](https://microdata.gov.in/NADA/index.php/catalog/156/study-description)

## Reproducible commands

From the repository root, after placing the source CSV in the ignored raw-data location:

```powershell
.\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv\Scripts\python.exe ml/src/audit_dataset.py
.\.venv\Scripts\python.exe ml/src/train.py
.\.venv\Scripts\python.exe ml/src/predict.py --input ml/examples/profile.json
```

Generated joblib models and row-level assignments are local and ignored by Git. Aggregate model-selection and training reports are kept in `ml/reports/`.

## Stage 3 exit notes

- Training, model selection, cluster profiles, PCA projection, model artifacts, and inference use the same six-field contract.
- A local inference smoke check produced a cluster assignment and PCA coordinates from the sample profile.
- The numeric-vs-mixed feature comparison is saved in `ml/reports/feature_set_comparison.json` and is reproducible from `ml/src/compare_feature_sets.py`.
- The result is an educational demonstration, not a validated financial assessment. Do not name personas from this CSV. Stage 4 should start after choosing and auditing the empirical SEBI respondent file or explicitly retaining a demo-only scope.
