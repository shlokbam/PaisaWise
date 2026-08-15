from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.rule import Rule
from app.schemas.rule import RuleOut, RuleCreate, RuleUpdate
from typing import List

router = APIRouter(prefix="/rules", tags=["rules"])

@router.get("", response_model=List[RuleOut])
def get_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all rules defined for the current user."""
    return db.query(Rule).filter(Rule.user_id == current_user.id).order_by(Rule.priority.desc()).all()

@router.post("", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
def create_rule(
    rule_in: RuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new custom rule."""
    rule = Rule(
        user_id=current_user.id,
        name=rule_in.name,
        merchant_pattern=rule_in.merchant_pattern,
        upi_pattern=rule_in.upi_pattern,
        payment_method=rule_in.payment_method,
        amount_min=rule_in.amount_min,
        amount_max=rule_in.amount_max,
        set_ownership=rule_in.set_ownership.upper(),
        set_transaction_type=rule_in.set_transaction_type.upper(),
        set_category_id=rule_in.set_category_id,
        set_subcategory_id=rule_in.set_subcategory_id,
        set_include_in_personal_expenses=rule_in.set_include_in_personal_expenses,
        priority=rule_in.priority,
        is_active=rule_in.is_active
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule

@router.patch("/{id}", response_model=RuleOut)
def update_rule(
    id: str,
    rule_in: RuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing rule."""
    rule = db.query(Rule).filter(Rule.id == id, Rule.user_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    update_data = rule_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)
        
    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a custom rule."""
    rule = db.query(Rule).filter(Rule.id == id, Rule.user_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return None
