"""
ml-service/app/schemas.py
Pydantic schemas with strong validation for 11 model features and batch/payload inference.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
import math


class SinglePredictionInput(BaseModel):
    data_per_month_gb: float = Field(..., ge=0, description="Monthly data allowance in GB")
    sms_per_month: float = Field(..., ge=0, description="Monthly SMS allowance")
    monthly_equivalent_inr: float = Field(..., ge=0, description="Effective monthly price in INR")
    duration_months: float = Field(..., ge=0, description="Plan duration in months")
    discount_percent: float = Field(..., ge=0, description="Discount percentage")
    data_coverage_ratio: float = Field(..., ge=0, description="Ratio of provided data to needed data")
    sms_coverage_ratio: float = Field(..., ge=0, description="Ratio of provided SMS to needed SMS")
    data_waste_ratio: float = Field(..., ge=0, description="Ratio of unused data to provided data")
    sms_waste_ratio: float = Field(..., ge=0, description="Ratio of unused SMS to provided SMS")
    price_to_budget_ratio: float = Field(..., ge=0, description="Ratio of monthly price to customer budget")
    duration_match: float = Field(..., ge=0, le=1.0, description="1.0 if matches preferred duration, else 0.0 or 0.5")

    @field_validator("*", mode="before")
    def check_finite(cls, v):
        if isinstance(v, (int, float)):
            if math.isnan(v) or math.isinf(v):
                raise ValueError("Values must be finite numbers.")
        return v


class CustomerPayload(BaseModel):
    customerId: Optional[str] = None
    monthlyBudget: Optional[float] = 500.0
    minimumData: Optional[float] = 10.0
    minimumCallMinutes: Optional[float] = 500.0
    minimumSms: Optional[float] = 100.0
    preferredDuration: Optional[str] = "28"
    requires5G: Optional[bool] = False
    preferredOperator: Optional[str] = ""
    currentSpending: Optional[float] = 500.0


class UsagePayload(BaseModel):
    dataUsage: Optional[float] = 0.0
    callMinutes: Optional[float] = 0.0
    smsCount: Optional[float] = 0.0
    numberOfCalls: Optional[int] = 0
    averageCallDuration: Optional[float] = 0.0
    currentSpending: Optional[float] = None


class PlanPayload(BaseModel):
    planId: Any
    planCode: Optional[str] = None
    name: str
    operator: Optional[str] = ""
    price: float
    monthlyEquivalent: Optional[float] = None
    durationMonths: Optional[int] = 1
    discountPercent: Optional[float] = 0.0
    discountInr: Optional[float] = 0.0
    dataLimit: Optional[float] = None
    callMinutes: Optional[float] = None
    smsLimit: Optional[float] = None
    fiveG: Optional[bool] = False
    validity: Optional[int] = 28


class RecommendationRequestPayload(BaseModel):
    customer: Optional[CustomerPayload] = Field(default_factory=CustomerPayload)
    usage: Optional[UsagePayload] = Field(default_factory=UsagePayload)
    plans: List[PlanPayload] = Field(default_factory=list)
