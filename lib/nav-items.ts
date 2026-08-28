import { LayoutDashboard, LayoutGrid, Flag, Activity, Megaphone, Users, Gauge, Phone } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Pipeline", icon: LayoutGrid },
  { href: "/attention", label: "Needs Attention", icon: Flag },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/team", label: "Team", icon: Users },
  { href: "/kpi", label: "KPI", icon: Gauge },
  { href: "/cold-calling", label: "Cold Calling", icon: Phone },
] as const;
