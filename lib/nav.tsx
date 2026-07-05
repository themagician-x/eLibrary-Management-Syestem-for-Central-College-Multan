import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  milestone?: string; // shown as a "soon" tag until the section is built
};

const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const nav: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" {...s}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
    ),
  },
  {
    href: "/books",
    label: "Books",
    milestone: "M1",
    icon: (
      <svg viewBox="0 0 24 24" {...s}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 0 4 20.5V5.5Z" /><path d="M4 5.5A1.5 1.5 0 0 0 5.5 7H20" /></svg>
    ),
  },
  {
    href: "/students",
    label: "Students",
    milestone: "M2",
    icon: (
      <svg viewBox="0 0 24 24" {...s}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 19a5.5 5.5 0 0 0-3-4.9" /></svg>
    ),
  },
  {
    href: "/circulation",
    label: "Circulation",
    milestone: "M3",
    icon: (
      <svg viewBox="0 0 24 24" {...s}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>
    ),
  },
  {
    href: "/reservations",
    label: "Reservations",
    milestone: "M5",
    icon: (
      <svg viewBox="0 0 24 24" {...s}><path d="M6 4h12v16l-6-4-6 4V4Z" /></svg>
    ),
  },
  {
    href: "/fines",
    label: "Fines",
    milestone: "M4",
    icon: (
      <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 9.8c0-1 1.1-1.8 2.5-1.8s2.5.6 2.5 1.7c0 2.3-5 1.3-5 3.6 0 1.1 1.1 1.7 2.5 1.7s2.5-.8 2.5-1.8" /></svg>
    ),
  },
  {
    href: "/reports",
    label: "Reports",
    milestone: "M7",
    icon: (
      <svg viewBox="0 0 24 24" {...s}><path d="M4 20V4M4 20h16" /><path d="M8 16v-3M12 16V8M16 16v-6" /></svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    milestone: "M7",
    icon: (
      <svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" /></svg>
    ),
  },
];
