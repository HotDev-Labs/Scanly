from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserLogin, UserRegister, TokenResponse, UserResponse
from ..auth import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse)
@router.post("/register", response_model=TokenResponse)
def signup(req: UserRegister, db: Session = Depends(get_db)):
    clean_email = req.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid email address is required"
        )
    if len(req.password.strip()) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 4 characters"
        )
    
    # Check if user with this email or username already exists
    try:
        existing = db.query(User).filter(
            (User.username == clean_email) | (User.email == clean_email)
        ).first()
    except Exception as e:
        # Auto-heal: Ensure DB tables exist if called in cold serverless container
        from ..main import init_db
        try:
            init_db()
            existing = db.query(User).filter(
                (User.username == clean_email) | (User.email == clean_email)
            ).first()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database initialization failed: {str(e)}"
            )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An agent account with this email already exists. Please log in."
        )
    
    name_part = req.full_name.strip() if req.full_name and req.full_name.strip() else clean_email.split("@")[0].capitalize()
    pin_val = (req.security_pin or "").strip() or "1234"
    new_user = User(
        username=clean_email,
        email=clean_email,
        password_hash=hash_password(req.password),
        full_name=name_part,
        role="agent",
        security_pin=pin_val
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=TokenResponse)
def login(login_req: UserLogin, db: Session = Depends(get_db)):
    ident = (login_req.email or login_req.username or "").strip().lower()
    if not ident:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username is required"
        )

    try:
        user = db.query(User).filter(
            (User.username == ident) | (User.email == ident)
        ).first()
    except Exception as e:
        # Auto-heal: Ensure DB tables exist if called in cold serverless container
        from ..main import init_db
        try:
            init_db()
            user = db.query(User).filter(
                (User.username == ident) | (User.email == ident)
            ).first()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database initialization failed: {str(e)}"
            )

    if not user or not verify_password(login_req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please check your credentials or create an account."
        )

    # Auto-ensure full_name is friendly and not an email
    if not user.full_name or "@" in user.full_name:
        clean_name = (user.email or user.username).split("@")[0].replace(".", " ").replace("_", " ").title()
        user.full_name = clean_name
        try:
            db.commit()
            db.refresh(user)
        except Exception:
            pass

    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.put("/profile", response_model=UserResponse)
def update_profile(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_name = (body.get("full_name") or "").strip()
    if new_name:
        current_user.full_name = new_name
    
    if "security_pin" in body:
        new_pin = str(body.get("security_pin") or "").strip()
        if new_pin:
            if len(new_pin) < 4:
                raise HTTPException(status_code=400, detail="Security PIN must be at least 4 digits")
            current_user.security_pin = new_pin

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
