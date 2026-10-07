"use client";

import { useId, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./ExpandableSection.module.css";

export function ExpandableSection({ title, defaultExpanded = true, children }: { title: string; defaultExpanded?: boolean; children: ReactNode }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();
  return (
    <div>
      <button type="button" className={styles.trigger} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((v) => !v)}>
        <Icon name={expanded ? "chevronDown" : "chevronRight"} />
        {title}
      </button>
      <div id={panelId} hidden={!expanded} className={styles.panel}>
        {children}
      </div>
    </div>
  );
}
