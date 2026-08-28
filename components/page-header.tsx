import { Badge } from "@/components/ui/badge";

function formatSyncedAt(date: Date | null) {
  if (!date) return null;
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * The bar at the top of every page: what you're looking at on the left,
 * where the data came from on the right. Deliberately compact — a dashboard
 * page title is a label, not a headline.
 */
export function PageHeader({
  title,
  description,
  usingMockData,
  lastSyncedAt = null,
}: {
  title: string;
  description?: string;
  usingMockData: boolean;
  lastSyncedAt?: Date | null;
}) {
  const synced = formatSyncedAt(lastSyncedAt);

  return (
    <div className="sticky top-0 z-30 border-b border-black/[0.07] bg-background/85 backdrop-blur-xl dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3.5">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 truncate text-[13px] leading-tight text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {synced && (
            <span className="hidden text-[12px] text-muted-foreground sm:inline">
              Synced {synced}
            </span>
          )}
          {usingMockData ? (
            <Badge className="border-transparent bg-amber-500/12 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              Mock data
            </Badge>
          ) : (
            <Badge className="border-transparent bg-green-500/12 text-green-700 dark:bg-green-500/20 dark:text-green-400">
              Live
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
