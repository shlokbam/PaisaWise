from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional

class SubcategoryBase(BaseModel):
    name: str
    code: str

class SubcategoryOut(SubcategoryBase):
    id: UUID
    category_id: UUID

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    code: str
    color: Optional[str] = None
    is_custom: bool = False

class CategoryOut(CategoryBase):
    id: UUID
    subcategories: List[SubcategoryOut] = []

    class Config:
        from_attributes = True
