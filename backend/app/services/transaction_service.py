from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.transaction import Transaction, TransactionLink
from app.models.account import Account
from app.models.merchant import Merchant
from app.models.category import Category, Subcategory
from app.models.notification import Notification
from app.schemas.transaction import MobileTransactionCreate, TransactionCreate
from app.rules.rule_engine import evaluate_rules
from typing import Optional, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, timedelta, date

def resolve_account(db: Session, user_id: str, last_four: str, institution_name: str) -> Account:
    """Finds or creates a user account based on institution name and last 4 digits."""
    acct = (
        db.query(Account)
        .filter(
            Account.user_id == user_id,
            Account.last_four == last_four,
            Account.institution_name.ilike(institution_name)
        )
        .first()
    )
    
    if not acct:
        # Create a default account
        acct = Account(
            user_id=user_id,
            name=f"{institution_name} A/C xx{last_four}",
            account_type="BANK",
            last_four=last_four,
            institution_name=institution_name,
            ownership_type="MY_ACCOUNT"
        )
        db.add(acct)
        db.commit()
        db.refresh(acct)
        
    return acct

def check_duplicate(db: Session, user_id: str, message_hash: str) -> Optional[Transaction]:
    """Checks if a transaction from the same SMS hash already exists."""
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id, Transaction.source_message_hash == message_hash)
        .first()
    )

def detect_refund_and_link(db: Session, credit_tx: Transaction) -> bool:
    """
    Looks for a matching debit transaction of the same amount in the past 7 days.
    If found, marks credit_tx as REFUND and creates a link.
    """
    if credit_tx.direction != "CREDIT":
        return False
        
    # Search for an expense with same amount in last 7 days
    start_date = credit_tx.transaction_date - timedelta(days=7)
    debit_tx = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == credit_tx.user_id,
            Transaction.amount == credit_tx.amount,
            Transaction.direction == "DEBIT",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= credit_tx.transaction_date
        )
        .order_by(Transaction.transaction_date.desc())
        .first()
    )
    
    if debit_tx:
        credit_tx.transaction_type = "REFUND"
        credit_tx.ownership = "PERSONAL"
        credit_tx.include_in_personal_expenses = False
        credit_tx.confidence = 0.90
        
        # Link them
        link = TransactionLink(
            source_transaction_id=debit_tx.id,
            target_transaction_id=credit_tx.id,
            link_type="REFUND"
        )
        db.add(link)
        return True
        
    return False

def apply_heuristics(db: Session, tx: Transaction) -> float:
    """
    Applies heuristic rules (direction, keywords, transfer detection) to classify transaction.
    Returns confidence score.
    """
    desc = (tx.description or "").lower()
    
    # 1. Transfer detection (e.g. self transfers SBI to HDFC)
    if "transfer to" in desc or "self transfer" in desc or "transfer from" in desc:
        tx.transaction_type = "TRANSFER"
        tx.ownership = "PERSONAL"
        tx.include_in_personal_expenses = False
        return 0.95
        
    # 2. Investment detection (SIP, IPO, Mutual Funds)
    if any(kw in desc for kw in ["sip", "ipo", "mutual fund", "mutualfund", "nse", "bse", "zerodha", "groww"]):
        tx.transaction_type = "INVESTMENT"
        tx.ownership = "PERSONAL"
        tx.include_in_personal_expenses = False
        # Set category to INVESTMENT if it exists
        inv_cat = db.query(Category).filter_by(code="INVESTMENT").first()
        if inv_cat:
            tx.category_id = inv_cat.id
        return 0.95

    # 3. Income heuristic
    if tx.direction == "CREDIT":
        if any(kw in desc for kw in ["salary", "internship", "stipend"]):
            tx.transaction_type = "INCOME"
            tx.ownership = "PERSONAL"
            tx.include_in_personal_expenses = False
            return 0.95
        elif "refund" in desc:
            tx.transaction_type = "REFUND"
            tx.ownership = "PERSONAL"
            tx.include_in_personal_expenses = False
            return 0.90
        else:
            # Credit by default is NOT personal income without review
            tx.transaction_type = "OTHER"
            tx.ownership = "UNKNOWN"
            tx.include_in_personal_expenses = False
            return 0.60
            
    # 4. Debit defaults
    if tx.direction == "DEBIT":
        # Check default merchants
        if tx.merchant_name:
            merch = db.query(Merchant).filter(Merchant.name.ilike(tx.merchant_name)).first()
            if merch:
                tx.merchant_id = merch.id
                tx.category_id = merch.default_category_id
                tx.subcategory_id = merch.default_subcategory_id
                tx.ownership = "PERSONAL"
                tx.transaction_type = "EXPENSE"
                tx.include_in_personal_expenses = True
                return 0.95
                
            # Lookup previous classifications by same merchant name
            prev_tx = (
                db.query(Transaction)
                .filter(
                    Transaction.user_id == tx.user_id,
                    Transaction.merchant_name.ilike(tx.merchant_name),
                    Transaction.confidence >= 0.90
                )
                .order_by(Transaction.created_at.desc())
                .first()
            )
            if prev_tx:
                tx.ownership = prev_tx.ownership
                tx.transaction_type = prev_tx.transaction_type
                tx.category_id = prev_tx.category_id
                tx.subcategory_id = prev_tx.subcategory_id
                tx.include_in_personal_expenses = prev_tx.include_in_personal_expenses
                return 0.92
                
        # Basic defaults for debit expenses
        tx.transaction_type = "EXPENSE"
        tx.ownership = "PERSONAL"
        tx.include_in_personal_expenses = True
        
        # Check subcategory matching keywords
        food_cat = db.query(Category).filter_by(code="FOOD").first()
        trans_cat = db.query(Category).filter_by(code="TRANSPORT").first()
        if food_cat and any(kw in desc for kw in ["chai", "tea", "zomato", "swiggy", "eats", "restaurant"]):
            tx.category_id = food_cat.id
            return 0.85
        elif trans_cat and any(kw in desc for kw in ["uber", "ola", "metro", "cab", "auto"]):
            tx.category_id = trans_cat.id
            return 0.85

    return 0.50

def process_incoming_transaction(db: Session, user_id: str, payload: MobileTransactionCreate) -> Transaction:
    """
    Main processing pipeline for incoming financial transactions (mobile SMS ingestion).
    Applies the Hybrid Intelligence Pipeline:
    1. Duplicate check (idempotency key)
    2. Account resolution
    3. Rules evaluation
    4. Heuristics check
    5. Refund matching
    6. Triggers manual review if confidence is low.
    """
    # 1. Idempotency Check
    existing = check_duplicate(db, user_id, payload.raw_message_hash)
    if existing:
        return existing
        
    # 2. Resolve Account
    acct = None
    if payload.account_last4 and payload.bank_name:
        acct = resolve_account(db, user_id, payload.account_last4, payload.bank_name)
        
    # 3. Create initial Transaction object
    tx = Transaction(
        user_id=user_id,
        account_id=acct.id if acct else None,
        amount=payload.amount,
        currency=payload.currency,
        direction=payload.direction,
        transaction_date=payload.timestamp.date(),
        transaction_time=payload.timestamp.time(),
        merchant_name=payload.merchant_name,
        upi_id=payload.upi_id,
        sender=payload.sender,
        receiver=payload.receiver,
        payment_method=payload.payment_method,
        description=payload.description,
        ownership="UNKNOWN",
        transaction_type="EXPENSE",
        confidence=Decimal("0.50"),
        include_in_personal_expenses=False,
        source="SMS",
        source_message_hash=payload.raw_message_hash
    )
    
    # Save first to establish IDs
    db.add(tx)
    db.flush()
    
    # 4. Step A: Evaluate User Rules (Overrides everything, confidence 1.0)
    rule_matched, matched_rule = evaluate_rules(db, tx)
    
    if not rule_matched:
        # Step B: Apply Refund Linking
        refund_linked = detect_refund_and_link(db, tx)
        
        if not refund_linked:
            # Step C: Heuristics & Merchant Recognition
            confidence = apply_heuristics(db, tx)
            tx.confidence = Decimal(f"{confidence:.2f}")
            
    # Finalize logic
    # Set inclusion rule
    if tx.ownership == "PERSONAL" and tx.transaction_type == "EXPENSE" and tx.confidence >= 0.90:
        tx.include_in_personal_expenses = True
    else:
        # If confidence is low or ownership is family/business, do not automatically include
        if tx.confidence < 0.90:
            tx.include_in_personal_expenses = False
            
    db.commit()
    db.refresh(tx)
    
    # If confidence is low (< 0.90) and it's not resolved, trigger user notification
    if tx.confidence < 0.90:
        notif = Notification(
            user_id=user_id,
            transaction_id=tx.id,
            title="Needs Review",
            message=f"New transaction of ₹{tx.amount} to {tx.merchant_name or tx.sender or 'Unknown'} requires review.",
            status="PENDING",
            notification_type="NEEDS_REVIEW"
        )
        db.add(notif)
        db.commit()
        
    return tx
