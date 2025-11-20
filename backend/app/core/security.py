from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def verify_password(plain_password: str, stored_password: str) -> bool:
    return plain_password == stored_password


def get_password_hash(password: str) -> str:
    return password


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    to_encode = {"sub": subject}
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        subject: str | None = payload.get("sub")
        if subject is None:
            raise JWTError("Неверная структура токена")
        return subject
    except JWTError as exc:
        raise JWTError("Не удалось проверить токен") from exc


