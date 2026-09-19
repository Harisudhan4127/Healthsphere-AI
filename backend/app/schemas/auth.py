from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    role: str = "USER"


class UserRegister(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    organization_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: str
    organization_id: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class OrganizationOut(BaseModel):
    id: str
    name: str
    type: str
    settings: dict
    created_at: datetime

    class Config:
        from_attributes = True