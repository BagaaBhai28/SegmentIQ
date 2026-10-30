"""Generate a reproducible, archetype-based synthetic investor dataset."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "ml/data/processed/synthetic_archetype_dataset.csv"
SEED = 20261031
ROWS = 1600
ARCHETYPES = [
    "Capital-preserving",
    "Balanced-goal-based",
    "Growth-accumulator",
    "Liquidity-first",
]


def generate_dataset(rows: int = ROWS, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    groups = rng.integers(0, 4, rows)
    age_means = [53, 40, 30, 24]
    income_medians = [85_000, 125_000, 185_000, 52_000]
    expense_means = [.58, .63, .52, .76]
    sip_rates = [.07, .13, .23, .045]
    allocation_means = [(.12, .66, .22), (.46, .28, .26), (.78, .07, .15), (.24, .53, .23)]
    experience_means = [18, 9, 6, 2]
    literacy_means = [5.2, 6.8, 8.0, 4.4]
    records: list[dict[str, object]] = []

    for group in groups:
        group = int(group)
        age = int(np.clip(rng.normal(age_means[group], [5, 5, 4, 2][group]), 21, 65))
        income = float(np.clip(rng.lognormal(np.log(income_medians[group]), .24), 20_000, 500_000))
        expense_rate = float(np.clip(rng.normal(expense_means[group], .045), .38, .90))
        expenses = round(income * expense_rate / 100) * 100
        savings = (income - expenses) / income * 100
        experience = int(np.clip(round(rng.normal(experience_means[group], [3, 2.5, 2, 1][group])), 0, age - 18))
        literacy = int(np.clip(round(rng.normal(literacy_means[group], .8)), 1, 10))
        sip = round(min(income * savings / 100 * .8, income * sip_rates[group] * rng.lognormal(0, .18)) / 100) * 100
        allocation = rng.dirichlet(np.asarray(allocation_means[group]) * 130) * 100

        debt_status = rng.choice(
            ["No Debt", "Home Loan", "Credit Card Debt", "Personal Loan"],
            p=[[.30, .50, .05, .15], [.45, .35, .07, .13], [.62, .22, .06, .10], [.50, .10, .15, .25]][group],
        )
        debt_payment = 0 if debt_status == "No Debt" else round(income * rng.uniform(.07, .17) / 100) * 100
        city = rng.choice(
            ["Tier 1", "Tier 2", "Tier 3"],
            p=[[.25, .45, .30], [.45, .38, .17], [.55, .32, .13], [.18, .34, .48]][group],
        )
        employment = rng.choice(
            ["Salaried", "Self-Employed", "Student", "Unemployed"],
            p=[[.52, .40, .01, .07], [.70, .25, .01, .04], [.75, .22, .02, .01], [.40, .18, .37, .05]][group],
        )
        goal = rng.choice(
            ["Wealth Accumulation", "Retirement", "Tax Saving", "Home Purchase"],
            p=[[.12, .70, .13, .05], [.30, .40, .16, .14], [.75, .08, .10, .07], [.20, .08, .07, .65]][group],
        )
        risk = rng.choice(
            ["Low", "Medium", "High"],
            p=[[.86, .13, .01], [.08, .82, .10], [.01, .19, .80], [.60, .36, .04]][group],
        )
        records.append({
            "Age": age,
            "City_Tier": city,
            "Employment_Type": employment,
            "Monthly_Income_INR": round(income / 100) * 100,
            "Monthly_Expenses_INR": expenses,
            "Savings_Percentage": round(savings, 1),
            "Debt_Status": debt_status,
            "Monthly_Debt_Payment_INR": debt_payment,
            "Monthly_SIP": sip,
            "Equity_Allocation_Pct": allocation[0],
            "FD_Allocation_Pct": allocation[1],
            "Debt_Allocation_Pct": allocation[2],
            "Investment_Experience_Years": experience,
            "Financial_Literacy_Score": literacy,
            "Risk_Tolerance_Level": risk,
            "Primary_Financial_Goal": goal,
            # Used only to check whether unsupervised clusters recover simulated groups.
            "Synthetic_Archetype": ARCHETYPES[group],
        })
    return pd.DataFrame.from_records(records)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    generate_dataset().to_csv(OUTPUT, index=False)
    print(f"Generated {ROWS} synthetic profiles: {OUTPUT}")


if __name__ == "__main__":
    main()
