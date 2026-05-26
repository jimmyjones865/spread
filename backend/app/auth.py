import os
import logging
import bcrypt
from itsdangerous import TimestampSigner, BadSignature, SignatureExpired
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

SESSION_COOKIE = "spread_session"
SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE_DAYS", "30")) * 86400


def _signer() -> TimestampSigner:
    secret = os.getenv("SESSION_SECRET")
    if not secret:
        raise RuntimeError("SESSION_SECRET not set")
    return TimestampSigner(secret)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_session_token() -> str:
    return _signer().sign("admin").decode()


def validate_session_token(token: str) -> bool:
    try:
        _signer().unsign(token, max_age=SESSION_MAX_AGE)
        return True
    except (BadSignature, SignatureExpired):
        return False


def require_admin(request: Request) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token or not validate_session_token(token):
        raise HTTPException(status_code=401, detail="Not authenticated")


def log_login(ip: str, success: bool) -> None:
    logger.info("login ip=%s success=%s", ip, success)
