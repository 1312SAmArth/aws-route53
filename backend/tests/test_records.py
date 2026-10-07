import pytest


def url(zone):
    return f"/api/hosted-zones/{zone['id']}/records"


VALID_RECORDS = [
    ("A", ["192.0.2.10", "192.0.2.11"], ["192.0.2.10", "192.0.2.11"]),
    ("AAAA", ["2001:0db8:0000::0001"], ["2001:db8::1"]),
    ("CNAME", ["Target.Example.NET"], ["target.example.net."]),
    ("TXT", ["v=spf1 -all"], ['"v=spf1 -all"']),
    ("MX", ["10 Mail.example.com"], ["10 mail.example.com."]),
    ("NS", ["ns1.example.net"], ["ns1.example.net."]),
    ("PTR", ["host.example.com"], ["host.example.com."]),
    ("SRV", ["10 60 5060 sip.example.com"], ["10 60 5060 sip.example.com."]),
    ("CAA", ['0 issue letsencrypt.org'], ['0 issue "letsencrypt.org"']),
]


@pytest.mark.parametrize("rtype,values,expected", VALID_RECORDS)
def test_create_every_record_type(client, zone, rtype, values, expected):
    r = client.post(url(zone), json={"name": "test", "type": rtype, "values": values, "ttl": 120})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "test.example.com."
    assert body["values"] == expected
    assert body["ttl"] == 120
    assert body["is_system"] is False
    assert client.get(f"/api/records/{body['id']}").json()["values"] == expected


INVALID_RECORDS = [
    ("A", ["999.1.1.1"]),
    ("A", ["2001:db8::1"]),
    ("AAAA", ["192.0.2.1"]),
    ("CNAME", ["not a hostname"]),
    ("CNAME", ["a.example.com", "b.example.com"]),
    ("MX", ["mail.example.com"]),
    ("MX", ["70000 mail.example.com"]),
    ("SRV", ["10 60 sip.example.com"]),
    ("SRV", ["10 60 99999 sip.example.com"]),
    ("CAA", ['0 bogus "x"']),
    ("CAA", ["999 issue x"]),
    ("PTR", ["bad..host"]),
    ("NS", ["-bad.example.net"]),
    ("TXT", ['   ']),
]


@pytest.mark.parametrize("rtype,values", INVALID_RECORDS)
def test_backend_rejects_invalid_values(client, zone, rtype, values):
    r = client.post(url(zone), json={"name": "bad", "type": rtype, "values": values})
    assert r.status_code == 422, r.text
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
    assert r.json()["error"]["details"]


def test_unsupported_and_lowercase_types(client, zone):
    assert client.post(url(zone), json={"name": "x", "type": "SOA", "values": ["a"]}).status_code == 422
    assert client.post(url(zone), json={"name": "x", "type": "BOGUS", "values": ["a"]}).status_code == 422
    assert client.post(url(zone), json={"name": "x", "type": "a", "values": ["1.1.1.1"]}).status_code == 201


def test_name_resolution(client, zone):
    for raw in ["@", "", "example.com", "example.com."]:
        r = client.post(url(zone), json={"name": raw, "type": "TXT", "values": [f"apex {raw}"]})
        assert r.status_code in (201, 409)
    assert client.post(url(zone), json={"name": "other.org", "type": "A", "values": ["1.1.1.1"]}).status_code == 201  # relative: other.org.example.com.
    r = client.post(url(zone), json={"name": "evil.other.org.", "type": "A", "values": ["1.1.1.1"]})
    assert r.status_code == 422 and r.json()["error"]["details"][0]["field"] == "name"
    assert client.post(url(zone), json={"name": "*.wild", "type": "A", "values": ["1.1.1.1"]}).status_code == 201
    assert client.post(url(zone), json={"name": "_sip._tcp", "type": "SRV", "values": ["1 1 1 a.example.com"]}).status_code == 201


def test_ttl_validation(client, zone):
    assert client.post(url(zone), json={"name": "t", "type": "A", "values": ["1.1.1.1"], "ttl": -1}).status_code == 422
    assert client.post(url(zone), json={"name": "t", "type": "A", "values": ["1.1.1.1"], "ttl": 2**31}).status_code == 422
    default = client.post(url(zone), json={"name": "t", "type": "A", "values": ["1.1.1.1"]})
    assert default.json()["ttl"] == 300


def test_duplicate_name_and_type_conflicts(client, zone):
    body = {"name": "dup", "type": "A", "values": ["1.1.1.1"]}
    assert client.post(url(zone), json=body).status_code == 201
    r = client.post(url(zone), json=body)
    assert r.status_code == 409 and r.json()["error"]["code"] == "RECORD_ALREADY_EXISTS"


def test_cname_rules(client, zone):
    r = client.post(url(zone), json={"name": "@", "type": "CNAME", "values": ["x.example.net"]})
    assert r.status_code == 422  # not at the apex
    client.post(url(zone), json={"name": "web", "type": "A", "values": ["1.1.1.1"]})
    r = client.post(url(zone), json={"name": "web", "type": "CNAME", "values": ["x.example.net"]})
    assert r.status_code == 409 and r.json()["error"]["code"] == "CNAME_CONFLICT"
    client.post(url(zone), json={"name": "alias", "type": "CNAME", "values": ["x.example.net"]})
    r = client.post(url(zone), json={"name": "alias", "type": "TXT", "values": ["hello"]})
    assert r.status_code == 409


def test_weighted_routing(client, zone):
    base = {"name": "api", "type": "A", "values": ["1.1.1.1"], "routing_policy": "WEIGHTED"}
    assert client.post(url(zone), json=base).status_code == 422  # needs id + weight
    assert client.post(url(zone), json={**base, "set_identifier": "a"}).status_code == 422
    assert client.post(url(zone), json={**base, "set_identifier": "a", "weight": 300}).status_code == 422
    assert client.post(url(zone), json={**base, "set_identifier": "a", "weight": 70}).status_code == 201
    assert client.post(url(zone), json={**base, "values": ["2.2.2.2"], "set_identifier": "b", "weight": 30}).status_code == 201
    simple = client.post(url(zone), json={"name": "api", "type": "A", "values": ["3.3.3.3"]})
    assert simple.status_code == 409 and simple.json()["error"]["code"] == "ROUTING_POLICY_CONFLICT"
    assert client.post(url(zone), json={"name": "s", "type": "A", "values": ["1.1.1.1"], "set_identifier": "x"}).status_code == 422


def test_alias_records(client, zone):
    ok = client.post(url(zone), json={"name": "cdn", "type": "A", "alias_target": "d1.cloudfront.net", "evaluate_target_health": True})
    assert ok.status_code == 201
    body = ok.json()
    assert body["alias_target"] == "d1.cloudfront.net." and body["ttl"] is None and body["values"] == []
    assert client.post(url(zone), json={"name": "a2", "type": "TXT", "alias_target": "x.example.net"}).status_code == 422
    assert client.post(url(zone), json={"name": "a3", "type": "A", "alias_target": "x.net", "values": ["1.1.1.1"]}).status_code == 422
    assert client.post(url(zone), json={"name": "a4", "type": "A", "alias_target": "x.net", "ttl": 60}).status_code == 422


def test_create_record_in_missing_zone(client):
    r = client.post("/api/hosted-zones/ZNOPE/records", json={"name": "x", "type": "A", "values": ["1.1.1.1"]})
    assert r.status_code == 404 and r.json()["error"]["code"] == "HOSTED_ZONE_NOT_FOUND"


def test_unknown_fields_are_rejected(client, zone):
    r = client.post(url(zone), json={"name": "x", "type": "A", "values": ["1.1.1.1"], "hosted_zone_id": "OTHER"})
    assert r.status_code == 422


def test_get_missing_record(client):
    r = client.get("/api/records/99999")
    assert r.status_code == 404 and r.json()["error"]["code"] == "RECORD_NOT_FOUND"


def test_update_record(client, zone):
    rec = client.post(url(zone), json={"name": "www", "type": "A", "values": ["1.1.1.1"], "ttl": 60}).json()
    r = client.patch(f"/api/records/{rec['id']}", json={"values": ["8.8.8.8", "8.8.4.4"], "ttl": 600})
    assert r.status_code == 200
    assert r.json()["values"] == ["8.8.8.8", "8.8.4.4"] and r.json()["ttl"] == 600 and r.json()["name"] == "www.example.com."

    assert client.patch(f"/api/records/{rec['id']}", json={"values": ["nope"]}).status_code == 422
    # Changing the type re-validates the existing values against the new type.
    assert client.patch(f"/api/records/{rec['id']}", json={"type": "AAAA"}).status_code == 422
    assert client.patch(f"/api/records/{rec['id']}", json={"type": "AAAA", "values": ["::1"]}).json()["type"] == "AAAA"
    assert client.get(f"/api/records/{rec['id']}").json()["values"] == ["::1"]


def test_update_cannot_collide_with_another_record(client, zone):
    client.post(url(zone), json={"name": "a", "type": "A", "values": ["1.1.1.1"]})
    b = client.post(url(zone), json={"name": "b", "type": "A", "values": ["2.2.2.2"]}).json()
    assert client.patch(f"/api/records/{b['id']}", json={"name": "a"}).status_code == 409
    assert client.patch(f"/api/records/{b['id']}", json={"ttl": 99}).status_code == 200  # but not against itself


def test_switch_between_alias_and_standard(client, zone):
    rec = client.post(url(zone), json={"name": "sw", "type": "A", "values": ["1.1.1.1"]}).json()
    to_alias = client.patch(f"/api/records/{rec['id']}", json={"alias_target": "lb.example.net"}).json()
    assert to_alias["alias_target"] == "lb.example.net." and to_alias["values"] == [] and to_alias["ttl"] is None
    back = client.patch(f"/api/records/{rec['id']}", json={"values": ["2.2.2.2"], "ttl": 30, "alias_target": None}).json()
    assert back["alias_target"] is None and back["values"] == ["2.2.2.2"] and back["ttl"] == 30


def test_update_missing_record(client):
    assert client.patch("/api/records/99999", json={"ttl": 1}).status_code == 404


def test_delete_record(client, zone):
    rec = client.post(url(zone), json={"name": "gone", "type": "A", "values": ["1.1.1.1"]}).json()
    assert client.delete(f"/api/records/{rec['id']}").status_code == 204
    assert client.get(f"/api/records/{rec['id']}").status_code == 404
    assert client.delete(f"/api/records/{rec['id']}").status_code == 404
    assert client.get(f"/api/hosted-zones/{zone['id']}").json()["record_count"] == 2


def test_system_records_are_protected(client, zone):
    system = {r["type"]: r for r in client.get(url(zone)).json()["items"]}
    for rec in system.values():
        r = client.delete(f"/api/records/{rec['id']}")
        assert r.status_code == 400 and r.json()["error"]["code"] == "SYSTEM_RECORD_PROTECTED"
    assert client.patch(f"/api/records/{system['NS']['id']}", json={"name": "x"}).status_code == 400
    assert client.patch(f"/api/records/{system['SOA']['id']}", json={"values": ["x"]}).status_code == 400
    assert client.patch(f"/api/records/{system['NS']['id']}", json={"ttl": 3600}).json()["ttl"] == 3600


def test_batch_delete(client, zone):
    ids = [client.post(url(zone), json={"name": f"h{i}", "type": "A", "values": ["1.1.1.1"]}).json()["id"] for i in range(3)]
    r = client.post(f"{url(zone)}/batch-delete", json={"ids": ids[:2]})
    assert r.status_code == 200 and r.json() == {"deleted": 2}
    assert client.get(f"/api/records/{ids[2]}").status_code == 200
    assert client.post(f"{url(zone)}/batch-delete", json={"ids": [ids[2], 424242]}).status_code == 404
    assert client.get(f"/api/records/{ids[2]}").status_code == 200  # all-or-nothing
    system_id = client.get(url(zone)).json()["items"][0]["id"]
    assert client.post(f"{url(zone)}/batch-delete", json={"ids": [system_id]}).status_code == 400
    assert client.post(f"{url(zone)}/batch-delete", json={"ids": []}).status_code == 422


def test_batch_delete_cannot_touch_other_zones(client, zone):
    other = client.post("/api/hosted-zones", json={"name": "other.org"}).json()
    rec = client.post(url(other), json={"name": "x", "type": "A", "values": ["1.1.1.1"]}).json()
    assert client.post(f"{url(zone)}/batch-delete", json={"ids": [rec["id"]]}).status_code == 404
    assert client.get(f"/api/records/{rec['id']}").status_code == 200


def test_list_search_filter_pagination(client, zone):
    for i in range(12):
        client.post(url(zone), json={"name": f"web{i:02d}", "type": "A", "values": [f"10.0.0.{i}"]})
    client.post(url(zone), json={"name": "mail", "type": "MX", "values": ["10 smtp.example.net"]})
    client.post(url(zone), json={"name": "txt", "type": "TXT", "values": ["hello world"]})

    page1 = client.get(url(zone), params={"page_size": 5}).json()
    assert page1["total"] == 16 and len(page1["items"]) == 5
    assert len(client.get(url(zone), params={"page_size": 5, "page": 4}).json()["items"]) == 1

    assert client.get(url(zone), params={"type": "MX"}).json()["total"] == 1
    assert client.get(url(zone), params={"type": "mx"}).json()["total"] == 1
    assert client.get(url(zone), params={"search": "web0"}).json()["total"] == 10
    assert client.get(url(zone), params={"search": "smtp"}).json()["total"] == 1  # matches values too
    assert client.get(url(zone), params={"search": "10.0.0.11"}).json()["total"] == 1
    assert client.get(url(zone), params={"search": "web", "type": "TXT"}).json()["total"] == 0
    assert client.get(url(zone), params={"routing_policy": "WEIGHTED"}).json()["total"] == 0


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 500}, {"routing_policy": "GEO"}])
def test_list_records_rejects_invalid_params(client, zone, params):
    assert client.get(url(zone), params=params).status_code == 422


def test_list_records_for_missing_zone(client):
    assert client.get("/api/hosted-zones/ZNOPE/records").status_code == 404


def test_zone_record_count_tracks_changes(client, zone):
    rec = client.post(url(zone), json={"name": "x", "type": "A", "values": ["1.1.1.1"]}).json()
    assert client.get(f"/api/hosted-zones/{zone['id']}").json()["record_count"] == 3
    listed = client.get("/api/hosted-zones").json()["items"][0]
    assert listed["record_count"] == 3
    client.delete(f"/api/records/{rec['id']}")
    assert client.get(f"/api/hosted-zones/{zone['id']}").json()["record_count"] == 2


def test_errors_never_leak_internals(client):
    r = client.get("/api/nonexistent")
    assert r.status_code == 404 and set(r.json()) == {"error"}
