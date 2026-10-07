import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-client";
import { Alert } from "./Alert";
import { Button, Spinner } from "./Button";
import styles from "./States.module.css";

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description && <p className={styles.emptyText}>{description}</p>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Unable to load data" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const message = error instanceof ApiError ? error.message : "An unexpected error occurred. Please try again.";
  return (
    <div className={styles.errorWrap}>
      <Alert
        type="error"
        header={title}
        action={
          onRetry && (
            <Button icon="refresh" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        {message}
      </Alert>
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className={styles.loading} role="status">
      <Spinner size={18} />
      <span>{label}…</span>
    </div>
  );
}
