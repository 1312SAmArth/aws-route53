import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db, make_engine
from app.main import create_app
from app.models import User

USERNAME = "tester"
PASSWORD = "correct-horse-battery"
PASSWORD_HASH = hash_password(PASSWORD)  # bcrypt is slow on purpose; hash once, not per test


@pytest.fixture()
def db_session_factory():
    engine = make_engine("sqlite://")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    with factory() as db:
        db.add(User(username=USERNAME, password_hash=PASSWORD_HASH, account_id="123456789012"))
        db.commit()
    yield factory
    engine.dispose()


@pytest.fixture()
def raw_client(db_session_factory):
    """Unauthenticated client wired to an isolated in-memory database."""
    app = create_app()

    def override_get_db():
        with db_session_factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


@pytest.fixture()
def client(raw_client):
    response = raw_client.post("/api/auth/login", json={"username": USERNAME, "password": PASSWORD})
    assert response.status_code == 200
    return raw_client


@pytest.fixture()
def zone(client):
    response = client.post("/api/hosted-zones", json={"name": "example.com", "comment": "test zone"})
    assert response.status_code == 201
    return response.json()
