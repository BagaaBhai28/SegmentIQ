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

from ml.src.predict import DEFAULT_ARTIFACTS, predict_profile

PROFILE_PATH = DEFAULT_ARTIFACTS / "cluster_profiles.json"
FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"
app = FastAPI(
    title="SegmentIQ API",
    description="Exploratory segmentation using a synthetic investor dataset.",
    version="0.2.0",
)
app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    # Figma Make previews run on figma.com; published Make apps use figma.site.
    allow_origin_regex=r"^https://([a-z0-9-]+\.)?figma\.com$|^https://[a-z0-9-]+\.figma\.site$",
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
        if abs(allocation_total - 100) > 0.5:
            raise ValueError("Equity, FD, and debt allocations must total 100% (within 0.5%).")
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

