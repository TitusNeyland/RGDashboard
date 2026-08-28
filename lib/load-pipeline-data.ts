import { db } from "@/lib/db";
import { campaigns, contacts, opportunities, pipelineEvents, pipelineStages } from "@/drizzle/schema";
import { asc, desc } from "drizzle-orm";
import {
  mockCampaigns,
  mockContacts,
  mockOpportunities,
  mockPipelineEvents,
  mockPipelineStages,
} from "@/lib/mock-data";

/** Most recent sync timestamp across synced opportunities, for the page header. */
function latestSyncedAt(rows: { syncedAt: Date }[]): Date | null {
  let latest: Date | null = null;
  for (const row of rows) {
    if (!latest || row.syncedAt > latest) latest = row.syncedAt;
  }
  return latest;
}

/**
 * Shared by every dashboard page: real GHL-synced data when a database is
 * configured, mock data otherwise (see app/(dashboard)/leads/page.tsx for
 * why — lets the UI be previewed with no credentials at all).
 */
export async function loadPipelineData() {
  try {
    const [opportunityRows, contactRows, eventRows, stageRows, campaignRows] =
      await Promise.all([
        db.select().from(opportunities).orderBy(desc(opportunities.ghlUpdatedAt)),
        db.select().from(contacts),
        db.select().from(pipelineEvents).orderBy(desc(pipelineEvents.occurredAt)),
        db.select().from(pipelineStages).orderBy(asc(pipelineStages.position)),
        db.select().from(campaigns).orderBy(asc(campaigns.name)),
      ]);
    return {
      opportunities: opportunityRows,
      contacts: contactRows,
      events: eventRows,
      stages: stageRows,
      campaigns: campaignRows,
      lastSyncedAt: latestSyncedAt(opportunityRows),
      usingMockData: false,
    };
  } catch {
    return {
      opportunities: mockOpportunities,
      contacts: mockContacts,
      events: mockPipelineEvents,
      stages: mockPipelineStages,
      campaigns: mockCampaigns,
      lastSyncedAt: latestSyncedAt(mockOpportunities),
      usingMockData: true,
    };
  }
}
