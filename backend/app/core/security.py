import logging
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import HTTPException, status

# Configure clean logging that prevents leaking secrets or tokens
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("hireflow.backend")

# HTTP Bearer scheme for JWT extraction
security_bearer = HTTPBearer(
    auto_error=False,
    description="Supabase Auth JWT Access Token"
)


class AuthError(HTTPException):
    def __init__(self, detail: str, status_code: int = status.HTTP_401_UNAUTHORIZED):
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )
