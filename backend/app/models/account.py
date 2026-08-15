from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    account_type = Column(String, nullable=False)  # BANK, CREDIT_CARD, WALLET, OTHER
    last_four = Column(String(4), nullable=False)
    institution_name = Column(String, nullable=False)  # HDFC, SBI, ICICI, etc.
    ownership_type = Column(String, default="MY_ACCOUNT")  # MY_ACCOUNT, FAMILY_ACCOUNT, OTHER
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")

    __table_args__ = (
        UniqueConstraint("user_id", "institution_name", "last_four", name="uq_user_account"),
    )
