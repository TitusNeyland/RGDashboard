import type { campaigns, contacts, opportunities } from "@/drizzle/schema";

type OpportunityRow = typeof opportunities.$inferSelect;
type ContactRow = typeof contacts.$inferSelect;
type CampaignRow = typeof campaigns.$inferSelect;

/** Loose comparison so "Jackson Absentee SMS" matches "jackson-absentee-sms". */
function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function contactSignals(contact: ContactRow | undefined): string[] {
  const raw = contact?.raw as
    | {
        tags?: unknown;
        source?: unknown;
        attributions?: { campaign?: unknown; utmCampaign?: unknown; utmSource?: unknown }[];
      }
    | undefined;
  if (!raw) return [];

  const signals: string[] = [];
  if (typeof raw.source === "string") signals.push(raw.source);
  if (Array.isArray(raw.tags)) {
    for (const tag of raw.tags) if (typeof tag === "string") signals.push(tag);
  }
  if (Array.isArray(raw.attributions)) {
    for (const attr of raw.attributions) {
      for (const value of [attr?.campaign, attr?.utmCampaign, attr?.utmSource]) {
        if (typeof value === "string") signals.push(value);
      }
    }
  }
  return signals;
}

/**
 * Resolves which campaign an opportunity came from.
 *
 * Precedence, strongest signal first:
 *   1. the opportunity's own GHL lead `source`
 *   2. the contact's source, tags, or UTM/attribution campaign values
 *
 * A campaign matches when its `key` or `name` normalizes equal to one of
 * those signals, or when a signal contains the key as a substring (so a
 * source like "SMS - Jackson Absentee" still matches key "jackson-absentee").
 *
 * Returns null when nothing matches — unattributed leads are reported as
 * their own bucket rather than being silently spread across campaigns.
 *
 * This is the piece most likely to need tuning against RG's real account:
 * it assumes RG actually stamps a recognizable campaign name onto leads. If
 * they don't, no amount of code here can invent the link — that becomes an
 * operational fix (consistent source/tag naming at send time).
 */
export function resolveCampaignKey(
  opportunity: OpportunityRow,
  contact: ContactRow | undefined,
  campaignRows: CampaignRow[]
): string | null {
  const signals = [
    ...(opportunity.source ? [opportunity.source] : []),
    ...contactSignals(contact),
  ].map(normalize);
  if (signals.length === 0) return null;

  for (const campaign of campaignRows) {
    const candidates = [normalize(campaign.key), normalize(campaign.name)];
    for (const signal of signals) {
      if (candidates.some((c) => c.length > 0 && (signal === c || signal.includes(c)))) {
        return campaign.key;
      }
    }
  }
  return null;
}

/** campaign key (or null for unattributed) -> the opportunities it produced. */
export function groupOpportunitiesByCampaign(
  opportunityRows: OpportunityRow[],
  contactRows: ContactRow[],
  campaignRows: CampaignRow[]
): Map<string | null, OpportunityRow[]> {
  const contactsById = new Map(contactRows.map((c) => [c.ghlId, c]));
  const grouped = new Map<string | null, OpportunityRow[]>();

  for (const opportunity of opportunityRows) {
    const contact = opportunity.contactGhlId
      ? contactsById.get(opportunity.contactGhlId)
      : undefined;
    const key = resolveCampaignKey(opportunity, contact, campaignRows);
    const list = grouped.get(key) ?? [];
    list.push(opportunity);
    grouped.set(key, list);
  }
  return grouped;
}
