import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface NavSection {
  /** A heading makes the section a collapsible group, like "Traffic flow" in the console. */
  heading?: string;
  items: NavItem[];
}

/** Single source for the sidebar and the header's Services menu. */
export const NAV_SECTIONS: NavSection[] = [
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

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
