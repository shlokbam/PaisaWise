from sqlalchemy.orm import Session
from app.models.rule import Rule
from app.models.transaction import Transaction
from typing import Optional, Tuple
import re

def evaluate_rules(db: Session, transaction: Transaction) -> Tuple[bool, Optional[Rule]]:
    """
    Evaluates active rules for a user on a given transaction.
    Rules are sorted by priority (highest first) and then by creation date.
    
    If a rule matches, updates the transaction's classification fields in-place,
    sets confidence to 1.0, and returns (True, matched_rule).
    If no rules match, returns (False, None).
    """
    # Fetch active rules for the user, ordered by priority desc
    rules = (
        db.query(Rule)
        .filter(Rule.user_id == transaction.user_id, Rule.is_active == True)
        .order_by(Rule.priority.desc(), Rule.created_at.asc())
        .all()
    )
    
    for rule in rules:
        match = True
        
        # 1. Match merchant pattern (regex case-insensitive)
        if rule.merchant_pattern:
            if not transaction.merchant_name:
                match = False
            else:
                pattern = re.compile(rule.merchant_pattern, re.IGNORECASE)
                if not pattern.search(transaction.merchant_name):
                    match = False
                    
        # 2. Match UPI ID pattern (regex case-insensitive)
        if match and rule.upi_pattern:
            if not transaction.upi_id:
                match = False
            else:
                pattern = re.compile(rule.upi_pattern, re.IGNORECASE)
                if not pattern.search(transaction.upi_id):
                    match = False
                    
        # 3. Match payment method
        if match and rule.payment_method:
            if transaction.payment_method.upper() != rule.payment_method.upper():
                match = False
                
        # 4. Match amount range
        if match and rule.amount_min is not None:
            if transaction.amount < rule.amount_min:
                match = False
        if match and rule.amount_max is not None:
            if transaction.amount > rule.amount_max:
                match = False
                
        # If all criteria match, apply the rule actions
        if match:
            transaction.ownership = rule.set_ownership
            transaction.transaction_type = rule.set_transaction_type
            transaction.category_id = rule.set_category_id
            transaction.subcategory_id = rule.set_subcategory_id
            transaction.include_in_personal_expenses = rule.set_include_in_personal_expenses
            transaction.confidence = 1.00 # rule match has maximum confidence
            return True, rule
            
    return False, None
