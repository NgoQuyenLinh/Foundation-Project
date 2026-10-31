# backend/app/schemas/auth.py

from typing import Optional
from fastapi import HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, Field


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=150)
    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: Optional[str] = Field(default=None, max_length=150)
    role: Optional[str] = Field(default="student", max_length=20)
    student_code: Optional[str] = Field(default=None, max_length=20)
    class_id: Optional[int] = None
    faculty_id: Optional[int] = None


class UserLogin(BaseModel):
    identifier: str = Field(..., description="MSSV, email hoặc username")
    password: str = Field(min_length=1, max_length=128)


async def get_login_payload(request: Request) -> UserLogin:
    """Dependency hỗ trợ xử lý cả JSON (Frontend) lẫn Form-data (Swagger/OAuth2)"""
    content_type = request.headers.get("content-type", "")

    # 1. Xử lý Request từ Frontend (JSON)
    if "application/json" in content_type:
        try:
            body = await request.json()
            identifier = body.get("identifier") or body.get("username") or body.get("email")
            password = body.get("password")

            if not identifier or not password:
                raise ValueError("Missing identifier or password")

            return UserLogin(identifier=identifier, password=password)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Dữ liệu JSON không hợp lệ hoặc thiếu thông tin đăng nhập",
            )

    # 2. Xử lý Request từ Swagger UI / OAuth2 (Form Data)
    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        try:
            form = await request.form()
            username = form.get("username")
            password = form.get("password")

            if username and password:
                return UserLogin(
                    identifier=str(username),
                    password=str(password),
                )
        except Exception:
            pass

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Thiếu thông tin đăng nhập",
    )


class UserInfo(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: str
    student_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


class TokenData(BaseModel):
    sub: Optional[str] = None
    model_config = ConfigDict(extra="ignore")