from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.budget import Budget
from app.api.dashboard import get_dashboard_summary
from app.api.subscriptions import get_active_subscriptions
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, Any, List

def get_monthly_summary(user_id: str, db: Session) -> Dict[str, Any]:
    """Returns the central dashboard summary including money movement, personal spending, and investments."""
    # We reuse the helper logic from get_dashboard_summary to keep numbers consistent
    # Let's resolve the user object first
    from app.models.user import User
    user = db.query(User).filter_by(id=user_id).first()
    return get_dashboard_summary(db=db, current_user=user)

def get_spending_by_category(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """Returns total personal spending grouped by category."""
    results = (
        db.query(
            Category.name.label("category"),
            func.sum(Transaction.amount).label("total")
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "EXPENSE",
            Transaction.ownership == "PERSONAL",
            Transaction.include_in_personal_expenses == True
        )
        .group_by(Category.id)
        .all()
    )
    return [{"category": r.category, "amount": float(r.total)} for r in results]

def get_spending_by_merchant(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """Returns total personal spending grouped by merchant name."""
    results = (
        db.query(
            Transaction.merchant_name.label("merchant"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count")
        )
        .filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "EXPENSE",
            Transaction.ownership == "PERSONAL",
            Transaction.include_in_personal_expenses == True,
            Transaction.merchant_name != None
        )
        .group_by(Transaction.merchant_name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(10)
        .all()
    )
    return [{"merchant": r.merchant, "amount": float(r.total), "count": r.count} for r in results]

def get_subscription_total(user_id: str, db: Session) -> Dict[str, Any]:
    """Returns active subscriptions and their monthly totals."""
    from app.models.user import User
    user = db.query(User).filter_by(id=user_id).first()
    return get_active_subscriptions(db=db, current_user=user)

def get_budget_status(user_id: str, db: Session) -> List[Dict[str, Any]]:
    """Returns status of all budgets (spent vs limit) for current month."""
    from app.models.user import User
    user = db.query(User).filter_by(id=user_id).first()
    from app.api.budgets import get_budgets_status
    status_list = get_budgets_status(db=db, current_user=user)
    return [
        {
            "category": s.category_name,
            "limit": float(s.limit),
            "spent": float(s.spent),
            "remaining": float(s.remaining),
            "percentage": s.percentage
        } for s in status_list
    ]

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_monthly_summary",
            "description": "Returns the main dashboard financial summaries including personal spending, total money movement (inflow/outflow), financial activity and budget limits.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_spending_by_category",
            "description": "Returns total personal spending grouped by category for the current month.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_spending_by_merchant",
            "description": "Returns top 10 merchants by total personal spending for the current month.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_subscription_total",
            "description": "Returns active recurring monthly subscriptions (Netflix, Spotify, etc.) and total cost.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_budget_status",
            "description": "Returns budget limits, spent amounts, and remaining values by category.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]

def call_tool_by_name(name: str, user_id: str, db: Session) -> str:
    """Executes the matching tool function and returns JSON formatted string result."""
    try:
        if name == "get_monthly_summary":
            return json_dump_helper(get_monthly_summary(user_id, db))
        elif name == "get_spending_by_category":
            return json_dump_helper(get_spending_by_category(user_id, db))
        elif name == "get_spending_by_merchant":
            return json_dump_helper(get_spending_by_merchant(user_id, db))
        elif name == "get_subscription_total":
            return json_dump_helper(get_subscription_total(user_id, db))
        elif name == "get_budget_status":
            return json_dump_helper(get_budget_status(user_id, db))
        else:
            return f"Error: Tool '{name}' not found."
    except Exception as e:
        return f"Error executing tool '{name}': {str(e)}"

def json_dump_helper(obj: Any) -> str:
    import json
    return json.dumps(obj, default=str)
