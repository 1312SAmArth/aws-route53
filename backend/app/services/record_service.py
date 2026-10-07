from dataclasses import dataclass

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from app.core.errors import AppError, ConflictError, NotFoundError, ValidationFailed
from app.models import DnsRecord, HostedZone
from app.schemas.record import RecordCreate, RecordUpdate
from app.services import dns_validation as dv
from app.services.hosted_zone_service import get_zone_model


@dataclass
class RecordFields:
    """Validated, canonical field values ready to be written to a DnsRecord."""

    name: str
    type: str
    ttl: int | None
    values: list[str]
    routing_policy: str
    set_identifier: str
    weight: int | None
    alias_target: str | None
    evaluate_target_health: bool
    comment: str | None


def _fail(field: str, message: str) -> ValidationFailed:
    return ValidationFailed(message, details=[{"field": field, "message": message}])


def _build_fields(zone: HostedZone, raw: dict) -> RecordFields:
    """Validate a complete record payload. The backend is the source of truth for every rule."""
    record_type = (raw["type"] or "").strip().upper()
    if record_type not in dv.USER_RECORD_TYPES:
        raise _fail("type", f"'{raw['type']}' is not a supported record type. Use one of: {', '.join(dv.USER_RECORD_TYPES)}.")

    try:
        name = dv.normalize_record_name(raw["name"] or "", zone.name)
    except ValueError as exc:
        raise _fail("name", str(exc)) from None

    policy = raw["routing_policy"] or "SIMPLE"
    set_identifier = (raw["set_identifier"] or "").strip()
    weight = raw["weight"]
    if policy == "WEIGHTED":
        if not set_identifier:
            raise _fail("set_identifier", "A record ID is required for weighted routing.")
        if weight is None or not 0 <= weight <= 255:
            raise _fail("weight", "Weight must be a number between 0 and 255.")
    else:
        if set_identifier:
            raise _fail("set_identifier", "A record ID is only valid with weighted routing.")
        weight = None

    alias_target = (raw["alias_target"] or "").strip() or None
    if alias_target:
        if record_type not in dv.ALIAS_TYPES:
            raise _fail("alias_target", f"Alias records are only supported for {', '.join(dv.ALIAS_TYPES)} records.")
        if raw["values"]:
            raise _fail("values", "An alias record cannot also have values.")
        if raw["ttl"] is not None:
            raise _fail("ttl", "Alias records use the target's TTL; leave TTL empty.")
        try:
            alias_target = dv.normalize_hostname(alias_target)
        except ValueError as exc:
            raise _fail("alias_target", str(exc)) from None
        values: list[str] = []
        ttl = None
    else:
        values = dv.normalize_values(record_type, raw["values"] or [])
        ttl = dv.validate_ttl(raw["ttl"])

    if record_type == "CNAME" and name == zone.name:
        raise _fail("name", "A CNAME record cannot be created at the zone apex.")

    return RecordFields(
        name=name,
        type=record_type,
        ttl=ttl,
        values=values,
        routing_policy=policy,
        set_identifier=set_identifier,
        weight=weight,
        alias_target=alias_target,
        evaluate_target_health=bool(raw["evaluate_target_health"]) if alias_target else False,
        comment=(raw["comment"] or "").strip() or None,
    )


def _check_conflicts(db: Session, zone_id: str, fields: RecordFields, *, exclude_id: int | None) -> None:
    stmt = select(DnsRecord).where(DnsRecord.hosted_zone_id == zone_id, DnsRecord.name == fields.name)
    if exclude_id is not None:
        stmt = stmt.where(DnsRecord.id != exclude_id)
    for other in db.scalars(stmt):
        if other.type == fields.type:
            if other.set_identifier == fields.set_identifier:
                raise ConflictError(
                    "A record with this name, type and record ID already exists.",
                    code="RECORD_ALREADY_EXISTS",
                    details=[{"field": "name", "message": "A record with this name and type already exists."}],
                )
            if other.routing_policy != fields.routing_policy:
                raise ConflictError(
                    "Records with the same name and type must use the same routing policy.", code="ROUTING_POLICY_CONFLICT"
                )
        elif fields.type == "CNAME" or other.type == "CNAME":
            raise ConflictError(
                "A CNAME record cannot coexist with other record types of the same name.",
                code="CNAME_CONFLICT",
                details=[{"field": "name", "message": "This name is already used by a record of a different type."}],
            )


def get_record(db: Session, record_id: int) -> DnsRecord:
    record = db.get(DnsRecord, record_id)
    if record is None:
        raise NotFoundError("The record was not found.", code="RECORD_NOT_FOUND")
    return record


def list_records(
    db: Session,
    zone_id: str,
    *,
    page: int,
    page_size: int,
    search: str | None,
    record_type: str | None,
    routing_policy: str | None,
    alias: bool | None = None,
) -> tuple[list[DnsRecord], int]:
    get_zone_model(db, zone_id)
    stmt = select(DnsRecord).where(DnsRecord.hosted_zone_id == zone_id)
    if search and search.strip():
        term = search.strip().lower()
        stmt = stmt.where(
            func.lower(DnsRecord.name).contains(term, autoescape=True)
            | func.lower(cast(DnsRecord.values, String)).contains(term, autoescape=True)
            | func.lower(func.coalesce(DnsRecord.alias_target, "")).contains(term, autoescape=True)
        )
    if record_type:
        stmt = stmt.where(DnsRecord.type == record_type.upper())
    if routing_policy:
        stmt = stmt.where(DnsRecord.routing_policy == routing_policy)
    if alias is not None:
        stmt = stmt.where(DnsRecord.alias_target.is_not(None) if alias else DnsRecord.alias_target.is_(None))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(DnsRecord.name, DnsRecord.type, DnsRecord.set_identifier).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(stmt)), total


def create_record(db: Session, zone_id: str, data: RecordCreate) -> DnsRecord:
    zone = get_zone_model(db, zone_id)
    fields = _build_fields(zone, data.model_dump())
    _check_conflicts(db, zone_id, fields, exclude_id=None)
    record = DnsRecord(hosted_zone_id=zone_id, **fields.__dict__)
    db.add(record)
    db.commit()
    return record


def update_record(db: Session, record_id: int, data: RecordUpdate) -> DnsRecord:
    record = get_record(db, record_id)
    zone = get_zone_model(db, record.hosted_zone_id)
    changes = data.model_dump(exclude_unset=True)

    if record.is_system:
        return _update_system_record(db, record, changes)

    merged = {**_to_raw(record), **changes}
    if changes.get("alias_target"):  # becoming (or staying) an alias
        merged["values"] = changes.get("values") or []
        merged["ttl"] = changes.get("ttl")
    elif changes.get("values") and "alias_target" not in changes:  # alias -> standard
        merged["alias_target"] = None

    fields = _build_fields(zone, merged)
    _check_conflicts(db, zone.id, fields, exclude_id=record.id)
    for key, value in fields.__dict__.items():
        setattr(record, key, value)
    db.commit()
    return record


def _update_system_record(db: Session, record: DnsRecord, changes: dict) -> DnsRecord:
    """The default apex records allow only a TTL change (and NS values); everything else is locked."""
    allowed = {"ttl"} if record.type == "SOA" else {"ttl", "values"}
    if set(changes) - allowed:
        raise AppError(
            "The default NS and SOA records can only have their TTL (and NS values) changed.",
            code="SYSTEM_RECORD_PROTECTED",
        )
    if "values" in changes:
        record.values = dv.normalize_values("NS", changes["values"] or [])
    if "ttl" in changes:
        record.ttl = dv.validate_ttl(changes["ttl"])
    db.commit()
    return record


def _to_raw(record: DnsRecord) -> dict:
    return {
        "name": record.name,
        "type": record.type,
        "ttl": record.ttl,
        "values": list(record.values),
        "routing_policy": record.routing_policy,
        "set_identifier": record.set_identifier,
        "weight": record.weight,
        "alias_target": record.alias_target,
        "evaluate_target_health": record.evaluate_target_health,
        "comment": record.comment,
    }


def _protected() -> AppError:
    return AppError("The default NS and SOA records of a hosted zone cannot be deleted.", code="SYSTEM_RECORD_PROTECTED")


def delete_record(db: Session, record_id: int) -> None:
    record = get_record(db, record_id)
    if record.is_system:
        raise _protected()
    db.delete(record)
    db.commit()


def batch_delete(db: Session, zone_id: str, ids: list[int]) -> int:
    get_zone_model(db, zone_id)
    records = list(db.scalars(select(DnsRecord).where(DnsRecord.hosted_zone_id == zone_id, DnsRecord.id.in_(set(ids)))))
    if len(records) != len(set(ids)):
        raise NotFoundError("One or more records were not found in this hosted zone.", code="RECORD_NOT_FOUND")
    if any(r.is_system for r in records):
        raise _protected()
    for record in records:
        db.delete(record)
    db.commit()
    return len(records)
