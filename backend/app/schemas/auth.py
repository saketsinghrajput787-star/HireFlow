from typing import Optional, Literal
from pydantic import BaseModel, Field


UserRole = Literal["student", "recruiter", "admin"]


class UserProfileResponse(BaseModel):
    id: str = Field(..., description="Unique user UUID from Supabase Auth")
    email: str = Field(..., description="User email address")
    full_name: str = Field(..., description="User full display name")
    role: UserRole = Field(..., description="Authoritative user role from database: student, recruiter, or admin")
    created_at: Optional[str] = Field(default=None, description="Profile creation timestamp")


class ErrorDetail(BaseModel):
    detail: str = Field(..., description="Human-readable error description")
    code: Optional[str] = Field(default=None, description="Internal error code")


class DemoRecruiterLoginResponse(BaseModel):
    access_token: str = Field(..., description="Supabase Auth access JWT")
    refresh_token: str = Field(..., description="Supabase Auth refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(default=3600, description="Token lifetime in seconds")
    user: dict = Field(..., description="Supabase Auth user object")
    profile: UserProfileResponse = Field(..., description="Authoritative database profile and role")

