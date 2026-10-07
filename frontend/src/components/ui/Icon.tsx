import type { SVGProps } from "react";

const PATHS = {
  search: "M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10Zm3.5-1.5L14 14",
  close: "M3 3l10 10M13 3L3 13",
  refresh: "M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3",
  copy: "M5.5 5.5h7v8h-7zM3.5 10.5v-8h7",
  check: "M3 8.5l3.5 3.5L13 4.5",
  chevronDown: "M3.5 6l4.5 4.5L12.5 6",
  chevronRight: "M6 3.5l4.5 4.5L6 12.5",
  chevronLeft: "M10 3.5L5.5 8l4.5 4.5",
  menu: "M2 4h12M2 8h12M2 12h12",
  info: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12Zm0-6v3.5M8 5.2v.1",
  warning: "M8 2L1.5 13.5h13L8 2Zm0 4.5v3.5M8 11.7v.1",
  error: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM5.7 5.7l4.6 4.6M10.3 5.7l-4.6 4.6",
  success: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12Zm-2.5-6l2 2 3.5-4",
  user: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5.5 6c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5",
  globe: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM2 8h12M8 2c2 1.8 2.8 3.8 2.8 6S10 12.2 8 14C6 12.2 5.2 10.2 5.2 8S6 3.8 8 2Z",
  dashboard: "M2 2.5h5v5H2zM9 2.5h5v3H9zM9 7.5h5v6H9zM2 9.5h5v4H2z",
  zones: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12ZM2 8h12M8 2v12",
  traffic: "M2 4h4l4 8h4M10 4h4M12 2l2 2-2 2M12 10l2 2-2 2",
  health: "M1.5 8h3l2-4 3 8 2-4h3",
  resolver: "M3 3.5h10v4H3zM3 9.5h10v4H3zM5.5 5.5v.1M5.5 11.5v.1",
  profiles: "M2.5 4.5h11v8h-11zM5.5 4.5v-2h5v2M2.5 8h11",
  plus: "M8 3v10M3 8h10",
  moon: "M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z",
  sun: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M13 3l-1 1M4 12l-1 1",
  upload: "M8 11V2.5M4.5 6L8 2.5 11.5 6M2.5 10v3.5h11V10",
  download: "M8 2.5V11M4.5 7.5L8 11l3.5-3.5M2.5 10v3.5h11V10",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
