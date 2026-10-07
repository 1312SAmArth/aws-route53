import type { RecordType } from "./types";
import {
  CAA_TAGS,
  validateHostname,
  validateIPv4,
  validateIPv6,
  validateIntInRange,
} from "./validation";

export type ValueKind = "lines" | "mx" | "srv" | "caa";

export interface RecordTypeMeta {
  type: RecordType;
  description: string;
  kind: ValueKind;
  label: string;
  placeholder: string;
  help: string;
  aliasable: boolean;
}

export const RECORD_TYPE_META: Record<RecordType, RecordTypeMeta> = {
  A: {
    type: "A",
    description: "Routes traffic to an IPv4 address and some AWS resources",
    kind: "lines",
    label: "Value",
    placeholder: "192.0.2.235",
    help: "Enter one IPv4 address per line.",
    aliasable: true,
  },
  AAAA: {
    type: "AAAA",
    description: "Routes traffic to an IPv6 address and some AWS resources",
    kind: "lines",
    label: "Value",
    placeholder: "2001:0db8:85a3:0:0:8a2e:0370:7334",
    help: "Enter one IPv6 address per line.",
    aliasable: true,
  },
  CNAME: {
    type: "CNAME",
    description: "Routes traffic to another domain name and to some AWS resources",
    kind: "lines",
    label: "Value",
    placeholder: "www.example.com",
    help: "Enter a single domain name. A CNAME can't be created at the zone apex.",
    aliasable: true,
  },
  TXT: {
    type: "TXT",
    description: "Used to verify email senders and for application-specific values",
    kind: "lines",
    label: "Value",
    placeholder: "v=spf1 include:_spf.example.com ~all",
    help: "Enter one text value per line. Values longer than 255 characters are split automatically.",
    aliasable: false,
  },
  MX: {
    type: "MX",
    description: "Routes traffic to mail servers",
    kind: "mx",
    label: "Mail servers",
    placeholder: "mail.example.com",
    help: "Lower priority numbers are tried first.",
    aliasable: false,
  },
  NS: {
    type: "NS",
    description: "Identifies the name servers for a subdomain",
    kind: "lines",
    label: "Value",
    placeholder: "ns-1.example.net",
    help: "Enter one name server per line.",
    aliasable: false,
  },
  PTR: {
    type: "PTR",
    description: "Maps an IP address to a domain name (reverse DNS)",
    kind: "lines",
    label: "Value",
    placeholder: "host.example.com",
    help: "Enter a single domain name.",
    aliasable: false,
  },
  SRV: {
    type: "SRV",
    description: "Specifies the host and port of a service, such as SIP",
    kind: "srv",
    label: "Services",
    placeholder: "sip.example.com",
    help: "Use names like _sip._tcp for the record name.",
    aliasable: false,
  },
  CAA: {
    type: "CAA",
    description: "Restricts which certificate authorities may issue certificates",
    kind: "caa",
    label: "Authorities",
    placeholder: "letsencrypt.org",
    help: "Tag issue and issuewild take a CA domain; iodef takes a URL or mailto: address.",
    aliasable: false,
  },
};

export interface MxRow {
  priority: string;
  host: string;
}
export interface SrvRow {
  priority: string;
  weight: string;
  port: string;
  target: string;
}
export interface CaaRow {
  flags: string;
  tag: string;
  value: string;
}

export interface ValueDraft {
  lines: string;
  mx: MxRow[];
  srv: SrvRow[];
  caa: CaaRow[];
}

export const emptyMx = (): MxRow => ({ priority: "10", host: "" });
export const emptySrv = (): SrvRow => ({ priority: "10", weight: "10", port: "", target: "" });
export const emptyCaa = (): CaaRow => ({ flags: "0", tag: "issue", value: "" });

export function emptyDraft(): ValueDraft {
  return { lines: "", mx: [emptyMx()], srv: [emptySrv()], caa: [emptyCaa()] };
}

/** Undo the canonical TXT quoting so the user edits plain text. */
function unquoteTxt(value: string): string {
  const chunks = [...value.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1].replace(/\\(.)/g, "$1"));
  return chunks.length ? chunks.join("") : value;
}

export function draftFromValues(type: RecordType, values: string[]): ValueDraft {
  const draft = emptyDraft();
  if (values.length === 0) return draft;
  switch (RECORD_TYPE_META[type].kind) {
    case "mx":
      draft.mx = values.map((v) => {
        const [priority = "", host = ""] = v.split(/\s+/);
        return { priority, host };
      });
      break;
    case "srv":
      draft.srv = values.map((v) => {
        const [priority = "", weight = "", port = "", target = ""] = v.split(/\s+/);
        return { priority, weight, port, target };
      });
      break;
    case "caa":
      draft.caa = values.map((v) => {
        const m = v.match(/^(\d+)\s+(\S+)\s+"?(.*?)"?$/);
        return m ? { flags: m[1], tag: m[2], value: m[3] } : emptyCaa();
      });
      break;
    default:
      draft.lines = values.map((v) => (type === "TXT" ? unquoteTxt(v) : v)).join("\n");
  }
  return draft;
}

const blank = (...parts: string[]) => parts.every((p) => p.trim() === "");

export interface SerializedValues {
  values: string[];
  sourceIndex: number[];
}

export function serializeDraft(type: RecordType, draft: ValueDraft): SerializedValues {
  const values: string[] = [];
  const sourceIndex: number[] = [];
  const push = (value: string, index: number) => {
    values.push(value);
    sourceIndex.push(index);
  };
  switch (RECORD_TYPE_META[type].kind) {
    case "mx":
      draft.mx.forEach((r, i) => !blank(r.host) && push(`${r.priority.trim()} ${r.host.trim()}`, i));
      break;
    case "srv":
      draft.srv.forEach(
        (r, i) => !blank(r.target, r.port) && push(`${r.priority.trim()} ${r.weight.trim()} ${r.port.trim()} ${r.target.trim()}`, i),
      );
      break;
    case "caa":
      draft.caa.forEach((r, i) => !blank(r.value) && push(`${r.flags.trim()} ${r.tag.trim()} "${r.value.trim().replace(/^"|"$/g, "")}"`, i));
      break;
    default: {
      let line = 0;
      draft.lines.split("\n").forEach((raw) => {
        if (raw.trim()) push(raw.trim(), line++);
      });
    }
  }
  return { values, sourceIndex };
}

export interface DraftErrors {
  rows: Record<string, string>;
  general: string[];
}

export function validateDraft(type: RecordType, draft: ValueDraft): DraftErrors {
  const errors: DraftErrors = { rows: {}, general: [] };
  const kind = RECORD_TYPE_META[type].kind;
  const { values } = serializeDraft(type, draft);
  if (values.length === 0) {
    errors.general.push("Enter at least one value.");
    return errors;
  }

  if (kind === "lines") {
    const check: Record<string, (v: string) => string | null> = {
      A: validateIPv4,
      AAAA: validateIPv6,
      CNAME: validateHostname,
      NS: validateHostname,
      PTR: validateHostname,
      TXT: (v) => (v.length > 4000 ? "TXT values cannot be longer than 4000 characters." : null),
    };
    values.forEach((v, i) => {
      const message = check[type]?.(v);
      if (message) errors.general.push(`Line ${i + 1}: ${message}`);
    });
    if ((type === "CNAME" || type === "PTR") && values.length > 1) errors.general.push(`${type} records accept exactly one value.`);
    return errors;
  }

  const setRow = (row: number, field: string, message: string | null) => {
    if (message) errors.rows[`${row}.${field}`] ??= message;
  };
  if (kind === "mx") {
    draft.mx.forEach((r, i) => {
      if (blank(r.host)) return;
      setRow(i, "priority", validateIntInRange(r.priority, "Priority", 0, 65535));
      setRow(i, "host", validateHostname(r.host));
    });
  } else if (kind === "srv") {
    draft.srv.forEach((r, i) => {
      if (blank(r.target, r.port)) return;
      setRow(i, "priority", validateIntInRange(r.priority, "Priority", 0, 65535));
      setRow(i, "weight", validateIntInRange(r.weight, "Weight", 0, 65535));
      setRow(i, "port", validateIntInRange(r.port, "Port", 0, 65535));
      setRow(i, "target", validateHostname(r.target));
    });
  } else {
    draft.caa.forEach((r, i) => {
      if (blank(r.value)) return;
      setRow(i, "flags", validateIntInRange(r.flags, "Flags", 0, 255));
      setRow(i, "tag", (CAA_TAGS as readonly string[]).includes(r.tag) ? null : "Choose issue, issuewild or iodef.");
    });
  }
  return errors;
}

export function mapServerValueErrors(
  type: RecordType,
  serialized: SerializedValues,
  fieldErrors: Record<string, string>,
): DraftErrors {
  const errors: DraftErrors = { rows: {}, general: [] };
  const kind = RECORD_TYPE_META[type].kind;
  for (const [field, message] of Object.entries(fieldErrors)) {
    if (field === "values") {
      errors.general.push(message);
      continue;
    }
    const match = field.match(/^values\.(\d+)$/);
    if (!match) continue;
    const index = Number(match[1]);
    if (kind === "lines") errors.general.push(`Line ${index + 1}: ${message}`);
    else errors.rows[`${serialized.sourceIndex[index] ?? index}.row`] = message;
  }
  return errors;
}
