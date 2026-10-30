# Notebook audit: shared Colab experiment

Notebook: `Untitled1.ipynb`, shared via Colab. This audit is based on the live notebook cells and saved outputs visible through the shared link on 2026-10-31. The source CSV and generated artifacts were not present in the repository, so the numeric outputs have not been reproduced locally.

## What the notebook does

1. Reads `Indian_Personal_Finance_Behavior_Dataset_2026.csv` from the notebook's working directory.
2. Adds `Investment_Experience_Years = max(0, Age - 22)`.
3. Generates `Monthly_SIP` as monthly income × savings percentage × a seeded random factor between 0.2 and 0.6.
4. Generates equity and FD allocations from risk-tolerance-specific random ranges, then assigns the remainder to debt.
5. Saves `ml/data/processed/investors_enriched_2026.csv`.
6. Trains a StandardScaler + K-Means pipeline on 11 columns, initially hardcoding `K=4`, and exports the scaler, model, PCA, and cluster means.
7. Creates descriptive personas for the four clusters and writes a segmented CSV.
8. Includes a later remediation cell that removes expense-greater-than-income rows, sets debt payment to zero for `No Debt`, sweeps `K=2..8`, retrains, and overwrites the model artifacts.

## Claims shown in notebook outputs

For the initial `K=4` run, the notebook reports silhouette `0.1297`, Davies–Bouldin `1.9381`, and Calinski–Harabasz `138.2727`. Its persona sizes are 272, 177, 277, and 274 respondents (27.2%, 17.7%, 27.7%, 27.4%).

For the later cleaned run, it reports reducing the data from 1,000 to 655 rows. Its sweep reports:

| K | Silhouette | Davies–Bouldin | Calinski–Harabasz |
|---:|---:|---:|---:|
| 2 | 0.1361 | 2.3989 | 107.4149 |
| 3 | 0.1237 | 2.1024 | 96.1258 |
| 4 | 0.1301 | 1.9166 | 90.5510 |
| 5 | 0.1263 | 1.8981 | 81.5522 |
| 6 | 0.1225 | 1.8474 | 76.4671 |
| 7 | 0.1207 | 1.9275 | 71.2065 |
| 8 | 0.1178 | 1.8796 | 66.7133 |

The cell selects `K=2` solely because it has the highest silhouette in this sweep. All reported silhouette scores are low, so this does not establish strongly separated or useful segments.

## Issues to resolve before using this as the production pipeline

- **Engineered-feature leakage:** investment experience is almost a direct copy of age; SIP is a formula using income and savings; allocation values are generated from risk tolerance. Including these features means the model partly clusters project assumptions and duplicated inputs rather than independently observed investor behavior.
- **Arbitrary cleaning policy:** dropping every row where expenses exceed income removes 345 of 1,000 records. This may be a dataset-generation contradiction, but deletion is a modeling decision that needs justification and sensitivity analysis. Setting debt payment to zero for `No Debt` also assumes `Debt_Status` is authoritative even though fields are described as independently generated.
- **Conflicting pipeline state:** the remediation cell overwrites the scaler and K-Means artifacts with a two-cluster model, while the Stage 4 cell still loads the full, uncleaned 1,000-row enriched data and maps cluster IDs 0–3 to four personas. Re-running Stage 4 after remediation assigns the 1,000 rows to the new two-cluster model but retains the old four-persona mapping. The notebook must keep data cleaning, model version, feature contract, cluster profiles, and interpretation in one consistent flow.
- **Stale persona output:** the four personas were written for the original `K=4` run and should not be reused for `K=2` without recomputing profiles and carefully reinterpreting clusters.
- **Weak model selection evidence:** the silhouette advantage for K=2 is small (0.1361 vs 0.1301 for K=4); other metrics prefer different K values. Use multiple criteria and seed stability, and be willing to conclude that the data does not support meaningful clusters.
- **Export path typo:** the cleaned CSV path ends with a trailing space: `investors_cleaned_segmented.csv `. This can create an unintended filename and break downstream code.
- **Inference contract missing:** exported artifacts do not include a versioned feature schema or a single preprocessing/model pipeline. Backend code could accidentally supply columns in a different order or use cleaning rules different from training.
- **Reproducibility gap:** `np.random.seed(42)` makes the generated columns dependent on row order. The generation formulas and their synthetic status need to be explicit; model metrics and profiles should be reproducible from a checked-in script and documented dataset provenance.

## Recommended next step

Do not treat either notebook model as final yet. First obtain and verify the source dataset and its provenance, then decide whether SegmentIQ will be a transparent synthetic demonstration or use empirically observed financial features. Build one reproducible training script with a versioned feature contract and a single pipeline; evaluate the resulting clusters and produce matching profiles before connecting them to FastAPI.
