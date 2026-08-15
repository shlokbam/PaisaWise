from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date, time
from typing import Optional, List
from decimal import Decimal
from app.schemas.category import CategoryOut, SubcategoryOut
from app.schemas.account import AccountOut

class TransactionBase(BaseModel):
    amount: Decimal
    currency: str = "INR"
    direction: str # DEBIT, CREDIT
    transaction_date: date
    transaction_time: Optional[time] = None
    merchant_name: Optional[str] = None
    upi_id: Optional[str] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    payment_method: str # UPI, CARD, NETBANKING, CASH, OTHER
    description: Optional[str] = None
    ownership: str = "UNKNOWN" # PERSONAL, FAMILY, BUSINESS, UNKNOWN
    transaction_type: str = "EXPENSE" # EXPENSE, INCOME, TRANSFER, INVESTMENT, REFUND, etc.
    include_in_personal_expenses: bool = False

class TransactionCreate(TransactionBase):
    account_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None

class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = None
    direction: Optional[str] = None
    transaction_date: Optional[date] = None
    transaction_time: Optional[time] = None
    merchant_name: Optional[str] = None
    upi_id: Optional[str] = None
    payment_method: Optional[str] = None
    description: Optional[str] = None
    ownership: Optional[str] = None
    transaction_type: Optional[str] = None
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
    include_in_personal_expenses: Optional[bool] = None

class TransactionFeedback(BaseModel):
    ownership: Optional[str] = None
    transaction_type: Optional[str] = None
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
    include_in_personal_expenses: Optional[bool] = None

class TransactionOut(TransactionBase):
    id: UUID
    user_id: UUID
    account_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
    confidence: Decimal
    source: str
    source_message_hash: Optional[str] = None
    is_duplicate: bool
    created_at: datetime
    updated_at: datetime
    
    # Nested info
    account: Optional[AccountOut] = None
    category: Optional[CategoryOut] = None
    subcategory: Optional[SubcategoryOut] = None

    class Config:
        from_attributes = True

class MobileTransactionCreate(BaseModel):
    amount: Decimal
    currency: str = "INR"
    direction: str  # DEBIT, CREDIT
    payment_method: str  # UPI, CARD, NETBANKING, CASH, OTHER
    merchant_name: Optional[str] = None
    upi_id: Optional[str] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    account_last4: Optional[str] = None
    bank_name: Optional[str] = None
    raw_message_hash: str
    timestamp: datetime
    description: Optional[str] = None
