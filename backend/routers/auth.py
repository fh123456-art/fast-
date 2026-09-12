from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import hash_password, verify_password, create_token, get_current_user
from schemas import RegisterIn, LoginIn, TokenOut, UserOut, ProfileIn

router = APIRouter(prefix="/auth", tags=["认证"])
profile_router = APIRouter(prefix="/profile", tags=["个人信息"])


def user_out(u: User) -> dict:
    return {
        "id": u.id, "username": u.username, "name": u.name or u.username, "gender": u.gender,
        "phone": u.phone, "email": u.email, "school": u.school, "major": u.major,
        "degree": u.degree, "graduate_year": u.graduate_year, "intention": u.intention,
        "expect_city": u.expect_city, "expect_salary": u.expect_salary,
        "role": u.role or "student", "is_active": u.is_active,
    }


@router.post("/register", response_model=TokenOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="该账号已被注册")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        name=data.name or data.username,
        email=data.email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id)
    return {"access_token": token, "user": user_out(user)}


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用,请联系管理员")
    token = create_token(user.id)
    return {"access_token": token, "user": user_out(user)}


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return current


# ---------- 个人信息 ----------
@profile_router.get("", response_model=UserOut)
def get_profile(current: User = Depends(get_current_user)):
    return current


@profile_router.put("", response_model=UserOut)
def update_profile(data: ProfileIn, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(current, k, v)
    db.commit()
    db.refresh(current)
    return current
