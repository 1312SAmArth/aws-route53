"use client";

import { useFlash } from "@/context/FlashContext";
import { Alert } from "./Alert";
import styles from "./Flashbar.module.css";

export function Flashbar() {
  const { messages, dismiss } = useFlash();
  return (
    <div className={styles.flashbar} aria-live="polite">
      {messages.map((m) => (
        <Alert key={m.id} type={m.type} header={m.header} onDismiss={() => dismiss(m.id)}>
          {m.content}
        </Alert>
      ))}
    </div>
  );
}
