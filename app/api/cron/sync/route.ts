import { NextResponse } from "next/server";
import { runSync } from "@/scripts/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` on scheduled
// invocations. Reject anything else so this endpoint isn't a public trigger
// for a GHL sync.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Always incremental. A full sync takes minutes and this function caps at
  // 60 seconds, so a full run here would time out partway through and leave
  // the watermark unmoved — failing identically forever. Use
  // `npm run sync -- --full` from a machine for a complete re-pull.
  const result = await runSync({ full: false });
  return NextResponse.json(result);
}
