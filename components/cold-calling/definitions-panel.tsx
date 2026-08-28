import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { FUNNEL_DEFINITIONS } from "@/lib/cold-calling/dispositions";

/**
 * §11's first checklist item. These are proposals until RG ratifies them,
 * and the panel says so — every rate in the scorecard moves depending on
 * where these lines are drawn.
 */
export function DefinitionsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel definitions to confirm</CardTitle>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          These are proposals, not settled fact. Every rate below depends on
          them, so confirm them before the baseline starts — and then leave
          them alone for its full four weeks, or the trend means nothing.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {FUNNEL_DEFINITIONS.map((d) => (
          <div key={d.term}>
            <p className="text-[14px] font-medium">{d.term}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{d.definition}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{d.note}</p>
          </div>
        ))}

        <div className="flex gap-2.5 rounded-lg bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            strokeWidth={2.25}
          />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              The consequential one is &ldquo;meaningful conversation&rdquo;.
            </span>{" "}
            It is the denominator of qualified-lead rate. Counting an immediate
            refusal as a conversation would depress that rate for reasons
            unrelated to caller skill — so it currently does not count.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
