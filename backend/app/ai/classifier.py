from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.models.category import Category, Subcategory
from app.ai.providers import get_ai_provider
from app.models.user import User
from app.ai.prompts import CLASSIFICATION_SYSTEM_PROMPT, CLASSIFICATION_USER_TEMPLATE
from typing import Dict, Any, Optional
import json

def get_transaction_history_context(db: Session, user_id: str, merchant_name: Optional[str]) -> str:
    """Retrieves 3 past transaction examples of the same merchant to guide the LLM."""
    if not merchant_name:
        return "No matching merchant history."
        
    past_txs = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.merchant_name.ilike(merchant_name),
            Transaction.confidence >= 0.90
        )
        .order_by(Transaction.transaction_date.desc())
        .limit(3)
        .all()
    )
    
    if not past_txs:
        return "No matching merchant history."
        
    lines = []
    for tx in past_txs:
        cat_code = tx.category.code if tx.category else "OTHER"
        sub_code = tx.subcategory.code if tx.subcategory else "OTHER"
        lines.append(
            f"- Amt: ₹{tx.amount}, Desc: {tx.description or ''}, "
            f"Classified as: Ownership={tx.ownership}, Type={tx.transaction_type}, "
            f"Category={cat_code}/{sub_code}, Include={tx.include_in_personal_expenses}"
        )
    return "\n".join(lines)

def classify_transaction_with_ai(db: Session, transaction: Transaction) -> Dict[str, Any]:
    """
    Classifies a transaction using the active LLM provider.
    Validates output categories and maps them back to database UUIDs.
    """
    user = db.query(User).filter(User.id == transaction.user_id).first()
    provider = get_ai_provider(user)
    
    # Get history context
    history = get_transaction_history_context(db, transaction.user_id, transaction.merchant_name)
    
    # Format user prompt
    user_prompt = CLASSIFICATION_USER_TEMPLATE.format(
        amount=transaction.amount,
        currency=transaction.currency,
        direction=transaction.direction,
        merchant_name=transaction.merchant_name or "None",
        upi_id=transaction.upi_id or "None",
        payment_method=transaction.payment_method,
        date=transaction.transaction_date.strftime("%Y-%m-%d"),
        description=transaction.description or "None",
        history=history
    )
    
    try:
        raw_result = provider.generate_json(
            prompt=user_prompt,
            system_prompt=CLASSIFICATION_SYSTEM_PROMPT,
            json_schema=None
        )
        
        # Clean results and map string codes to category/subcategory UUIDs
        category_code = raw_result.get("category", "OTHER").upper()
        subcategory_code = raw_result.get("subcategory", "OTHER").upper()
        
        cat = db.query(Category).filter_by(code=category_code).first()
        if not cat:
            cat = db.query(Category).filter_by(code="OTHER").first()
            
        sub = None
        if cat:
            sub = db.query(Subcategory).filter_by(category_id=cat.id, code=subcategory_code).first()
            if not sub:
                # Get the first subcategory or None
                sub = db.query(Subcategory).filter_by(category_id=cat.id).first()
                
        # Resolve UUIDs
        raw_result["category_id"] = cat.id if cat else None
        raw_result["subcategory_id"] = sub.id if sub else None
        
        # Ensure include_in_personal_expenses matches formula
        raw_result["include_in_personal_expenses"] = (
            raw_result.get("ownership") == "PERSONAL" and
            raw_result.get("transaction_type") == "EXPENSE"
        )
        
        return raw_result
        
    except Exception as e:
        print(f"Failed to classify transaction with AI: {e}")
        # Return fallback dictionary
        other_cat = db.query(Category).filter_by(code="OTHER").first()
        return {
            "ownership": "UNKNOWN",
            "transaction_type": "EXPENSE",
            "category_id": other_cat.id if other_cat else None,
            "subcategory_id": None,
            "include_in_personal_expenses": False,
            "confidence": 0.50,
            "reason": f"AI failure fallback: {str(e)}"
        }
