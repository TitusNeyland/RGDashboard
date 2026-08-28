import { Sidebar } from "@/components/sidebar";
import { NavTabs } from "@/components/nav-tabs";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <Sidebar />

      {/* Mobile fallback nav — the sidebar only renders at lg+ */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-[#f5f5f7]/70 backdrop-blur-2xl backdrop-saturate-150 lg:hidden dark:border-white/10 dark:bg-black/70">
        <div className="flex h-12 items-center gap-4 px-6">
          <span className="font-heading text-[15px] font-semibold tracking-tight">
            RG
          </span>
          <span className="h-3 w-px bg-foreground/15" aria-hidden />
          <NavTabs />
        </div>
      </header>

      <div className="flex w-full flex-1 flex-col lg:pl-64">
        <main className="mx-auto w-full max-w-6xl flex-1">{children}</main>
        <footer className="mt-auto">
          <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
            <p className="text-center text-[12px] text-muted-foreground">
              Copyright © {new Date().getFullYear()} RG Investment Group. All
              rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
