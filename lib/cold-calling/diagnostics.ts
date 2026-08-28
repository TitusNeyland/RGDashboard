/**
 * The §7 weekly diagnostic decision tree.
 *
 * The point of a layered funnel is that a bad week becomes a short diagnosis
 * rather than a mystery. This walks the funnel in order and finds the FIRST
 * step where the input is healthy but the output is not — that step is the
 * constraint, and everything downstream of it is a symptom.
 *
 * Deterministic throughout. No model is involved in identifying a constraint
 * (KPI spec §25); a model may later describe one in plain language, but the
 * arithmetic that finds it lives here.
 */

export interface ColdCallFunnel {
  recordsLoaded: number | null;
  dials: number | null;
  uniqueAttempted: number | null;
  contacts: number | null;
  conversations: number | null;
  qualifiedLeads: number | null;
  appointmentsSet: number | null;
  appointmentsHeld: number | null;
}

/** One link in the funnel, with the rate that governs it. */
interface FunnelLink {
  id: string;
  /** The step feeding this link. */
  inputLabel: string;
  /** The step it produces. */
  outputLabel: string;
  rate: (f: ColdCallFunnel) => number | null;
  input: (f: ColdCallFunnel) => number | null;
  likelyArea: string;
  action: string;
  /**
   * Minimum input volume before this link is worth diagnosing. Set per link
   * because the funnel narrows by orders of magnitude — a single global
   * threshold either ignores real drops at the bottom or reports noise at
   * the top.
   */
  minInput: number;
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

/** Ordered top of funnel to bottom. Order is the diagnosis. */
export const FUNNEL_LINKS: FunnelLink[] = [
  {
    id: "contact_rate",
    minInput: 100,
    inputLabel: "Dials",
    outputLabel: "Contacts",
    rate: (f) => ratio(f.contacts, f.uniqueAttempted),
    input: (f) => f.dials,
    likelyArea: "List quality, skip trace, phone data, or dialer",
    action: "Audit the data source and number quality before adding dial volume.",
  },
  {
    id: "conversation_rate",
    minInput: 40,
    inputLabel: "Contacts",
    outputLabel: "Meaningful conversations",
    rate: (f) => ratio(f.conversations, f.contacts),
    input: (f) => f.contacts,
    likelyArea: "Opening, seller targeting, or caller engagement",
    action: "Review the opener and who the list is putting in front of the caller.",
  },
  {
    id: "qualified_lead_rate",
    minInput: 20,
    inputLabel: "Meaningful conversations",
    outputLabel: "Qualified leads",
    rate: (f) => ratio(f.qualifiedLeads, f.conversations),
    input: (f) => f.conversations,
    likelyArea: "List targeting or qualification skill",
    action: "Review list criteria and how the caller is qualifying.",
  },
  {
    id: "qualified_to_appointment",
    minInput: 8,
    inputLabel: "Qualified leads",
    outputLabel: "Appointments set",
    rate: (f) => ratio(f.appointmentsSet, f.qualifiedLeads),
    input: (f) => f.qualifiedLeads,
    likelyArea: "Appointment transition or lead advancement skill",
    action:
      "Pull the recent qualified leads that did not schedule, categorize why, then roleplay a revised appointment transition.",
  },
  {
    id: "appointment_held_rate",
    minInput: 5,
    inputLabel: "Appointments set",
    outputLabel: "Appointments held",
    rate: (f) => ratio(f.appointmentsHeld, f.appointmentsSet),
    input: (f) => f.appointmentsSet,
    likelyArea: "Appointment quality, confirmation process, or qualification",
    action: "Audit the confirmation process and how firmly appointments are being set.",
  },
];

export type DiagnosisConfidence = "high" | "medium" | "low";

export interface ConstraintDiagnosis {
  linkId: string;
  observed: string;
  currentRate: number | null;
  baselineRate: number | null;
  changePct: number | null;
  likelyArea: string;
  action: string;
  confidence: DiagnosisConfidence;
  sampleSize: number;
}

export interface DiagnosisResult {
  /** The single most valuable thing to fix, or null when undeterminable. */
  primaryConstraint: ConstraintDiagnosis | null;
  /** Why no constraint was identified, when none was. */
  unavailableReason: string | null;
  /** Every link evaluated, for the supporting table. */
  links: ConstraintDiagnosis[];
}

/** A rate this far below baseline counts as a real drop, not noise. */
const MATERIAL_DROP_PCT = 15;


/**
 * Identifies the primary constraint by comparing each funnel link against the
 * trailing baseline.
 *
 * Deliberately returns ONE constraint, not a list of red metrics: fifteen
 * warnings is not a management system. The first materially degraded link
 * wins, because a leak upstream mechanically starves every step below it —
 * and recommending more volume while a downstream leak is the real constraint
 * is exactly the mistake this is meant to prevent.
 */
export function diagnoseColdCalling(
  current: ColdCallFunnel,
  baseline: ColdCallFunnel | null
): DiagnosisResult {
  if (baseline === null) {
    return {
      primaryConstraint: null,
      unavailableReason:
        "No trailing baseline yet. RG's own four-week baseline has to exist before a drop can be distinguished from normal variation — outside benchmarks are not RG standards.",
      links: [],
    };
  }

  const links: ConstraintDiagnosis[] = FUNNEL_LINKS.map((link) => {
    const currentRate = link.rate(current);
    const baselineRate = link.rate(baseline);
    const input = link.input(current) ?? 0;
    const changePct =
      currentRate === null || baselineRate === null || baselineRate === 0
        ? null
        : ((currentRate - baselineRate) / baselineRate) * 100;

    // Confidence tracks how much traffic the rate is built on, not how
    // dramatic the drop looks.
    const confidence: DiagnosisConfidence =
      input >= link.minInput * 5 ? "high" : input >= link.minInput ? "medium" : "low";

    return {
      linkId: link.id,
      observed: `${link.inputLabel} → ${link.outputLabel}`,
      currentRate,
      baselineRate,
      changePct,
      likelyArea: link.likelyArea,
      action: link.action,
      confidence,
      sampleSize: input,
    };
  });

  // Activity gate first: if dials themselves are down, no downstream rate is
  // the constraint — there simply is not enough input to judge anything.
  if (
    current.dials !== null &&
    baseline.dials !== null &&
    baseline.dials > 0 &&
    ((current.dials - baseline.dials) / baseline.dials) * 100 <= -MATERIAL_DROP_PCT
  ) {
    const changePct = ((current.dials - baseline.dials) / baseline.dials) * 100;
    return {
      primaryConstraint: {
        linkId: "dials",
        observed: "Dial volume",
        currentRate: current.dials,
        baselineRate: baseline.dials,
        changePct,
        likelyArea: "Caller activity, schedule, or dialer usage",
        action: "Restore input volume before diagnosing any conversion rate below it.",
        confidence: current.dials >= 500 ? "high" : current.dials >= 100 ? "medium" : "low",
        sampleSize: current.dials,
      },
      unavailableReason: null,
      links,
    };
  }

  const degraded = links.filter(
    (l) =>
      l.changePct !== null &&
      l.changePct <= -MATERIAL_DROP_PCT &&
      l.sampleSize >= (FUNNEL_LINKS.find((x) => x.id === l.linkId)?.minInput ?? 0)
  );

  if (degraded.length === 0) {
    const anyMeasurable = links.some((l) => l.changePct !== null);
    return {
      primaryConstraint: null,
      unavailableReason: anyMeasurable
        ? "No funnel step is materially below its baseline this period."
        : "Not enough volume to compare any funnel step against baseline.",
      links,
    };
  }

  // Earliest degraded link in funnel order — upstream leaks starve everything
  // downstream, so fixing the first one is what actually moves the number.
  const order = FUNNEL_LINKS.map((l) => l.id);
  const primary = degraded.sort(
    (a, b) => order.indexOf(a.linkId) - order.indexOf(b.linkId)
  )[0];

  return { primaryConstraint: primary, unavailableReason: null, links };
}
