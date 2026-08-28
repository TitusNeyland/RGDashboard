/**
 * Wavv discovery — run this BEFORE trusting any cold-calling KPI.
 *
 *   npm run discover:wavv
 *
 * Prints the raw /calls response so the real field names, envelope shape and
 * paging contract can be read off an actual account rather than guessed. The
 * client's assumptions (base URL, auth header, field names) are all
 * environment-overridable because they are unverified — if this fails, the
 * error names exactly which assumption to correct.
 */
import "dotenv/config";
import { WavvClient, extractCalls, WavvApiError } from "@/lib/wavv/client";

async function main() {
  console.log("Base URL   :", process.env.WAVV_BASE_URL ?? "(default guess) https://api.wavv.com/v3");
  console.log("Auth scheme:", process.env.WAVV_AUTH_SCHEME ?? "(default) bearer");
  console.log("");

  const client = new WavvClient();

  // Last 30 days keeps the response small while still returning real calls.
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const payload = await client.rawCallsPage({
    startDate: iso(start),
    endDate: iso(end),
    limit: 5,
  });

  console.log("=== RAW ENVELOPE (top-level keys) ===");
  console.log(
    Array.isArray(payload) ? "(bare array)" : Object.keys(payload as object).join(", ")
  );

  const calls = extractCalls(payload);
  console.log(`\n=== ${calls.length} call(s) returned ===`);

  if (calls.length === 0) {
    console.log("No calls in the last 30 days, or the array sits under an unexpected key.");
    console.log("\nFull payload:\n", JSON.stringify(payload, null, 2).slice(0, 3000));
    return;
  }

  console.log("\n=== FIELD NAMES ON THE FIRST CALL ===");
  console.log(Object.keys(calls[0]).join(", "));

  console.log("\n=== FIRST CALL (raw) ===");
  console.log(JSON.stringify(calls[0], null, 2));

  console.log("\n=== DISTINCT DISPOSITIONS IN THIS SAMPLE ===");
  const dispositions = new Set(
    calls.map((c) => String(c.disposition ?? c.status ?? c.outcome ?? "(none)"))
  );
  console.log([...dispositions].join(" | "));
  console.log(
    "\nMap each of these in lib/cold-calling/dispositions.ts before trusting any rate."
  );
}

main().catch((err) => {
  if (err instanceof WavvApiError) {
    console.error(`\nRequest failed (HTTP ${err.status}).\n`);
    console.error(err.message);
    console.error("\nResponse body:", err.body);
    console.error(
      "\nThe base URL and auth header are unverified guesses. Correct them with:\n" +
        "  WAVV_BASE_URL=https://...      (from Wavv's API docs / Integrations panel)\n" +
        "  WAVV_AUTH_SCHEME=x-api-key     (if Wavv does not use a Bearer token)\n"
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
