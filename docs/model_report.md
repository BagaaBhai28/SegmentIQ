# Historical ML experiments on the supplied CSV

> **Historical research note:** The results below describe earlier experiments using the separately supplied CSV and derived features. They do **not** describe the currently deployed app model. The current app trains on generated scenario data using 11 numeric and 5 categorical features; see [the current ML workflow](../ml/README.md). The source CSV is not in this repository, so the figures below are recorded results and are not independently reproducible from a fresh checkout.

## Stage 3 result

An earlier source-CSV baseline experiment used the six numeric fields available in that file. It excluded `Respondent_ID`, performed no record deletion or value correction, scaled the inputs, evaluated K=2 through K=8 across five random seeds, and saved a scikit-learn pipeline plus feature contract. The current `ml/src/train.py` implements the separate synthetic demo pipeline described in `ml/README.md`.

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

## Synthetic investor-feature experiment

To answer whether adding more investor-style fields raises K, `ml/src/synthetic_feature_experiment.py` creates a separate derived CSV under ignored `ml/data/processed/`. It appends seeded random values for monthly investment amount, investment horizon, investing experience, risk profile, investment goal, preferred asset class, investment frequency, and liquidity need. The original CSV is not changed. These values are explicitly synthetic and must not be interpreted as reported investor behavior.

The experiment compares the original six numeric features with those six plus the eight synthetic fields. Numeric values are standardized and unordered categories are one-hot encoded. The sweep evaluates K=2 through K=8 across five seeds.

| Representation | Silhouette-maximizing K | Best silhouette | Davies–Bouldin-minimizing K | Seed ARI at silhouette-best K |
|---|---:|---:|---:|---:|
| Original six numeric | 8 | 0.1398 | 7 | 0.5116 |
| Original + synthetic investor fields | 2 | 0.0643 | 8 | 0.8882 |

So K does **not** consistently increase: by silhouette it falls from 8 to 2, while the Davies–Bouldin minimum shifts from 7 to 8. Metrics disagree, and the expanded feature set has much weaker silhouette values across the sweep. This shows that adding random fields can move a metric's preferred K without creating meaningful segments. The synthetic experiment is useful for demonstrating the pipeline only; it is not a basis for choosing real investor personas.

The derived dataset is `ml/data/processed/synthetic_investor_features.csv` (ignored by Git), and aggregate results are in `ml/reports/synthetic_feature_experiment.json`.

## Historical experiment commands

These commands document the earlier workflow. The source CSV is required for its audit and feature experiments; it is not committed. `ml/src/train.py` now trains the current synthetic demo model, not the six-field baseline summarized above.

```powershell
.\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv\Scripts\python.exe ml/src/audit_dataset.py
.\.venv\Scripts\python.exe ml/src/train.py
.\.venv\Scripts\python.exe ml/src/predict.py --input ml/examples/profile.json
.\.venv\Scripts\python.exe ml/src/synthetic_feature_experiment.py
```

Generated joblib models and row-level assignments are local and ignored by Git. Aggregate model-selection and training reports are kept in `ml/reports/`.

## Notes from the earlier experiment

- The earlier six-field experiment was intended to keep training and inference on one contract; those artifacts are not the deployed model.
- A local inference smoke check in the earlier workflow produced a cluster assignment and PCA coordinates from its sample profile.
- The numeric-vs-mixed feature comparison is saved in `ml/reports/feature_set_comparison.json` and is reproducible from `ml/src/compare_feature_sets.py`.
- The seeded synthetic feature experiment is reproducible with `ml/src/synthetic_feature_experiment.py`; its row-level output remains local and ignored.
- The experiment is not a validated financial assessment. Do not treat names or assignments from the supplied CSV experiments as validated investor personas.
