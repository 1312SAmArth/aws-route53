import { displayName } from "@/lib/format";
import type { DnsRecord } from "@/lib/types";
import styles from "./RecordValues.module.css";

const MAX_LINES = 4;

/** Value column: one value per line, truncated with a tooltip, and "+N more" past a few lines. */
export function RecordValues({ record }: { record: DnsRecord }) {
  if (record.alias_target) {
    return (
      <span className={`mono ${styles.value}`} title={record.alias_target}>
        {displayName(record.alias_target)}
      </span>
    );
  }
  const shown = record.values.slice(0, MAX_LINES);
  const hidden = record.values.length - shown.length;
  return (
    <div className={styles.list}>
      {shown.map((v, i) => (
        <span key={i} className={`mono ${styles.value}`} title={v}>
          {v}
        </span>
      ))}
      {hidden > 0 && <span className={styles.more}>+{hidden} more</span>}
    </div>
  );
}
