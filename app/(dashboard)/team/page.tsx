import { loadPipelineData } from "@/lib/load-pipeline-data";
import {
  buildEmployeeReport,
  groupByTeamRole,
  UNAVAILABLE_METRICS,
} from "@/lib/employees/report";
import { StatTile } from "@/components/leads/stat-tile";
import { EmployeeTable } from "@/components/team/employee-table";
import { Card, CardContent } from "@/components/ui/card";
import { Users, CalendarCheck, FileSignature, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { opportunities, events, stages, users, usingMockData } = await loadPipelineData();

  const rows = buildEmployeeReport(users, opportunities, events, stages);
  const groups = groupByTeamRole(rows);

  const activePeople = rows.filter((r) => r.user != null).length;
  const totalAppointments = rows.reduce((s, r) => s + r.appointmentsSet, 0);
  const totalContracts = rows.reduce((s, r) => s + r.contractsProduced, 0);
  const unclassified = rows.filter((r) => r.user != null && r.teamRole === "unassigned").length;

  return (
    <div className="flex flex-col gap-8 px-6 py-10 sm:px-8 sm:py-14">
      {usingMockData && (
        <div className="w-fit rounded-full bg-white px-4 py-1.5 text-[13px] text-muted-foreground dark:bg-card">
          Previewing mock data
        </div>
      )}

      <div className="max-w-2xl">
        <p className="text-[13px] font-medium text-primary">Employee Accountability</p>
        <h1 className="font-heading mt-2 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[48px]">
          Team
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          Pipeline activity by employee, grouped by role.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile label="People" value={String(activePeople)} icon={Users} tone="blue" />
        <StatTile
          label="Appointments set"
          value={String(totalAppointments)}
          icon={CalendarCheck}
          tone="violet"
        />
        <StatTile
          label="Contracts produced"
          value={String(totalContracts)}
          icon={FileSignature}
          tone="green"
        />
        <StatTile
          label="Unclassified"
          value={String(unclassified)}
          icon={Info}
          tone="amber"
          note={unclassified > 0 ? "Set roles via import:team" : undefined}
        />
      </div>

      <Card>
        <CardContent className="flex gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2.25} />
          <div className="text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              These numbers credit whoever owns a lead now, not whoever did the work.
            </span>{" "}
            GHL reports an opportunity&apos;s current assignee but never the user
            behind a stage change, so a reassigned lead carries its whole history
            to its new owner. Treat this as a view of workload and outcomes per
            owner — not as an individual performance score.
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="font-heading text-xl font-semibold tracking-tight">
              No employees synced yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-muted-foreground">
              Run <code className="font-mono text-[13px]">npm run sync</code> to
              pull users from GHL, then{" "}
              <code className="font-mono text-[13px]">npm run import:team</code>{" "}
              to set who is a cold caller, VA, or acquisitions rep.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <EmployeeTable key={g.role} label={g.label} members={g.members} />
          ))}
        </div>
      )}

      <Card>
        <CardContent>
          <p className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            Not yet available
          </p>
          <ul className="divide-y divide-black/[0.06] dark:divide-white/10">
            {UNAVAILABLE_METRICS.map((m) => (
              <li
                key={m.key}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-[14px]">{m.label}</span>
                <span className="text-[13px] text-muted-foreground">{m.reason}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
