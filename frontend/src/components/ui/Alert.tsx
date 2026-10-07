import type { ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./Alert.module.css";

export type AlertType = "error" | "warning" | "info" | "success";

interface AlertProps {
  type: AlertType;
  header?: string;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ type, header, children, action, onDismiss, className }: AlertProps) {
  return (
    <div className={[styles.alert, styles[type], className].filter(Boolean).join(" ")} role={type === "error" ? "alert" : "status"}>
      <Icon name={type} size={18} className={styles.icon} />
      <div className={styles.body}>
        {header && <div className={styles.header}>{header}</div>}
        {children && <div className={styles.content}>{children}</div>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
      {onDismiss && (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
