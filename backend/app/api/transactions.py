from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.feedback import UserFeedback
from app.models.rule import Rule
from app.models.merchant import Merchant
from app.models.notification import Notification
from app.schemas.transaction import TransactionOut, TransactionCreate, TransactionUpdate, TransactionFeedback
from app.ai.classifier import classify_transaction_with_ai
from typing import List, Optional
from decimal import Decimal

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("", response_model=List[TransactionOut])
def get_transactions(
    ownership: Optional[str] = None,
    type: Optional[str] = None,
    include: Optional[bool] = None,
    needs_review: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List and filter user transactions.
    Supports search (merchant name, upi id, description) and preset filters.
    """
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    
    if ownership:
        query = query.filter(Transaction.ownership == ownership.upper())
    if type:
        query = query.filter(Transaction.transaction_type == type.upper())
    if include is not None:
        query = query.filter(Transaction.include_in_personal_expenses == include)
    if needs_review is not None and needs_review:
        query = query.filter(Transaction.confidence < Decimal("0.90"))
        
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.merchant_name.ilike(search_filter),
                Transaction.upi_id.ilike(search_filter),
                Transaction.description.ilike(search_filter)
            )
        )
        
    # Sort by date desc, time desc
    query = query.order_by(desc(Transaction.transaction_date), desc(Transaction.transaction_time))
    
    # Paginate
    offset = (page - 1) * limit
    return query.offset(offset).limit(limit).all()

@router.get("/{id}", response_model=TransactionOut)
def get_transaction(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch a single transaction detail."""
    tx = db.query(Transaction).filter(Transaction.id == id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.post("", response_model=TransactionOut)
def create_transaction(
    tx_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually record a transaction."""
    tx = Transaction(
        user_id=current_user.id,
        account_id=tx_in.account_id,
        amount=tx_in.amount,
        currency=tx_in.currency,
        direction=tx_in.direction.upper(),
        transaction_date=tx_in.transaction_date,
        transaction_time=tx_in.transaction_time,
        merchant_name=tx_in.merchant_name,
        upi_id=tx_in.upi_id,
        sender=tx_in.sender,
        receiver=tx_in.receiver,
        payment_method=tx_in.payment_method.upper(),
        description=tx_in.description,
        ownership=tx_in.ownership.upper(),
        transaction_type=tx_in.transaction_type.upper(),
        category_id=tx_in.category_id,
        subcategory_id=tx_in.subcategory_id,
        confidence=Decimal("1.00"), # Manually entered = 100% confidence
        include_in_personal_expenses=tx_in.include_in_personal_expenses,
        source="MANUAL",
        is_duplicate=False
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx

@router.patch("/{id}", response_model=TransactionOut)
def update_transaction(
    id: str,
    tx_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually update/edit a transaction. Sets confidence to 1.0."""
    tx = db.query(Transaction).filter(Transaction.id == id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    update_data = tx_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tx, field, value)
        
    tx.confidence = Decimal("1.00") # Manually adjusted
    
    # Calculate include_in_personal_expenses automatically unless explicitly overridden
    if "include_in_personal_expenses" not in update_data:
        if tx.ownership == "PERSONAL" and tx.transaction_type == "EXPENSE":
            tx.include_in_personal_expenses = True
        else:
            tx.include_in_personal_expenses = False
            
    db.commit()
    db.refresh(tx)
    return tx

@router.post("/{id}/feedback")
def submit_feedback(
    id: str,
    feedback_in: TransactionFeedback,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits user correction/confirmation for AI classification.
    Learns from feedback and suggests rule generation if patterns recur.
    """
    tx = db.query(Transaction).filter(Transaction.id == id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Save correction logs
    feedback = db.query(UserFeedback).filter_by(transaction_id=tx.id).first()
    if not feedback:
        feedback = UserFeedback(user_id=current_user.id, transaction_id=tx.id)
        db.add(feedback)
        
    # Record corrections
    if feedback_in.ownership:
        feedback.corrected_ownership = feedback_in.ownership.upper()
        tx.ownership = feedback_in.ownership.upper()
    if feedback_in.transaction_type:
        feedback.corrected_type = feedback_in.transaction_type.upper()
        tx.transaction_type = feedback_in.transaction_type.upper()
    if feedback_in.category_id:
        feedback.corrected_category_id = feedback_in.category_id
        tx.category_id = feedback_in.category_id
    if feedback_in.subcategory_id:
        tx.subcategory_id = feedback_in.subcategory_id
    if feedback_in.include_in_personal_expenses is not None:
        feedback.corrected_include = feedback_in.include_in_personal_expenses
        tx.include_in_personal_expenses = feedback_in.include_in_personal_expenses
    else:
        # Determine inclusion rule
        if tx.ownership == "PERSONAL" and tx.transaction_type == "EXPENSE":
            tx.include_in_personal_expenses = True
        else:
            tx.include_in_personal_expenses = False
            
    tx.confidence = Decimal("1.00") # Confirmed by human-in-the-loop
    db.commit()
    db.refresh(tx)
    
    # Clean up corresponding notification
    notif = db.query(Notification).filter_by(transaction_id=tx.id, status="PENDING").first()
    if notif:
        notif.status = "READ"
        db.commit()
        
    # check for Rule Suggestion
    # Let's count how many similar corrections have been made for this merchant/UPI pattern
    suggest_rule = False
    rule_suggestion_payload = {}
    
    if tx.merchant_name or tx.upi_id:
        filter_clause = []
        if tx.merchant_name:
            filter_clause.append(Transaction.merchant_name == tx.merchant_name)
        if tx.upi_id:
            filter_clause.append(Transaction.upi_id == tx.upi_id)
            
        similar_corrections_count = (
            db.query(UserFeedback)
            .join(Transaction, Transaction.id == UserFeedback.transaction_id)
            .filter(
                UserFeedback.user_id == current_user.id,
                or_(*filter_clause)
            )
            .count()
        )
        
        # Suggest a rule if we have corrected this merchant/UPI at least 2 times
        if similar_corrections_count >= 2:
            # Check if a rule already exists for this pattern
            existing_rule = db.query(Rule).filter(
                Rule.user_id == current_user.id,
                or_(
                    and_(Rule.merchant_pattern == tx.merchant_name, Rule.merchant_pattern != None),
                    and_(Rule.upi_pattern == tx.upi_id, Rule.upi_pattern != None)
                )
            ).first()
            
            if not existing_rule:
                suggest_rule = True
                rule_suggestion_payload = {
                    "name": f"Rule for {tx.merchant_name or tx.upi_id}",
                    "merchant_pattern": tx.merchant_name,
                    "upi_pattern": tx.upi_id,
                    "set_ownership": tx.ownership,
                    "set_transaction_type": tx.transaction_type,
                    "set_category_id": tx.category_id,
                    "set_subcategory_id": tx.subcategory_id,
                    "set_include_in_personal_expenses": tx.include_in_personal_expenses
                }
                
    return {
        "status": "success",
        "transaction": tx,
        "suggest_rule": suggest_rule,
        "rule_suggestion": rule_suggestion_payload
    }

@router.post("/{id}/classify", response_model=TransactionOut)
def classify_transaction(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Triggers AI-based classification fallback for a specific transaction."""
    tx = db.query(Transaction).filter(Transaction.id == id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    ai_result = classify_transaction_with_ai(db, tx)
    
    # Update fields
    tx.ownership = ai_result.get("ownership", "UNKNOWN")
    tx.transaction_type = ai_result.get("transaction_type", "EXPENSE")
    tx.category_id = ai_result.get("category_id")
    tx.subcategory_id = ai_result.get("subcategory_id")
    tx.confidence = Decimal(str(ai_result.get("confidence", 0.50)))
    tx.include_in_personal_expenses = ai_result.get("include_in_personal_expenses", False)
    
    db.commit()
    db.refresh(tx)
    return tx
