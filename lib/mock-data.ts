import type {
  campaigns,
  contacts,
  opportunities,
  pipelineEvents,
  pipelineStages,
  users,
} from "@/drizzle/schema";

type OpportunityRow = typeof opportunities.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;
type PipelineStageRow = typeof pipelineStages.$inferSelect;
type CampaignRow = typeof campaigns.$inferSelect;
type UserRow = typeof users.$inferSelect;

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

/**
 * Fake rows shaped like a real `opportunities` sync, so the leads page can
 * be previewed without a Postgres connection or GHL credentials. Used only
 * as a fallback when the real DB isn't configured yet — see app/(dashboard)/leads/page.tsx.
 */
export const mockOpportunities: OpportunityRow[] = [
  {
    id: "mock-1",
    ghlId: "mock-ghl-1",
    source: "SMS - Jackson Absentee Owner",
    contactGhlId: "mock-contact-1",
    name: "412 Maple St, Jackson MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "42f0caff-969f-40e0-99b8-5ef839e03812",
    stageName: "Offer Sent/ Negotiating",
    status: "open",
    ownerGhlId: "mock-owner-1",
    ownerName: "Devin R.",
    monetaryValue: "142000",
    raw: {},
    ghlCreatedAt: hoursAgo(96),
    ghlUpdatedAt: hoursAgo(2),
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-2",
    ghlId: "mock-ghl-2",
    source: "SMS - Jackson Absentee Owner",
    contactGhlId: "mock-contact-2",
    name: "88 Cedar Ave, Ridgeland MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "b940d2af-4cf4-494c-a507-a035c7e83caa",
    stageName: "APPOINTMENT SET",
    status: "open",
    ownerGhlId: "mock-owner-2",
    ownerName: "Priya K.",
    monetaryValue: "98500",
    raw: {},
    ghlCreatedAt: hoursAgo(48),
    ghlUpdatedAt: hoursAgo(20),
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-3",
    ghlId: "mock-ghl-3",
    source: "SMS - Jackson Absentee Owner",
    contactGhlId: "mock-contact-3",
    name: "215 Willow Dr, Clinton MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "60ed85ef-5e19-49e0-a6ea-0884fe35abb8",
    stageName: "Under contract",
    status: "open",
    ownerGhlId: "mock-owner-1",
    ownerName: "Devin R.",
    monetaryValue: "176000",
    raw: {},
    ghlCreatedAt: hoursAgo(200),
    ghlUpdatedAt: hoursAgo(5),
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-4",
    ghlId: "mock-ghl-4",
    source: "Cold Call - Hinds County",
    contactGhlId: "mock-contact-4",
    name: "1029 Birch Ln, Pearl MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "40b8aba6-6be9-49e5-9025-8f7178eab64d",
    stageName: "MANUAL TEXT/ CALLED",
    status: "open",
    ownerGhlId: null,
    ownerName: null,
    monetaryValue: "64000",
    raw: {},
    ghlCreatedAt: hoursAgo(12),
    ghlUpdatedAt: hoursAgo(12),
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-5",
    ghlId: "mock-ghl-5",
    source: "SMS - Jackson Absentee Owner",
    contactGhlId: "mock-contact-5",
    name: "77 Sycamore Ct, Flowood MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "09f34606-394f-4fec-a2e1-c824772626ab",
    stageName: "AI LEAD NOTIFICATION",
    status: "open",
    ownerGhlId: "mock-owner-3",
    ownerName: "Marcus T.",
    monetaryValue: null,
    raw: {},
    ghlCreatedAt: hoursAgo(1),
    ghlUpdatedAt: hoursAgo(1),
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-6",
    ghlId: "mock-ghl-6",
    source: "Cold Call - Hinds County",
    contactGhlId: "mock-contact-6",
    name: "530 Poplar St, Brandon MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "a270a344-5615-4596-bab7-569cd020c6f9",
    stageName: "1st CALL",
    status: "open",
    ownerGhlId: "mock-owner-2",
    ownerName: "Priya K.",
    monetaryValue: "121000",
    raw: {},
    ghlCreatedAt: hoursAgo(30),
    ghlUpdatedAt: hoursAgo(28),
    syncedAt: hoursAgo(0.2),
  },
  // The rows below exist to exercise each of the four rules the Lead
  // Manager can actually evaluate today (see lib/rules/lead-rules.ts).
  {
    id: "mock-7",
    ghlId: "mock-ghl-7",
    source: "SMS - Jackson Absentee Owner",
    contactGhlId: "mock-contact-2", // same contact as mock-2 -> duplicate-opportunity
    name: "88 Cedar Ave, Ridgeland MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "09f34606-394f-4fec-a2e1-c824772626ab",
    stageName: "AI LEAD NOTIFICATION",
    status: "open",
    ownerGhlId: "mock-owner-2",
    ownerName: "Priya K.",
    monetaryValue: null,
    raw: {},
    ghlCreatedAt: hoursAgo(1),
    ghlUpdatedAt: hoursAgo(1),
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-8",
    ghlId: "mock-ghl-8",
    source: null,
    contactGhlId: "mock-contact-8", // tagged "Hot Lead" -> hot-lead-uncontacted
    name: "9 Fawn Trail, Terry MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "09f34606-394f-4fec-a2e1-c824772626ab",
    stageName: "AI LEAD NOTIFICATION",
    status: "open",
    ownerGhlId: "mock-owner-3",
    ownerName: "Marcus T.",
    monetaryValue: null,
    raw: {},
    ghlCreatedAt: hoursAgo(50),
    ghlUpdatedAt: hoursAgo(50),
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-9",
    ghlId: "mock-ghl-9",
    source: "SMS - Jackson Absentee Owner",
    contactGhlId: "mock-contact-9",
    name: "12 Oakwood Rd, Madison MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "392b72de-334e-4394-a8ca-2da2b16102a6",
    stageName: "Lost", // status still "open" -> conflicting-status
    status: "open",
    ownerGhlId: "mock-owner-1",
    ownerName: "Devin R.",
    monetaryValue: "55000",
    raw: {},
    ghlCreatedAt: hoursAgo(300),
    ghlUpdatedAt: hoursAgo(10),
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-10",
    ghlId: "mock-ghl-10",
    source: "Cold Call - Hinds County",
    contactGhlId: "mock-contact-10",
    name: "64 Hollow Creek Dr, Byram MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "a270a344-5615-4596-bab7-569cd020c6f9",
    stageName: "1st CALL", // 35 days no update -> stalled-in-stage (high)
    status: "open",
    ownerGhlId: "mock-owner-2",
    ownerName: "Priya K.",
    monetaryValue: "89000",
    raw: {},
    ghlCreatedAt: hoursAgo(24 * 40),
    ghlUpdatedAt: hoursAgo(24 * 35),
    syncedAt: hoursAgo(0.2),
  },
  // A closed/won deal, so campaign revenue and ROI have something real to
  // compute from (revenue counts won deals only — see lib/campaigns/report.ts).
  {
    id: "mock-11",
    ghlId: "mock-ghl-11",
    source: "SMS - Jackson Absentee Owner",
    contactGhlId: "mock-contact-11",
    name: "301 Ridge Rd, Jackson MS",
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId: "3f154b00-0c74-4de6-ab65-79d665068e32",
    stageName: "closed",
    status: "won",
    ownerGhlId: "mock-owner-1",
    ownerName: "Devin R.",
    monetaryValue: "27000",
    raw: {},
    ghlCreatedAt: hoursAgo(24 * 22),
    ghlUpdatedAt: hoursAgo(24 * 2),
    syncedAt: hoursAgo(0.2),
  },
];

let eventSeq = 0;
function event(
  partial: Omit<PipelineEventRow, "id" | "createdAt" | "source" | "actorGhlId" | "raw" | "eventType"> &
    Partial<Pick<PipelineEventRow, "eventType">>
): PipelineEventRow {
  eventSeq++;
  return {
    id: `mock-event-${eventSeq}`,
    source: "poll_diff",
    actorGhlId: null,
    raw: null,
    eventType: "stage_change",
    createdAt: partial.occurredAt,
    ...partial,
  };
}

export const mockPipelineEvents: PipelineEventRow[] = [
  // 412 Maple St — full run from New Lead to an offer.
  event({ opportunityGhlId: "mock-ghl-1", fromStageId: null, fromStageName: null, toStageId: "09f34606-394f-4fec-a2e1-c824772626ab", toStageName: "AI LEAD NOTIFICATION", occurredAt: hoursAgo(96) }),
  event({ opportunityGhlId: "mock-ghl-1", fromStageId: "09f34606-394f-4fec-a2e1-c824772626ab", fromStageName: "AI LEAD NOTIFICATION", toStageId: "a270a344-5615-4596-bab7-569cd020c6f9", toStageName: "1st CALL", occurredAt: hoursAgo(70) }),
  event({ opportunityGhlId: "mock-ghl-1", fromStageId: "a270a344-5615-4596-bab7-569cd020c6f9", fromStageName: "1st CALL", toStageId: "40b8aba6-6be9-49e5-9025-8f7178eab64d", toStageName: "MANUAL TEXT/ CALLED", occurredAt: hoursAgo(40) }),
  event({ opportunityGhlId: "mock-ghl-1", fromStageId: "40b8aba6-6be9-49e5-9025-8f7178eab64d", fromStageName: "MANUAL TEXT/ CALLED", toStageId: "42f0caff-969f-40e0-99b8-5ef839e03812", toStageName: "Offer Sent/ Negotiating", eventType: "offer", occurredAt: hoursAgo(2) }),

  // 215 Willow Dr — offer accepted, now under contract.
  event({ opportunityGhlId: "mock-ghl-3", fromStageId: "42f0caff-969f-40e0-99b8-5ef839e03812", fromStageName: "Offer Sent/ Negotiating", toStageId: "60ed85ef-5e19-49e0-a6ea-0884fe35abb8", toStageName: "Under contract", eventType: "contract", occurredAt: hoursAgo(5) }),

  // 12 Oakwood Rd — lost.
  event({ opportunityGhlId: "mock-ghl-9", fromStageId: "a270a344-5615-4596-bab7-569cd020c6f9", fromStageName: "1st CALL", toStageId: "392b72de-334e-4394-a8ca-2da2b16102a6", toStageName: "Lost", eventType: "lost", occurredAt: hoursAgo(10) }),

  // 64 Hollow Creek Dr — was lost, came back, then sat for 35 days.
  event({ opportunityGhlId: "mock-ghl-10", fromStageId: "392b72de-334e-4394-a8ca-2da2b16102a6", fromStageName: "Lost", toStageId: "a270a344-5615-4596-bab7-569cd020c6f9", toStageName: "1st CALL", eventType: "reactivation", occurredAt: hoursAgo(24 * 36) }),

  // Everyday stage moves for the rest of the mock leads.
  event({ opportunityGhlId: "mock-ghl-2", fromStageId: "09f34606-394f-4fec-a2e1-c824772626ab", fromStageName: "AI LEAD NOTIFICATION", toStageId: "b940d2af-4cf4-494c-a507-a035c7e83caa", toStageName: "APPOINTMENT SET", occurredAt: hoursAgo(20) }),
  event({ opportunityGhlId: "mock-ghl-6", fromStageId: "09f34606-394f-4fec-a2e1-c824772626ab", fromStageName: "AI LEAD NOTIFICATION", toStageId: "a270a344-5615-4596-bab7-569cd020c6f9", toStageName: "1st CALL", occurredAt: hoursAgo(28) }),
  event({ opportunityGhlId: "mock-ghl-8", fromStageId: null, fromStageName: null, toStageId: "09f34606-394f-4fec-a2e1-c824772626ab", toStageName: "AI LEAD NOTIFICATION", occurredAt: hoursAgo(50) }),
].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

function stageRow(
  position: number,
  stageId: string,
  stageName: string
): PipelineStageRow {
  return {
    id: `mock-stage-row-${position}`,
    pipelineId: "VwDHYOpeE22Qq3SBd9Fj",
    pipelineName: "THE RG WAY",
    stageId,
    stageName,
    position,
    syncedAt: hoursAgo(0.2),
  };
}

// Mirrors THE RG WAY, RG's real acquisition funnel, using its actual
// pipeline and stage IDs (read via `npm run discover`). Keeping the mock
// aligned to production means the pipeline filter and milestone config
// behave identically here and against live data.
export const mockPipelineStages: PipelineStageRow[] = [
  stageRow(0, "09f34606-394f-4fec-a2e1-c824772626ab", "AI LEAD NOTIFICATION"),
  stageRow(1, "40b8aba6-6be9-49e5-9025-8f7178eab64d", "MANUAL TEXT/ CALLED"),
  stageRow(2, "a270a344-5615-4596-bab7-569cd020c6f9", "1st CALL"),
  stageRow(3, "b940d2af-4cf4-494c-a507-a035c7e83caa", "APPOINTMENT SET"),
  stageRow(4, "0aeb11dd-0923-4e14-b15b-0430c2d76a03", "Appointment completed"),
  stageRow(5, "42f0caff-969f-40e0-99b8-5ef839e03812", "Offer Sent/ Negotiating"),
  stageRow(6, "802a7573-7b6e-4f45-942a-37e0fa77594b", "Agreement sent"),
  stageRow(7, "60ed85ef-5e19-49e0-a6ea-0884fe35abb8", "Under contract"),
  stageRow(8, "3f154b00-0c74-4de6-ab65-79d665068e32", "closed"),
  stageRow(9, "739c42be-e3a0-4b25-a70d-9c570ac49a5c", "Needs Follow up"),
  stageRow(10, "392b72de-334e-4394-a8ca-2da2b16102a6", "Lost"),
];

/**
 * Delivery-side campaign data — in production these numbers come from RG's
 * SMS/dialer tool via `npm run import:campaigns`, never from GHL. The
 * pipeline-side numbers (qualified, appointments, revenue) are NOT here:
 * they're computed from attributed opportunities at read time.
 */
export const mockCampaigns: CampaignRow[] = [
  {
    id: "mock-campaign-1",
    key: "jackson-absentee-owner",
    name: "SMS - Jackson Absentee Owner",
    channel: "sms",
    listName: "Jackson Absentee Owners (Q3)",
    market: "Jackson, MS",
    startedOn: hoursAgo(24 * 30),
    recordsLoaded: 3000,
    messagesSent: 2940,
    delivered: 2650,
    failed: 290,
    replies: 183,
    positiveReplies: 41,
    negativeReplies: 108,
    dncRequests: 22,
    wrongNumbers: 12,
    costCents: 138000, // $1,380
    updatedAt: hoursAgo(1),
  },
  {
    id: "mock-campaign-2",
    key: "hinds-county-cold-call",
    name: "Cold Call - Hinds County",
    channel: "cold_call",
    listName: "Hinds County Distressed",
    market: "Hinds County, MS",
    startedOn: hoursAgo(24 * 21),
    recordsLoaded: 1200,
    messagesSent: 1150,
    delivered: 940,
    failed: 210,
    replies: 96,
    positiveReplies: 19,
    negativeReplies: 61,
    dncRequests: 11,
    wrongNumbers: 5,
    costCents: 96000, // $960
    updatedAt: hoursAgo(1),
  },
];

/**
 * Mock employees. `teamRole` is RG's own classification — GHL only reports
 * admin/user, so in production these come from `npm run import:team`.
 * mock-owner-4 has no opportunities, to exercise the zero-activity case.
 */
export const mockUsers: UserRow[] = [
  {
    id: "mock-user-1",
    ghlId: "mock-owner-1",
    name: "Devin R.",
    email: "devin@example.com",
    phone: null,
    ghlRole: "admin",
    teamRole: "acquisitions",
    raw: {},
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-user-2",
    ghlId: "mock-owner-2",
    name: "Priya K.",
    email: "priya@example.com",
    phone: null,
    ghlRole: "user",
    teamRole: "acquisitions",
    raw: {},
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-user-3",
    ghlId: "mock-owner-3",
    name: "Marcus T.",
    email: "marcus@example.com",
    phone: null,
    ghlRole: "user",
    teamRole: "cold_caller",
    raw: {},
    syncedAt: hoursAgo(0.2),
  },
  {
    id: "mock-user-4",
    ghlId: "mock-owner-4",
    name: "Ana L.",
    email: "ana@example.com",
    phone: null,
    ghlRole: "user",
    teamRole: "va",
    raw: {},
    syncedAt: hoursAgo(0.2),
  },
];

export const mockContacts: ContactRow[] = [
  {
    id: "mock-contact-row-8",
    ghlId: "mock-contact-8",
    name: "Renee Aldridge",
    email: "renee@example.com",
    phone: null,
    raw: { tags: ["Hot Lead"] },
    syncedAt: hoursAgo(0.2),
  },
];
