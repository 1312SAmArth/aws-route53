import { LinkButton } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CopyButton } from "@/components/ui/CopyButton";
import { KeyValueGrid } from "@/components/ui/KeyValueGrid";
import { displayName, formatDateTime } from "@/lib/format";
import type { DnsRecord, HostedZone } from "@/lib/types";
import styles from "./RecordDetails.module.css";

export function RecordDetails({ zone, record }: { zone: HostedZone; record: DnsRecord }) {
  const values = record.alias_target ? [record.alias_target] : record.values;
  return (
    <Container
      title={`Record details: ${displayName(record.name)}`}
      actions={
        <LinkButton href={`/hosted-zones/${zone.id}/records/${record.id}/edit`} variant="normal">
          Edit record
        </LinkButton>
      }
    >
      <KeyValueGrid
        items={[
          { label: "Record name", value: displayName(record.name) },
          { label: "Type", value: record.type },
          { label: "Routing policy", value: record.routing_policy === "WEIGHTED" ? "Weighted" : "Simple" },
          { label: "Alias", value: record.alias_target ? `Yes (evaluate target health: ${record.evaluate_target_health ? "yes" : "no"})` : "No" },
          { label: "TTL (seconds)", value: record.ttl ?? "–" },
          ...(record.set_identifier ? [{ label: "Record ID / weight", value: `${record.set_identifier} / ${record.weight}` }] : []),
          { label: "Comment", value: record.comment ?? "–" },
          { label: "Last updated", value: formatDateTime(record.updated_at) },
          {
            label: record.alias_target ? "Route traffic to" : "Values",
            value: (
              <ul className={styles.values}>
                {values.map((v, i) => (
                  <li key={i}>
                    <span className="mono">{v}</span> <CopyButton text={v} label="value" />
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
    </Container>
  );
}
