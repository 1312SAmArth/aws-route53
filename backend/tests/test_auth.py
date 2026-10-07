from tests.conftest import PASSWORD, USERNAME


def test_login_sets_httponly_cookie_and_returns_user(raw_client):
    r = raw_client.post("/api/auth/login", json={"username": USERNAME, "password": PASSWORD})
    assert r.status_code == 200
    assert r.json()["user"]["username"] == USERNAME
    assert "httponly" in r.headers["set-cookie"].lower()


def test_login_rejects_wrong_password_and_unknown_user_identically(raw_client):
    bad_pw = raw_client.post("/api/auth/login", json={"username": USERNAME, "password": "nope"})
    bad_user = raw_client.post("/api/auth/login", json={"username": "ghost", "password": "nope"})
    assert bad_pw.status_code == bad_user.status_code == 401
    assert bad_pw.json() == bad_user.json()
    assert bad_pw.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_login_requires_both_fields(raw_client):
    r = raw_client.post("/api/auth/login", json={"username": USERNAME})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_session_persists_across_requests(client):
    r = client.get("/api/auth/session")
    assert r.status_code == 200
    assert r.json()["user"]["account_id"] == "123456789012"


def test_protected_routes_require_a_session(raw_client):
    assert raw_client.get("/api/auth/session").status_code == 401
    assert raw_client.get("/api/hosted-zones").status_code == 401
    assert raw_client.get("/api/records/1").status_code == 401


def test_logout_invalidates_the_session_server_side(client):
    stolen_cookie = client.cookies.get("r53_session")
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/session").status_code == 401
    # Replaying the old cookie must fail: logout deleted the row, not just the browser cookie.
    client.cookies.set("r53_session", stolen_cookie)
    assert client.get("/api/auth/session").status_code == 401


def test_health_is_public(raw_client):
    assert raw_client.get("/api/health").json() == {"status": "ok"}
