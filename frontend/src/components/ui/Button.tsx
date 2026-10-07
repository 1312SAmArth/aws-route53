import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "normal" | "link" | "icon" | "danger";

interface CommonProps {
  variant?: ButtonVariant;
  icon?: IconName;
  children?: ReactNode;
  className?: string;
}

export function Spinner({ size = 14 }: { size?: number }) {
  return <span className={styles.spinner} style={{ width: size, height: size }} role="presentation" />;
}

function classes(variant: ButtonVariant, extra?: string, more?: string) {
  return [styles.button, styles[variant], more, extra].filter(Boolean).join(" ");
}

function Content({ icon, loading, children }: Pick<CommonProps, "icon" | "children"> & { loading?: boolean }) {
  return (
    <>
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children ? <span>{children}</span> : null}
    </>
  );
}

interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  loading?: boolean;
}

export function Button({ variant = "normal", icon, loading, children, className, type = "button", disabled, ...rest }: ButtonProps) {
  return (
    <button {...rest} type={type} className={classes(variant, className)} disabled={disabled || loading} aria-busy={loading || undefined}>
      <Content icon={icon} loading={loading}>
        {children}
      </Content>
    </button>
  );
}

interface LinkButtonProps extends CommonProps {
  href: string;
  disabled?: boolean;
  /** Plain anchor that downloads the response instead of navigating inside the app. */
  download?: boolean;
  "aria-label"?: string;
}

/** A navigation link styled like a button. A disabled one renders as inert text, not a dead link. */
export function LinkButton({ variant = "normal", icon, children, className, href, disabled, download, ...rest }: LinkButtonProps) {
  if (disabled) {
    return (
      <span className={classes(variant, className, styles.disabledLink)} aria-disabled="true">
        <Content icon={icon}>{children}</Content>
      </span>
    );
  }
  if (download) {
    return (
      <a href={href} download className={classes(variant, className)} {...rest}>
        <Content icon={icon}>{children}</Content>
      </a>
    );
  }
  return (
    <Link href={href} className={classes(variant, className)} {...rest}>
      <Content icon={icon}>{children}</Content>
    </Link>
  );
}
