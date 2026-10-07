"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Flashbar } from "@/components/ui/Flashbar";
import { Header } from "./Header";
import { ShortcutsDialog, useKeyboardShortcuts } from "./KeyboardShortcuts";
import { Sidebar } from "./Sidebar";
import styles from "./AppShell.module.css";

export function AppShell({ children }: { children: ReactNode }) {
  // Wide screens collapse the nav inline; narrow screens show it as an overlay drawer.
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  useKeyboardShortcuts(openShortcuts);

  const toggleNav = () => {
    setCollapsed((v) => !v);
    setDrawerOpen((v) => !v);
  };

  return (
    <div className={styles.shell}>
      <Header onToggleNav={toggleNav} onOpenShortcuts={openShortcuts} />
      <div className={styles.body}>
        <Sidebar collapsed={collapsed} drawerOpen={drawerOpen} onNavigate={() => setDrawerOpen(false)} onCloseDrawer={() => setDrawerOpen(false)} />
        <main className={styles.main} id="main-content">
          <div className={styles.content}>
            <Flashbar />
            {children}
          </div>
        </main>
      </div>
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
    </div>
  );
}
