from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Rule(Base):
    __tablename__ = "rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    merchant_pattern = Column(String, nullable=True)
    upi_pattern = Column(String, nullable=True)
    payment_method = Column(String(50), nullable=True)
    amount_min = Column(Numeric(12, 2), nullable=True)
    amount_max = Column(Numeric(12, 2), nullable=True)
    
    # Actions
    set_ownership = Column(String(20), nullable=False) # PERSONAL, FAMILY, BUSINESS, UNKNOWN
    set_transaction_type = Column(String(30), nullable=False) # EXPENSE, INCOME, TRANSFER, INVESTMENT, REFUND, etc.
    set_category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    set_subcategory_id = Column(UUID(as_uuid=True), ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=True)
    set_include_in_personal_expenses = Column(Boolean, nullable=False, default=False)
    
    priority = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="rules")
    set_category = relationship("Category")
    set_subcategory = relationship("Subcategory")
