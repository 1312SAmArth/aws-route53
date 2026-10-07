"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useLogout, useSession } from "@/hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.css";

function formatAccountId(id: string): string {
  return id.replace(/(\d{4})(?=\d)/g, "$1-");
}

export function Header({ onToggleNav, onOpenShortcuts }: { onToggleNav: () => void; onOpenShortcuts: () => void }) {
  const { data: user } = useSession();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
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
    <header className={styles.header}>
      <button type="button" className={styles.iconButton} onClick={onToggleNav} aria-label="Toggle navigation">
        <Icon name="menu" size={18} />
      </button>
      <Link href="/hosted-zones" className={styles.logo} aria-label="Route 53 home">
        aws
      </Link>
      <span className={styles.service}>Route 53</span>

      <div className={styles.spacer} />

      <span className={styles.region}>
        <Icon name="globe" size={14} />
        <span>Global</span>
      </span>

      <div className={styles.menuWrap} ref={menuRef}>
        <button type="button" className={styles.account} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <Icon name="user" size={16} />
          <span className={styles.accountLabel}>{user?.username ?? "Account"}</span>
          <Icon name="chevronDown" size={12} />
        </button>
        {open && (
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
                setOpen(false);
                onOpenShortcuts();
              }}
            >
              Keyboard shortcuts
            </button>
            <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.menuDivider}`} onClick={() => logout.mutate()} disabled={logout.isPending}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
