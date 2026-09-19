from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_current_user
from app.core.audit import record_audit
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.models import Organization, User
from app.schemas.auth import TokenOut, UserLogin, UserOut, UserRegister, OrganizationOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _organization_out(org: Organization) -> OrganizationOut:
    return OrganizationOut.model_validate(org)


def _user_out(user: User) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    org = None
    if payload.organization_name:
        org = Organization(name=payload.organization_name, type="clinic", settings={"modules": {}})
        db.add(org)
        db.flush()

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="ADMIN" if org is not None else "USER",
        organization_id=org.id if org else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role)
    record_audit(db, user.id, "auth.register", "user", user.id, request=request, email=user.email)
    return TokenOut(access_token=token, user=_user_out(user))


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    token = create_access_token(user.id, user.role)
    record_audit(db, user.id, "auth.login", "user", user.id, request=request)
    return TokenOut(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)


@router.get("/roles")
def roles():
    from app.api.deps import ROLES

    return {"roles": sorted(ROLES)}


@router.get("/organization", response_model=OrganizationOut | None)
def my_organization(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.organization_id:
        return None
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _organization_out(org)