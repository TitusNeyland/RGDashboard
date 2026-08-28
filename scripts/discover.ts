/**
 * Phase 0 discovery pass (see build plan): dumps real pipelines, one page of
 * opportunities, and one page of contacts from RG's actual GHL account, raw,
 * so field names/shapes can be verified before trusting anything the sync
 * job promotes into typed columns. Run with `npm run discover`.
 */
import "dotenv/config";
import { GhlClient } from "@/lib/ghl/client";

async function main() {
  const client = new GhlClient();

  console.log("=== Pipelines & stages ===");
  const pipelines = await client.listPipelines();
  console.log(JSON.stringify(pipelines, null, 2));

  console.log("\n=== First opportunity (raw) ===");
  for await (const opp of client.iterateOpportunities(1)) {
    console.log(JSON.stringify(opp, null, 2));
    break;
  }

  console.log("\n=== First contact (raw) ===");
  for await (const contact of client.iterateContacts(1)) {
    console.log(JSON.stringify(contact, null, 2));
    break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
