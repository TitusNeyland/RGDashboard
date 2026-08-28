import { loadPipelineData } from "@/lib/load-pipeline-data";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/leads/stat-tile";
import { EventTypeBadge } from "@/components/leads/event-type-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity as ActivityIcon, CalendarClock, Users, Zap, History } from "lucide-react";

export const dynamic = "force-dynamic";

function weekCutoff() {
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

function formatRelative(date: Date) {
  const ms = Date.now() - date.getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function ActivityPage() {
  const { opportunities, events, usingMockData, lastSyncedAt } = await loadPipelineData();

  const opportunityByGhlId = new Map(opportunities.map((o) => [o.ghlId, o]));
  const eventsThisWeek = events.filter((e) => e.occurredAt.getTime() >= weekCutoff()).length;
  const leadsWithActivity = new Set(events.map((e) => e.opportunityGhlId)).size;
  const webhookCount = events.filter((e) => e.source === "webhook").length;

  return (
    <>
      <PageHeader
        title="Activity"
        description="RG's own history of stage moves — captured by this app, not read back from GHL"
        usingMockData={usingMockData}
        lastSyncedAt={lastSyncedAt}
      />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label="Events tracked" value={String(events.length)} icon={ActivityIcon} tone="blue" />
        <StatTile label="This week" value={String(eventsThisWeek)} icon={CalendarClock} tone="violet" />
        <StatTile label="Leads with activity" value={String(leadsWithActivity)} icon={Users} tone="green" />
        <StatTile label="Real-time (webhook)" value={String(webhookCount)} icon={Zap} tone="amber" />
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b border-black/[0.07] px-4 py-3 dark:border-white/10">
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
            Recent activity
          </CardTitle>
        </CardHeader>
        {events.length === 0 ? (
          <CardContent className="py-14 text-center">
            <p className="text-[15px] font-semibold tracking-tight">
              No activity tracked yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
              Every stage move a lead makes from here on gets recorded the next
              time <code className="font-mono text-[13px]">npm run sync</code>{" "}
              runs (or in real time, once the GHL webhook is configured).
            </p>
          </CardContent>
        ) : (
          <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
            {events.map((e) => {
              const opp = opportunityByGhlId.get(e.opportunityGhlId);
              return (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {opp?.name ?? e.opportunityGhlId}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      {e.fromStageName ?? "New"} → {e.toStageName ?? "—"}
                      {opp?.ownerName ? ` · ${opp.ownerName}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <EventTypeBadge type={e.eventType} />
                    <Badge className="border-transparent bg-secondary text-secondary-foreground">
                      {e.source === "webhook" ? "Real-time" : "Synced"}
                    </Badge>
                    <span className="w-14 text-right text-[12px] text-muted-foreground">
                      {formatRelative(e.occurredAt)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
    </>
  );
}
