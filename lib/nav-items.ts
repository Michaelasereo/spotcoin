import { Activity, BarChart2, Heart, House, Settings, UserRound, Wallet } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof House;
};

const employeeNavItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/dashboard/feed", label: "Feed", icon: Activity },
  { href: "/dashboard/recognise", label: "Recognise", icon: Heart },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/settings", label: "Account", icon: UserRound },
];

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: House },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/settings", label: "Account", icon: UserRound },
];

export function getNavItems(isAdmin: boolean) {
  return isAdmin ? adminNavItems : employeeNavItems;
}
