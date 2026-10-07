"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./Sidebar.module.css";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }] },
  {
    items: [
      { href: "/hosted-zones", label: "Hosted zones", icon: "zones" },
      { href: "/health-checks", label: "Health checks", icon: "health" },
    ],
  },
  { heading: "Traffic flow", items: [{ href: "/traffic-policies", label: "Traffic policies", icon: "traffic" }] },
  {
    items: [
      { href: "/resolver", label: "Resolver", icon: "resolver" },
      { href: "/profiles", label: "Profiles", icon: "profiles" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  drawerOpen: boolean;
  onNavigate: () => void;
  onCloseDrawer: () => void;
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
          {SECTIONS.map((section, i) => (
            <ul key={i} className={styles.section} aria-label={section.heading}>
              {section.heading && <li className={styles.heading}>{section.heading}</li>}
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${styles.link} ${active ? styles.active : ""}`}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        </nav>
      </aside>
    </>
  );
}
