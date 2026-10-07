"use client";

import type { ReactNode } from "react";
import styles from "./DataTable.module.css";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  width?: string;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  caption: string;
  selectionMode?: "none" | "single" | "multi";
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  isRowSelectable?: (row: T) => boolean;
  loading?: boolean;
  skeletonRows?: number;
  empty?: ReactNode;
  error?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  selectionMode = "none",
  selectedIds = [],
  onSelectionChange,
  isRowSelectable = () => true,
  loading = false,
  skeletonRows = 5,
  empty,
  error,
}: DataTableProps<T>) {
  const selectable = selectionMode !== "none";
  const colCount = columns.length + (selectable ? 1 : 0);
  const selectableRows = rows.filter(isRowSelectable);
  const allSelected = selectableRows.length > 0 && selectableRows.every((r) => selectedIds.includes(getRowId(r)));

  const toggle = (id: string) => {
    if (!onSelectionChange) return;
    if (selectionMode === "single") onSelectionChange([id]);
    else onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : selectableRows.map(getRowId));
  };

  let body: ReactNode;
  if (error) {
    body = (
      <tr>
        <td colSpan={colCount} className={styles.message}>
          {error}
        </td>
      </tr>
    );
  } else if (loading) {
    body = Array.from({ length: skeletonRows }, (_, i) => (
      <tr key={i} aria-hidden="true">
        {Array.from({ length: colCount }, (_, c) => (
          <td key={c} className={styles.cell}>
            <span className={styles.skeleton} style={{ width: c === 0 && selectable ? 16 : `${55 + ((i + c) % 4) * 10}%` }} />
          </td>
        ))}
      </tr>
    ));
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={colCount} className={styles.message}>
          {empty}
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => {
      const id = getRowId(row);
      const selected = selectedIds.includes(id);
      const canSelect = selectable && isRowSelectable(row);
      return (
        <tr key={id} className={selected ? styles.selected : undefined} aria-selected={selectable ? selected : undefined}>
          {selectable && (
            <td className={`${styles.cell} ${styles.selectCell}`}>
              {canSelect && (
                <input
                  type={selectionMode === "single" ? "radio" : "checkbox"}
                  name={selectionMode === "single" ? "row-selection" : undefined}
                  className={styles.check}
                  checked={selected}
                  onChange={() => toggle(id)}
                  aria-label={`Select row ${id}`}
                />
              )}
            </td>
          )}
          {columns.map((col) => (
            <td key={col.id} className={`${styles.cell} ${col.align === "right" ? styles.right : ""}`}>
              {col.cell(row)}
            </td>
          ))}
        </tr>
      );
    });
  }

  return (
    <div className={styles.scroller}>
      <table className={styles.table} aria-busy={loading || undefined}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className={`${styles.th} ${styles.selectCell}`}>
                {selectionMode === "multi" && (
                  <input
                    type="checkbox"
                    className={styles.check}
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={selectableRows.length === 0}
                    aria-label="Select all rows on this page"
                  />
                )}
              </th>
            )}
            {columns.map((col) => (
              <th key={col.id} scope="col" className={`${styles.th} ${col.align === "right" ? styles.right : ""}`} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
