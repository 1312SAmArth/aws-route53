import type { ReactNode } from "react";
import styles from "./Badge.module.css";

type BadgeTone = "grey" | "blue" | "green" | "red" | "orange";

export function Badge({ tone = "grey", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

export function ZoneTypeBadge({ type }: { type: "PUBLIC" | "PRIVATE" }) {
  return <Badge tone={type === "PUBLIC" ? "blue" : "grey"}>{type === "PUBLIC" ? "Public" : "Private"}</Badge>;
}
