import { Activity, FileStack, PenLine, User, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

export const NAV: NavItem[] = [
  {
    href: "/tailor/new",
    label: "New tailor",
    icon: PenLine,
    match: (p) => p.startsWith("/tailor"),
  },
  { href: "/resumes", label: "Resumes", icon: FileStack, match: (p) => p.startsWith("/resumes") },
  { href: "/activity", label: "Activity", icon: Activity, match: (p) => p.startsWith("/activity") },
  { href: "/profile", label: "Profile", icon: User, match: (p) => p.startsWith("/profile") },
];
