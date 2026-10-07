from typing import Annotated

from fastapi import APIRouter, Cookie, Response, status

from app.api.deps import SESSION_COOKIE, CurrentUser, DbSession
from app.core.config import get_settings
from app.schemas.auth import LoginRequest, SessionOut, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SessionOut)
def login(body: LoginRequest, response: Response, db: DbSession) -> SessionOut:
    settings = get_settings()
    user, token = auth_service.login(db, body.username, body.password)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_ttl_hours * 3600,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )
    return SessionOut(user=UserOut.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, db: DbSession, token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None) -> None:
    auth_service.logout(db, token)
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/session", response_model=SessionOut)
def session(user: CurrentUser) -> SessionOut:
    return SessionOut(user=UserOut.model_validate(user))
