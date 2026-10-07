import type { ReactNode } from "react";
import styles from "./FormField.module.css";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FormFieldProps {
  id: string;
  label: string;
  description?: ReactNode;
  /** Format hints shown under the control, e.g. "Maximum 256 characters". */
  constraint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}

/** Wires label, description, constraint text and error message to a control via ids and aria attributes. */
export function FormField({ id, label, description, constraint, error, optional, children }: FormFieldProps) {
  const describedBy = [description && `${id}-description`, constraint && `${id}-constraint`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional && <i className={styles.optional}> - optional</i>}
      </label>
      {description && (
        <div id={`${id}-description`} className={styles.description}>
          {description}
        </div>
      )}
      <div className={styles.control}>
        {children({ id, "aria-describedby": describedBy || undefined, "aria-invalid": error ? true : undefined })}
      </div>
      {error && (
        <div id={`${id}-error`} className={styles.error} role="alert">
          {error}
        </div>
      )}
      {constraint && (
        <div id={`${id}-constraint`} className={styles.constraint}>
          {constraint}
        </div>
      )}
    </div>
  );
}
