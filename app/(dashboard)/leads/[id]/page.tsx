import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPipelineData } from "@/lib/load-pipeline-data";
import { buildLeadContext } from "@/lib/ai/context";
import { getAiProvider } from "@/lib/ai";
import { AiInsightCard } from "@/components/leads/ai-insight-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calculator, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Prerendered lead pages.
 *
 * CAPPED DELIBERATELY. Against RG's real account this returns 3,000+
 * opportunities, and Next builds a page per param — each one loading the full
 * dataset. That turned `next build` into an hours-long job. On Vercel the
 * remaining ids render on demand (dynamicParams defaults to true); on the
 * static export only mock data is present, which is well under the cap.
 */
const MAX_PRERENDERED_LEADS = 25;

export async function generateStaticParams() {
  const { opportunities } = await loadPipelineData();
  return opportunities.slice(0, MAX_PRERENDERED_LEADS).map((o) => ({ id: o.id }));
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[14px] font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default async function LeadDetailPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const { opportunities, contacts, events, usingMockData } = await loadPipelineData();

  const lead = opportunities.find((o) => o.id === id);
  if (!lead) notFound();

  const context = buildLeadContext(lead, events, opportunities, contacts);
  const insight = await getAiProvider().generateLeadInsight(context);
  const brief = await getAiProvider().generateAcquisitionBrief(context);

  return (
    <div className="flex flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      {usingMockData && (
        <div className="w-fit rounded-full bg-white px-4 py-1.5 text-[13px] text-muted-foreground dark:bg-card">
          Previewing mock data
        </div>
      )}

      <div className="max-w-2xl">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
          Back to pipeline
        </Link>
        <h1 className="font-heading mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[40px]">
          {lead.name ?? "Unnamed lead"}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[15px] text-muted-foreground">
          {lead.stageName && (
            <Badge className="border-transparent bg-secondary text-secondary-foreground">
              {lead.stageName}
            </Badge>
          )}
          <span>{lead.pipelineName ?? "Unknown pipeline"}</span>
          <span aria-hidden>·</span>
          <span>{lead.ownerName ?? "Unassigned"}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Deterministic column — plain code, never the model. */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
              Computed facts
            </CardTitle>
            <p className="text-[13px] text-muted-foreground">
              Calculated in code, not by a model.
            </p>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-black/[0.06] dark:divide-white/10">
              <Fact
                label="Days since update"
                value={
                  context.facts.daysSinceLastUpdate == null
                    ? "—"
                    : String(context.facts.daysSinceLastUpdate)
                }
              />
              <Fact
                label="Days in stage"
                value={
                  context.facts.daysInCurrentStage == null
                    ? "—"
                    : String(context.facts.daysInCurrentStage)
                }
              />
              <Fact label="Stage changes" value={String(context.facts.stageHistory.length)} />
              <Fact label="Open flags" value={String(context.facts.openFlags.length)} />
              <Fact label="Lead source" value={lead.source ?? "—"} />
              <Fact
                label="Value"
                value={
                  lead.monetaryValue
                    ? Number(lead.monetaryValue).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      })
                    : "—"
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Judgment column — the only place a model is used. */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <AiInsightCard result={insight} />

          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
                Acquisition brief
                {brief.isPlaceholder && (
                  <Badge className="border-transparent bg-amber-500/14 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                    Placeholder
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-[14px]">
              <p className="font-medium">{brief.data.headline}</p>
              <p className="leading-relaxed text-muted-foreground">
                {brief.data.sellerSituation}
              </p>
              <p className="leading-relaxed text-muted-foreground">
                {brief.data.propertyNotes}
              </p>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  Risks
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {brief.data.risks.map((r) => (
                    <li key={r} className="text-muted-foreground">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                  Next step
                </p>
                <p className="mt-1">{brief.data.suggestedNextStep}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {context.facts.stageHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stage history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
              {context.facts.stageHistory.map((s, i) => (
                <li
                  key={`${s.stage}-${i}`}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-[14px]">{s.stage}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {s.enteredAt.toISOString().slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
