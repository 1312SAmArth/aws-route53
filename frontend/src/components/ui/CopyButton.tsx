"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import styles from "./CopyButton.module.css";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied (insecure context, permissions); the text stays selectable.
    }
  };

  return (
    <button type="button" className={styles.copy} onClick={copy} aria-label={copied ? "Copied" : `Copy ${label}`} title={copied ? "Copied" : `Copy ${label}`}>
      <Icon name={copied ? "check" : "copy"} size={14} />
    </button>
  );
}
