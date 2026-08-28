import { LayoutDashboard, LayoutGrid, Flag, Activity, Megaphone } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Pipeline", icon: LayoutGrid },
  { href: "/attention", label: "Needs Attention", icon: Flag },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
] as const;
