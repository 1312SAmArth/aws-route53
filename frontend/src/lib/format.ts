const dateTime = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** e.g. "Mar 4, 2026, 14:05 UTC" */
export function formatDateTime(iso: string): string {
  return `${dateTime.format(new Date(iso))} UTC`;
}

/** Route 53 shows names without the trailing root dot, except in value columns. */
export function displayName(fqdn: string): string {
  return fqdn.endsWith(".") ? fqdn.slice(0, -1) : fqdn;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
