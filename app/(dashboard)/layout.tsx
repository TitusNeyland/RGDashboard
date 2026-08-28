import { Sidebar } from "@/components/sidebar";
import { NavTabs } from "@/components/nav-tabs";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-full lg:pl-[232px]">
      <Sidebar />

      {/* Mobile nav — the sidebar only renders at lg+ */}
      <header className="sticky top-0 z-50 border-b border-black/[0.07] bg-background/85 backdrop-blur-xl lg:hidden dark:border-white/10">
        <div className="flex h-12 items-center gap-3 px-4">
          <span className="text-[14px] font-semibold tracking-tight">RG</span>
          <span className="h-3 w-px bg-foreground/15" aria-hidden />
          <div className="min-w-0 overflow-x-auto">
            <NavTabs />
          </div>
        </div>
      </header>

      <main className="min-h-full">{children}</main>
    </div>
  );
}
