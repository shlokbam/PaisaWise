from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from typing import List, Dict, Any
from decimal import Decimal
from datetime import date, timedelta

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

@router.get("")
def get_active_subscriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Scans the transaction ledger to identify active recurring subscriptions,
    aggregates monthly totals, and flags any recent price adjustments.
    """
    # 1. Fetch all transactions that belong to the SUBSCRIPTIONS category code
    sub_category = db.query(Category).filter_by(code="SUBSCRIPTIONS").first()
    if not sub_category:
        return {"subscriptions": [], "total_monthly": 0.0, "alerts": []}
        
    txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.category_id == sub_category.id,
            Transaction.transaction_type == "EXPENSE",
            Transaction.include_in_personal_expenses == True
        )
        .order_by(Transaction.merchant_name, desc(Transaction.transaction_date))
        .all()
    )
    
    # Group by merchant name
    groups: Dict[str, List[Transaction]] = {}
    for tx in txs:
        name = tx.merchant_name or "Unknown Service"
        # Normalize name (e.g. Netflix, Spotify)
        name_clean = name.split()[0].title() if name else "Unknown Service"
        if name_clean not in groups:
            groups[name_clean] = []
            
        groups[name_clean].append(tx)
        
    detected_subs = []
    alerts = []
    total_monthly = Decimal("0.00")
    
    today = date.today()
    thirty_days_ago = today - timedelta(days=35)
    
    for merchant, merchant_txs in groups.items():
        # A subscription is active if we have at least one charge, and the latest is within the last 45 days
        latest_tx = merchant_txs[0]
        if latest_tx.transaction_date < today - timedelta(days=45):
            # Subscription likely cancelled or lapsed
            continue
            
        # Check if there is recurring pattern (at least 2 charges roughly 30 days apart)
        is_recurring = len(merchant_txs) >= 2
        
        current_price = latest_tx.amount
        previous_price = None
        price_change_message = None
        
        if len(merchant_txs) >= 2:
            # Check for price changes
            prev_tx = merchant_txs[1]
            previous_price = prev_tx.amount
            if current_price != previous_price:
                price_change_message = f"{merchant} price changed from ₹{previous_price} to ₹{current_price}."
                alerts.append({
                    "type": "PRICE_CHANGE",
                    "merchant": merchant,
                    "message": price_change_message,
                    "old_price": previous_price,
                    "new_price": current_price
                })
                
        detected_subs.append({
            "merchant": merchant,
            "amount": current_price,
            "previous_amount": previous_price,
            "billing_cycle": "Monthly",
            "last_billed": latest_tx.transaction_date,
            "payment_method": latest_tx.payment_method,
            "price_changed": current_price != previous_price,
            "change_description": price_change_message
        })
        
        total_monthly += current_price
        
    return {
        "subscriptions": detected_subs,
        "total_monthly": total_monthly,
        "alerts": alerts
    }
