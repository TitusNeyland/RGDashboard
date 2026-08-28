import type {
  opportunities,
  pipelineEvents,
  pipelineStages,
  users,
} from "@/drizzle/schema";
import {
  buildStageIndex,
  groupEventsByOpportunity,
  isTerminalLostStage,
  maxReachedPosition,
} from "@/lib/pipeline-events/reached";

type OpportunityRow = typeof opportunities.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;
type PipelineStageRow = typeof pipelineStages.$inferSelect;
type UserRow = typeof users.$inferSelect;

export type TeamRole = UserRow["teamRole"];

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  cold_caller: "Cold callers",
  va: "VAs",
  acquisitions: "Acquisitions",
  apprentice: "Apprentices",
  lead_manager: "Lead managers",
  unassigned: "Unassigned role",
};

/** The order the spec lists them in. */
export const TEAM_ROLE_ORDER: TeamRole[] = [
  "cold_caller",
  "va",
  "acquisitions",
  "apprentice",
  "lead_manager",
  "unassigned",
];

export interface EmployeeStats {
  user: UserRow | null;
  ghlId: string | null;
  name: string;
  teamRole: TeamRole;
  leadsWorked: number;
  appointmentsSet: number;
  leadsAdvanced: number;
  offersMade: number;
  contractsProduced: number;
  /** contracts / leads worked, as a percentage. Null with no leads. */
  conversionRatePct: number | null;
}

/**
 * Metrics the app cannot compute today, with the reason. Surfaced in the UI
 * so a missing data source never reads as a score of zero.
 */
export const UNAVAILABLE_METRICS = [
  {
    key: "response_time",
    label: "Response time",
    reason: "Needs GHL conversations/messages synced",
  },
  {
    key: "follow_ups_completed",
    label: "Follow-ups completed",
    reason: "Needs GHL tasks synced",
  },
] as const;

function pct(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * Per-employee pipeline performance.
 *
 * IMPORTANT — this measures the CURRENT OWNER of each lead, not who did the
 * work. GHL's opportunity webhooks report an opportunity's assignee, never
 * the user who performed a stage change (`pipeline_events.actorGhlId` is
 * therefore almost always null). So if a lead is reassigned, its entire
 * history moves to the new owner: the receiving rep is credited with
 * appointments and offers someone else produced.
 *
 * That makes these numbers a fair picture of *who owns what* and a rough
 * one of *who produced what*. They should not be used for individual
 * performance review without corroboration — see the caveat rendered on
 * the Team page.
 */
export function buildEmployeeReport(
  userRows: UserRow[],
  opportunityRows: OpportunityRow[],
  eventRows: PipelineEventRow[],
  stageRows: PipelineStageRow[]
): EmployeeStats[] {
  const { positionByStageId, nameByStageId, milestonePositions } = buildStageIndex(stageRows);
  const eventsByOpportunity = groupEventsByOpportunity(eventRows);

  const byOwner = new Map<string | null, OpportunityRow[]>();
  for (const opp of opportunityRows) {
    const key = opp.ownerGhlId ?? null;
    const list = byOwner.get(key) ?? [];
    list.push(opp);
    byOwner.set(key, list);
  }

  function statsFor(
    user: UserRow | null,
    ghlId: string | null,
    name: string,
    opps: OpportunityRow[]
  ): EmployeeStats {
    let appointmentsSet = 0;
    let offersMade = 0;
    let contractsProduced = 0;
    let leadsAdvanced = 0;

    for (const opp of opps) {
      const events = eventsByOpportunity.get(opp.ghlId) ?? [];
      const reached = maxReachedPosition(opp, events, positionByStageId, nameByStageId);
      const bars = opp.pipelineId ? milestonePositions.get(opp.pipelineId) : undefined;

      if (reached != null && bars) {
        const appt = bars.get("appointments");
        const offer = bars.get("offers");
        const contract = bars.get("contracts");
        if (appt != null && reached >= appt) appointmentsSet++;
        if (offer != null && reached >= offer) offersMade++;
        if (contract != null && reached >= contract) contractsProduced++;
      }

      // A lead counts as "advanced" once, if it ever moved forward — not
      // once per hop, so a lead nudged through five stages doesn't outscore
      // five separate leads that each moved once.
      const movedForward = events.some((e) => {
        if (!e.fromStageId || !e.toStageId) return false;
        // Moving a lead to Closed Lost is not advancing it. Terminal stages
        // sit at the end of a GHL pipeline, so by raw position a lost move
        // looks like the biggest jump forward there is.
        if (isTerminalLostStage(nameByStageId.get(e.toStageId) ?? null)) return false;
        const from = positionByStageId.get(e.fromStageId);
        const to = positionByStageId.get(e.toStageId);
        return from != null && to != null && to > from;
      });
      if (movedForward) leadsAdvanced++;
    }

    return {
      user,
      ghlId,
      name,
      teamRole: user?.teamRole ?? "unassigned",
      leadsWorked: opps.length,
      appointmentsSet,
      leadsAdvanced,
      offersMade,
      contractsProduced,
      conversionRatePct: pct(contractsProduced, opps.length),
    };
  }

  const rows: EmployeeStats[] = userRows.map((user) =>
    statsFor(
      user,
      user.ghlId,
      user.name ?? user.email ?? user.ghlId,
      byOwner.get(user.ghlId) ?? []
    )
  );

  // Leads with no assignee at all — shown so the totals reconcile against
  // the pipeline instead of silently under-reporting.
  const unowned = byOwner.get(null) ?? [];
  if (unowned.length > 0) {
    rows.push(statsFor(null, null, "Unassigned", unowned));
  }

  // Owners GHL reports on opportunities but that aren't in the users list
  // (deactivated staff, agency-level users). Without this they'd vanish.
  const knownIds = new Set(userRows.map((u) => u.ghlId));
  for (const [ownerId, opps] of byOwner) {
    if (ownerId == null || knownIds.has(ownerId)) continue;
    rows.push(statsFor(null, ownerId, opps[0]?.ownerName ?? ownerId, opps));
  }

  return rows.sort((a, b) => b.leadsWorked - a.leadsWorked);
}

/** Groups the report rows by RG's own job-function classification. */
export function groupByTeamRole(rows: EmployeeStats[]) {
  const grouped = new Map<TeamRole, EmployeeStats[]>();
  for (const row of rows) {
    const list = grouped.get(row.teamRole) ?? [];
    list.push(row);
    grouped.set(row.teamRole, list);
  }
  return TEAM_ROLE_ORDER.filter((role) => grouped.has(role)).map((role) => ({
    role,
    label: TEAM_ROLE_LABELS[role],
    members: grouped.get(role)!,
  }));
}
