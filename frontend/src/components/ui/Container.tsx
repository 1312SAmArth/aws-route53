import type { ReactNode } from "react";
import styles from "./Container.module.css";

interface ContainerProps {
  title?: ReactNode;
  /** Muted count after the title, e.g. "(12)". */
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Remove body padding for edge-to-edge tables. */
  flush?: boolean;
  as?: "section" | "div";
  id?: string;
}

/** White bordered panel with an optional header, the basic building block of the console layout. */
export function Container({ title, count, description, actions, children, flush, as: Tag = "section", id }: ContainerProps) {
  return (
    <Tag className={styles.container} aria-labelledby={title && id ? `${id}-title` : undefined}>
      {(title || actions) && (
        <div className={styles.header}>
          <div className={styles.headerText}>
            {title && (
              <h2 className={styles.title} id={id ? `${id}-title` : undefined}>
                {title}
                {count !== undefined && <span className={styles.count}> ({count})</span>}
              </h2>
            )}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={flush ? undefined : styles.body}>{children}</div>
    </Tag>
  );
}
