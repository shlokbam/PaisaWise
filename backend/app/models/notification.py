from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    status = Column(String(20), default="PENDING") # PENDING, READ, DISMISSED
    notification_type = Column(String(50), nullable=False) # NEEDS_REVIEW, BUDG_WARN, RECURRING_ALERT
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")
    transaction = relationship("Transaction")
