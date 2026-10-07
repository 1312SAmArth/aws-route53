import type { ReactNode } from "react";
import styles from "./Container.module.css";

interface ContainerProps {
  title?: ReactNode;
  count?: number;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  as?: "section" | "div";
  id?: string;
  info?: ReactNode;
  headingLevel?: 1 | 2;
}

export function Container({ title, count, description, actions, children, flush, as: Tag = "section", id, info, headingLevel = 2 }: ContainerProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <Tag className={styles.container} aria-labelledby={title && id ? `${id}-title` : undefined}>
      {(title || actions) && (
        <div className={styles.header}>
          <div className={styles.headerText}>
            {title && (
              <Heading className={styles.title} id={id ? `${id}-title` : undefined}>
                {title}
                {count !== undefined && <span className={styles.count}> ({count})</span>}
                {info && <span className={styles.info}>{info}</span>}
              </Heading>
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
