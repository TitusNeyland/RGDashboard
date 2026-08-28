import { SetupChecklist, type ChecklistItem } from "@/components/cold-calling/setup-checklist";
import { DispositionMap } from "@/components/cold-calling/disposition-map";
import { DefinitionsPanel } from "@/components/cold-calling/definitions-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhoneOff, Workflow } from "lucide-react";
import { FUNNEL_LINKS } from "@/lib/cold-calling/diagnostics";

export const dynamic = "force-dynamic";

/**
 * Cold-calling channel (Tier 2B).
 *
 * No call data exists yet — Wavv is not integrated — so this deliberately
 * leads with what RG can act on today rather than a grid of empty metrics.
 * Showing zeros here would read as "cold calling produced nothing", which is
 * a business claim the data does not support.
 */
export default function ColdCallingPage() {
  // Wavv sync does not exist yet, so no call data can be present. Stated as a
  // fact of the build rather than inferred from an empty query.
  const wavvConnected = false;

  const checklist: ChecklistItem[] = [
    {
      label: "Confirm funnel definitions",
      done: false,
      detail:
        "Contact, meaningful conversation, qualified lead, appointment. Proposals are below; RG has to ratify them.",
    },
    {
      label: "Map every Wavv disposition",
      done: false,
      detail:
        "Run npm run discover:wavv to list the dispositions actually in use, then reconcile against the mapping below. Unmapped labels are excluded from every rate.",
    },
    {
      label: "Verify the Wavv API shape",
      done: wavvConnected,
      detail:
        "The client's base URL, auth header and field names are unverified guesses. npm run discover:wavv prints the real response, or names which assumption to fix.",
    },
    {
      label: "Sync call history",
      done: false,
      detail:
        "Needs the schema for calls, which is intentionally not written until discovery confirms the real field names.",
    },
    {
      label: "Preserve caller and list attribution",
      done: false,
      detail:
        "Every lead needs the caller and the list/batch that produced it, or per-caller and per-list economics cannot be computed.",
    },
    {
      label: "Run four weeks without changing definitions",
      done: false,
      detail: "Only then does a trailing baseline mean anything.",
    },
  ];

  return (
    <div className="flex flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-[13px] font-medium text-primary">Tier 2B · Channel</p>
        <h1 className="font-heading mt-2 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
          Cold Calling
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          Explains why the company numbers moved. The business outcomes
          themselves stay on the Scorecard.
        </p>
      </div>

      <Card>
        <CardContent className="flex gap-3">
          <PhoneOff
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            strokeWidth={2.25}
          />
          <div className="text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              No call data yet — Wavv is not connected.
            </span>{" "}
            Dials, contacts, conversations, talk time and dispositions all come
            from Wavv, so every rate in this channel is unavailable rather than
            zero. A zero here would read as &ldquo;cold calling produced
            nothing&rdquo;, which is a business claim the data cannot support.
          </div>
        </CardContent>
      </Card>

      <SetupChecklist items={checklist} />
      <DefinitionsPanel />
      <DispositionMap />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
            Weekly diagnostic
          </CardTitle>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Once call data and a four-week baseline exist, this walks the funnel
            in order and names the single most valuable thing to fix. It returns
            one constraint, not a list of warnings — an upstream leak starves
            every step below it.
          </p>
        </CardHeader>
        <CardContent>
          <ol className="divide-y divide-black/[0.06] dark:divide-white/10">
            {FUNNEL_LINKS.map((link, i) => (
              <li key={link.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-[13px] tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14px]">
                    {link.inputLabel} → {link.outputLabel}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    If this drops: {link.likelyArea.toLowerCase()}. {link.action}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
