"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-black/[0.06] bg-white lg:flex dark:border-white/10 dark:bg-[#0a0a0a]">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary text-[13px] font-bold text-primary-foreground">
          RG
        </div>
        <span className="font-heading text-[15px] font-semibold tracking-tight">
          RG Pipeline
        </span>
      </div>

      <nav className="flex-1 px-3 py-2">
        <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline
        </p>
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors",
                    active
                      ? "bg-primary/[0.08] font-medium text-primary"
                      : "text-muted-foreground hover:bg-black/[0.03] hover:text-foreground dark:hover:bg-white/[0.06]"
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={2} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-black/[0.06] p-4 dark:border-white/10">
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-semibold dark:bg-white/10">
            RG
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">RG Investment Group</p>
            <p className="text-[12px] text-muted-foreground">Internal tool</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
