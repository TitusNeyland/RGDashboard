import type { contacts, opportunities, pipelineEvents } from "@/drizzle/schema";
import { latestStageEntryByOpportunity } from "@/lib/pipeline-events/time-in-stage";

type OpportunityRow = typeof opportunities.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;

export type LeadFlagPriority = "high" | "medium" | "low";

export interface LeadFlag {
  id: string;
  ruleId: string;
  opportunityId: string;
  leadName: string;
  whatIsWrong: string;
  whyItMatters: string;
  priority: LeadFlagPriority;
  recommendedAction: string;
  assignedEmployee: string;
}

export interface RuleDescriptor {
  id: string;
  label: string;
  /** From the spec doc, verbatim category. */
  status: "active" | "needs-data";
  blockedReason?: string;
}

/**
 * The 8 problem types from the spec. 4 are computable today from the
 * contacts + opportunities we actually sync; 4 need data this app doesn't
 * pull yet (GHL appointments, tasks, or a confirmed visit-tracking field) —
 * those are surfaced as "needs-data" rather than faked with guessed logic.
 */
export const RULE_CATALOG: RuleDescriptor[] = [
  { id: "hot-lead-uncontacted", label: "Hot lead not contacted", status: "active" },
  {
    id: "qualified-no-appointment",
    label: "Qualified lead without appointment",
    status: "needs-data",
    blockedReason: "Needs GHL appointments synced — not built yet",
  },
  {
    id: "appointment-no-next-action",
    label: "Appointment with no next action",
    status: "needs-data",
    blockedReason: "Needs GHL appointments + tasks synced",
  },
  {
    id: "visit-no-offer",
    label: "Property visit completed but no offer made",
    status: "needs-data",
    blockedReason: "Needs a confirmed visit-tracking field/tag from RG's GHL account",
  },
  {
    id: "followup-overdue",
    label: "Follow-up overdue",
    status: "needs-data",
    blockedReason: "Needs GHL tasks synced",
  },
  { id: "stalled-in-stage", label: "Lead sitting too long in a stage", status: "active" },
  { id: "conflicting-status", label: "Conflicting CRM statuses", status: "active" },
  { id: "duplicate-opportunity", label: "Duplicate opportunities", status: "active" },
];

const HOT_TAG_PATTERN = /\bhot\b/i;
const HOT_LEAD_NO_CONTACT_HOURS = 24;
const STALLED_MEDIUM_DAYS = 14;
const STALLED_HIGH_DAYS = 30;
const TERMINAL_KEYWORDS = ["won", "lost", "closed", "dead", "abandon"];
const OPEN_TERMINAL_KEYWORDS = { won: ["won", "contract"], lost: ["lost", "dead", "abandon"] };

function hoursSince(date: Date | null): number | null {
  if (!date) return null;
  return (Date.now() - date.getTime()) / (60 * 60 * 1000);
}

function hasHotTag(contact: ContactRow | undefined): boolean {
  const tags = (contact?.raw as { tags?: unknown })?.tags;
  if (!Array.isArray(tags)) return false;
  return tags.some((t) => typeof t === "string" && HOT_TAG_PATTERN.test(t));
}

function flagHotLeadUncontacted(
  row: OpportunityRow,
  contact: ContactRow | undefined
): LeadFlag | null {
  if (row.status !== "open") return null;
  if (!hasHotTag(contact)) return null;
  const lastActivity = row.ghlUpdatedAt ?? row.ghlCreatedAt;
  const idleHours = hoursSince(lastActivity);
  if (idleHours == null || idleHours < HOT_LEAD_NO_CONTACT_HOURS) return null;

  return {
    id: `hot-lead-uncontacted:${row.ghlId}`,
    ruleId: "hot-lead-uncontacted",
    opportunityId: row.id,
    leadName: row.name ?? "Unnamed lead",
    whatIsWrong: `Tagged as a hot lead but no activity in ${Math.round(idleHours)}h.`,
    whyItMatters: "Hot leads go cold fast — every hour uncontacted lowers the odds of a response.",
    priority: "high",
    recommendedAction: "Call or text today; confirm the lead is still working this contact.",
    assignedEmployee: row.ownerName ?? "Unassigned",
  };
}

function flagStalledInStage(
  row: OpportunityRow,
  stageEnteredAt: Date | undefined
): LeadFlag | null {
  if (row.status !== "open") return null;
  // Real stage-entry time from the pipeline event log when we have it;
  // GHL's last-update timestamp otherwise — an honest proxy for leads with
  // no recorded event history yet (e.g. before Phase 1 tracking started).
  const usingRealEntry = stageEnteredAt != null;
  const hours = usingRealEntry
    ? hoursSince(stageEnteredAt!)
    : (hoursSince(row.ghlUpdatedAt) ?? hoursSince(row.ghlCreatedAt));
  if (hours == null) return null;
  const daysStale = hours / 24;
  if (daysStale < STALLED_MEDIUM_DAYS) return null;

  const priority: LeadFlagPriority = daysStale >= STALLED_HIGH_DAYS ? "high" : "medium";
  return {
    id: `stalled-in-stage:${row.ghlId}`,
    ruleId: "stalled-in-stage",
    opportunityId: row.id,
    leadName: row.name ?? "Unnamed lead",
    whatIsWrong: usingRealEntry
      ? `In "${row.stageName ?? "an unknown stage"}" for ${Math.floor(daysStale)} days.`
      : `No GHL update in ${Math.floor(daysStale)} days in "${row.stageName ?? "an unknown stage"}".`,
    whyItMatters: "Leads that sit untouched are the ones most likely to go with a competitor or lose interest.",
    priority,
    recommendedAction: "Review the lead and either advance it or explicitly mark it dead.",
    assignedEmployee: row.ownerName ?? "Unassigned",
  };
}

function flagConflictingStatus(row: OpportunityRow): LeadFlag | null {
  const stage = (row.stageName ?? "").toLowerCase();
  const status = (row.status ?? "").toLowerCase();
  if (!stage || !status) return null;

  let conflict: string | null = null;
  if (status === "open" && TERMINAL_KEYWORDS.some((k) => stage.includes(k))) {
    conflict = `Status is "open" but the stage ("${row.stageName}") reads as closed.`;
  } else if (
    status === "won" &&
    !OPEN_TERMINAL_KEYWORDS.won.some((k) => stage.includes(k))
  ) {
    conflict = `Status is "won" but the stage ("${row.stageName}") doesn't reflect that.`;
  } else if (
    (status === "lost" || status === "abandoned") &&
    !OPEN_TERMINAL_KEYWORDS.lost.some((k) => stage.includes(k))
  ) {
    conflict = `Status is "${row.status}" but the stage ("${row.stageName}") doesn't reflect that.`;
  }
  if (!conflict) return null;

  return {
    id: `conflicting-status:${row.ghlId}`,
    ruleId: "conflicting-status",
    opportunityId: row.id,
    leadName: row.name ?? "Unnamed lead",
    whatIsWrong: conflict,
    whyItMatters: "Mismatched status/stage breaks every report built on top of either field.",
    priority: "medium",
    recommendedAction: "Open the record in GHL and correct the status or the stage.",
    assignedEmployee: row.ownerName ?? "Unassigned",
  };
  // Heuristic, keyword-based against whatever stage names RG's account
  // actually uses — re-check against real stage names from the Phase 0
  // discovery pass and tighten the keyword list if it over/under-fires.
}

function flagDuplicateOpportunities(rows: OpportunityRow[]): LeadFlag[] {
  const byContact = new Map<string, OpportunityRow[]>();
  for (const row of rows) {
    if (row.status !== "open" || !row.contactGhlId) continue;
    const group = byContact.get(row.contactGhlId) ?? [];
    group.push(row);
    byContact.set(row.contactGhlId, group);
  }

  const flags: LeadFlag[] = [];
  for (const group of byContact.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort(
      (a, b) => (b.ghlUpdatedAt?.getTime() ?? 0) - (a.ghlUpdatedAt?.getTime() ?? 0)
    );
    const [primary, ...duplicates] = sorted;
    flags.push({
      id: `duplicate-opportunity:${primary.ghlId}`,
      ruleId: "duplicate-opportunity",
      opportunityId: primary.id,
      leadName: primary.name ?? "Unnamed lead",
      whatIsWrong: `Same contact has ${group.length} open opportunities: ${sorted
        .map((r) => r.name ?? "Unnamed")
        .join(", ")}.`,
      whyItMatters: "Duplicate opportunities split follow-up across reps and skew pipeline counts.",
      priority: "medium",
      recommendedAction: `Merge or close ${duplicates.length === 1 ? "the duplicate" : "the duplicates"}, keeping the most current one.`,
      assignedEmployee: primary.ownerName ?? "Unassigned",
    });
  }
  return flags;
}

const PRIORITY_RANK: Record<LeadFlagPriority, number> = { high: 0, medium: 1, low: 2 };

export function evaluateLeadRules(
  opportunityRows: OpportunityRow[],
  contactRows: ContactRow[],
  eventRows: PipelineEventRow[] = []
): LeadFlag[] {
  const contactsById = new Map(contactRows.map((c) => [c.ghlId, c]));
  const stageEnteredById = latestStageEntryByOpportunity(eventRows);
  const flags: LeadFlag[] = [];

  for (const row of opportunityRows) {
    const contact = row.contactGhlId ? contactsById.get(row.contactGhlId) : undefined;
    const hot = flagHotLeadUncontacted(row, contact);
    if (hot) flags.push(hot);
    const stalled = flagStalledInStage(row, stageEnteredById.get(row.ghlId));
    if (stalled) flags.push(stalled);
    const conflict = flagConflictingStatus(row);
    if (conflict) flags.push(conflict);
  }
  flags.push(...flagDuplicateOpportunities(opportunityRows));

  return flags.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}
