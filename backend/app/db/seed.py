"""Demo data. Goes through the service layer so seeded records obey the same rules as API writes.

Usage: python -m app.db.seed [--reset]
"""
import sys
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base, utcnow
from app.models import HostedZone, User
from app.schemas.hosted_zone import HostedZoneCreate
from app.schemas.record import RecordCreate
from app.services import hosted_zone_service, record_service

ACCOUNT_ID = "512348907261"


def R(name: str, type: str, values: list[str] | None = None, ttl: int | None = 300, **extra) -> RecordCreate:
    return RecordCreate(name=name, type=type, values=values or [], ttl=ttl, **extra)


def weighted(name: str, ip: str, ident: str, weight: int) -> RecordCreate:
    return R(name, "A", [ip], 60, routing_policy="WEIGHTED", set_identifier=ident, weight=weight)


def alias(name: str, type: str, target: str) -> RecordCreate:
    return RecordCreate(name=name, type=type, alias_target=target, ttl=None, evaluate_target_health=True)


SPF = '"v=spf1 include:_spf.google.com include:amazonses.com ~all"'

ZONES: list[tuple[HostedZoneCreate, list[RecordCreate]]] = [
    (
        HostedZoneCreate(name="example.com", comment="Primary production domain"),
        [
            R("@", "A", ["93.184.216.34", "93.184.216.35"]),
            R("@", "AAAA", ["2606:2800:220:1:248:1893:25c8:1946"]),
            R("@", "MX", ["1 aspmx.l.google.com", "5 alt1.aspmx.l.google.com", "10 alt2.aspmx.l.google.com"], 3600),
            R("@", "TXT", [SPF, '"google-site-verification=rXOxyZounnZasA8Z7oaD3c14JdjS9aKSWvsR1EbUSIQ"'], 3600),
            R("@", "CAA", ['0 issue "letsencrypt.org"', '0 issue "amazon.com"', '0 iodef "mailto:security@example.com"'], 3600),
            R("www", "CNAME", ["example.com"], 300),
            R("blog", "CNAME", ["example.ghost.io"], 3600),
            R("docs", "CNAME", ["example.readthedocs.io"], 3600),
            R("shop", "CNAME", ["shops.myshopify.com"], 3600),
            R("mail", "A", ["198.51.100.25"], 3600),
            R("mail", "AAAA", ["2001:db8:85a3::8a2e:370:7334"], 3600),
            R("ftp", "A", ["198.51.100.40"], 86400),
            R("vpn", "A", ["203.0.113.12"], 300),
            R("_dmarc", "TXT", ['"v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"'], 3600),
            R("selector1._domainkey", "CNAME", ["selector1-example-com._domainkey.example.onmicrosoft.com"], 3600),
            R("_sip._tcp", "SRV", ["10 60 5060 sip1.example.com", "10 40 5060 sip2.example.com"], 3600),
            R("_xmpp-server._tcp", "SRV", ["5 0 5269 xmpp.example.com"], 3600),
            R("sip1", "A", ["203.0.113.50"], 3600),
            R("sip2", "A", ["203.0.113.51"], 3600),
            R("xmpp", "A", ["203.0.113.60"], 3600),
            weighted("api", "198.51.100.10", "blue", 80),
            weighted("api", "198.51.100.11", "green", 20),
            alias("cdn", "A", "d111111abcdef8.cloudfront.net"),
            alias("static", "AAAA", "d111111abcdef8.cloudfront.net"),
            R("*.dev", "A", ["10.20.30.40"], 60),
            R("dev", "NS", ["ns-1536.awsdns-00.co.uk", "ns-0.awsdns-00.com"], 172800),
            R("status", "CNAME", ["stats.uptimerobot.com"], 600),
        ],
    ),
    (
        HostedZoneCreate(name="acme-corp.io", comment="Acme Corp marketing site and app"),
        [
            R("@", "A", ["104.18.32.7", "172.64.155.249"]),
            R("@", "MX", ["10 mx.zoho.com", "20 mx2.zoho.com"], 3600),
            R("@", "TXT", ['"v=spf1 include:zoho.com ~all"'], 3600),
            R("@", "CAA", ['0 issue "digicert.com"'], 3600),
            R("www", "CNAME", ["acme-corp.io"]),
            R("app", "CNAME", ["acme-app.herokuapp.com"], 300),
            R("careers", "CNAME", ["acme.workable.com"], 3600),
            R("_dmarc", "TXT", ['"v=DMARC1; p=none; rua=mailto:reports@acme-corp.io"'], 3600),
            R("help", "CNAME", ["acme.zendesk.com"], 3600),
        ],
    ),
    (
        HostedZoneCreate(name="shopfront.dev", comment="E-commerce storefront"),
        [
            R("@", "A", ["75.2.60.5"]),
            R("www", "CNAME", ["shopfront.dev"]),
            R("admin", "A", ["52.14.119.201"], 120),
            R("checkout", "A", ["52.14.119.202", "52.14.119.203"], 60),
            R("@", "TXT", ['"stripe-verification=4f9d2a7b1c"'], 3600),
            R("@", "CAA", ['0 issue "amazon.com"', '0 issuewild ";"'], 3600),
            R("images", "CNAME", ["shopfront.b-cdn.net"], 3600),
        ],
    ),
    (
        HostedZoneCreate(name="api.payments-gateway.com", comment="Payments API (PCI scope)"),
        [
            R("@", "A", ["35.171.20.5", "35.171.20.6", "35.171.20.7"], 60),
            R("v1", "A", ["35.171.21.10"], 60),
            R("v2", "A", ["35.171.22.10"], 60),
            R("webhooks", "A", ["35.171.23.10"], 60),
            R("@", "CAA", ['0 issue "digicert.com"', '0 iodef "mailto:secops@payments-gateway.com"'], 3600),
            R("@", "AAAA", ["2600:1f18:2148:bc00::1"], 60),
        ],
    ),
    (
        HostedZoneCreate(name="staticassets.net", comment="Static asset CDN"),
        [
            alias("@", "A", "d2abcdefghijk.cloudfront.net"),
            alias("@", "AAAA", "d2abcdefghijk.cloudfront.net"),
            R("img", "CNAME", ["d2abcdefghijk.cloudfront.net"], 300),
            R("fonts", "CNAME", ["d2abcdefghijk.cloudfront.net"], 300),
            R("@", "TXT", ['"asset-pipeline=v3"'], 3600),
        ],
    ),
    (
        HostedZoneCreate(name="mail-relay.org", comment="Outbound mail relay"),
        [
            R("@", "MX", ["10 relay1.mail-relay.org", "10 relay2.mail-relay.org"], 3600),
            R("relay1", "A", ["192.0.2.25"], 3600),
            R("relay2", "A", ["192.0.2.26"], 3600),
            R("relay1", "AAAA", ["2001:db8::25"], 3600),
            R("@", "TXT", ['"v=spf1 ip4:192.0.2.25 ip4:192.0.2.26 -all"'], 3600),
            R("mail._domainkey", "TXT", ['"v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7"'], 3600),
        ],
    ),
    (
        HostedZoneCreate(name="blog.writers.page", comment="Writers collective blog"),
        [
            R("@", "A", ["185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153"]),
            R("www", "CNAME", ["writers-page.github.io"]),
            R("@", "TXT", ['"github-pages-verification=7d8e1f"'], 3600),
        ],
    ),
    (
        HostedZoneCreate(name="iot-telemetry.cloud", comment="IoT device telemetry ingestion"),
        [
            R("ingest", "A", ["54.230.10.1", "54.230.10.2"], 60),
            R("mqtt", "A", ["54.230.11.1"], 60),
            R("_mqtt._tcp", "SRV", ["0 5 8883 mqtt.iot-telemetry.cloud"], 300),
            R("@", "CAA", ['0 issue "amazon.com"'], 3600),
        ],
    ),
    (
        HostedZoneCreate(name="status.example.org", comment="Public status page"),
        [
            R("@", "A", ["54.146.12.88"], 300),
            R("history", "CNAME", ["status.example.org"], 300),
        ],
    ),
    (
        HostedZoneCreate(
            name="internal.corp.local",
            type="PRIVATE",
            comment="Internal service discovery",
            vpc_id="vpc-0a1b2c3d4e5f67890",
            vpc_region="us-east-1",
        ),
        [
            R("db-primary", "A", ["10.0.1.15"], 60),
            R("db-replica", "A", ["10.0.2.15"], 60),
            R("cache", "A", ["10.0.1.40", "10.0.2.40"], 60),
            R("ldap", "CNAME", ["dc01.internal.corp.local"], 300),
            R("dc01", "A", ["10.0.0.5"], 300),
            R("_ldap._tcp", "SRV", ["0 100 389 dc01.internal.corp.local"], 300),
        ],
    ),
    (
        HostedZoneCreate(
            name="db.prod.internal",
            type="PRIVATE",
            comment="Production database endpoints",
            vpc_id="vpc-0f9e8d7c6b5a43210",
            vpc_region="eu-west-1",
        ),
        [
            R("orders", "A", ["10.1.4.20"], 30),
            R("users", "A", ["10.1.4.21"], 30),
            R("analytics", "CNAME", ["analytics.cluster-abc123.eu-west-1.rds.amazonaws.com"], 30),
        ],
    ),
    (
        HostedZoneCreate(name="10.in-addr.arpa", comment="Reverse lookup for 10.0.0.0/8"),
        [
            R("5.0.0", "PTR", ["dc01.internal.corp.local"], 3600),
            R("15.1.0", "PTR", ["db-primary.internal.corp.local"], 3600),
            R("15.2.0", "PTR", ["db-replica.internal.corp.local"], 3600),
            R("20.4.1", "PTR", ["orders.db.prod.internal"], 3600),
        ],
    ),
]


def _seed_user(db: Session) -> None:
    settings = get_settings()
    db.add(User(username=settings.demo_username, password_hash=hash_password(settings.demo_password), account_id=ACCOUNT_ID))
    db.commit()


def seed(db: Session) -> None:
    _seed_user(db)
    now = utcnow()
    for index, (zone_data, recs) in enumerate(ZONES):
        zone = hosted_zone_service.create_zone(db, zone_data)
        db_zone = db.get(HostedZone, zone.id)
        db_zone.created_at = now - timedelta(days=210 - index * 17, hours=index * 3)
        db.commit()
        for rec in recs:
            record_service.create_record(db, zone.id, rec)


def seed_if_empty(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)) is None:
        seed(db)


def reset() -> None:
    from app.db.session import SessionLocal, engine

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset()
    else:
        from app.db.session import SessionLocal, engine

        Base.metadata.create_all(engine)
        with SessionLocal() as db:
            seed_if_empty(db)
    print("Database seeded.")
