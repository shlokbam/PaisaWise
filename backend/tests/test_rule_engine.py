import sys
import os
from decimal import Decimal
from datetime import date, datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.rule import Rule
from app.models.transaction import Transaction
from app.rules.rule_engine import evaluate_rules

def test_rule_evaluation():
    db = SessionLocal()
    try:
        # Get demo user
        user = db.query(User).filter_by(email="shlok@paisawise.com").first()
        assert user is not None
        
        # Create a test rule
        test_rule = Rule(
            user_id=user.id,
            name="Test Rule for Spotify",
            merchant_pattern="SPOTIFY",
            set_ownership="PERSONAL",
            set_transaction_type="EXPENSE",
            set_include_in_personal_expenses=True,
            priority=100
        )
        db.add(test_rule)
        db.commit()
        
        # Test transaction
        tx = Transaction(
            user_id=user.id,
            amount=Decimal("119.00"),
            direction="DEBIT",
            transaction_date=date.today(),
            merchant_name="SPOTIFY PREMIUM",
            payment_method="CARD",
            ownership="UNKNOWN",
            transaction_type="EXPENSE",
            confidence=Decimal("0.5"),
            include_in_personal_expenses=False,
            source="SMS"
        )
        
        matched, rule = evaluate_rules(db, tx)
        
        assert matched is True
        assert rule.id == test_rule.id
        assert tx.ownership == "PERSONAL"
        assert tx.include_in_personal_expenses is True
        assert tx.confidence == Decimal("1.00")
        
        # Clean up
        db.delete(test_rule)
        db.commit()
    finally:
        db.close()
