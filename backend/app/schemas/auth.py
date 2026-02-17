"""
Pydantic request and response schemas for authentication endpoints.

These models define the structure of data sent to and received from
authentication API endpoints. They handle validation automatically.

PYDANTIC VALIDATION
==================
Pydantic is a Python library for data validation using type hints.
FastAPI uses Pydantic to:
1. Parse JSON request bodies
2. Validate types and values
3. Return 422 status code if validation fails
4. Auto-generate API documentation (OpenAPI/Swagger)

Example:
  @app.post("/auth/signup")
  async def signup(body: SignupRequest):
      # FastAPI automatically:
      # 1. Parses JSON as SignupRequest
      # 2. Validates email and password fields
      # 3. Returns 422 if invalid
      # 4. Calls signup() if valid
      return await signup(email=body.email, password=body.password)

FIELD VALIDATION
===============
Each field can have validators that check constraints:

email = EmailStr
  - Ensures valid email format
  - Automatically applies RFC 5322 subset validation

password = str with constraints:
  - min_length=8 (at least 8 characters)
  - Checked with regex for at least 1 digit
  - Validated in model_post_init or separate validator
"""

from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID


# ============================================================================
# REQUEST MODELS (Client → Server)
# ============================================================================

class SignupRequest(BaseModel):
    """Request body for POST /auth/signup endpoint."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        description="Password (min 8 chars, must include at least 1 digit)"
    )
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password meets security requirements."""
        # Check for at least one digit
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        return v
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "user@example.com",
                "password": "SecurePassword123"
            }
        }
    }


class LoginRequest(BaseModel):
    """Request body for POST /auth/login endpoint."""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "user@example.com",
                "password": "SecurePassword123"
            }
        }
    }


# ============================================================================
# RESPONSE MODELS (Server → Client)
# ============================================================================

class UserResponse(BaseModel):
    """User object returned in API responses."""
    
    id: str = Field(..., description="User ID (UUID)")
    email: str = Field(..., description="User email address")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    model_config = ConfigDict(
        from_attributes=True,  # Enable ORM mode (convert SQLAlchemy User to response)
        json_schema_extra={
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "email": "user@example.com",
                "created_at": "2026-01-15T10:30:00"
            }
        }
    )


class SignupResponse(BaseModel):
    """Response body for POST /auth/signup endpoint."""
    
    id: str = Field(..., description="User ID (UUID)")
    email: str = Field(..., description="User email address")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "email": "user@example.com",
                "created_at": "2026-01-15T10:30:00"
            }
        }
    )


class LoginResponse(BaseModel):
    """Response body for POST /auth/login endpoint."""
    
    access_token: str = Field(..., description="JWT token for authentication")
    token_type: str = Field(default="bearer", description="Token type (always 'bearer')")
    user: UserResponse = Field(..., description="Authenticated user data")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                    "email": "user@example.com",
                    "created_at": "2026-01-15T10:30:00"
                }
            }
        }
    }


class ValidateResponse(BaseModel):
    """Response body for GET /auth/validate endpoint."""
    
    id: str = Field(..., description="User ID (UUID)")
    email: str = Field(..., description="User email address")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    model_config = ConfigDict(from_attributes=True)


class LogoutResponse(BaseModel):
    """Response body for POST /auth/logout endpoint."""
    
    message: str = Field(default="Logged out successfully")


class HealthResponse(BaseModel):
    """Response body for GET /health endpoint."""
    
    status: str = Field(default="ok", description="Health status")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "ok"
            }
        }
    }
