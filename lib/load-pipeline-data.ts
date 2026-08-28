import { db } from "@/lib/db";
import { campaigns, contacts, opportunities, pipelineEvents, pipelineStages, users } from "@/drizzle/schema";
import { asc, desc } from "drizzle-orm";
import {
  mockCampaigns,
  mockContacts,
  mockOpportunities,
  mockPipelineEvents,
  mockPipelineStages,
  mockUsers,
} from "@/lib/mock-data";

/**
 * Shared by every dashboard page: real GHL-synced data when a database is
 * configured, mock data otherwise (see app/(dashboard)/leads/page.tsx for
 * why — lets the UI be previewed with no credentials at all).
 */
export async function loadPipelineData() {
  try {
    const [opportunityRows, contactRows, eventRows, stageRows, campaignRows, userRows] =
      await Promise.all([
        db.select().from(opportunities).orderBy(desc(opportunities.ghlUpdatedAt)),
        db.select().from(contacts),
        db.select().from(pipelineEvents).orderBy(desc(pipelineEvents.occurredAt)),
        db.select().from(pipelineStages).orderBy(asc(pipelineStages.position)),
        db.select().from(campaigns).orderBy(asc(campaigns.name)),
        db.select().from(users).orderBy(asc(users.name)),
      ]);
    return {
      opportunities: opportunityRows,
      contacts: contactRows,
      events: eventRows,
      stages: stageRows,
      campaigns: campaignRows,
      users: userRows,
      usingMockData: false,
    };
  } catch {
    return {
      opportunities: mockOpportunities,
      contacts: mockContacts,
      events: mockPipelineEvents,
      stages: mockPipelineStages,
      campaigns: mockCampaigns,
      users: mockUsers,
      usingMockData: true,
    };
  }
}
