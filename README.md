# SegmentIQ

SegmentIQ is an educational investor profiling app. Enter a profile and a monthly budget to get a simulated investor group and a comparison with household budgets from the SEBI Investor Survey 2025.

**[Try SegmentIQ live](https://segmentiq-khaki.vercel.app/)** · [Read the project guide](docs/project-guide.md) · [Explore the API](https://segmentiq-khaki.vercel.app/docs)

![SegmentIQ sample profile with a live monthly budget chart showing 100% allocation](docs/images/budget-form.png)

## Try a report

1. Select **Use example** to explore the report, or enter your own details.
2. Allocate your monthly take-home income across regular expenses, savings, loan repayments, investments, and other expenses. The live chart updates as you enter amounts. For the investor profile, equity, fixed deposits, and debt assets must total 100%.
3. Select **Generate my report**. If you select **No current portfolio**, the form asks only for budget details and returns the budget comparison.

The example returns **Growth-accumulator** as the simulated investor match and **Near-zero loan repayments** as the survey budget comparison. The [annotated walkthrough](docs/project-guide.md#read-the-report) explains what each part of the report means.

## What the results represent

| Result | Reference data | How to read it |
|---|---|---|
| Simulated investor match | 1,600 reproducibly generated profiles | The closest of four simulated groups, with descriptive averages and common characteristics. |
| Monthly budget comparison | 17,824 eligible investor-sample interviews from the SEBI Investor Survey 2025 | The closest of three survey budget groups. Reference averages come from 1,800 held-out interviews. |

The synthetic model uses 11 numeric and five categorical features. It selected four clusters from K=2 through K=8 across five seeds, with mean silhouette **0.3061** and mean seed stability **ARI 1.0000**. The generator allocates expenses, borrowing repayments, investing, and savings as separate uses of income.

The SEBI model compares five budget shares after a square-root transform. The published survey describes these budgets at the household level. Applicability to people without a portfolio has not been established. The app provides descriptive comparisons for exploration. Investment suitability and performance require additional information. [SEBI Investor Survey 2025](https://www.sebi.gov.in/reports-and-statistics/research/jan-2026/investor-survey-2025-_99170.html)

## Run locally

Install Python 3.13 and run these commands from the repository root on Windows.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv\Scripts\python.exe -m ml.src.generate_synthetic_dataset
.\.venv\Scripts\python.exe -m ml.src.train
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Open [the local app](http://127.0.0.1:8000/) or [the local API docs](http://127.0.0.1:8000/docs). FastAPI serves the HTML, CSS, and JavaScript directly. The app requires no frontend build, database, or API key.

## API

| Method | Path | Returns |
|---|---|---|
| GET | `/health` | Synthetic model artifact readiness |
| GET | `/segments` | Descriptive summaries of the simulated groups |
| POST | `/report` | Both results for `{profile, budget}`, or a budget result when `profile` is `null` |
| POST | `/predict` | A simulated group and its descriptive summary |
| POST | `/sebi/predict` | A survey budget comparison for `{budget}` |

The budget object contains percentage shares named `expenses`, `savings`, `loan_repayments`, `investment`, and `other`. For a combined report, shared values in the budget and profile must agree, and the investment share must cover the monthly SIP. Invalid requests return HTTP 422.

To try the combined report on the local server using the same sample as the browser:

```powershell
$profile = Get-Content ml/examples/profile.json -Raw | ConvertFrom-Json
$budget = @{ expenses = 53.125; savings = 20; loan_repayments = 0; investment = 18.75; other = 8.125 }
$body = @{ profile = $profile; budget = $budget } | ConvertTo-Json -Depth 4
Invoke-RestMethod http://127.0.0.1:8000/report -Method Post -ContentType 'application/json' -Body $body
```

## Repository guide

| Path | Contents |
|---|---|
| [`frontend/`](frontend/) | Form, live budget chart, and report |
| [`backend/`](backend/) | FastAPI routes, validation, and aggregate SEBI model |
| [`ml/`](ml/) | Synthetic data generator, training, inference, and example input |
| [`docs/`](docs/) | Project guide, architecture, scope, roadmap, and historical research |
| [`pyproject.toml`](pyproject.toml) and [`vercel.json`](vercel.json) | Vercel build and runtime settings |

Vercel builds from GitHub `main` and regenerates the synthetic artifacts. Git tracks the aggregate SEBI model and workbook hash. The original workbook, input CSVs, generated datasets, and local artifacts stay outside version control.

[Architecture](docs/architecture.md) · [Scope](docs/requirements.md) · [Roadmap](docs/roadmap.md) · [Contributing](CONTRIBUTING.md)
