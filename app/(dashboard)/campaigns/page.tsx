import { loadPipelineData } from "@/lib/load-pipeline-data";
import { buildCampaignReport, untrackedMilestones } from "@/lib/campaigns/report";
import { StatTile } from "@/components/leads/stat-tile";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { CampaignComparisonTable } from "@/components/campaigns/campaign-comparison-table";
import { Card, CardContent } from "@/components/ui/card";
import { funnelStep } from "@/lib/pipeline-events/funnel-steps";
import { Wallet, TrendingUp, Target, Percent } from "lucide-react";

export const dynamic = "force-dynamic";

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function CampaignsPage() {
  const { opportunities, contacts, events, stages, campaigns, usingMockData } =
    await loadPipelineData();

  const rows = buildCampaignReport(campaigns, opportunities, contacts, events, stages);
  const untracked = untrackedMilestones(stages);

  const totalSpend = campaigns.reduce((sum, c) => sum + (c.costCents ?? 0), 0) / 100;
  const totalRevenue = rows.reduce((sum, r) => sum + r.outcomes.revenue, 0);
  const totalQualified = rows.reduce((sum, r) => sum + r.outcomes.qualified, 0);
  const blendedRoi =
    totalSpend > 0 ? Math.round(((totalRevenue - totalSpend) / totalSpend) * 1000) / 10 : null;

  return (
    <div className="flex flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      {usingMockData && (
        <div className="w-fit rounded-full bg-white px-4 py-1.5 text-[13px] text-muted-foreground dark:bg-card">
          Previewing mock data
        </div>
      )}

      <div className="max-w-2xl">
        <p className="text-[13px] font-medium text-primary">Marketing Reports</p>
        <h1 className="font-heading mt-2 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
          Campaigns
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          What each campaign cost, and what it actually produced in the
          pipeline.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label="Total spend" value={money(totalSpend)} icon={Wallet} tone="violet" />
        <StatTile label="Attributed revenue" value={money(totalRevenue)} icon={TrendingUp} tone="green" />
        <StatTile label="Qualified leads" value={String(totalQualified)} icon={Target} tone="blue" />
        <StatTile
          label="Blended ROI"
          value={blendedRoi == null ? "—" : `${blendedRoi.toLocaleString("en-US")}%`}
          icon={Percent}
          tone={blendedRoi != null && blendedRoi < 0 ? "red" : "green"}
        />
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-heading text-xl font-semibold tracking-tight">
              No campaigns yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-muted-foreground">
              Campaign delivery numbers come from RG&apos;s SMS or dialer tool,
              not from GHL. Import them with{" "}
              <code className="font-mono text-[13px]">npm run import:campaigns</code>{" "}
              — see <code className="font-mono text-[13px]">campaigns.example.csv</code>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <CampaignComparisonTable rows={rows} />

          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <CampaignCard key={row.key ?? "unattributed"} row={row} untracked={untracked} />
            ))}
          </div>
        </>
      )}

      {untracked.length > 0 && (
        <Card>
          <CardContent>
            <p className="text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">Not tracked:</span>{" "}
              {untracked.map((k) => funnelStep(k).label.toLowerCase()).join(", ")} — no
              pipeline stage matches {untracked.length === 1 ? "this milestone" : "these milestones"}, so
              it can&apos;t be counted. Add a matching stage in GHL, or these
              stay unreportable.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
