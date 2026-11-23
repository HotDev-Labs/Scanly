import hashlib
import hmac
import os
import json
import base64
import time
from typing import Optional
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import User

SECRET_KEY = os.getenv("APP_SECRET_KEY", "smart_luggage_verification_secure_key_2026")
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return base64.b64encode(salt + pwd_hash).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        decoded = base64.b64decode(hashed_password.encode("utf-8"))
        salt = decoded[:16]
        stored_hash = decoded[16:]
        computed_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(stored_hash, computed_hash)
    except Exception:
        return False

def create_access_token(user: User) -> str:
    payload = {
        "user_id": user.id,
        "username": user.username,
        "email": getattr(user, "email", None) or user.username,
        "role": user.role,
        "exp": int(time.time()) + (7 * 24 * 3600)  # 7 days
    }
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    
    sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode('utf-8').rstrip('=')
    return f"{payload_b64}.{sig_b64}"

def decode_token(token: str) -> Optional[dict]:
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode('utf-8').rstrip('=')
        
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
            
        padding = 4 - (len(payload_b64) % 4)
        if padding != 4:
            payload_b64 += '=' * padding
            
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8'))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    # If token provided, decode it
    if credentials:
        token = credentials.credentials
        payload = decode_token(token)
        if payload:
            user = db.query(User).filter(User.id == payload.get("user_id")).first()
            if user:
                return user

    # No admin panel / login requirement: fallback to default station operator seamlessly
    default_user = db.query(User).filter(User.username == "operator1").first()
    if not default_user:
        default_user = db.query(User).filter(User.username == "admin").first()
    if not default_user:
        default_user = User(
            id=1,
            username="operator1",
            password_hash="none",
            full_name="Station Operator",
            role="operator"
        )
    return default_user

def seed_default_users(db: Session):
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        admin_user = User(
            username="admin",
            password_hash=hash_password("admin123"),
            full_name="Chief Station Operator",
            role="admin"
        )
        db.add(admin_user)
        db.commit()
    
    operator = db.query(User).filter(User.username == "operator1").first()
    if not operator:
        op_user = User(
            username="operator1",
            password_hash=hash_password("operator123"),
            full_name="Luggage Handover Officer 1",
            role="operator"
        )
        db.add(op_user)
        db.commit()
