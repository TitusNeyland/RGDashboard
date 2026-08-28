/**
 * Measurement windows for the KPI engine.
 *
 * TIMEZONE CAVEAT: ranges are built with the runtime's local calendar. On
 * Vercel that is UTC, so day-boundary windows ("Today", "This week") are
 * offset from RG's Central Time — a deal closed at 8pm CT lands in the next
 * UTC day. Wider windows (30/60/90d, QTD, YTD) are unaffected in practice.
 * Fixing this properly means storing RG's timezone in admin config and
 * building ranges against it; noted rather than silently wrong.
 *
 * Weeks start MONDAY.
 */

export type PeriodKey =
  | "today"
  | "this_week"
  | "last_week"
  | "trailing_4w"
  | "last_30d"
  | "last_60d"
  | "last_90d"
  | "mtd"
  | "qtd"
  | "ytd";

export interface PeriodRange {
  key: PeriodKey;
  label: string;
  start: Date;
  end: Date;
}

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  this_week: "This week",
  last_week: "Last week",
  trailing_4w: "Trailing 4 weeks",
  last_30d: "Last 30 days",
  last_60d: "Last 60 days",
  last_90d: "Last 90 days",
  mtd: "Month to date",
  qtd: "Quarter to date",
  ytd: "Year to date",
};

/** Display order in the period switcher. */
export const PERIOD_ORDER: PeriodKey[] = [
  "today",
  "this_week",
  "last_week",
  "trailing_4w",
  "last_30d",
  "last_60d",
  "last_90d",
  "mtd",
  "qtd",
  "ytd",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

/** Monday-start week. */
function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  // getDay(): 0=Sun..6=Sat. Shift so Monday is 0.
  const offset = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

function daysBack(now: Date, days: number): PeriodRange["start"] {
  return startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
}

export function resolvePeriod(key: PeriodKey, now: Date = new Date()): PeriodRange {
  const label = PERIOD_LABELS[key];
  const end = endOfDay(now);

  switch (key) {
    case "today":
      return { key, label, start: startOfDay(now), end };

    case "this_week":
      return { key, label, start: startOfWeek(now), end };

    case "last_week": {
      const thisWeekStart = startOfWeek(now);
      const start = new Date(thisWeekStart.getTime() - 7 * DAY_MS);
      return { key, label, start, end: endOfDay(new Date(thisWeekStart.getTime() - DAY_MS)) };
    }

    case "trailing_4w":
      return { key, label, start: daysBack(now, 28), end };

    case "last_30d":
      return { key, label, start: daysBack(now, 30), end };

    case "last_60d":
      return { key, label, start: daysBack(now, 60), end };

    case "last_90d":
      return { key, label, start: daysBack(now, 90), end };

    case "mtd": {
      const start = startOfDay(now);
      start.setDate(1);
      return { key, label, start, end };
    }

    case "qtd": {
      const start = startOfDay(now);
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      return { key, label, start, end };
    }

    case "ytd": {
      const start = startOfDay(now);
      start.setMonth(0, 1);
      return { key, label, start, end };
    }
  }
}

/**
 * The equally-long window immediately preceding `range`, for change-vs-prior
 * comparison. "Last week" therefore compares against the week before it, and
 * "Last 30 days" against days 31–60 back.
 */
export function previousComparable(range: PeriodRange): PeriodRange {
  const durationMs = range.end.getTime() - range.start.getTime();
  const end = new Date(range.start.getTime() - 1);
  const start = new Date(end.getTime() - durationMs);
  return { key: range.key, label: `Previous ${range.label.toLowerCase()}`, start, end };
}

/** True when `date` falls inside the window (inclusive both ends). */
export function withinPeriod(date: Date | null, range: PeriodRange): boolean {
  if (!date) return false;
  const t = date.getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}
