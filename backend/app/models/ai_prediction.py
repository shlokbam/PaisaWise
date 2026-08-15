from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.core.database import Base

class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    prompt_payload = Column(Text, nullable=False)
    response_payload = Column(Text, nullable=False)
    predicted_ownership = Column(String(20), nullable=True)
    predicted_type = Column(String(30), nullable=True)
    predicted_category_code = Column(String(50), nullable=True)
    confidence = Column(Numeric(3, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    transaction = relationship("Transaction", back_populates="predictions")
