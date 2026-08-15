from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.category import Category, Subcategory
from app.schemas.category import CategoryOut
from typing import List, Optional

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("", response_model=List[CategoryOut])
def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve system defaults and user-specific custom categories."""
    return (
        db.query(Category)
        .filter((Category.user_id == None) | (Category.user_id == current_user.id))
        .order_by(Category.name.asc())
        .all()
    )

@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_custom_category(
    name: str,
    color: Optional[str] = "#9E9E9E",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a user-defined custom category."""
    # Ensure code is unique and derived from name
    code = name.upper().replace(" ", "_")
    existing = db.query(Category).filter((Category.code == code) & ((Category.user_id == None) | (Category.user_id == current_user.id))).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category code already exists.")
        
    cat = Category(
        user_id=current_user.id,
        name=name,
        code=code,
        color=color,
        is_custom=True
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat
