import { Icon } from "./Icon";
import styles from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

/** 1 … 4 5 6 … 20, always keeping first, last and the neighbours of the current page. */
export function pageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= pageCount - 2) [pageCount - 3, pageCount - 2, pageCount - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button type="button" className={styles.item} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <Icon name="chevronLeft" />
      </button>
      {pageWindow(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className={styles.gap} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles.item} ${p === page ? styles.current : ""}`}
            onClick={() => onChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className={styles.item} onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
        <Icon name="chevronRight" />
      </button>
    </nav>
  );
}
