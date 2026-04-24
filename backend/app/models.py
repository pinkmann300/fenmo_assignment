from decimal import Decimal, ROUND_HALF_UP
from pydantic import BaseModel, field_validator
from datetime import date as DateType
from typing import Optional


class ExpenseCreate(BaseModel):
    amount: Decimal
    category: str
    description: Optional[str] = ""
    date: DateType

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("amount must be greater than zero")
        # Round to 2 decimal places
        return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @field_validator("category")
    @classmethod
    def category_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("category cannot be empty")
        return v

    @field_validator("description", mode="before")
    @classmethod
    def strip_description(cls, v: Optional[str]) -> str:
        return (v or "").strip()


class ExpenseResponse(BaseModel):
    id: str
    amount: Decimal
    category: str
    description: str
    date: str
    created_at: str

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    expenses: list[ExpenseResponse]
    total: Decimal
    count: int
