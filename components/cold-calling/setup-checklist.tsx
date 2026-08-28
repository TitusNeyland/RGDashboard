import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, Circle, CircleCheck } from "lucide-react";

export interface ChecklistItem {
  label: string;
  done: boolean;
  detail: string;
}

/**
 * The §11 build checklist. Ordered so the blocking items come first — the
 * definitions must be ratified before the four-week baseline starts, because
 * changing them mid-baseline invalidates the trend.
 */
export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          Build checklist
          <Badge className="border-transparent bg-secondary text-secondary-foreground">
            {done} of {items.length}
          </Badge>
        </CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Cold-calling metrics stay unavailable until these are done. Nothing
          here can be inferred from data RG already has.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
          {items.map((item) => (
            <li key={item.label} className="flex gap-2.5 py-3 first:pt-0 last:pb-0">
              {item.done ? (
                <CircleCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
                  strokeWidth={2.25}
                />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2.25} />
              )}
              <div className="min-w-0">
                <p className="text-[14px]">{item.label}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
