from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/categories")
def get_category_spending(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the distribution of Personal Spending by category code.
    Matches strict personal spending criteria: EXPENSE, PERSONAL, include_in_personal_expenses == True.
    """
    query = (
        db.query(
            Category.name.label("category_name"),
            Category.code.label("category_code"),
            Category.color.label("color"),
            func.sum(Transaction.amount).label("total")
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "EXPENSE",
            Transaction.ownership == "PERSONAL",
            Transaction.include_in_personal_expenses == True
        )
    )
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
        
    results = query.group_by(Category.id).order_by(desc("total")).all()
    
    return [
        {
            "category": r.category_name,
            "code": r.category_code,
            "color": r.color or "#9E9E9E",
            "value": float(r.total)
        }
        for r in results
    ]

@router.get("/merchants")
def get_merchant_spending(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns top spending merchants."""
    query = (
        db.query(
            Transaction.merchant_name.label("merchant"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count")
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "EXPENSE",
            Transaction.ownership == "PERSONAL",
            Transaction.include_in_personal_expenses == True,
            Transaction.merchant_name != None
        )
    )
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
        
    results = (
        query.group_by(Transaction.merchant_name)
        .order_by(desc("total"))
        .limit(limit)
        .all()
    )
    
    return [
        {
            "merchant": r.merchant,
            "value": float(r.total),
            "count": r.count
        }
        for r in results
    ]

@router.get("/monthly")
def get_monthly_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns month-over-month trend of Personal Spending vs Income.
    """
    # Query monthly personal spending
    spending_query = (
        db.query(
            func.to_char(Transaction.transaction_date, 'YYYY-MM').label("month"),
            func.sum(Transaction.amount).label("total")
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "EXPENSE",
            Transaction.ownership == "PERSONAL",
            Transaction.include_in_personal_expenses == True
        )
        .group_by("month")
        .all()
    )
    
    # Query monthly income
    income_query = (
        db.query(
            func.to_char(Transaction.transaction_date, 'YYYY-MM').label("month"),
            func.sum(Transaction.amount).label("total")
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "INCOME"
        )
        .group_by("month")
        .all()
    )
    
    # Combine results
    months = sorted(list(set([r.month for r in spending_query] + [r.month for r in income_query])))
    
    spending_map = {r.month: float(r.total) for r in spending_query}
    income_map = {r.month: float(r.total) for r in income_query}
    
    trends = []
    for m in months:
        # Convert YYYY-MM to Month Name (e.g. "Aug 2026")
        try:
            d = date(int(m[:4]), int(m[5:]), 1)
            name = d.strftime("%b %Y")
        except Exception:
            name = m
        trends.append({
            "month": name,
            "spending": spending_map.get(m, 0.0),
            "income": income_map.get(m, 0.0)
        })
        
    return trends
