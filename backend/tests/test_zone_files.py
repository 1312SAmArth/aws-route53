import json

SAMPLE = """\
$ORIGIN example.com.
$TTL 3600
@   IN SOA ns1.example.com. admin.example.com. (
        2024010101 ; serial
        7200 ; refresh
        900 ; retry
        1209600 ; expire
        86400 ) ; minimum
    IN NS ns1.example.com.
@       IN A     192.0.2.1
        IN A     192.0.2.2          ; continuation line reuses the previous name
www 300 IN CNAME example.com.
mail    IN MX    10 mx1.example.com.
        IN MX    20 mx2.example.com.
txt     IN TXT   "v=spf1 ip4:192.0.2.0/24 ; not a comment" "second chunk"
_sip._tcp IN SRV 10 60 5060 sip.example.com.
caa     IN CAA   0 issue "letsencrypt.org"
v6      IN AAAA  2001:db8::1
"""


def url(zone):
    return f"/api/hosted-zones/{zone['id']}"


def records_by_key(client, zone):
    items = client.get(f"{url(zone)}/records", params={"page_size": 100}).json()["items"]
    return {(r["name"], r["type"]): r for r in items}


def test_import_creates_record_sets_and_skips_default_records(client, zone):
    r = client.post(f"{url(zone)}/records/import", json={"content": SAMPLE})
    assert r.status_code == 200, r.text
    body = r.json()
    # SOA is not a supported type and the apex NS already exists: both are reported, nothing else is lost.
    reasons = " ".join(s["reason"] for s in body["skipped"])
    assert "SOA" in reasons and "apex NS" in reasons
    assert body["created"] == 7  # A, CNAME, MX, TXT, SRV, CAA, AAAA record sets

    recs = records_by_key(client, zone)
    assert recs[("example.com.", "A")]["values"] == ["192.0.2.1", "192.0.2.2"]
    assert recs[("example.com.", "A")]["ttl"] == 3600  # from $TTL
    assert recs[("www.example.com.", "CNAME")]["ttl"] == 300  # explicit TTL wins
    assert recs[("mail.example.com.", "MX")]["values"] == ["10 mx1.example.com.", "20 mx2.example.com."]
    txt = recs[("txt.example.com.", "TXT")]["values"][0]
    assert "; not a comment" in txt and "second chunk" in txt  # a semicolon inside quotes is data, not a comment
    assert recs[("_sip._tcp.example.com.", "SRV")]["values"] == ["10 60 5060 sip.example.com."]
    assert recs[("caa.example.com.", "CAA")]["values"] == ['0 issue "letsencrypt.org"']


def test_import_reports_invalid_lines_but_keeps_valid_ones(client, zone):
    content = "good IN A 192.0.2.5\nbad IN A 999.1.1.1\nodd IN HINFO x y\nmissing IN A\nbadttl IN MX notanumber host.example.com.\n"
    body = client.post(f"{url(zone)}/records/import", json={"content": content}).json()
    assert body["created"] == 1
    by_line = {s["line"]: s["reason"] for s in body["skipped"]}
    assert "IPv4" in by_line[2]
    assert "HINFO" in by_line[3]
    assert "Missing record data" in by_line[4]
    assert 5 in by_line
    assert ("good.example.com.", "A") in records_by_key(client, zone)
    assert ("bad.example.com.", "A") not in records_by_key(client, zone)


def test_import_does_not_overwrite_existing_records(client, zone):
    client.post(f"{url(zone)}/records", json={"name": "www", "type": "A", "values": ["1.1.1.1"]})
    body = client.post(f"{url(zone)}/records/import", json={"content": "www IN A 2.2.2.2\n"}).json()
    assert body["created"] == 0 and "already exists" in body["skipped"][0]["reason"]
    assert records_by_key(client, zone)[("www.example.com.", "A")]["values"] == ["1.1.1.1"]


def test_import_rejects_names_outside_the_zone(client, zone):
    body = client.post(f"{url(zone)}/records/import", json={"content": "evil.other.org. IN A 1.1.1.1\n"}).json()
    assert body["created"] == 0 and "must end with the hosted zone name" in body["skipped"][0]["reason"]


def test_import_honours_origin_directive(client, zone):
    content = "$ORIGIN sub.example.com.\nhost IN A 192.0.2.9\n"
    assert client.post(f"{url(zone)}/records/import", json={"content": content}).json()["created"] == 1
    assert ("host.sub.example.com.", "A") in records_by_key(client, zone)


def test_import_limits_and_errors(client, zone):
    assert client.post(f"{url(zone)}/records/import", json={"content": "a" * (300 * 1024)}).status_code == 422
    assert client.post(f"{url(zone)}/records/import", json={"content": ""}).status_code == 422
    assert client.post("/api/hosted-zones/ZNOPE/records/import", json={"content": "a IN A 1.1.1.1"}).status_code == 404


def test_import_requires_authentication(raw_client):
    assert raw_client.post("/api/hosted-zones/ZX/records/import", json={"content": "a IN A 1.1.1.1"}).status_code == 401


def test_export_json(client, zone):
    client.post(f"{url(zone)}/records", json={"name": "www", "type": "A", "values": ["1.1.1.1"], "ttl": 60})
    r = client.get(f"{url(zone)}/export")
    assert r.status_code == 200
    assert 'filename="example.com.json"' in r.headers["content-disposition"]
    data = json.loads(r.text)
    assert data["name"] == "example.com." and len(data["name_servers"]) == 4
    assert {(x["name"], x["type"]) for x in data["records"]} >= {("www.example.com.", "A"), ("example.com.", "SOA")}


def test_export_bind_uses_relative_names_and_comments_aliases(client, zone):
    client.post(f"{url(zone)}/records", json={"name": "www", "type": "A", "values": ["1.1.1.1", "2.2.2.2"], "ttl": 60})
    client.post(f"{url(zone)}/records", json={"name": "cdn", "type": "A", "alias_target": "d1.cloudfront.net"})
    text = client.get(f"{url(zone)}/export", params={"format": "bind"}).text
    assert "$ORIGIN example.com." in text
    assert "www\t60\tIN\tA\t1.1.1.1" in text and "www\t60\tIN\tA\t2.2.2.2" in text
    assert "; ALIAS cdn A -> d1.cloudfront.net." in text
    assert "@\t900\tIN\tSOA\t" in text


def test_export_rejects_unknown_format_and_missing_zone(client, zone):
    assert client.get(f"{url(zone)}/export", params={"format": "yaml"}).status_code == 422
    assert client.get("/api/hosted-zones/ZNOPE/export").status_code == 404


def test_bind_round_trip(client, zone):
    client.post(f"{url(zone)}/records/import", json={"content": SAMPLE})
    before = {k: v["values"] for k, v in records_by_key(client, zone).items() if not v["is_system"]}
    exported = client.get(f"{url(zone)}/export", params={"format": "bind"}).text

    ids = [r["id"] for r in records_by_key(client, zone).values() if not r["is_system"]]
    assert client.post(f"{url(zone)}/records/batch-delete", json={"ids": ids}).status_code == 200
    result = client.post(f"{url(zone)}/records/import", json={"content": exported}).json()

    after = {k: v["values"] for k, v in records_by_key(client, zone).items() if not v["is_system"]}
    assert after == before
    assert result["created"] == len(before)
