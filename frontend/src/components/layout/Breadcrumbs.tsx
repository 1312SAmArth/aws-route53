import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import styles from "./Breadcrumbs.module.css";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail: Crumb[] = [{ label: "Route 53", href: "/dashboard" }, ...items];
  return (
    <nav aria-label="Breadcrumbs" className={styles.nav}>
      <ol className={styles.list}>
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className={styles.item}>
              {crumb.href && !last ? (
                <Link href={crumb.href}>{crumb.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? styles.current : undefined}>
                  {crumb.label}
                </span>
              )}
              {!last && <Icon name="chevronRight" size={12} className={styles.sep} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
