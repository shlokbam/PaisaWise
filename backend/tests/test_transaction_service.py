import sys
import os
from decimal import Decimal
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction, TransactionLink
from app.models.notification import Notification
from app.schemas.transaction import MobileTransactionCreate
from app.services.transaction_service import process_incoming_transaction

def test_process_transaction_duplicate_and_refund():
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(email="shlok@paisawise.com").first()
        assert user is not None
        
        # 1. Test Ingestion and Account Auto-creation
        payload1 = MobileTransactionCreate(
            amount=Decimal("150.00"),
            direction="DEBIT",
            payment_method="UPI",
            merchant_name="Zomato Lunch",
            account_last4="9876",
            bank_name="ICICI",
            raw_message_hash="hash_zomato_test_150",
            timestamp=datetime.utcnow()
        )
        
        tx1 = process_incoming_transaction(db, user.id, payload1)
        assert tx1 is not None
        assert tx1.amount == Decimal("150.00")
        assert tx1.account_id is not None
        
        # Verify account was created
        acct = db.query(Account).filter_by(id=tx1.account_id).first()
        assert acct is not None
        assert acct.last_four == "9876"
        assert acct.institution_name == "ICICI"
        
        # 2. Test Idempotency (Duplicate checks)
        tx2 = process_incoming_transaction(db, user.id, payload1)
        assert tx2.id == tx1.id
        
        # 3. Test Refund Linking
        # First ingest a debit
        payload_debit = MobileTransactionCreate(
            amount=Decimal("999.00"),
            direction="DEBIT",
            payment_method="CARD",
            merchant_name="Amazon Product",
            account_last4="9876",
            bank_name="ICICI",
            raw_message_hash="hash_amazon_test_999",
            timestamp=datetime.utcnow() - timedelta(days=2)
        )
        tx_debit = process_incoming_transaction(db, user.id, payload_debit)
        
        # Ingest credit representing refund
        payload_credit = MobileTransactionCreate(
            amount=Decimal("999.00"),
            direction="CREDIT",
            payment_method="CARD",
            merchant_name="Amazon Refund",
            account_last4="9876",
            bank_name="ICICI",
            raw_message_hash="hash_amazon_test_refund_999",
            timestamp=datetime.utcnow()
        )
        tx_credit = process_incoming_transaction(db, user.id, payload_credit)
        
        assert tx_credit.transaction_type == "REFUND"
        assert tx_credit.include_in_personal_expenses is False
        
        # Check transaction link
        link = db.query(TransactionLink).filter_by(target_transaction_id=tx_credit.id).first()
        assert link is not None
        assert link.source_transaction_id == tx_debit.id
        assert link.link_type == "REFUND"
        
        # 4. Test Notification Trigger on Low Confidence
        payload_low = MobileTransactionCreate(
            amount=Decimal("4999.00"),
            direction="DEBIT",
            payment_method="UPI",
            merchant_name="Unidentified Vendor Co",
            account_last4="9876",
            bank_name="ICICI",
            raw_message_hash="hash_low_conf_test_4999",
            timestamp=datetime.utcnow()
        )
        tx_low = process_incoming_transaction(db, user.id, payload_low)
        assert tx_low.confidence < Decimal("0.90")
        
        # Verify notification was generated
        notif = db.query(Notification).filter_by(transaction_id=tx_low.id).first()
        assert notif is not None
        assert notif.notification_type == "NEEDS_REVIEW"
        
        # Clean up
        db.delete(link)
        db.delete(tx_credit)
        db.delete(tx_debit)
        db.delete(tx_low)
        db.delete(tx1)
        db.delete(acct)
        db.delete(notif)
        db.commit()
    finally:
        db.close()
