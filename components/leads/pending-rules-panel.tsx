import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import type { RuleDescriptor } from "@/lib/rules/lead-rules";

export function PendingRulesPanel({ rules }: { rules: RuleDescriptor[] }) {
  if (rules.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          Not yet available
        </CardTitle>
        <p className="text-[13px] text-muted-foreground">
          These 4 checks from the spec need data this app doesn&apos;t sync yet.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
          {rules.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <span className="text-[14px]">{rule.label}</span>
              <span className="text-[13px] text-muted-foreground">{rule.blockedReason}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
