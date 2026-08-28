import { db } from "@/lib/db";
import { campaigns, contacts, opportunities, pipelineEvents, pipelineStages, users } from "@/drizzle/schema";
import { asc, desc, inArray, isNotNull } from "drizzle-orm";
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
        // Only contacts attached to an opportunity. The location has 31,000+
        // contacts but ~3,000 opportunities, and contacts carry a full JSONB
        // payload — loading all of them added seconds to every page render
        // for rows nothing displays. Uses a subquery rather than an id list
        // so the parameter count stays constant.
        db
          .select()
          .from(contacts)
          .where(
            inArray(
              contacts.ghlId,
              db
                .select({ id: opportunities.contactGhlId })
                .from(opportunities)
                .where(isNotNull(opportunities.contactGhlId))
            )
          ),
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
