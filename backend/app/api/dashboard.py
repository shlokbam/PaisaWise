from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.budget import Budget
from app.models.category import Category
from typing import Dict, Any
from decimal import Decimal
from datetime import date, timedelta

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes dashboard summary metrics centrally.
    Implements the Three Financial Numbers rule:
    1. Money Movement (inflow / outflow)
    2. Personal Spending (PERSONAL + EXPENSE + include)
    3. Financial Activity (Investments, transfers, etc.)
    """
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    
    # 1. Calculate Personal Spending for current month
    personal_spending_current = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= start_of_month,
            Transaction.transaction_date <= today,
            Transaction.transaction_type == "EXPENSE",
            Transaction.ownership == "PERSONAL",
            Transaction.include_in_personal_expenses == True
        )
        .scalar()
    ) or Decimal("0.00")
    
    # Calculate Personal Spending for previous month
    prev_month_end = start_of_month - timedelta(days=1)
    start_of_prev_month = date(prev_month_end.year, prev_month_end.month, 1)
    personal_spending_prev = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= start_of_prev_month,
            Transaction.transaction_date <= prev_month_end,
            Transaction.transaction_type == "EXPENSE",
            Transaction.ownership == "PERSONAL",
            Transaction.include_in_personal_expenses == True
        )
        .scalar()
    ) or Decimal("0.00")
    
    spending_change_pct = 0.0
    if personal_spending_prev > 0:
        spending_change_pct = float(
            ((personal_spending_current - personal_spending_prev) / personal_spending_prev) * 100
        )
        
    # 2. Money Movement (Everything entering/leaving the account)
    total_inflow = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= start_of_month,
            Transaction.transaction_date <= today,
            Transaction.direction == "CREDIT"
        )
        .scalar()
    ) or Decimal("0.00")
    
    total_outflow = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= start_of_month,
            Transaction.transaction_date <= today,
            Transaction.direction == "DEBIT"
        )
        .scalar()
    ) or Decimal("0.00")
    
    # 3. Financial Activity (Investments, transfers, etc.)
    financial_activity = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_date >= start_of_month,
            Transaction.transaction_date <= today,
            Transaction.transaction_type.in_(["INVESTMENT", "TRANSFER"])
        )
        .scalar()
    ) or Decimal("0.00")
    
    # 4. Pending Reviews Count
    pending_reviews_count = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.confidence < Decimal("0.90")
        )
        .count()
    )
    
    # 5. Overall Month Budget Status
    overall_budget = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category_id == None,
            Budget.period_start <= today,
            Budget.period_end >= today
        )
        .first()
    )
    
    budget_limit = overall_budget.amount if overall_budget else Decimal("20000.00") # default HFL limit
    budget_remaining = max(Decimal("0.00"), budget_limit - personal_spending_current)
    
    # 6. Fetch Recent Transactions
    recent_transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc(), Transaction.transaction_time.desc())
        .limit(10)
        .all()
    )
    
    # 7. Generate a static/dynamic AI Insight text (Deterministic backend check)
    ai_insight = "No insight available yet. Record more transactions to unlock AI-powered insights."
    if personal_spending_current > 0:
        # Example calculation: Subscriptions percentage
        sub_category = db.query(Category).filter_by(code="SUBSCRIPTIONS").first()
        sub_spend = Decimal("0.00")
        if sub_category:
            sub_spend = (
                db.query(func.sum(Transaction.amount))
                .filter(
                    Transaction.user_id == current_user.id,
                    Transaction.category_id == sub_category.id,
                    Transaction.transaction_date >= start_of_month,
                    Transaction.transaction_type == "EXPENSE",
                    Transaction.include_in_personal_expenses == True
                )
                .scalar()
            ) or Decimal("0.00")
            
        if sub_spend > 0 and personal_spending_current > 0:
            pct = float((sub_spend / personal_spending_current) * 100)
            ai_insight = f"Subscriptions account for {pct:.1f}% of your personal spending this month."
        else:
            # Fallback Zomato insight
            zomato_spend = (
                db.query(func.sum(Transaction.amount))
                .filter(
                    Transaction.user_id == current_user.id,
                    Transaction.merchant_name.ilike("zomato"),
                    Transaction.transaction_date >= start_of_month
                )
                .scalar()
            ) or Decimal("0.00")
            if zomato_spend > 0:
                ai_insight = f"Your top merchant this month is Zomato (spent ₹{zomato_spend})."
                
    return {
        "period": today.strftime("%B %Y"),
        "personal_spending": float(personal_spending_current),
        "spending_change_pct": round(spending_change_pct, 1),
        "money_movement": {
            "total_inflow": float(total_inflow),
            "total_outflow": float(total_outflow)
        },
        "financial_activity": float(financial_activity),
        "pending_reviews_count": pending_reviews_count,
        "monthly_budget": {
            "limit": float(budget_limit),
            "spent": float(personal_spending_current),
            "remaining": float(budget_remaining)
        },
        "recent_transactions": [
            {
                "id": str(tx.id),
                "merchant_name": tx.merchant_name or tx.sender or tx.receiver or "Unknown",
                "amount": float(tx.amount),
                "direction": tx.direction,
                "transaction_date": tx.transaction_date.strftime("%Y-%m-%d"),
                "category": tx.category.name if tx.category else "Other",
                "include": tx.include_in_personal_expenses,
                "confidence": float(tx.confidence)
            } for tx in recent_transactions
        ],
        "ai_insight": ai_insight
    }
