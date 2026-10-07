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
  /** Rendered after the title and count, e.g. an <InfoLink>. */
  info?: ReactNode;
  /** Use 1 when the container is the page's main heading. */
  headingLevel?: 1 | 2;
}

/** White bordered panel with an optional header, the basic building block of the console layout. */
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
