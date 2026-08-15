from sqlalchemy import Column, String, DateTime, Numeric, Date, Time, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    external_transaction_id = Column(String, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR")
    direction = Column(String(10), nullable=False) # DEBIT, CREDIT
    transaction_date = Column(Date, nullable=False, index=True)
    transaction_time = Column(Time, nullable=True)
    merchant_id = Column(UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True)
    merchant_name = Column(String(150), nullable=True)
    upi_id = Column(String(150), nullable=True)
    sender = Column(String(150), nullable=True)
    receiver = Column(String(150), nullable=True)
    payment_method = Column(String(50), nullable=False) # UPI, CARD, NETBANKING, CASH, OTHER
    description = Column(String, nullable=True)
    
    # Classification columns
    ownership = Column(String(20), nullable=False, index=True) # PERSONAL, FAMILY, BUSINESS, UNKNOWN
    transaction_type = Column(String(30), nullable=False, index=True) # EXPENSE, INCOME, TRANSFER, INVESTMENT, REFUND, SETTLEMENT, CASH_WITHDRAWAL, CASH_DEPOSIT, OTHER
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=True)
    confidence = Column(Numeric(3, 2), nullable=False) # 0.00 to 1.00
    include_in_personal_expenses = Column(Boolean, nullable=False, default=False, index=True)
    
    source = Column(String(20), nullable=False) # SMS, MANUAL, STATEMENT, API
    source_message_hash = Column(String(64), nullable=True)
    is_duplicate = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    merchant = relationship("Merchant", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    subcategory = relationship("Subcategory", back_populates="transactions")
    
    predictions = relationship("AIPrediction", back_populates="transaction", cascade="all, delete-orphan")
    feedback = relationship("UserFeedback", back_populates="transaction", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user_id", "source_message_hash", name="uq_user_message_hash"),
    )

class TransactionLink(Base):
    __tablename__ = "transaction_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    target_transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    link_type = Column(String(30), nullable=False) # REFUND, TRANSFER_PAIR
    created_at = Column(DateTime, default=datetime.utcnow)
