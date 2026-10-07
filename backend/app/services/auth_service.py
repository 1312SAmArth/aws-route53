from datetime import timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import UnauthorizedError
from app.core.security import hash_token, new_session_token, verify_password
from app.db.base import utcnow
from app.models import User, UserSession


def login(db: Session, username: str, password: str) -> tuple[User, str]:
    user = db.scalar(select(User).where(User.username == username))
    # Same message for unknown user and wrong password so usernames can't be probed.
    if user is None or not verify_password(password, user.password_hash):
        raise UnauthorizedError("Incorrect username or password.", code="INVALID_CREDENTIALS")
    token = new_session_token()
    expires = utcnow() + timedelta(hours=get_settings().session_ttl_hours)
    db.add(UserSession(token_hash=hash_token(token), user_id=user.id, expires_at=expires))
    db.execute(delete(UserSession).where(UserSession.expires_at < utcnow()))
    db.commit()
    return user, token


def user_for_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    session = db.scalar(select(UserSession).where(UserSession.token_hash == hash_token(token)))
    if session is None:
        return None
    expires_at = session.expires_at
    if expires_at.tzinfo is None:  # SQLite returns naive datetimes
        expires_at = expires_at.replace(tzinfo=utcnow().tzinfo)
    if expires_at < utcnow():
        return None
    return db.get(User, session.user_id)


def logout(db: Session, token: str | None) -> None:
    if token:
        db.execute(delete(UserSession).where(UserSession.token_hash == hash_token(token)))
        db.commit()
