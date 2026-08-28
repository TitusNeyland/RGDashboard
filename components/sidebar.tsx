"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-black/[0.07] bg-[#fbfbfc] lg:flex dark:border-white/10 dark:bg-[#0a0a0a]">
      <div className="flex h-[57px] shrink-0 items-center gap-2 border-b border-black/[0.07] px-4 dark:border-white/10">
        <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-primary text-[11px] font-bold text-primary-foreground">
          RG
        </div>
        <span className="text-[13px] font-semibold tracking-[-0.01em]">
          Pipeline Manager
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-px">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[13px] transition-colors",
                    active
                      ? "bg-black/[0.055] font-medium text-foreground dark:bg-white/[0.09]"
                      : "text-muted-foreground hover:bg-black/[0.035] hover:text-foreground dark:hover:bg-white/[0.05]"
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0", active ? "text-foreground" : "")}
                    strokeWidth={2}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-black/[0.07] p-2 dark:border-white/10">
        <div className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[10px] font-semibold dark:bg-white/10">
            RG
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium leading-tight">
              RG Investment Group
            </p>
            <p className="text-[11px] leading-tight text-muted-foreground">Internal</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
