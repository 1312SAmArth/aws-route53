"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { NAV_SECTIONS, isActive, type NavSection } from "./nav";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  collapsed: boolean;
  drawerOpen: boolean;
  onNavigate: () => void;
  onCloseDrawer: () => void;
}

function Group({ section, pathname, onNavigate }: { section: NavSection; pathname: string; onNavigate: () => void }) {
  const hasActive = section.items.some((i) => isActive(pathname, i.href));
  const [open, setOpen] = useState(true);
  const expanded = open || hasActive;

  const links = (
    <ul className={styles.list} hidden={!expanded}>
      {section.items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`${styles.link} ${section.heading ? styles.nested : ""} ${active ? styles.active : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              {!section.heading && <Icon name={item.icon} />}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (!section.heading) return <div className={styles.section}>{links}</div>;
  return (
    <div className={styles.section}>
      <button type="button" className={styles.groupToggle} aria-expanded={expanded} onClick={() => setOpen((v) => !v)}>
        <Icon name={expanded ? "chevronDown" : "chevronRight"} size={14} />
        {section.heading}
      </button>
      {links}
    </div>
  );
}

export function Sidebar({ collapsed, drawerOpen, onNavigate, onCloseDrawer }: SidebarProps) {
  const pathname = usePathname();
  const classes = [styles.sidebar, collapsed && styles.collapsed, drawerOpen && styles.drawerOpen].filter(Boolean).join(" ");

  return (
    <>
      {drawerOpen && <div className={styles.scrim} onClick={onCloseDrawer} aria-hidden="true" />}
      <aside className={classes} aria-label="Route 53 navigation">
        <div className={styles.title}>
          <Link href="/dashboard" onClick={onNavigate}>
            Route 53
          </Link>
          <button type="button" className={styles.close} onClick={onCloseDrawer} aria-label="Close navigation">
            <Icon name="close" />
          </button>
        </div>
        <nav>
          {NAV_SECTIONS.map((section, i) => (
            <Group key={i} section={section} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </nav>
      </aside>
    </>
  );
}
