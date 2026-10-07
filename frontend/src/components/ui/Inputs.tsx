import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";
import styles from "./Inputs.module.css";

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(styles.control, className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(styles.control, styles.textarea, className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={styles.selectWrap}>
      <select {...rest} className={cx(styles.control, styles.select, className)}>
        {children}
      </select>
      <Icon name="chevronDown" className={styles.selectIcon} />
    </span>
  );
}

interface ChoiceProps {
  type: "radio" | "checkbox";
  label: ReactNode;
  description?: ReactNode;
}

/** Native radio/checkbox with an AWS-style label block, so keyboard and screen-reader behaviour comes for free. */
export function Choice({ type, label, description, className, ...rest }: ChoiceProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <label className={cx(styles.choice, className)}>
      <input {...rest} type={type} className={styles.choiceInput} />
      <span>
        <span className={styles.choiceLabel}>{label}</span>
        {description && <span className={styles.choiceDescription}>{description}</span>}
      </span>
    </label>
  );
}
