/**
 * Client-side mirrors of the backend rules (backend/app/services/dns_validation.py).
 * They exist only to give instant feedback; the API re-validates everything.
 * Each validator returns an error message, or null when the value is valid.
 */

const LABEL = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
const RECORD_LABEL = /^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?$/i;
const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export const MAX_TTL = 2_147_483_647;

function checkLabels(name: string, pattern: RegExp, allowWildcard: boolean): string | null {
  const bare = name.replace(/\.$/, "");
  if (!bare) return "Enter a domain name.";
  if (bare.length > 253) return "Domain names cannot be longer than 253 characters.";
  const labels = bare.split(".");
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label === "*" && i === 0 && allowWildcard && labels.length > 1) continue;
    if (!label) return "Domain names cannot contain empty labels (consecutive dots).";
    if (label.length > 63) return "Each label must be 63 characters or fewer.";
    if (!pattern.test(label)) return `"${label}" contains invalid characters or starts/ends with a hyphen.`;
  }
  return null;
}

export function validateZoneName(name: string): string | null {
  const value = name.trim();
  const error = checkLabels(value, LABEL, false);
  if (error) return error;
  if (!value.replace(/\.$/, "").includes(".")) return "Enter a domain with at least two labels, for example example.com.";
  return null;
}

export function validateHostname(value: string): string | null {
  return checkLabels(value.trim(), RECORD_LABEL, false);
}

export function validateRecordName(name: string): string | null {
  const value = name.trim();
  if (value === "" || value === "@") return null;
  return checkLabels(value, RECORD_LABEL, true);
}

export function validateIPv4(value: string): string | null {
  return IPV4.test(value.trim()) ? null : `"${value.trim()}" is not a valid IPv4 address.`;
}

export function validateIPv6(value: string): string | null {
  const v = value.trim();
  const message = `"${v}" is not a valid IPv6 address.`;
  if (!v.includes(":") || !/^[0-9a-f:.]+$/i.test(v)) return message;
  try {
    new URL(`http://[${v}]/`);
    return null;
  } catch {
    return message;
  }
}

export function validateIntInRange(value: string, label: string, min: number, max: number): string | null {
  if (!/^\d+$/.test(value.trim())) return `${label} must be a whole number between ${min} and ${max}.`;
  const n = Number(value);
  return n >= min && n <= max ? null : `${label} must be between ${min} and ${max}.`;
}

export function validateTtl(value: string): string | null {
  if (value.trim() === "") return "Enter a TTL in seconds.";
  return validateIntInRange(value, "TTL", 0, MAX_TTL);
}

export const CAA_TAGS = ["issue", "issuewild", "iodef"] as const;
