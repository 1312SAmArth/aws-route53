import type { ReactNode } from "react";
import styles from "./KeyValueGrid.module.css";

export interface KeyValueItem {
  label: string;
  value: ReactNode;
}

/** Read-only label/value layout used on detail panels. */
export function KeyValueGrid({ items }: { items: KeyValueItem[] }) {
  return (
    <dl className={styles.grid}>
      {items.map((item) => (
        <div key={item.label} className={styles.item}>
          <dt className={styles.label}>{item.label}</dt>
          <dd className={styles.value}>{item.value ?? "-"}</dd>
        </div>
      ))}
    </dl>
  );
}
