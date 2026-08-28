import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400",
  violet: "text-violet-600 dark:text-violet-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
} as const;

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "blue",
  note,
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONE_STYLES;
  /** Small muted caption under the value — e.g. why a metric reads "—". */
  note?: string;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="px-4">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <Icon
              className={cn("h-3.5 w-3.5 shrink-0", TONE_STYLES[tone])}
              strokeWidth={2.25}
            />
          )}
          <p className="truncate text-[12px] font-medium text-muted-foreground">
            {label}
          </p>
        </div>
        <p className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
          {value}
        </p>
        {note && <p className="mt-1.5 text-[11px] text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
