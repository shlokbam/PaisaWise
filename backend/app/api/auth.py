from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, Token, UserLogin
from jose import jwt, JWTError
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system."
        )
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        first_name=user_in.first_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2 compatible token login, retrieve access and refresh token."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    return {
        "access_token": create_access_token(subject=user.id),
        "refresh_token": create_refresh_token(subject=user.id),
        "token_type": "bearer",
    }

@router.post("/login-json", response_model=Token)
def login_json(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """JSON body login interface (alternative to OAuth2PasswordRequestForm for easier frontend calls)."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    return {
        "access_token": create_access_token(subject=user.id),
        "refresh_token": create_refresh_token(subject=user.id),
        "token_type": "bearer",
    }

@router.post("/refresh", response_model=Token)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Refresh tokens using a refresh token."""
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "access_token": create_access_token(subject=user.id),
        "refresh_token": create_refresh_token(subject=user.id),
        "token_type": "bearer"
    }

from fastapi import UploadFile, File
from app.api.deps import get_current_user
from app.schemas.settings import SettingsUpdate, PasswordChange
import uuid
import shutil
import os

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """Get profile info of current logged-in user."""
    return current_user

def validate_groq_key(key: str) -> bool:
    try:
        headers = {"Authorization": f"Bearer {key.strip()}"}
        resp = httpx.get("https://api.groq.com/openai/v1/models", headers=headers, timeout=5.0)
        return resp.status_code == 200
    except Exception:
        return False

def validate_mistral_key(key: str) -> bool:
    try:
        headers = {"Authorization": f"Bearer {key.strip()}"}
        resp = httpx.get("https://api.mistral.ai/v1/models", headers=headers, timeout=5.0)
        return resp.status_code == 200
    except Exception:
        return False

import httpx

@router.put("/settings", response_model=UserOut)
def update_settings(
    settings_in: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user API keys with active validation verification."""
    groq_in = settings_in.groq_api_key
    mistral_in = settings_in.mistral_api_key
    
    # If both inputs are unset (None), nothing to change
    if groq_in is None and mistral_in is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No configuration was submitted."
        )
        
    validation_failures = []
    updated_something = False
    
    # 1. Process Groq API Key
    if groq_in is not None:
        if groq_in.strip() == "":
            current_user.groq_api_key = None
            updated_something = True
        else:
            if validate_groq_key(groq_in):
                current_user.groq_api_key = groq_in.strip()
                updated_something = True
            else:
                validation_failures.append("Groq API key failed authentication check.")
                
    # 2. Process Mistral API Key
    if mistral_in is not None:
        if mistral_in.strip() == "":
            current_user.mistral_api_key = None
            updated_something = True
        else:
            if validate_mistral_key(mistral_in):
                current_user.mistral_api_key = mistral_in.strip()
                updated_something = True
            else:
                validation_failures.append("Mistral API key failed authentication check.")
                
    # Check if at least one operation succeeded
    if not updated_something:
        error_detail = " | ".join(validation_failures) or "All submitted API keys are invalid."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail
        )
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/profile-picture", response_model=UserOut)
def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload and save user profile picture."""
    # Ensure folder exists
    os.makedirs("static/uploads", exist_ok=True)
    
    # Generate unique filename to avoid collision/caching issues
    extension = os.path.splitext(file.filename)[1] or ".png"
    filename = f"{current_user.id}_{uuid.uuid4().hex}{extension}"
    file_path = f"static/uploads/{filename}"
    
    # Save the file locally
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Delete old profile picture if exists
    if current_user.profile_picture:
        old_path = current_user.profile_picture.lstrip("/")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception:
                pass
                
    # Update DB URL
    current_user.profile_picture = f"/static/uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(
    pwd_in: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change account password."""
    if not verify_password(pwd_in.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )
    current_user.hashed_password = get_password_hash(pwd_in.new_password)
    db.commit()
    return {"message": "Password changed successfully."}
