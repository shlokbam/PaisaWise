from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class AccountBase(BaseModel):
    name: str
    account_type: str  # BANK, CREDIT_CARD, WALLET, OTHER
    last_four: str
    institution_name: str
    ownership_type: str = "MY_ACCOUNT"  # MY_ACCOUNT, FAMILY_ACCOUNT, OTHER

class AccountCreate(AccountBase):
    pass

class AccountOut(AccountBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
