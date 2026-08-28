import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Info } from "lucide-react";
import { FOLLOW_UP_LABELS, type AiResult, type LeadInsight } from "@/lib/ai/types";

const MOTIVATION_STYLES: Record<string, string> = {
  high: "border-transparent bg-green-500/12 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  medium: "border-transparent bg-amber-500/14 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  low: "border-transparent bg-secondary text-secondary-foreground",
  unknown: "border-transparent bg-secondary text-secondary-foreground",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-[14px]">{children}</div>
    </div>
  );
}

export function AiInsightCard({ result }: { result: AiResult<LeadInsight> }) {
  const i = result.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          AI read
          {result.isPlaceholder && (
            <Badge className="border-transparent bg-amber-500/14 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              Placeholder
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {result.caveat && (
          <div className="flex gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              strokeWidth={2.25}
            />
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {result.caveat}
            </p>
          </div>
        )}

        <Field label="Summary">
          <p className="leading-relaxed text-muted-foreground">{i.summary}</p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Seller motivation">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={MOTIVATION_STYLES[i.motivation.level]}>
                {i.motivation.level}
              </Badge>
              {i.motivation.signals.length === 0 && (
                <span className="text-[13px] text-muted-foreground">No signals found</span>
              )}
            </div>
            {i.motivation.signals.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {i.motivation.signals.map((s) => (
                  <li key={s} className="text-[13px] text-muted-foreground">
                    &ldquo;{s}&rdquo;
                  </li>
                ))}
              </ul>
            )}
          </Field>

          <Field label="Price objection">
            {i.priceObjection.detected ? (
              <p className="text-muted-foreground">{i.priceObjection.detail}</p>
            ) : (
              <span className="text-[13px] text-muted-foreground">None detected</span>
            )}
          </Field>

          <Field label="Still interested?">
            <p className="capitalize">{i.stillInterested.verdict}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {i.stillInterested.reason}
            </p>
          </Field>

          <Field label="Recommended follow-up">
            <p>{FOLLOW_UP_LABELS[i.recommendedFollowUp.category]}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {i.recommendedFollowUp.reason}
            </p>
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}
