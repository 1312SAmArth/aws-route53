"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import styles from "./SearchInput.module.css";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  delayMs?: number;
}

export function SearchInput({ value, onChange, placeholder, ariaLabel, delayMs = 300 }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);

  // Follow external changes (e.g. "Clear filter") without an effect round-trip.
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), delayMs);
    return () => window.clearTimeout(timer);
  }, [draft, value, onChange, delayMs]);

  return (
    <div className={styles.wrapper} role="search">
      <Icon name="search" className={styles.icon} />
      <input
        type="search"
        className={styles.input}
        value={draft}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onChange(draft);
        }}
      />
      {draft && (
        <button type="button" className={styles.clear} aria-label="Clear search" onClick={() => { setDraft(""); onChange(""); }}>
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
