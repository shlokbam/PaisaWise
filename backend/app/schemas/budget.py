from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from app.schemas.category import CategoryOut

class BudgetBase(BaseModel):
    category_id: Optional[UUID] = None  # NULL means overall total budget
    amount: Decimal
    period_start: date
    period_end: date

class BudgetCreate(BudgetBase):
    pass

class BudgetOut(BudgetBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    category: Optional[CategoryOut] = None

    class Config:
        from_attributes = True
class BudgetStatus(BaseModel):
    category_id: Optional[UUID] = None
    category_name: Optional[str] = "Overall"
    category_code: Optional[str] = "OVERALL"
    color: Optional[str] = "#4F46E5"
    limit: Decimal
    spent: Decimal
    remaining: Decimal
    percentage: float
