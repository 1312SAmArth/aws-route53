"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import styles from "./InfoLink.module.css";

/** The console's blue "Info" link next to a heading; opens a short help dialog. */
export function InfoLink({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.info} onClick={() => setOpen(true)} aria-label={`Info: ${title}`}>
        Info
      </button>
      {open && (
        <Modal
          title={title}
          onClose={() => setOpen(false)}
          footer={
            <Button variant="primary" onClick={() => setOpen(false)}>
              Close
            </Button>
          }
        >
          <div className={styles.body}>{children}</div>
        </Modal>
      )}
    </>
  );
}
