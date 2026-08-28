/**
 * The central KPI registry (spec §5 and §8).
 *
 * Nothing downstream hardcodes a formula, a threshold, or an explanation —
 * pages and components read from here, so definitions can evolve without
 * touching application code.
 *
 * ON THRESHOLDS: the warn/critical numbers below are PROVISIONAL placeholders
 * so the status engine has something to compare against on day one. They are
 * not industry benchmarks and must not be presented as targets. Per §7, RG's
 * own trailing performance becomes the real benchmark as history accumulates;
 * these should be replaced by RG baselines (and later by admin config, §26)
 * rather than treated as authoritative.
 */

export type KpiCategory =
  | "revenue"
  | "conversion"
  | "efficiency"
  | "velocity"
  | "marketing"
  | "quality";

export type HealthyDirection = "higher_is_better" | "lower_is_better";

export type KpiFormat = "percent" | "currency" | "number" | "days" | "ratio";

/** The §8 self-explanation block. Every KPI must be able to explain itself. */
export interface KpiExplanation {
  whatItMeasures: string;
  /** What a LOW result may indicate. */
  whenLow: string[];
  /** What an unusually HIGH result may indicate — high is not always good. */
  whenHigh: string[];
}

export interface KpiDefinition {
  id: string;
  name: string;
  category: KpiCategory;
  description: string;
  /** Human-readable formula shown in the UI. */
  formula: string;
  numerator: string;
  denominator: string | null;
  sourceFields: string[];
  sourceSystems: string[];
  format: KpiFormat;
  healthyDirection: HealthyDirection;
  /** Provisional — see file header. Null means "no threshold defined yet". */
  warningThreshold: number | null;
  criticalThreshold: number | null;
  /** Below this denominator the KPI reports INSUFFICIENT_DATA, never a status. */
  minSampleSize: number;
  owner: string;
  relatedKpis: string[];
  likelyCauses: string[];
  explanation: KpiExplanation;
  /**
   * Set when the KPI cannot be computed at all today. Names the exact missing
   * data source. A blocked KPI renders INSUFFICIENT_DATA with this reason —
   * never a zero, which would read as a business result rather than a gap.
   */
  blockedBy: string | null;
  /** Shown alongside the value when the number is real but qualified. */
  caveat?: string;
}

export const KPI_DEFINITIONS: KpiDefinition[] = [
  // ---------------------------------------------------------------- conversion
  {
    id: "lead_to_appointment",
    name: "Lead → Appointment",
    category: "conversion",
    description: "Share of new leads that produce a booked appointment.",
    formula: "Appointments reached in period ÷ New leads created in period",
    numerator: "Opportunities reaching the appointment stage within the window",
    denominator: "Opportunities created within the window",
    sourceFields: ["pipeline_events.occurred_at", "pipeline_events.to_stage_id", "opportunities.ghl_created_at"],
    sourceSystems: ["GoHighLevel"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: 35,
    criticalThreshold: 20,
    minSampleSize: 10,
    owner: "Acquisitions",
    relatedKpis: ["appointment_to_offer", "pipeline_velocity"],
    likelyCauses: [
      "Appointment transition language",
      "Lead qualification inconsistency",
      "List targeting",
      "Follow-up speed",
    ],
    explanation: {
      whatItMeasures:
        "How effectively new lead volume is converted into booked time with a seller.",
      whenLow: [
        "Leads are being worked but not advanced to a booking",
        "Qualification is inconsistent, so unqualified leads dilute the denominator",
        "List targeting is bringing in the wrong sellers",
        "Follow-up is too slow and leads go cold before a booking",
      ],
      whenHigh: [
        "Appointments may be booked with unqualified sellers, which shows up later as a low appointment-to-offer rate",
        "Lead volume may be too low, making the rate look strong on a small base",
      ],
    },
    blockedBy: null,
    caveat:
      "Cohort rate: measured against leads created in the window, however long they later took to book. Recent windows exclude leads too new to have converted yet.",
  },
  {
    id: "appointment_to_offer",
    name: "Appointment → Offer",
    category: "conversion",
    description: "Share of appointments that result in an offer being made.",
    formula: "Offers reached in period ÷ Appointments reached in period",
    numerator: "Opportunities reaching the offer stage within the window",
    denominator: "Opportunities reaching the appointment stage within the window",
    sourceFields: ["pipeline_events.occurred_at", "pipeline_events.to_stage_id", "pipeline_stages.position"],
    sourceSystems: ["GoHighLevel"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: 50,
    criticalThreshold: 30,
    minSampleSize: 8,
    owner: "Acquisitions",
    relatedKpis: ["lead_to_appointment", "offer_to_contract", "avg_assignment_fee"],
    likelyCauses: [
      "Appointment quality / qualification",
      "Acquisitions estimating or repair-cost preparation",
      "Offer follow-through after the visit",
    ],
    explanation: {
      whatItMeasures:
        "Whether time spent with sellers is converted into an actual offer.",
      whenLow: [
        "Appointments are being set with sellers who were never really qualified",
        "Acquisitions is slow or hesitant to prepare and present numbers",
        "ARV or repair estimates are not ready in time",
      ],
      whenHigh: [
        "Offers may be issued indiscriminately, which tends to depress offer-to-contract",
      ],
    },
    blockedBy: null,
  },
  {
    id: "offer_to_contract",
    name: "Offer → Contract",
    category: "conversion",
    description: "How effectively offers are converted into signed agreements.",
    formula: "Contracts reached in period ÷ Offers reached in period",
    numerator: "Opportunities reaching the contract stage within the window",
    denominator: "Opportunities reaching the offer stage within the window",
    sourceFields: ["pipeline_events.occurred_at", "pipeline_events.to_stage_id", "pipeline_stages.position"],
    sourceSystems: ["GoHighLevel"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: 15,
    criticalThreshold: 8,
    minSampleSize: 8,
    owner: "Acquisitions",
    relatedKpis: ["avg_assignment_fee", "contract_to_close", "fallout_rate"],
    likelyCauses: [
      "Offer pricing too low",
      "Negotiation quality",
      "Weak offer follow-up",
      "Seller expectations not set at the appointment",
      "Inaccurate ARV or repair estimates",
    ],
    explanation: {
      whatItMeasures:
        "How effectively RG converts actual offers into signed agreements.",
      whenLow: [
        "Offers are priced too low for the seller's expectation",
        "Negotiation or follow-up after the offer is weak",
        "Seller expectations were not properly set during the appointment",
        "ARV or repair estimates are inaccurate, producing unrealistic numbers",
      ],
      whenHigh: [
        "RG may be overpaying — check average assignment fee alongside this",
        "Margins may be too thin, which tends to surface later as disposition failures",
      ],
    },
    blockedBy: null,
  },
  {
    id: "contract_to_close",
    name: "Contract → Close",
    category: "conversion",
    description: "Share of signed contracts that reach a closing.",
    formula: "Closings reached in period ÷ Contracts reached in period",
    numerator: "Opportunities reaching the closing stage within the window",
    denominator: "Opportunities reaching the contract stage within the window",
    sourceFields: ["pipeline_events.occurred_at", "pipeline_events.to_stage_id"],
    sourceSystems: ["GoHighLevel"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: 70,
    criticalThreshold: 50,
    minSampleSize: 5,
    owner: "Disposition",
    relatedKpis: ["fallout_rate", "offer_to_contract", "gross_revenue"],
    likelyCauses: [
      "Disposition capability or buyer demand",
      "Contract priced above what buyers will pay",
      "Contract quality or title issues",
    ],
    explanation: {
      whatItMeasures:
        "Whether signed contracts actually turn into completed, paid deals.",
      whenLow: [
        "Disposition cannot find buyers at the contracted price",
        "Contracts are being signed with too little margin",
        "Title or contract-quality problems are killing deals late",
      ],
      whenHigh: [
        "Generally good — but check that contract volume is not so small that the rate is noise",
      ],
    },
    blockedBy: null,
  },
  {
    id: "win_rate",
    name: "Win Rate",
    category: "conversion",
    description: "Share of contracted opportunities marked won.",
    formula: "Won opportunities ÷ Opportunities that reached contract",
    numerator: "Opportunities with status = won",
    denominator: "Opportunities that ever reached the contract stage",
    sourceFields: ["opportunities.status", "pipeline_events.to_stage_id"],
    sourceSystems: ["GoHighLevel"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: 70,
    criticalThreshold: 50,
    minSampleSize: 5,
    owner: "Disposition",
    relatedKpis: ["contract_to_close", "fallout_rate"],
    likelyCauses: ["Disposition throughput", "Contract quality", "Buyer demand"],
    explanation: {
      whatItMeasures: "The end-to-end success rate once a contract exists.",
      whenLow: ["Contracts are falling out before completion"],
      whenHigh: ["Healthy, provided contract volume is meaningful"],
    },
    blockedBy: null,
  },

  // ------------------------------------------------------------------ revenue
  {
    id: "deals_closed",
    name: "Deals Closed",
    category: "revenue",
    description: "Count of deals completed in the period.",
    formula: "Count of won opportunities with a closing event in the period",
    numerator: "Won opportunities closing within the window",
    denominator: null,
    sourceFields: ["opportunities.status", "pipeline_events.occurred_at"],
    sourceSystems: ["GoHighLevel"],
    format: "number",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 0,
    owner: "Management",
    relatedKpis: ["gross_revenue", "avg_assignment_fee"],
    likelyCauses: ["Upstream funnel volume", "Disposition throughput"],
    explanation: {
      whatItMeasures: "Raw deal output for the period.",
      whenLow: ["Look upstream — contracts, offers, then appointments, in that order"],
      whenHigh: ["Confirm average assignment fee held up; volume at low fees may not be progress"],
    },
    blockedBy: null,
  },
  {
    id: "gross_revenue",
    name: "Gross Revenue",
    category: "revenue",
    description: "Total assignment fees earned on deals closed in the period.",
    formula: "Σ monetary_value of won opportunities closing in the period",
    numerator: "Assignment fees on won deals",
    denominator: null,
    sourceFields: ["opportunities.monetary_value", "opportunities.status"],
    sourceSystems: ["GoHighLevel"],
    format: "currency",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 0,
    owner: "Management",
    relatedKpis: ["deals_closed", "avg_assignment_fee", "marketing_roi"],
    likelyCauses: ["Deal count", "Fee size"],
    explanation: {
      whatItMeasures: "Money actually earned, not pipeline value.",
      whenLow: ["Separate the cause: fewer deals, or smaller fees per deal"],
      whenHigh: ["Check whether it came from one outlier deal before treating it as a trend"],
    },
    blockedBy: null,
    caveat: "Counts only opportunities GHL marks won. Signed-but-unclosed contracts are pipeline, not revenue.",
  },
  {
    id: "avg_assignment_fee",
    name: "Average Assignment Fee",
    category: "revenue",
    description: "Mean fee earned per closed deal.",
    formula: "Gross revenue ÷ Deals closed",
    numerator: "Σ assignment fees",
    denominator: "Deals closed",
    sourceFields: ["opportunities.monetary_value"],
    sourceSystems: ["GoHighLevel"],
    format: "currency",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 3,
    owner: "Acquisitions",
    relatedKpis: ["median_assignment_fee", "offer_to_contract", "cost_per_contract"],
    likelyCauses: ["Offer pricing", "Market/list mix", "Negotiation"],
    explanation: {
      whatItMeasures: "Typical economics of a completed deal.",
      whenLow: ["Offers may be priced to win volume rather than margin"],
      whenHigh: ["Strong — but confirm the mean is not carried by one large outlier; compare against the median"],
    },
    blockedBy: null,
  },
  {
    id: "median_assignment_fee",
    name: "Median Assignment Fee",
    category: "revenue",
    description: "Midpoint fee — resistant to one unusually large deal.",
    formula: "Median monetary_value of won deals in the period",
    numerator: "Assignment fees on won deals",
    denominator: null,
    sourceFields: ["opportunities.monetary_value"],
    sourceSystems: ["GoHighLevel"],
    format: "currency",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 3,
    owner: "Acquisitions",
    relatedKpis: ["avg_assignment_fee"],
    likelyCauses: ["Offer pricing", "Deal mix"],
    explanation: {
      whatItMeasures: "The typical deal, with outliers removed from the picture.",
      whenLow: ["Most deals are small even if the average looks acceptable"],
      whenHigh: ["Consistent deal economics across the period"],
    },
    blockedBy: null,
  },
  {
    id: "min_assignment_fee",
    name: "Minimum Assignment Fee",
    category: "revenue",
    description: "Smallest fee accepted in the period.",
    formula: "Min monetary_value of won deals in the period",
    numerator: "Assignment fees on won deals",
    denominator: null,
    sourceFields: ["opportunities.monetary_value"],
    sourceSystems: ["GoHighLevel"],
    format: "currency",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 3,
    owner: "Acquisitions",
    relatedKpis: ["avg_assignment_fee", "median_assignment_fee"],
    likelyCauses: ["Willingness to take thin deals"],
    explanation: {
      whatItMeasures: "The floor RG is currently accepting.",
      whenLow: ["Thin deals are consuming the same operational effort as profitable ones"],
      whenHigh: ["Discipline on deal quality is holding"],
    },
    blockedBy: null,
  },

  // ---------------------------------------------------------------- marketing
  {
    id: "marketing_spend",
    name: "Marketing Spend",
    category: "marketing",
    description: "Total recorded campaign spend.",
    formula: "Σ campaigns.cost_cents ÷ 100",
    numerator: "Recorded campaign cost",
    denominator: null,
    sourceFields: ["campaigns.cost_cents"],
    sourceSystems: ["Manual CSV import"],
    format: "currency",
    healthyDirection: "lower_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 0,
    owner: "Management",
    relatedKpis: ["cost_per_contract", "marketing_roi"],
    likelyCauses: [],
    explanation: {
      whatItMeasures: "What RG has put into the top of the funnel.",
      whenLow: ["Lead volume will follow it down after a lag"],
      whenHigh: ["Only meaningful next to ROI and cost per contract"],
    },
    blockedBy: null,
    caveat:
      "All-time total, not period-scoped. Campaign spend is overwritten on each CSV re-import and carries no history.",
  },
  {
    id: "cost_per_contract",
    name: "Cost per Contract",
    category: "efficiency",
    description: "Marketing cost to produce one signed contract.",
    formula: "Marketing spend ÷ Contracts reached in period",
    numerator: "Total campaign spend",
    denominator: "Contracts in the window",
    sourceFields: ["campaigns.cost_cents", "pipeline_events.to_stage_id"],
    sourceSystems: ["Manual CSV import", "GoHighLevel"],
    format: "currency",
    healthyDirection: "lower_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 3,
    owner: "Management",
    relatedKpis: ["avg_assignment_fee", "marketing_roi", "fee_to_cost_ratio"],
    likelyCauses: ["Funnel conversion", "List quality", "Channel mix"],
    explanation: {
      whatItMeasures: "Acquisition efficiency — what it costs to buy one contract.",
      whenLow: ["Efficient acquisition, provided contract quality holds"],
      whenHigh: ["Either spend is up or downstream conversion has fallen; check the funnel before adding budget"],
    },
    blockedBy: null,
    caveat: "Divides all-time spend by period contracts — spend has no history to scope by window.",
  },
  {
    id: "cost_per_qualified_lead",
    name: "Cost per Qualified Lead",
    category: "efficiency",
    description: "Marketing cost to produce one qualified lead.",
    formula: "Marketing spend ÷ Qualified leads in period",
    numerator: "Total campaign spend",
    denominator: "Qualified leads in the window",
    sourceFields: ["campaigns.cost_cents", "pipeline_events.to_stage_id"],
    sourceSystems: ["Manual CSV import", "GoHighLevel"],
    format: "currency",
    healthyDirection: "lower_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 5,
    owner: "Marketing",
    relatedKpis: ["cost_per_contract", "lead_to_appointment"],
    likelyCauses: ["List quality", "Targeting", "Channel mix"],
    explanation: {
      whatItMeasures: "Top-of-funnel efficiency before sales skill is involved.",
      whenLow: ["Targeting and list quality are working"],
      whenHigh: ["Lists or targeting are producing volume without qualification"],
    },
    blockedBy: null,
    caveat: "Divides all-time spend by period qualified leads — spend has no history to scope by window.",
  },
  {
    id: "marketing_roi",
    name: "Marketing ROI",
    category: "marketing",
    description: "Return on recorded marketing spend.",
    formula: "(Gross revenue − Marketing spend) ÷ Marketing spend",
    numerator: "Revenue less spend",
    denominator: "Marketing spend",
    sourceFields: ["opportunities.monetary_value", "campaigns.cost_cents"],
    sourceSystems: ["GoHighLevel", "Manual CSV import"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: 100,
    criticalThreshold: 0,
    minSampleSize: 1,
    owner: "Management",
    relatedKpis: ["fee_to_cost_ratio", "cost_per_contract"],
    likelyCauses: ["Conversion rates", "Fee size", "Spend efficiency"],
    explanation: {
      whatItMeasures: "Whether marketing is returning more than it consumes.",
      whenLow: ["Spend is outpacing closed revenue — check where the funnel is leaking before cutting or adding budget"],
      whenHigh: ["Strong return; consider whether the channel has room to scale"],
    },
    blockedBy: null,
    caveat: "Compares period revenue against all-time spend; treat as directional until spend history exists.",
  },
  {
    id: "fee_to_cost_ratio",
    name: "Fee-to-Cost Ratio",
    category: "efficiency",
    description: "Revenue earned per dollar of marketing spend.",
    formula: "Gross revenue ÷ Marketing spend",
    numerator: "Gross revenue",
    denominator: "Marketing spend",
    sourceFields: ["opportunities.monetary_value", "campaigns.cost_cents"],
    sourceSystems: ["GoHighLevel", "Manual CSV import"],
    format: "ratio",
    healthyDirection: "higher_is_better",
    warningThreshold: 2,
    criticalThreshold: 1,
    minSampleSize: 1,
    owner: "Management",
    relatedKpis: ["marketing_roi"],
    likelyCauses: ["Fee size", "Spend efficiency"],
    explanation: {
      whatItMeasures: "How many dollars come back per dollar spent.",
      whenLow: ["Below 1.0 means marketing is losing money on a cash basis"],
      whenHigh: ["Efficient — worth testing whether spend can increase without the ratio collapsing"],
    },
    blockedBy: null,
    caveat: "Compares period revenue against all-time spend.",
  },
  {
    id: "reply_rate",
    name: "Reply Rate",
    category: "marketing",
    description: "Share of delivered messages that received a reply.",
    formula: "Σ campaigns.replies ÷ Σ campaigns.delivered",
    numerator: "Replies",
    denominator: "Delivered messages",
    sourceFields: ["campaigns.replies", "campaigns.delivered"],
    sourceSystems: ["Manual CSV import"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: 5,
    criticalThreshold: 2,
    minSampleSize: 100,
    owner: "Marketing",
    relatedKpis: ["cost_per_qualified_lead"],
    likelyCauses: ["Opener copy", "List quality", "Carrier filtering", "Sending-number health"],
    explanation: {
      whatItMeasures: "Whether outbound messaging is provoking any response at all.",
      whenLow: [
        "Carrier filtering or sending-number health if delivery also fell",
        "List quality or opener copy if delivery held steady",
      ],
      whenHigh: [
        "Raw replies alone do not indicate success — check positive replies and opt-outs before declaring an opener a winner",
      ],
    },
    blockedBy: null,
    caveat: "All-time campaign totals. Imported campaign figures carry no time dimension, so this cannot be period-scoped.",
  },

  // ----------------------------------------------------------------- velocity
  {
    id: "pipeline_velocity",
    name: "Pipeline Velocity",
    category: "velocity",
    description: "Average days from lead creation to a signed contract.",
    formula: "Mean(contract event date − opportunity created date)",
    numerator: "Elapsed days",
    denominator: "Contracts in the window",
    sourceFields: ["opportunities.ghl_created_at", "pipeline_events.occurred_at"],
    sourceSystems: ["GoHighLevel"],
    format: "days",
    healthyDirection: "lower_is_better",
    warningThreshold: 45,
    criticalThreshold: 75,
    minSampleSize: 3,
    owner: "Acquisitions",
    relatedKpis: ["avg_days_in_stage", "lead_to_appointment"],
    likelyCauses: ["Follow-up cadence", "Stage handoffs", "Seller decision time"],
    explanation: {
      whatItMeasures: "How long capital and effort are tied up before a deal is signed.",
      whenLow: ["Fast cycle — check that speed is not coming from cherry-picking easy deals"],
      whenHigh: ["Leads are sitting between stages; check average days in stage to find where"],
    },
    blockedBy: null,
    caveat:
      "Resolution is bounded by the daily sync — several stage moves in one day collapse into one recorded event.",
  },
  {
    id: "avg_days_in_stage",
    name: "Average Days in Stage",
    category: "velocity",
    description: "Mean time an opportunity spends in a stage before moving on.",
    formula: "Mean gap between consecutive stage events, across completed stage visits",
    numerator: "Elapsed days across stage visits",
    denominator: "Completed stage visits",
    sourceFields: ["pipeline_events.occurred_at", "pipeline_events.to_stage_id"],
    sourceSystems: ["GoHighLevel"],
    format: "days",
    healthyDirection: "lower_is_better",
    warningThreshold: 10,
    criticalThreshold: 21,
    minSampleSize: 5,
    owner: "Acquisitions",
    relatedKpis: ["pipeline_velocity"],
    likelyCauses: ["Follow-up cadence", "Ownership gaps", "Stage definition"],
    explanation: {
      whatItMeasures: "Where leads are waiting rather than moving.",
      whenLow: ["Leads are being worked promptly"],
      whenHigh: ["Identify the specific stage — the pipeline funnel view breaks this out per stage"],
    },
    blockedBy: null,
    caveat: "Counts only completed stage visits; a lead currently sitting in a stage contributes nothing yet.",
  },

  // ------------------------------------------------------------------ quality
  {
    id: "fallout_rate",
    name: "Fallout Rate",
    category: "quality",
    description: "Share of contracted deals that later died.",
    formula: "Contracts that later logged a lost event ÷ Contracts reached",
    numerator: "Opportunities that reached contract and later went lost",
    denominator: "Opportunities that reached contract",
    sourceFields: ["pipeline_events.event_type", "pipeline_events.to_stage_id"],
    sourceSystems: ["GoHighLevel"],
    format: "percent",
    healthyDirection: "lower_is_better",
    warningThreshold: 20,
    criticalThreshold: 35,
    minSampleSize: 5,
    owner: "Disposition",
    relatedKpis: ["contract_to_close", "offer_to_contract"],
    likelyCauses: [
      "Contracts priced above what buyers will pay",
      "Title or inspection problems",
      "Seller backing out after signing",
    ],
    explanation: {
      whatItMeasures: "How much signed business RG fails to convert into cash.",
      whenLow: ["Contract quality is holding"],
      whenHigh: [
        "Offers may be too aggressive to survive disposition — check offer-to-contract alongside this; a high contract rate with high fallout usually means overpaying",
      ],
    },
    blockedBy: null,
    caveat: "Fallout reasons are not captured, so this reports the rate but cannot explain the cause.",
  },

  // ------------------------------------------------- blocked: no data source
  {
    id: "speed_to_lead",
    name: "Speed to Lead",
    category: "velocity",
    description: "Time between a lead arriving and RG's first contact attempt.",
    formula: "Mean(first outbound contact − lead created)",
    numerator: "Elapsed time to first contact",
    denominator: "New leads",
    sourceFields: ["(not available)"],
    sourceSystems: ["GoHighLevel conversations", "Wavv calls"],
    format: "days",
    healthyDirection: "lower_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 10,
    owner: "Acquisitions",
    relatedKpis: ["lead_to_appointment"],
    likelyCauses: ["Staffing coverage", "Notification routing", "Working hours"],
    explanation: {
      whatItMeasures: "How fast RG responds when a lead comes in — usually the highest-leverage lever in the funnel.",
      whenLow: ["Fast response; expect a stronger lead-to-appointment rate"],
      whenHigh: ["Leads are going cold before first contact"],
    },
    blockedBy:
      "No first-contact timestamp exists. Requires GHL conversations or the Wavv calls API to be synced.",
  },
  {
    id: "appointment_held_rate",
    name: "Appointment Held Rate",
    category: "quality",
    description: "Share of set appointments that were actually held.",
    formula: "Appointments held ÷ Appointments set",
    numerator: "Held appointments",
    denominator: "Set appointments",
    sourceFields: ["(not available)"],
    sourceSystems: ["GoHighLevel calendars"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 5,
    owner: "Acquisitions",
    relatedKpis: ["appointment_to_offer", "lead_to_appointment"],
    likelyCauses: ["Confirmation process", "Appointment quality", "Qualification"],
    explanation: {
      whatItMeasures: "Whether booked time actually happens.",
      whenLow: ["Confirmation process or appointment quality"],
      whenHigh: ["Booked appointments are real and confirmed"],
    },
    blockedBy: "GHL appointment objects are not synced — only stage names indicate an appointment was set.",
  },
  {
    id: "net_profit",
    name: "Net Profit",
    category: "revenue",
    description: "Revenue less all costs.",
    formula: "Gross revenue − total costs",
    numerator: "Revenue less costs",
    denominator: null,
    sourceFields: ["(not available)"],
    sourceSystems: ["Accounting / cost records"],
    format: "currency",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 0,
    owner: "Management",
    relatedKpis: ["gross_revenue", "marketing_spend"],
    likelyCauses: [],
    explanation: {
      whatItMeasures: "What RG actually keeps.",
      whenLow: ["Costs are outpacing fee income"],
      whenHigh: ["Healthy unit economics"],
    },
    blockedBy: "Only marketing spend is recorded. Payroll, software and overhead are not tracked anywhere.",
  },
  {
    id: "fee_retention",
    name: "Fee Retention",
    category: "quality",
    description: "How much of the projected fee survives to closing.",
    formula: "Actual assignment fee ÷ Projected assignment fee",
    numerator: "Actual fee",
    denominator: "Projected fee",
    sourceFields: ["(not available)"],
    sourceSystems: ["GoHighLevel custom fields"],
    format: "percent",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 3,
    owner: "Disposition",
    relatedKpis: ["avg_assignment_fee", "fallout_rate"],
    likelyCauses: ["Renegotiation at closing", "Inspection concessions"],
    explanation: {
      whatItMeasures: "Whether deals close at the value they were signed at.",
      whenLow: ["Deals are being renegotiated down after contract"],
      whenHigh: ["Contracted values are holding through closing"],
    },
    blockedBy:
      "Only one money field exists (the actual fee). No projected-fee field is captured to compare against.",
  },
  {
    id: "dispo_time_to_buyer",
    name: "Dispo Time-to-Buyer",
    category: "velocity",
    description: "Days from contract signed to buyer assigned.",
    formula: "Mean(buyer assigned date − contract date)",
    numerator: "Elapsed days",
    denominator: "Contracts",
    sourceFields: ["(not available)"],
    sourceSystems: ["Disposition records"],
    format: "days",
    healthyDirection: "lower_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 3,
    owner: "Disposition",
    relatedKpis: ["contract_to_close", "fallout_rate"],
    likelyCauses: ["Buyer list depth", "Pricing"],
    explanation: {
      whatItMeasures: "How quickly contracts find a buyer.",
      whenLow: ["Strong buyer demand"],
      whenHigh: ["Buyer list may be too thin, or contracts priced too high"],
    },
    blockedBy: "No disposition or buyer-assignment records exist in the system.",
  },
  {
    id: "buyer_depth",
    name: "Buyer Depth",
    category: "quality",
    description: "How many active buyers are available per contract.",
    formula: "Active buyers ÷ Contracts needing placement",
    numerator: "Active buyers",
    denominator: "Contracts needing a buyer",
    sourceFields: ["(not available)"],
    sourceSystems: ["Buyer list"],
    format: "ratio",
    healthyDirection: "higher_is_better",
    warningThreshold: null,
    criticalThreshold: null,
    minSampleSize: 1,
    owner: "Disposition",
    relatedKpis: ["dispo_time_to_buyer"],
    likelyCauses: ["Buyer acquisition effort"],
    explanation: {
      whatItMeasures: "Whether disposition has enough demand to place contracts.",
      whenLow: ["Contracts will sit; fallout risk rises"],
      whenHigh: ["Contracts can be placed quickly"],
    },
    blockedBy: "No buyer list is tracked in the system.",
  },
];

export function kpiById(id: string): KpiDefinition {
  const def = KPI_DEFINITIONS.find((k) => k.id === id);
  if (!def) throw new Error(`Unknown KPI: ${id}`);
  return def;
}

/** KPIs that can be computed today, in registry order. */
export const COMPUTABLE_KPIS = KPI_DEFINITIONS.filter((k) => k.blockedBy === null);

/** KPIs awaiting a data source, in registry order. */
export const BLOCKED_KPIS = KPI_DEFINITIONS.filter((k) => k.blockedBy !== null);
