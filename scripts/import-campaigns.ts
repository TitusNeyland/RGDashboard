/**
 * Imports campaign delivery numbers from a CSV export out of RG's SMS or
 * dialer tool — the half of the campaign report that cannot come from GHL
 * (see drizzle/schema.ts `campaigns`).
 *
 *   npm run import:campaigns -- path/to/campaigns.csv
 *
 * Rows are upserted by `key`, so re-importing an updated export refreshes
 * the numbers instead of creating duplicates.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { db } from "@/lib/db";
import { campaigns } from "@/drizzle/schema";
import { parseCsv } from "@/lib/csv";

function optionalInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function optionalCents(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

const CHANNELS = ["sms", "cold_call", "direct_mail", "other"] as const;
type Channel = (typeof CHANNELS)[number];

function parseChannel(value: string | undefined): Channel {
  const v = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (CHANNELS as readonly string[]).includes(v) ? (v as Channel) : "other";
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error(
      "Usage: npm run import:campaigns -- path/to/campaigns.csv\n" +
        "See campaigns.example.csv for the expected columns."
    );
    process.exit(1);
  }

  const parsed = parseCsv(readFileSync(path, "utf8"));
  if (parsed.length === 0) {
    console.error("No data rows found in the CSV.");
    process.exit(1);
  }

  let imported = 0;
  for (const record of parsed) {
    const key = record.key?.trim();
    const name = record.name?.trim();
    if (!key || !name) {
      console.warn(`Skipping row with no key/name: ${JSON.stringify(record)}`);
      continue;
    }

    const values = {
      name,
      channel: parseChannel(record.channel),
      listName: record.list_name || null,
      market: record.market || null,
      startedOn: record.started_on ? new Date(record.started_on) : null,
      recordsLoaded: optionalInt(record.records_loaded),
      messagesSent: optionalInt(record.messages_sent),
      delivered: optionalInt(record.delivered),
      failed: optionalInt(record.failed),
      replies: optionalInt(record.replies),
      positiveReplies: optionalInt(record.positive_replies),
      negativeReplies: optionalInt(record.negative_replies),
      dncRequests: optionalInt(record.dnc_requests),
      wrongNumbers: optionalInt(record.wrong_numbers),
      costCents: optionalCents(record.cost),
      updatedAt: new Date(),
    };

    await db
      .insert(campaigns)
      .values({ key, ...values })
      .onConflictDoUpdate({ target: campaigns.key, set: values });
    imported++;
  }

  console.log(`Imported ${imported} campaign${imported === 1 ? "" : "s"}.`);
  return { imported };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
