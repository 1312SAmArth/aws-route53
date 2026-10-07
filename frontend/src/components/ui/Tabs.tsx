"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Tabs.module.css";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabDef[];
  value: string;
  onChange: (id: string) => void;
  idPrefix: string;
}

export function Tabs({ tabs, value, onChange, idPrefix }: TabsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  const active = tabs.find((t) => t.id === value) ?? tabs[0];
  return (
    <div>
      <div role="tablist" className={styles.list}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`${idPrefix}-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={tab.id === active.id}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={tab.id === active.id ? 0 : -1}
            className={`${styles.tab} ${tab.id === active.id ? styles.active : ""}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${idPrefix}-panel-${active.id}`} aria-labelledby={`${idPrefix}-tab-${active.id}`} className={styles.panel}>
        {active.content}
      </div>
    </div>
  );
}
