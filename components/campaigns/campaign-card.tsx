import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Mail, Megaphone } from "lucide-react";
import type { CampaignReportRow } from "@/lib/campaigns/report";
import type { FunnelStepKey } from "@/lib/pipeline-events/funnel-steps";

const CHANNEL_ICONS = {
  sms: MessageSquare,
  cold_call: Phone,
  direct_mail: Mail,
  other: Megaphone,
} as const;

const CHANNEL_LABELS = {
  sms: "SMS",
  cold_call: "Cold call",
  direct_mail: "Direct mail",
  other: "Other",
} as const;

function num(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("en-US");
}

function money(value: number | null | undefined, fractionDigits = 0) {
  if (value == null) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium tabular-nums">{value}</p>
    </div>
  );
}

export function CampaignCard({
  row,
  untracked,
}: {
  row: CampaignReportRow;
  untracked: FunnelStepKey[];
}) {
  const campaign = row.campaign;
  const Icon = campaign ? CHANNEL_ICONS[campaign.channel] : Megaphone;
  const o = row.outcomes;
  const isUntracked = (key: FunnelStepKey) => untracked.includes(key);
  const outcome = (key: FunnelStepKey, value: number) =>
    isUntracked(key) ? "Not tracked" : num(value);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-black/[0.07] px-4 py-3 dark:border-white/10">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
          {row.name}
          {campaign && (
            <Badge className="border-transparent bg-secondary text-secondary-foreground">
              {CHANNEL_LABELS[campaign.channel]}
            </Badge>
          )}
          {!campaign && (
            <Badge className="border-transparent bg-amber-500/14 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              No campaign matched
            </Badge>
          )}
        </CardTitle>
        {campaign?.listName && (
          <p className="text-[12px] text-muted-foreground">
            {campaign.listName}
            {campaign.market ? ` · ${campaign.market}` : ""}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-4 py-4">
        {campaign && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Delivery · imported from RG&apos;s sending tool
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              <Metric label="Records loaded" value={num(campaign.recordsLoaded)} />
              <Metric label="Sent" value={num(campaign.messagesSent)} />
              <Metric label="Delivered" value={num(campaign.delivered)} />
              <Metric label="Failed" value={num(campaign.failed)} />
              <Metric label="Replies" value={num(campaign.replies)} />
              <Metric label="Positive replies" value={num(campaign.positiveReplies)} />
              <Metric label="Negative replies" value={num(campaign.negativeReplies)} />
              <Metric label="DNC requests" value={num(campaign.dncRequests)} />
              <Metric label="Wrong numbers" value={num(campaign.wrongNumbers)} />
              <Metric
                label="Spend"
                value={campaign.costCents != null ? money(campaign.costCents / 100) : "—"}
              />
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Pipeline results · computed from attributed leads
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Leads" value={num(o.leads)} />
            <Metric label="Interested" value={outcome("interested", o.interested)} />
            <Metric label="Qualified" value={outcome("qualified", o.qualified)} />
            <Metric label="Appointments" value={outcome("appointments", o.appointments)} />
            <Metric label="Offers" value={outcome("offers", o.offers)} />
            <Metric label="Contracts" value={outcome("contracts", o.contracts)} />
            <Metric label="Closed deals" value={outcome("closings", o.closings)} />
            <Metric label="Revenue" value={money(o.revenue)} />
          </div>
        </div>

        {campaign && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Efficiency
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              <Metric label="Cost / reply" value={money(row.costPerReply, 2)} />
              <Metric label="Cost / qualified" value={money(row.costPerQualifiedLead, 2)} />
              <Metric label="Cost / appointment" value={money(row.costPerAppointment, 2)} />
              <Metric label="Cost / contract" value={money(row.costPerContract, 2)} />
              <Metric
                label="ROI"
                value={row.roiPct == null ? "—" : `${row.roiPct.toLocaleString("en-US")}%`}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
