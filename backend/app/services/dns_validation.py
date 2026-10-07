"""Name and value validation for DNS records.

Every parser returns the canonical text form stored in the database
(e.g. ``10 mail.example.com.``) and raises ``ValueError`` with a user-facing message.
"""
import ipaddress
import re

from app.core.errors import ValidationFailed

LABEL_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
RECORD_LABEL_RE = re.compile(r"^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?$")
CAA_TAGS = ("issue", "issuewild", "iodef")
ALIAS_TYPES = ("A", "AAAA", "CNAME")
USER_RECORD_TYPES = ("A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA")
MAX_TTL = 2_147_483_647


def _fqdn(name: str, *, allow_underscore: bool, allow_wildcard: bool) -> str:
    value = name.strip().lower()
    if not value:
        raise ValueError("A domain name is required.")
    value = value.rstrip(".")
    if len(value) > 253:
        raise ValueError("Domain names cannot be longer than 253 characters.")
    labels = value.split(".")
    pattern = RECORD_LABEL_RE if allow_underscore else LABEL_RE
    for i, label in enumerate(labels):
        if label == "*" and i == 0 and allow_wildcard and len(labels) > 1:
            continue
        if not label:
            raise ValueError("Domain names cannot contain empty labels (consecutive dots).")
        if len(label) > 63:
            raise ValueError(f"Label '{label[:12]}…' is longer than 63 characters.")
        if not pattern.match(label):
            raise ValueError(f"Label '{label}' contains invalid characters or starts/ends with a hyphen.")
    return value + "."


def normalize_zone_name(name: str) -> str:
    fqdn = _fqdn(name, allow_underscore=False, allow_wildcard=False)
    if "." not in fqdn.rstrip("."):
        raise ValueError("Enter a domain with at least two labels, for example example.com.")
    return fqdn


def normalize_hostname(value: str) -> str:
    return _fqdn(value, allow_underscore=True, allow_wildcard=False)


def normalize_record_name(name: str, zone_name: str) -> str:
    """Resolve a user-entered name (relative, absolute or '@') to a FQDN inside the zone."""
    raw = name.strip().lower()
    if raw in ("", "@"):
        return zone_name
    fqdn = _fqdn(raw, allow_underscore=True, allow_wildcard=True)
    # A name that doesn't already end in the zone is treated as relative to it.
    if not raw.endswith(".") and fqdn != zone_name and not fqdn.endswith("." + zone_name):
        fqdn = _fqdn(f"{raw}.{zone_name}", allow_underscore=True, allow_wildcard=True)
    if fqdn != zone_name and not fqdn.endswith("." + zone_name):
        raise ValueError(f"The record name must end with the hosted zone name ({zone_name.rstrip('.')}).")
    return fqdn


def _int_in(text: str, label: str, low: int, high: int) -> int:
    if not re.fullmatch(r"\d+", text):
        raise ValueError(f"{label} must be a whole number between {low} and {high}.")
    n = int(text)
    if not low <= n <= high:
        raise ValueError(f"{label} must be between {low} and {high}.")
    return n


def _parse_a(v: str) -> str:
    try:
        return str(ipaddress.IPv4Address(v.strip()))
    except ValueError:
        raise ValueError(f"'{v.strip()}' is not a valid IPv4 address.") from None


def _parse_aaaa(v: str) -> str:
    try:
        return ipaddress.IPv6Address(v.strip()).compressed
    except ValueError:
        raise ValueError(f"'{v.strip()}' is not a valid IPv6 address.") from None


def _parse_host(v: str) -> str:
    return normalize_hostname(v)


def _parse_mx(v: str) -> str:
    parts = v.split()
    if len(parts) != 2:
        raise ValueError("MX values must look like '<priority> <mail server>', for example '10 mail.example.com'.")
    prio = _int_in(parts[0], "MX priority", 0, 65535)
    return f"{prio} {normalize_hostname(parts[1])}"


def _parse_srv(v: str) -> str:
    parts = v.split()
    if len(parts) != 4:
        raise ValueError("SRV values must look like '<priority> <weight> <port> <target>'.")
    prio = _int_in(parts[0], "SRV priority", 0, 65535)
    weight = _int_in(parts[1], "SRV weight", 0, 65535)
    port = _int_in(parts[2], "SRV port", 0, 65535)
    return f"{prio} {weight} {port} {normalize_hostname(parts[3])}"


def _parse_caa(v: str) -> str:
    match = re.fullmatch(r'\s*(\d+)\s+([A-Za-z]+)\s+(.+?)\s*', v)
    if not match:
        raise ValueError('CAA values must look like \'<flags> <tag> "<value>"\', for example \'0 issue "letsencrypt.org"\'.')
    flags = _int_in(match.group(1), "CAA flags", 0, 255)
    tag = match.group(2).lower()
    if tag not in CAA_TAGS:
        raise ValueError(f"CAA tag must be one of: {', '.join(CAA_TAGS)}.")
    value = match.group(3)
    if len(value) >= 2 and value[0] == value[-1] == '"':
        value = value[1:-1]
    if '"' in value:
        raise ValueError("CAA value cannot contain quotation marks.")
    return f'{flags} {tag} "{value}"'


def _parse_txt(v: str) -> str:
    text = v.strip()
    if len(text) >= 2 and text[0] == text[-1] == '"':
        text = text[1:-1]
    if not text:
        raise ValueError("TXT value cannot be empty.")
    if len(text) > 4000:
        raise ValueError("TXT value cannot be longer than 4000 characters.")
    text = re.sub(r'(?<!\\)"', r'\\"', text)
    # A single DNS string holds at most 255 bytes, so longer text is split into chunks.
    chunks = [text[i : i + 255] for i in range(0, len(text), 255)]
    return " ".join(f'"{c}"' for c in chunks)


_PARSERS = {
    "A": _parse_a,
    "AAAA": _parse_aaaa,
    "CNAME": _parse_host,
    "NS": _parse_host,
    "PTR": _parse_host,
    "MX": _parse_mx,
    "SRV": _parse_srv,
    "CAA": _parse_caa,
    "TXT": _parse_txt,
}


def normalize_values(record_type: str, values: list[str]) -> list[str]:
    parser = _PARSERS.get(record_type)
    if parser is None:
        raise ValidationFailed(
            f"Records of type {record_type} cannot be managed here.", details=[{"field": "type", "message": "Unsupported record type."}]
        )
    cleaned = [v for v in values if v and v.strip()]
    if not cleaned:
        raise ValidationFailed("At least one value is required.", details=[{"field": "values", "message": "Enter at least one value."}])
    out: list[str] = []
    errors: list[dict[str, str]] = []
    for i, raw in enumerate(cleaned):
        try:
            parsed = parser(raw)
        except ValueError as exc:
            errors.append({"field": f"values.{i}", "message": str(exc)})
            continue
        if parsed not in out:
            out.append(parsed)
    if errors:
        raise ValidationFailed("One or more values are invalid.", details=errors)
    if record_type in ("CNAME", "PTR") and len(out) != 1:
        raise ValidationFailed(
            f"{record_type} records must have exactly one value.", details=[{"field": "values", "message": "Enter a single value."}]
        )
    return out


def validate_ttl(ttl: int | None) -> int:
    if ttl is None:
        return 300
    if not 0 <= ttl <= MAX_TTL:
        raise ValidationFailed("Invalid TTL.", details=[{"field": "ttl", "message": f"TTL must be between 0 and {MAX_TTL}."}])
    return ttl
