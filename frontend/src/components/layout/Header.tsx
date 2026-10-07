"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { useLogout, useSession } from "@/hooks/useAuth";
import { NAV_SECTIONS } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.css";

function formatAccountId(id: string): string {
  return id.replace(/(\d{4})(?=\d)/g, "$1-");
}

interface PopoverProps {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
}

function Popover({ trigger, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.menuWrap} ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && children(() => setOpen(false))}
    </div>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  // Alt+S focuses the search box, as in the AWS console.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/hosted-zones?q=${encodeURIComponent(term)}` : "/hosted-zones");
    inputRef.current?.blur();
  };

  return (
    <form role="search" className={styles.search} onSubmit={submit}>
      <Icon name="search" size={14} className={styles.searchIcon} />
      <input
        ref={inputRef}
        type="search"
        className={styles.searchInput}
        placeholder="Search hosted zones"
        aria-label="Search hosted zones"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <kbd className={styles.searchHint} aria-hidden="true">
        [Alt+S]
      </kbd>
    </form>
  );
}

export function Header({ onToggleNav, onOpenShortcuts }: { onToggleNav: () => void; onOpenShortcuts: () => void }) {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <header className={styles.header}>
      <button type="button" className={styles.iconButton} onClick={onToggleNav} aria-label="Toggle navigation">
        <Icon name="menu" size={18} />
      </button>
      <Link href="/hosted-zones" className={styles.logo} aria-label="Route 53 home">
        aws
      </Link>

      <Popover
        trigger={({ open, toggle }) => (
          <button type="button" className={styles.headerButton} aria-label="Services" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
            <Icon name="grid" size={14} />
            <span className={styles.hideOnSmall}>Services</span>
          </button>
        )}
      >
        {(close) => (
          <div className={`${styles.menu} ${styles.menuLeft}`} role="menu">
            <div className={styles.menuTitle}>Route 53</div>
            {NAV_SECTIONS.flatMap((section) => section.items).map((item) => (
              <Link key={item.href} href={item.href} role="menuitem" className={styles.menuLink} onClick={close}>
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </Popover>

      <GlobalSearch />

      <div className={styles.spacer} />

      <span className={styles.region}>
        <Icon name="globe" size={14} />
        <span>Global</span>
      </span>

      <Popover
        trigger={({ open, toggle }) => (
          <button type="button" className={styles.headerButton} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
            <Icon name="user" size={16} />
            <span className={styles.accountLabel}>{user ? `${user.username} @ ${formatAccountId(user.account_id)}` : "Account"}</span>
            <Icon name="chevronDown" size={12} />
          </button>
        )}
      >
        {(close) => (
          <div className={styles.menu} role="menu">
            {user && (
              <div className={styles.menuInfo}>
                <div className={styles.menuLabel}>Account ID</div>
                <div className="mono">{formatAccountId(user.account_id)}</div>
                <div className={styles.menuLabel} style={{ marginTop: 8 }}>
                  Signed in as
                </div>
                <div>{user.username}</div>
              </div>
            )}
            <ThemeToggle />
            <button
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => {
                close();
                onOpenShortcuts();
              }}
            >
              Keyboard shortcuts
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${styles.menuItem} ${styles.menuDivider}`}
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              Sign out
            </button>
          </div>
        )}
      </Popover>
    </header>
  );
}
