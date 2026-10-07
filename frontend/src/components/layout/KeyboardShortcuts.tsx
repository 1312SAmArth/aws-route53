"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import styles from "./KeyboardShortcuts.module.css";

const SHORTCUTS = [
  { keys: "/", description: "Focus the filter box on a list" },
  { keys: "c", description: "Create a hosted zone, or a record when viewing a zone" },
  { keys: "?", description: "Show this list of shortcuts" },
];

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/** Where "c" should go from the current page, or null where there is nothing to create. */
export function createTargetFor(pathname: string): string | null {
  if (pathname === "/hosted-zones") return "/hosted-zones/new";
  if (/^\/hosted-zones\/[^/]+$/.test(pathname) && pathname !== "/hosted-zones/new") return `${pathname}/records/new`;
  return null;
}

export function useKeyboardShortcuts(onHelp: () => void) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      if (document.querySelector('[role="dialog"]')) return;

      if (event.key === "/") {
        const filter = document.querySelector<HTMLInputElement>('main input[type="search"]');
        if (filter) {
          event.preventDefault();
          filter.focus();
        }
      } else if (event.key === "c") {
        const target = createTargetFor(pathname);
        if (target) router.push(target);
      } else if (event.key === "?") {
        event.preventDefault();
        onHelp();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pathname, router, onHelp]);
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Keyboard shortcuts"
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <dl className={styles.list}>
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className={styles.row}>
            <dt>
              <kbd className={styles.key}>{s.keys}</kbd>
            </dt>
            <dd>{s.description}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>Shortcuts are disabled while typing in a field.</p>
    </Modal>
  );
}
