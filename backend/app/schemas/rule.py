from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from decimal import Decimal
from datetime import datetime
from app.schemas.category import CategoryOut, SubcategoryOut

class RuleBase(BaseModel):
    name: str
    merchant_pattern: Optional[str] = None
    upi_pattern: Optional[str] = None
    payment_method: Optional[str] = None
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    set_ownership: str # PERSONAL, FAMILY, BUSINESS, UNKNOWN
    set_transaction_type: str # EXPENSE, INCOME, TRANSFER, etc.
    set_category_id: Optional[UUID] = None
    set_subcategory_id: Optional[UUID] = None
    set_include_in_personal_expenses: bool = False
    priority: int = 1
    is_active: bool = True

class RuleCreate(RuleBase):
    pass

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    merchant_pattern: Optional[str] = None
    upi_pattern: Optional[str] = None
    payment_method: Optional[str] = None
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    set_ownership: Optional[str] = None
    set_transaction_type: Optional[str] = None
    set_category_id: Optional[UUID] = None
    set_subcategory_id: Optional[UUID] = None
    set_include_in_personal_expenses: Optional[bool] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None

class RuleOut(RuleBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Optional nested details
    set_category: Optional[CategoryOut] = None
    set_subcategory: Optional[SubcategoryOut] = None

    class Config:
        from_attributes = True
