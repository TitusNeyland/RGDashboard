/**
 * Assigns RG's own job-function roles to synced GHL users.
 *
 * GHL only knows "admin" / "user" — it has no concept of cold caller vs
 * acquisitions vs VA, so that classification has to come from RG:
 *
 *   npm run import:team -- path/to/team.csv
 *
 * Match users by `email` (preferred) or `ghl_id`. Users are NOT created
 * here — run `npm run sync` first to pull them from GHL, then this only
 * sets `team_role` on rows that already exist.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { parseCsv } from "@/lib/csv";

const ROLES = [
  "cold_caller",
  "va",
  "acquisitions",
  "apprentice",
  "lead_manager",
  "unassigned",
] as const;
type TeamRole = (typeof ROLES)[number];

function parseRole(value: string | undefined): TeamRole | null {
  const v = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (ROLES as readonly string[]).includes(v) ? (v as TeamRole) : null;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error(
      "Usage: npm run import:team -- path/to/team.csv\n" +
        "See team.example.csv for the expected columns.\n" +
        `Valid team_role values: ${ROLES.join(", ")}`
    );
    process.exit(1);
  }

  const records = parseCsv(readFileSync(path, "utf8"));
  if (records.length === 0) {
    console.error("No data rows found in the CSV.");
    process.exit(1);
  }

  let updated = 0;
  for (const record of records) {
    const role = parseRole(record.team_role);
    if (!role) {
      console.warn(
        `Skipping "${record.email || record.ghl_id}": unknown team_role ` +
          `"${record.team_role}" (expected one of ${ROLES.join(", ")})`
      );
      continue;
    }

    const email = record.email?.trim();
    const ghlId = record.ghl_id?.trim();
    if (!email && !ghlId) {
      console.warn("Skipping row with neither email nor ghl_id.");
      continue;
    }

    const result = await db
      .update(users)
      .set({ teamRole: role })
      .where(ghlId ? eq(users.ghlId, ghlId) : eq(users.email, email!))
      .returning({ ghlId: users.ghlId });

    if (result.length === 0) {
      console.warn(
        `No synced user matches ${ghlId ?? email} — run \`npm run sync\` first.`
      );
      continue;
    }
    updated += result.length;
  }

  console.log(`Set team role on ${updated} user${updated === 1 ? "" : "s"}.`);
  return { updated };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
