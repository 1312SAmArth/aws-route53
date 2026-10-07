from typing import Annotated

from fastapi import Cookie, Depends
from sqlalchemy.orm import Session

from app.core.errors import UnauthorizedError
from app.db.session import get_db
from app.models import User
from app.services import auth_service

SESSION_COOKIE = "r53_session"

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession, token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None) -> User:
    user = auth_service.user_for_token(db, token)
    if user is None:
        raise UnauthorizedError("Your session has expired. Please sign in again.", code="NOT_AUTHENTICATED")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
