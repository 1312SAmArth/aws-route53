import hashlib
import secrets
import string
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, ValidationFailed
from app.models import DnsRecord, HostedZone
from app.schemas.hosted_zone import HostedZoneCreate, HostedZoneOut, HostedZoneUpdate
from app.services.dns_validation import normalize_zone_name

_ID_ALPHABET = string.ascii_uppercase + string.digits
_NS_TLDS = ("com", "net", "org", "co.uk")


def generate_zone_id() -> str:
    return "Z" + "".join(secrets.choice(_ID_ALPHABET) for _ in range(20))


def name_servers_for(zone_id: str) -> list[str]:
    """Deterministic fake delegation set, derived from the zone id."""
    digest = hashlib.sha256(zone_id.encode()).digest()
    return [
        f"ns-{int.from_bytes(digest[i * 4 : i * 4 + 2], 'big') % 2048}.awsdns-{digest[i * 4 + 2] % 64:02d}.{_NS_TLDS[i]}."
        for i in range(4)
    ]


def to_out(zone: HostedZone, record_count: int) -> HostedZoneOut:
    return HostedZoneOut(
        id=zone.id,
        name=zone.name,
        type=zone.type,  # type: ignore[arg-type]
        comment=zone.comment,
        vpc_id=zone.vpc_id or None,
        vpc_region=zone.vpc_region,
        created_by=zone.created_by,
        record_count=record_count,
        name_servers=name_servers_for(zone.id),
        created_at=zone.created_at,
        updated_at=zone.updated_at,
    )


def _record_count_subquery():
    return (
        select(func.count(DnsRecord.id))
        .where(DnsRecord.hosted_zone_id == HostedZone.id)
        .correlate(HostedZone)
        .scalar_subquery()
    )


def list_zones(
    db: Session, *, page: int, page_size: int, search: str | None, zone_type: str | None, sort: str, order: str
) -> tuple[list[HostedZoneOut], int]:
    stmt = select(HostedZone, _record_count_subquery().label("record_count"))
    if search and search.strip():
        term = search.strip().lower()
        stmt = stmt.where(
            func.lower(HostedZone.name).contains(term, autoescape=True)
            | func.lower(func.coalesce(HostedZone.comment, "")).contains(term, autoescape=True)
            | func.lower(HostedZone.id).contains(term, autoescape=True)
        )
    if zone_type:
        stmt = stmt.where(HostedZone.type == zone_type)
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    column = HostedZone.name if sort == "name" else HostedZone.created_at
    stmt = stmt.order_by(column.desc() if order == "desc" else column.asc(), HostedZone.id)
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return [to_out(z, c) for z, c in rows], total


def get_zone_model(db: Session, zone_id: str) -> HostedZone:
    zone = db.get(HostedZone, zone_id)
    if zone is None:
        raise NotFoundError("The hosted zone was not found.", code="HOSTED_ZONE_NOT_FOUND")
    return zone


def _count_records(db: Session, zone_id: str, *, user_only: bool = False) -> int:
    stmt = select(func.count(DnsRecord.id)).where(DnsRecord.hosted_zone_id == zone_id)
    if user_only:
        stmt = stmt.where(DnsRecord.is_system.is_(False))
    return db.scalar(stmt) or 0


def get_zone(db: Session, zone_id: str) -> HostedZoneOut:
    zone = get_zone_model(db, zone_id)
    return to_out(zone, _count_records(db, zone_id))


def add_default_records(zone: HostedZone) -> None:
    """Route 53 creates an apex NS and SOA record with every zone; users can't delete them."""
    servers = name_servers_for(zone.id)
    zone.records.append(DnsRecord(name=zone.name, type="NS", ttl=172800, values=servers, is_system=True))
    zone.records.append(
        DnsRecord(
            name=zone.name,
            type="SOA",
            ttl=900,
            values=[f"{servers[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"],
            is_system=True,
        )
    )


def create_zone(db: Session, data: HostedZoneCreate) -> HostedZoneOut:
    try:
        name = normalize_zone_name(data.name)
    except ValueError as exc:
        raise ValidationFailed(str(exc), details=[{"field": "name", "message": str(exc)}]) from None

    vpc_id = (data.vpc_id or "").strip()
    vpc_region = (data.vpc_region or "").strip()
    if data.type == "PRIVATE":
        problems = []
        if not vpc_id:
            problems.append({"field": "vpc_id", "message": "A VPC ID is required for private hosted zones."})
        if not vpc_region:
            problems.append({"field": "vpc_region", "message": "A VPC region is required for private hosted zones."})
        if problems:
            raise ValidationFailed("Private hosted zones must be associated with a VPC.", details=problems)
    else:
        vpc_id, vpc_region = "", ""

    exists = db.scalar(
        select(HostedZone.id).where(HostedZone.name == name, HostedZone.type == data.type, HostedZone.vpc_id == vpc_id)
    )
    if exists:
        raise ConflictError(
            f"A {data.type.lower()} hosted zone for {name.rstrip('.')} already exists.",
            code="HOSTED_ZONE_ALREADY_EXISTS",
            details=[{"field": "name", "message": "A hosted zone with this name already exists."}],
        )

    zone = HostedZone(
        id=generate_zone_id(),
        name=name,
        type=data.type,
        comment=(data.comment or "").strip() or None,
        vpc_id=vpc_id,
        vpc_region=vpc_region or None,
        caller_reference=str(uuid.uuid4()),
    )
    db.add(zone)
    add_default_records(zone)
    db.commit()
    return to_out(zone, 2)


def update_zone(db: Session, zone_id: str, data: HostedZoneUpdate) -> HostedZoneOut:
    zone = get_zone_model(db, zone_id)
    zone.comment = (data.comment or "").strip() or None
    db.commit()
    return to_out(zone, _count_records(db, zone_id))


def delete_zone(db: Session, zone_id: str, *, force: bool) -> None:
    zone = get_zone_model(db, zone_id)
    user_records = _count_records(db, zone_id, user_only=True)
    if user_records and not force:
        raise ConflictError(
            f"The hosted zone contains {user_records} record(s) other than the default NS and SOA records. Delete them first.",
            code="HOSTED_ZONE_NOT_EMPTY",
        )
    db.delete(zone)  # records go via ON DELETE CASCADE
    db.commit()
