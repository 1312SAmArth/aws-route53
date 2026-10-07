"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./Header.module.css";

const STORAGE_KEY = "r53-theme";

/** Rendered inside the account menu, which only mounts after hydration, so reading the DOM here is safe. */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      if (next) localStorage.setItem(STORAGE_KEY, "dark");
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this page view.
    }
  };

  return (
    <button type="button" role="menuitemcheckbox" aria-checked={dark} className={styles.menuItem} onClick={toggle}>
      <span className={styles.menuItemRow}>
        <Icon name={dark ? "sun" : "moon"} />
        {dark ? "Light mode" : "Dark mode"}
      </span>
    </button>
  );
}
