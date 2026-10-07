import pytest


def test_create_zone_normalizes_name_and_adds_default_records(client):
    r = client.post("/api/hosted-zones", json={"name": "Shop.Example.COM", "comment": "  hi  "})
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "shop.example.com."
    assert body["comment"] == "hi"
    assert body["type"] == "PUBLIC"
    assert body["id"].startswith("Z") and len(body["id"]) == 21
    assert body["record_count"] == 2
    assert len(body["name_servers"]) == 4

    records = client.get(f"/api/hosted-zones/{body['id']}/records").json()
    assert sorted(r["type"] for r in records["items"]) == ["NS", "SOA"]
    assert all(r["is_system"] for r in records["items"])


@pytest.mark.parametrize("name", ["-bad.com", "a..com", "localhost", "exa mple.com", "a" * 64 + ".com", "under_score.com"])
def test_create_zone_rejects_invalid_domains(client, name):
    r = client.post("/api/hosted-zones", json={"name": name})
    assert r.status_code == 422
    assert r.json()["error"]["details"][0]["field"] == "name"


def test_duplicate_zone_is_a_conflict_regardless_of_case_and_trailing_dot(client, zone):
    r = client.post("/api/hosted-zones", json={"name": "EXAMPLE.com."})
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "HOSTED_ZONE_ALREADY_EXISTS"


def test_public_and_private_zone_with_same_name_can_coexist(client, zone):
    r = client.post(
        "/api/hosted-zones",
        json={"name": "example.com", "type": "PRIVATE", "vpc_id": "vpc-123", "vpc_region": "us-east-1"},
    )
    assert r.status_code == 201


def test_private_zone_requires_vpc(client):
    r = client.post("/api/hosted-zones", json={"name": "corp.local", "type": "PRIVATE"})
    assert r.status_code == 422
    assert {d["field"] for d in r.json()["error"]["details"]} == {"vpc_id", "vpc_region"}


def test_get_zone_and_not_found(client, zone):
    assert client.get(f"/api/hosted-zones/{zone['id']}").json()["name"] == "example.com."
    r = client.get("/api/hosted-zones/ZDOESNOTEXIST")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "HOSTED_ZONE_NOT_FOUND"


def test_update_zone_comment_only(client, zone):
    r = client.patch(f"/api/hosted-zones/{zone['id']}", json={"comment": "updated"})
    assert r.status_code == 200
    assert r.json()["comment"] == "updated"
    assert r.json()["name"] == "example.com."
    # The name is immutable, as in Route 53.
    assert client.patch(f"/api/hosted-zones/{zone['id']}", json={"name": "other.com"}).status_code == 422


def test_update_missing_zone_is_404(client):
    assert client.patch("/api/hosted-zones/ZNOPE", json={"comment": "x"}).status_code == 404


def test_list_search_filter_and_pagination(client):
    for name in ["alpha.com", "beta.com", "gamma.org", "delta.org", "epsilon.net"]:
        client.post("/api/hosted-zones", json={"name": name, "comment": f"zone {name}"})
    client.post("/api/hosted-zones", json={"name": "alpha.internal", "type": "PRIVATE", "vpc_id": "v-1", "vpc_region": "us-east-1"})

    page1 = client.get("/api/hosted-zones", params={"page_size": 4}).json()
    assert page1["total"] == 6 and len(page1["items"]) == 4
    page2 = client.get("/api/hosted-zones", params={"page_size": 4, "page": 2}).json()
    assert len(page2["items"]) == 2
    names = [z["name"] for z in page1["items"] + page2["items"]]
    assert names == sorted(names)

    assert client.get("/api/hosted-zones", params={"search": "ALPHA"}).json()["total"] == 2
    assert client.get("/api/hosted-zones", params={"type": "PRIVATE"}).json()["total"] == 1
    assert client.get("/api/hosted-zones", params={"search": ".org"}).json()["total"] == 2
    assert client.get("/api/hosted-zones", params={"page": 99}).json()["items"] == []


def test_list_search_treats_wildcards_literally(client, zone):
    assert client.get("/api/hosted-zones", params={"search": "%"}).json()["total"] == 0


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}, {"type": "WEIRD"}, {"sort": "id"}])
def test_list_rejects_invalid_query_params(client, params):
    assert client.get("/api/hosted-zones", params=params).status_code == 422


def test_delete_empty_zone(client, zone):
    assert client.delete(f"/api/hosted-zones/{zone['id']}").status_code == 204
    assert client.get(f"/api/hosted-zones/{zone['id']}").status_code == 404


def test_delete_zone_with_records_requires_force_and_leaves_no_orphans(client, zone, db_session_factory):
    client.post(f"/api/hosted-zones/{zone['id']}/records", json={"name": "www", "type": "A", "values": ["1.2.3.4"]})
    r = client.delete(f"/api/hosted-zones/{zone['id']}")
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "HOSTED_ZONE_NOT_EMPTY"

    assert client.delete(f"/api/hosted-zones/{zone['id']}", params={"force": "true"}).status_code == 204
    from sqlalchemy import func, select

    from app.models import DnsRecord

    with db_session_factory() as db:
        assert db.scalar(select(func.count(DnsRecord.id))) == 0


def test_delete_missing_zone_is_404(client):
    assert client.delete("/api/hosted-zones/ZNOPE").status_code == 404
