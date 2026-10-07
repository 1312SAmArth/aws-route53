"""Export a hosted zone as JSON or BIND zone-file text, and import records from BIND text.

Import never writes anything itself: every parsed record goes through record_service, so it is
validated exactly like a record created through the API.
"""
import re
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError, ValidationFailed
from app.models import DnsRecord, HostedZone
from app.schemas.record import RecordCreate
from app.services import record_service
from app.services.dns_validation import USER_RECORD_TYPES
from app.services.hosted_zone_service import get_zone_model, name_servers_for

MAX_IMPORT_BYTES = 256 * 1024
MAX_IMPORT_RECORDS = 500



def _relative(name: str, origin: str) -> str:
    if name == origin:
        return "@"
    return name[: -len(origin) - 1] if name.endswith("." + origin) else name


def export_json(zone: HostedZone, records: list[DnsRecord]) -> dict:
    return {
        "id": zone.id,
        "name": zone.name,
        "type": zone.type,
        "comment": zone.comment,
        "name_servers": name_servers_for(zone.id),
        "records": [
            {
                "name": r.name,
                "type": r.type,
                "ttl": r.ttl,
                "values": r.values,
                "routing_policy": r.routing_policy,
                "set_identifier": r.set_identifier or None,
                "weight": r.weight,
                "alias_target": r.alias_target,
                "comment": r.comment,
            }
            for r in records
        ],
    }


def export_bind(zone: HostedZone, records: list[DnsRecord]) -> str:
    lines = [f"; Exported from Route 53 clone: hosted zone {zone.name} ({zone.id})", f"$ORIGIN {zone.name}", "$TTL 300"]
    for r in records:
        label = _relative(r.name, zone.name)
        if r.alias_target:
            # BIND has no alias concept; keep the information as a comment rather than inventing a record.
            lines.append(f"; ALIAS {label} {r.type} -> {r.alias_target} (not representable in BIND)")
            continue
        if r.routing_policy == "WEIGHTED":
            lines.append(f"; weighted record: id={r.set_identifier} weight={r.weight}")
        lines.extend(f"{label}\t{r.ttl}\tIN\t{r.type}\t{value}" for value in r.values)
    return "\n".join(lines) + "\n"


def load_records(db: Session, zone_id: str) -> tuple[HostedZone, list[DnsRecord]]:
    zone = get_zone_model(db, zone_id)
    stmt = (
        select(DnsRecord)
        .where(DnsRecord.hosted_zone_id == zone_id)
        .order_by(DnsRecord.name, DnsRecord.type, DnsRecord.set_identifier)
    )
    records = list(db.scalars(stmt))
    return zone, records


_TOKEN = re.compile(r'"(?:[^"\\]|\\.)*"|[^\s"]+')


@dataclass
class ParsedRecord:
    line: int
    name: str
    type: str
    ttl: int | None
    rdata: str


@dataclass
class ImportResult:
    created: int = 0
    skipped: list[dict] = field(default_factory=list)


def _strip_comment(line: str) -> str:
    in_quotes = False
    escaped = False
    for i, ch in enumerate(line):
        if escaped:
            escaped = False
        elif ch == "\\":
            escaped = True
        elif ch == '"':
            in_quotes = not in_quotes
        elif ch == ";" and not in_quotes:
            return line[:i]
    return line


def _logical_lines(text: str) -> list[tuple[int, str]]:
    """Join lines inside ( … ) groups, which BIND uses for multi-line records such as SOA."""
    out: list[tuple[int, str]] = []
    buffer = ""
    start = 0
    depth = 0
    for number, raw in enumerate(text.splitlines(), start=1):
        line = _strip_comment(raw).rstrip()
        if not line.strip() and depth == 0:
            continue
        if depth == 0:
            start = number
            buffer = line
        else:
            buffer += " " + line.strip()
        stripped = re.sub(r'"(?:[^"\\]|\\.)*"', "", line)
        depth += stripped.count("(") - stripped.count(")")
        if depth <= 0:
            depth = 0
            out.append((start, buffer.replace("(", " ").replace(")", " ")))
            buffer = ""
    if depth > 0 and buffer:
        out.append((start, buffer.replace("(", " ").replace(")", " ")))
    return out


def _rdata_for(record_type: str, rest: str) -> str:
    if record_type == "TXT":
        chunks = [t[1:-1] for t in _TOKEN.findall(rest) if len(t) >= 2 and t[0] == t[-1] == '"']
        return "".join(chunks) if chunks else rest.strip()
    return rest.strip()


def parse_bind(text: str, zone_name: str) -> tuple[list[ParsedRecord], list[dict]]:
    origin = zone_name
    default_ttl: int | None = None
    last_name = zone_name
    parsed: list[ParsedRecord] = []
    skipped: list[dict] = []

    def resolve(name: str) -> str:
        if name == "@":
            return origin
        return name if name.endswith(".") else f"{name}.{origin}"

    for number, line in _logical_lines(text):
        tokens = list(_TOKEN.finditer(line))
        if not tokens:
            continue
        first = tokens[0].group()
        if first.upper() == "$ORIGIN":
            if len(tokens) >= 2 and tokens[1].group().endswith("."):
                origin = tokens[1].group().lower()
            else:
                skipped.append({"line": number, "reason": "$ORIGIN must be an absolute name ending in a dot."})
            continue
        if first.upper() == "$TTL":
            if len(tokens) >= 2 and tokens[1].group().isdigit():
                default_ttl = int(tokens[1].group())
            else:
                skipped.append({"line": number, "reason": "$TTL must be a number of seconds."})
            continue
        if first.startswith("$"):
            skipped.append({"line": number, "reason": f"Unsupported directive {first}."})
            continue

        index = 0
        if line[0].isspace():
            name = last_name
        else:
            name = resolve(first.lower())
            last_name = name
            index = 1

        ttl = default_ttl
        while index < len(tokens):
            token = tokens[index].group()
            if token.isdigit():
                ttl = int(token)
            elif token.upper() != "IN":
                break
            index += 1
        if index >= len(tokens):
            skipped.append({"line": number, "reason": "No record type found."})
            continue

        record_type = tokens[index].group().upper()
        rest = line[tokens[index].end() :]
        if record_type not in USER_RECORD_TYPES:
            skipped.append({"line": number, "reason": f"Record type {record_type} is not supported."})
            continue
        if not rest.strip():
            skipped.append({"line": number, "reason": "Missing record data."})
            continue
        parsed.append(ParsedRecord(number, name, record_type, ttl, _rdata_for(record_type, rest)))
    return parsed, skipped


def import_bind(db: Session, zone_id: str, content: str) -> ImportResult:
    if len(content.encode()) > MAX_IMPORT_BYTES:
        raise ValidationFailed(
            f"Zone files are limited to {MAX_IMPORT_BYTES // 1024} KB.",
            details=[{"field": "content", "message": "File too large."}],
        )
    zone = get_zone_model(db, zone_id)
    parsed, skipped = parse_bind(content, zone.name)
    if len(parsed) > MAX_IMPORT_RECORDS:
        raise ValidationFailed(
            f"Zone files are limited to {MAX_IMPORT_RECORDS} records.", details=[{"field": "content", "message": "Too many records."}]
        )

    # Lines with the same name and type are one record set with several values.
    groups: dict[tuple[str, str], list[ParsedRecord]] = {}
    for rec in parsed:
        groups.setdefault((rec.name, rec.type), []).append(rec)

    result = ImportResult(skipped=skipped)
    for (name, record_type), items in groups.items():
        line = items[0].line
        # The apex NS/SOA belong to Route 53 and already exist; importing them would be a conflict.
        if name == zone.name and record_type == "NS":
            result.skipped.append({"line": line, "reason": "The apex NS record is managed by Route 53."})
            continue
        payload = RecordCreate(name=name, type=record_type, ttl=items[0].ttl, values=[i.rdata for i in items])
        try:
            record_service.create_record(db, zone_id, payload)
            result.created += 1
        except AppError as exc:
            db.rollback()
            detail = "; ".join(d["message"] for d in exc.details) or exc.message
            result.skipped.append({"line": line, "reason": f"{record_type} {name.rstrip('.')}: {detail}"})
    result.skipped.sort(key=lambda s: s["line"])
    return result
