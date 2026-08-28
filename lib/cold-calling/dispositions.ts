/**
 * Disposition taxonomy — turns Wavv/GHL operational labels into reporting
 * categories, so the funnel is computed from existing instrumentation rather
 * than a second tracking system (spec §5).
 *
 * THE DEFINITIONS BELOW ARE PROPOSALS, NOT SETTLED FACT. The build checklist
 * (§11) opens with "confirm one definition for contact, meaningful
 * conversation, qualified lead, and appointment" — because every rate in the
 * channel scorecard moves depending on where those lines are drawn. Marking
 * "Not Interested" as a meaningful conversation, for instance, inflates the
 * denominator of qualified-lead rate and makes callers look worse. RG must
 * ratify these before the four-week baseline starts, and then they must not
 * change during it, or the trend is meaningless.
 */

export type DispositionCategory =
  | "no_answer"
  | "bad_number"
  | "not_interested"
  | "callback"
  | "interested"
  | "extra_hot"
  | "appointment"
  | "needs_manager"
  | "do_not_call"
  | "already_sold"
  | "unmapped";

export interface DispositionRule {
  category: DispositionCategory;
  label: string;
  /** Lowercased substrings that identify this disposition. */
  matches: string[];
  /** A human picked up. Denominator of contact rate. */
  isContact: boolean;
  /** Enough engagement to qualify. Denominator of conversation rate. */
  isMeaningfulConversation: boolean;
  /** Meets RG's qualification bar. */
  isQualifiedLead: boolean;
  /** An appointment was booked on the call. */
  isAppointment: boolean;
  /** What this disposition diagnoses, per §5. */
  measurementUse: string;
}

export const DISPOSITION_RULES: DispositionRule[] = [
  {
    category: "no_answer",
    label: "No Answer",
    matches: ["no answer", "noanswer", "no-answer", "voicemail", "vm", "busy", "machine"],
    isContact: false,
    isMeaningfulConversation: false,
    isQualifiedLead: false,
    isAppointment: false,
    measurementUse: "Attempt activity, attempt frequency, list exhaustion",
  },
  {
    category: "bad_number",
    label: "Bad / Wrong Number",
    matches: ["bad number", "wrong number", "disconnected", "invalid", "not in service"],
    isContact: false,
    isMeaningfulConversation: false,
    isQualifiedLead: false,
    isAppointment: false,
    measurementUse: "Phone-data and skip-trace quality, by list source",
  },
  {
    category: "not_interested",
    label: "Not Interested",
    matches: ["not interested", "no interest", "not selling", "hung up", "refused"],
    // A human answered, so it counts as a contact. It is NOT counted as a
    // meaningful conversation: a quick refusal gave no chance to qualify, and
    // counting it would depress qualified-lead rate for reasons unrelated to
    // caller skill. This is the most consequential judgment call here.
    isContact: true,
    isMeaningfulConversation: false,
    isQualifiedLead: false,
    isAppointment: false,
    measurementUse: "List targeting and conversation outcomes",
  },
  {
    category: "callback",
    label: "Callback Scheduled",
    matches: ["callback", "call back", "follow up", "followup", "tomorrow", "next week", "next month", "later this week"],
    isContact: true,
    isMeaningfulConversation: true,
    isQualifiedLead: false,
    isAppointment: false,
    measurementUse: "Follow-up workload and callback conversion",
  },
  {
    category: "interested",
    label: "Interested",
    matches: ["interested", "warm"],
    isContact: true,
    isMeaningfulConversation: true,
    isQualifiedLead: true,
    isAppointment: false,
    measurementUse: "Qualified opportunity production",
  },
  {
    category: "extra_hot",
    label: "Extra Hot Lead",
    matches: ["extra hot", "hot lead", "very interested", "motivated"],
    isContact: true,
    isMeaningfulConversation: true,
    isQualifiedLead: true,
    isAppointment: false,
    measurementUse: "High-intent lead production",
  },
  {
    category: "appointment",
    label: "Appointment Set",
    matches: ["appointment", "appt", "scheduled", "booked"],
    isContact: true,
    isMeaningfulConversation: true,
    isQualifiedLead: true,
    isAppointment: true,
    measurementUse: "Direct appointment production",
  },
  {
    category: "needs_manager",
    label: "Needs Manager",
    matches: ["needs manager", "escalate", "manager"],
    isContact: true,
    isMeaningfulConversation: true,
    isQualifiedLead: false,
    isAppointment: false,
    measurementUse: "Escalation volume and caller judgment",
  },
  {
    category: "do_not_call",
    label: "Do Not Call",
    matches: ["do not call", "dnc", "remove"],
    isContact: true,
    isMeaningfulConversation: false,
    isQualifiedLead: false,
    isAppointment: false,
    measurementUse: "Compliance and suppression quality",
  },
  {
    category: "already_sold",
    label: "Already Sold",
    matches: ["already sold", "sold", "under contract elsewhere"],
    isContact: true,
    isMeaningfulConversation: false,
    isQualifiedLead: false,
    isAppointment: false,
    measurementUse: "List freshness and data lag",
  },
];

/** Every disposition RG has not mapped. Never silently dropped. */
export const UNMAPPED_RULE: DispositionRule = {
  category: "unmapped",
  label: "Unmapped",
  matches: [],
  isContact: false,
  isMeaningfulConversation: false,
  isQualifiedLead: false,
  isAppointment: false,
  measurementUse:
    "Not yet mapped to a reporting category — counted separately so it is visible as a data-quality gap rather than quietly excluded from every rate.",
};

/**
 * Resolves a raw disposition string to a rule.
 *
 * Longest match wins, so "wrong number" is not captured by a shorter pattern
 * that happens to appear inside it. Anything unrecognized returns the unmapped
 * rule rather than being discarded — an unmapped disposition silently dropped
 * would shrink every denominator and quietly flatter every rate.
 */
export function classifyDisposition(raw: string | null | undefined): DispositionRule {
  if (!raw || raw.trim() === "") return UNMAPPED_RULE;
  const value = raw.trim().toLowerCase();

  let best: { rule: DispositionRule; length: number } | null = null;
  for (const rule of DISPOSITION_RULES) {
    for (const pattern of rule.matches) {
      if (!value.includes(pattern)) continue;
      if (!best || pattern.length > best.length) best = { rule, length: pattern.length };
    }
  }
  return best?.rule ?? UNMAPPED_RULE;
}

/** The funnel-stage definitions RG must ratify before baselining (§11). */
export const FUNNEL_DEFINITIONS = [
  {
    term: "Dial",
    definition: "One outbound call attempt, regardless of outcome.",
    note: "Counts repeat attempts to the same record.",
  },
  {
    term: "Unique record attempted",
    definition: "One distinct owner or phone record dialed at least once in the period.",
    note: "Prevents repeat attempts from inflating apparent list penetration.",
  },
  {
    term: "Contact",
    definition: "A dial where a human answered.",
    note: "Excludes no answer, voicemail, and bad or wrong numbers.",
  },
  {
    term: "Meaningful conversation",
    definition:
      "A contact with enough engagement that the caller had a real chance to qualify the seller.",
    note:
      "Currently excludes an immediate refusal, DNC request, and already-sold. This is the most consequential definition in the system — it is the denominator of qualified-lead rate.",
  },
  {
    term: "Qualified lead",
    definition: "A seller meeting RG's qualification criteria, per disposition.",
    note: "Currently: Interested, Extra Hot Lead, or Appointment Set.",
  },
  {
    term: "Appointment",
    definition: "A scheduled appointment booked from a cold call.",
    note: "Set is not the same as held; held requires downstream confirmation.",
  },
] as const;
