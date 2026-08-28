import type {
  campaigns,
  contacts,
  opportunities,
  pipelineEvents,
  pipelineStages,
} from "@/drizzle/schema";

type OpportunityRow = typeof opportunities.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;
type PipelineEventRow = typeof pipelineEvents.$inferSelect;
type PipelineStageRow = typeof pipelineStages.$inferSelect;
type CampaignRow = typeof campaigns.$inferSelect;

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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-offer",
    stageName: "Offer Made",
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-appt",
    stageName: "Appointment Set",
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-contract",
    stageName: "Under Contract",
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-qualified",
    stageName: "Qualified",
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-new",
    stageName: "New Lead",
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-contacted",
    stageName: "Contacted",
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-new",
    stageName: "New Lead",
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-new",
    stageName: "New Lead",
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-lost",
    stageName: "Closed Lost", // status still "open" -> conflicting-status
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-contacted",
    stageName: "Contacted", // 35 days no update -> stalled-in-stage (high)
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
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId: "mock-stage-won",
    stageName: "Closed Won",
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
  event({ opportunityGhlId: "mock-ghl-1", fromStageId: null, fromStageName: null, toStageId: "mock-stage-new", toStageName: "New Lead", occurredAt: hoursAgo(96) }),
  event({ opportunityGhlId: "mock-ghl-1", fromStageId: "mock-stage-new", fromStageName: "New Lead", toStageId: "mock-stage-contacted", toStageName: "Contacted", occurredAt: hoursAgo(70) }),
  event({ opportunityGhlId: "mock-ghl-1", fromStageId: "mock-stage-contacted", fromStageName: "Contacted", toStageId: "mock-stage-qualified", toStageName: "Qualified", occurredAt: hoursAgo(40) }),
  event({ opportunityGhlId: "mock-ghl-1", fromStageId: "mock-stage-qualified", fromStageName: "Qualified", toStageId: "mock-stage-offer", toStageName: "Offer Made", eventType: "offer", occurredAt: hoursAgo(2) }),

  // 215 Willow Dr — offer accepted, now under contract.
  event({ opportunityGhlId: "mock-ghl-3", fromStageId: "mock-stage-offer", fromStageName: "Offer Made", toStageId: "mock-stage-contract", toStageName: "Under Contract", eventType: "contract", occurredAt: hoursAgo(5) }),

  // 12 Oakwood Rd — lost.
  event({ opportunityGhlId: "mock-ghl-9", fromStageId: "mock-stage-contacted", fromStageName: "Contacted", toStageId: "mock-stage-lost", toStageName: "Closed Lost", eventType: "lost", occurredAt: hoursAgo(10) }),

  // 64 Hollow Creek Dr — was lost, came back, then sat for 35 days.
  event({ opportunityGhlId: "mock-ghl-10", fromStageId: "mock-stage-lost", fromStageName: "Closed Lost", toStageId: "mock-stage-contacted", toStageName: "Contacted", eventType: "reactivation", occurredAt: hoursAgo(24 * 36) }),

  // Everyday stage moves for the rest of the mock leads.
  event({ opportunityGhlId: "mock-ghl-2", fromStageId: "mock-stage-new", fromStageName: "New Lead", toStageId: "mock-stage-appt", toStageName: "Appointment Set", occurredAt: hoursAgo(20) }),
  event({ opportunityGhlId: "mock-ghl-6", fromStageId: "mock-stage-new", fromStageName: "New Lead", toStageId: "mock-stage-contacted", toStageName: "Contacted", occurredAt: hoursAgo(28) }),
  event({ opportunityGhlId: "mock-ghl-8", fromStageId: null, fromStageName: null, toStageId: "mock-stage-new", toStageName: "New Lead", occurredAt: hoursAgo(50) }),
].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

function stageRow(
  position: number,
  stageId: string,
  stageName: string
): PipelineStageRow {
  return {
    id: `mock-stage-row-${position}`,
    pipelineId: "mock-pipeline",
    pipelineName: "Acquisitions Pipeline",
    stageId,
    stageName,
    position,
    syncedAt: hoursAgo(0.2),
  };
}

// Real GHL order for the mock pipeline's stages — the opportunities above
// reference these stageIds. "Closed Lost" sits last positionally but is
// excluded from forward-funnel conversion math (see lib/pipeline-dashboard.ts).
export const mockPipelineStages: PipelineStageRow[] = [
  stageRow(0, "mock-stage-new", "New Lead"),
  stageRow(1, "mock-stage-contacted", "Contacted"),
  stageRow(2, "mock-stage-qualified", "Qualified"),
  stageRow(3, "mock-stage-appt", "Appointment Set"),
  stageRow(4, "mock-stage-offer", "Offer Made"),
  stageRow(5, "mock-stage-contract", "Under Contract"),
  stageRow(6, "mock-stage-won", "Closed Won"),
  stageRow(7, "mock-stage-lost", "Closed Lost"),
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
