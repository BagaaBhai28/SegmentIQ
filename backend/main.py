"""FastAPI service for synthetic investor segment exploration."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.sebi_budget import MODEL, BudgetProfile, match_budget
from ml.src.predict import DEFAULT_ARTIFACTS, predict_profile

PROFILE_PATH = DEFAULT_ARTIFACTS / "cluster_profiles.json"
FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"
app = FastAPI(
    title="SegmentIQ API",
    description="SEBI investor budget profiling and synthetic scenario exploration.",
    version="0.2.0",
)
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class InvestorProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    Age: int = Field(ge=18, le=100)
    City_Tier: Literal["Tier 1", "Tier 2", "Tier 3"]
    Employment_Type: Literal["Salaried", "Self-Employed", "Student", "Unemployed"]
    Monthly_Income_INR: float = Field(ge=0, le=10_000_000)
    Monthly_Expenses_INR: float = Field(ge=0, le=10_000_000)
    Savings_Percentage: float = Field(ge=0, le=100)
    Debt_Status: Literal["No Debt", "Home Loan", "Credit Card Debt", "Personal Loan"]
    Monthly_Debt_Payment_INR: float = Field(ge=0, le=10_000_000)
    Monthly_SIP: float = Field(ge=0, le=10_000_000)
    Equity_Allocation_Pct: float = Field(ge=0, le=100)
    FD_Allocation_Pct: float = Field(ge=0, le=100)
    Debt_Allocation_Pct: float = Field(ge=0, le=100)
    Investment_Experience_Years: float = Field(ge=0, le=82)
    Financial_Literacy_Score: int = Field(ge=1, le=10)
    Risk_Tolerance_Level: Literal["Low", "Medium", "High"]
    Primary_Financial_Goal: Literal[
        "Wealth Accumulation", "Retirement", "Tax Saving", "Home Purchase"
    ]

    @model_validator(mode="after")
    def validate_profile_consistency(self) -> "InvestorProfile":
        allocation_total = (
            self.Equity_Allocation_Pct + self.FD_Allocation_Pct + self.Debt_Allocation_Pct
        )
        if abs(allocation_total - 100) >= 0.000001:
            raise ValueError("Equity, FD, and debt allocations must total 100%.")
        if self.Investment_Experience_Years > self.Age - 18:
            raise ValueError("Investment experience cannot exceed years since age 18.")
        if self.Debt_Status == "No Debt" and self.Monthly_Debt_Payment_INR > 0:
            raise ValueError("Monthly debt payment must be zero when Debt_Status is No Debt.")
        return self


@app.get("/", include_in_schema=False)
def home() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    needed = [
        DEFAULT_ARTIFACTS / "investor_segment_pipeline.joblib",
        DEFAULT_ARTIFACTS / "pca_projection.joblib",
        PROFILE_PATH,
    ]
    if not all(path.is_file() for path in needed):
        raise HTTPException(status_code=503, detail="Model artifacts are missing; generate data and train first.")
    return {"status": "ready", "model_data": "synthetic"}


@app.get("/segments")
def segments() -> dict[str, Any]:
    if not PROFILE_PATH.is_file():
        raise HTTPException(status_code=503, detail="Model artifacts are missing; train the model first.")
    profiles = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    return {
        "segments": list(profiles.values()),
        "disclaimer": "Names summarize simulated archetypes; they are not validated real-world investor categories.",
    }


@app.post("/predict")
def predict(profile: InvestorProfile) -> dict[str, Any]:
    try:
        return predict_profile(profile.model_dump())
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail="Model artifacts are missing; train the model first.") from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

@app.get("/demo", include_in_schema=False)
def synthetic_demo() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


class SebiProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    budget: BudgetProfile
    holdings: list[Literal[
        "Funds / ETFs", "Stocks / shares", "Futures & options",
        "REITs / InvITs", "Corporate bonds", "AIF",
    ]] | None = Field(default=None, min_length=1, max_length=6, deprecated=True,
                      description="Legacy field. Matching uses the five budget shares.")


@app.post("/sebi/predict")
def predict_sebi(profile: SebiProfileRequest) -> dict[str, Any]:
    return {"model_version": MODEL["model_version"], "segment": match_budget(profile.budget)}

class InvestorReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile: InvestorProfile | None
    budget: BudgetProfile

    @model_validator(mode="after")
    def validate_shared_budget(self) -> "InvestorReportRequest":
        profile = self.profile
        if profile is None:
            return self
        income = profile.Monthly_Income_INR
        if income <= 0:
            raise ValueError("Monthly income must be positive for a combined report.")

        # Accept shares rounded to two decimal places.
        tolerance = 0.0050000001
        overlapping_shares = {
            "expenses": profile.Monthly_Expenses_INR / income * 100,
            "savings": profile.Savings_Percentage,
            "loan_repayments": profile.Monthly_Debt_Payment_INR / income * 100,
        }
        for category, expected in overlapping_shares.items():
            if abs(getattr(self.budget, category) - expected) > tolerance:
                raise ValueError(f"Budget share for {category.replace('_', ' ')} must match the investor profile.")
        if profile.Monthly_SIP / income * 100 > self.budget.investment + tolerance:
            raise ValueError("The investment budget must include the monthly SIP.")
        return self


@app.post("/report")
def investor_report(request: InvestorReportRequest) -> dict[str, Any]:
    return {
        "investor_cluster": predict(request.profile) if request.profile is not None else None,
        "sebi_budget": {
            "model_version": MODEL["model_version"],
            "segment": match_budget(request.budget),
        },
    }
