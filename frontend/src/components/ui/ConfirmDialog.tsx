"use client";

import { useState, type ReactNode } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { FormField } from "./FormField";
import { Input } from "./Inputs";

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  /** When set, the user must type this word before the confirm button enables (used for irreversible deletes). */
  requireText?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel = "Delete",
  requireText,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const confirmed = !requireText || typed.trim().toLowerCase() === requireText.toLowerCase();

  return (
    <Modal
      title={title}
      onClose={onCancel}
      dismissible={!loading}
      footer={
        <>
          <Button variant="link" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={!confirmed} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (confirmed && !loading) onConfirm();
        }}
      >
        {children}
        {requireText && (
          <div style={{ marginTop: 16 }}>
            <FormField id="confirm-text" label={`To confirm deletion, type "${requireText}" in the field.`}>
              {(props) => (
                <Input {...props} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={requireText} autoComplete="off" data-autofocus />
              )}
            </FormField>
          </div>
        )}
        {error && (
          <div style={{ marginTop: 16 }}>
            <Alert type="error" header="Couldn't complete the request">
              {error}
            </Alert>
          </div>
        )}
      </form>
    </Modal>
  );
}
