from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.budget import BudgetOut, BudgetCreate, BudgetStatus
from typing import List, Optional
from decimal import Decimal
from datetime import date, timedelta

router = APIRouter(prefix="/budgets", tags=["budgets"])

@router.get("", response_model=List[BudgetStatus])
def get_budgets_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all active budgets for the current month and calculate progress.
    Applies the strict personal spending filter:
    transaction_type == EXPENSE, ownership == PERSONAL, include_in_personal_expenses == True.
    """
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    # End of month
    if today.month == 12:
        end_of_month = date(today.year, 12, 31)
    else:
        end_of_month = date(today.year, today.month + 1, 1) - timedelta(days=1)
        
    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.period_start <= today,
            Budget.period_end >= today
        )
        .all()
    )
    
    status_list = []
    
    for budget in budgets:
        # Calculate spending in the budget period
        spending_query = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.transaction_date >= budget.period_start,
                Transaction.transaction_date <= budget.period_end,
                Transaction.transaction_type == "EXPENSE",
                Transaction.ownership == "PERSONAL",
                Transaction.include_in_personal_expenses == True
            )
        )
        
        if budget.category_id:
            spending_query = spending_query.filter(Transaction.category_id == budget.category_id)
            cat = db.query(Category).filter_by(id=budget.category_id).first()
            cat_name = cat.name if cat else "Unknown"
            cat_code = cat.code if cat else "UNKNOWN"
            color = cat.color if cat else "#9E9E9E"
        else:
            cat_name = "Overall Spending"
            cat_code = "OVERALL"
            color = "#4F46E5" # Premium indigo
            
        spent_sum = spending_query.scalar() or Decimal("0.00")
        spent = Decimal(spent_sum)
        remaining = max(Decimal("0.00"), budget.amount - spent)
        
        percentage = 0.0
        if budget.amount > 0:
            percentage = float((spent / budget.amount) * 100)
            
        status_list.append(
            BudgetStatus(
                category_id=budget.category_id,
                category_name=cat_name,
                category_code=cat_code,
                color=color,
                limit=budget.amount,
                spent=spent,
                remaining=remaining,
                percentage=percentage
            )
        )
        
    return status_list

@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def create_or_update_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new budget. Overwrites if a budget already exists for this category/month."""
    # Check if a budget already exists for this category and date range overlap
    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category_id == budget_in.category_id,
            Budget.period_start == budget_in.period_start,
            Budget.period_end == budget_in.period_end
        )
        .first()
    )
    
    if existing:
        existing.amount = budget_in.amount
        db.commit()
        db.refresh(existing)
        return existing
        
    budget = Budget(
        user_id=current_user.id,
        category_id=budget_in.category_id,
        amount=budget_in.amount,
        period_start=budget_in.period_start,
        period_end=budget_in.period_end
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget

@router.patch("/{id}", response_model=BudgetOut)
def update_budget_limit(
    id: str,
    amount: Decimal,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update only the budget limit amount."""
    budget = db.query(Budget).filter(Budget.id == id, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    budget.amount = amount
    db.commit()
    db.refresh(budget)
    return budget
