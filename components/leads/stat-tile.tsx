import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_STYLES = {
  blue: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  green: "bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  violet: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400",
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
    <Card className={className}>
      <CardContent>
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]",
                TONE_STYLES[tone]
              )}
            >
              <Icon className="h-[15px] w-[15px]" strokeWidth={2.25} />
            </div>
          )}
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        </div>
        <p className="font-heading mt-3 text-[32px] font-semibold leading-none tracking-[-0.03em]">
          {value}
        </p>
        {note && <p className="mt-1.5 text-[12px] text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
