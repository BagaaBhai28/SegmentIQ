import json
from math import sqrt
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator

FIELDS = ("expenses", "savings", "loan_repayments", "investment", "other")
MODEL = json.loads(Path(__file__).with_name("sebi_budget_model.json").read_text(encoding="utf-8"))


class BudgetProfile(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    expenses: float = Field(ge=0, le=100)
    savings: float = Field(ge=0, le=100)
    loan_repayments: float = Field(ge=0, le=100)
    investment: float = Field(ge=0, le=100)
    other: float = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_total(self):
        # Five shares rounded independently to two decimals can sum to 99.98 or 100.02.
        if abs(sum(getattr(self, field) for field in FIELDS) - 100) > 0.020000000001:
            raise ValueError("Budget percentages must total 100% within 0.02 percentage points.")
        return self


def match_budget(profile: BudgetProfile) -> dict:
    shares = [getattr(profile, field) for field in FIELDS]
    total = sum(shares)
    transformed = [sqrt(share / total) for share in shares]

    def squared_distance(segment):
        return sum((value - center) ** 2 for value, center in zip(transformed, segment["center"], strict=True))

    closest = min(MODEL["segments"], key=squared_distance)
    return {key: value for key, value in closest.items() if key != "center"}
