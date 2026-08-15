from pydantic import BaseModel
from typing import Optional

class SettingsUpdate(BaseModel):
    groq_api_key: Optional[str] = None
    mistral_api_key: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str
