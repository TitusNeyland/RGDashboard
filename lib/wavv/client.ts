/**
 * Wavv Public API client — the cold-calling data source (Tier 2B).
 *
 * UNVERIFIED AGAINST A LIVE ACCOUNT. Wavv's published docs describe a REST
 * API with `GET /calls` (call history with filtering and pagination),
 * `GET /calls/{id}`, recording and transcript endpoints, and `call.*`
 * webhooks; documented fields include talk time in seconds, an
 * agent-selected free-text disposition, direction, and campaign id. What is
 * NOT confirmed is the base URL, the exact auth header, the pagination
 * parameter names, and every field name.
 *
 * So: run `npm run discover:wavv` FIRST. It prints the raw response (or the
 * exact failure), and the shapes below are corrected from that before any
 * KPI is trusted. This is the same sequence that caught the GHL field
 * mismatches — `raw` keeps the full payload so nothing is lost if a promoted
 * field turns out to be named differently.
 *
 * Base URL and auth scheme are environment-overridable precisely because
 * they are guesses.
 */

const DEFAULT_BASE_URL = "https://api.wavv.com/v3";

export interface WavvCall {
  id: string;
  /** Talk time. Docs reference a `seconds` field. */
  seconds?: number;
  duration?: number;
  direction?: string;
  /** Free-text label the agent selected. Maps via lib/cold-calling/dispositions.ts. */
  disposition?: string;
  status?: string;
  outcome?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  /** Who dialed. Needed for per-caller attribution. */
  userId?: string;
  agentId?: string;
  agentEmail?: string;
  /** Who was dialed. Needed to join a call to a GHL contact. */
  contactId?: string;
  phoneNumber?: string;
  campaignId?: string;
  [key: string]: unknown;
}

export class WavvApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown
  ) {
    super(message);
    this.name = "WavvApiError";
  }
}

export class WavvClient {
  private apiKey: string;
  private baseUrl: string;
  private authScheme: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string; authScheme?: string }) {
    const apiKey = opts?.apiKey ?? process.env.WAVV_API_KEY;
    if (!apiKey) throw new Error("WAVV_API_KEY is not set");
    this.apiKey = apiKey;
    this.baseUrl = opts?.baseUrl ?? process.env.WAVV_BASE_URL ?? DEFAULT_BASE_URL;
    // Bearer is the guess; some Wavv setups may want `x-api-key` instead.
    this.authScheme = opts?.authScheme ?? process.env.WAVV_AUTH_SCHEME ?? "bearer";
  }

  private headers(): Record<string, string> {
    return this.authScheme.toLowerCase() === "x-api-key"
      ? { "x-api-key": this.apiKey, "Content-Type": "application/json" }
      : { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  async request<T>(
    path: string,
    query?: Record<string, string | number | undefined>
  ): Promise<T> {
    const url = new URL(this.baseUrl.replace(/\/$/, "") + path);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new WavvApiError(
        `Wavv GET ${path} failed: ${res.status}. URL: ${url.toString()}`,
        res.status,
        body.slice(0, 500)
      );
    }
    return res.json() as Promise<T>;
  }

  /**
   * One page of call history, returned raw so the discovery script can show
   * the true envelope shape (which key holds the array, how paging is
   * expressed) before anything depends on it.
   */
  async rawCallsPage(params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    page?: number;
  }): Promise<unknown> {
    return this.request<unknown>("/calls", {
      start_date: params?.startDate,
      end_date: params?.endDate,
      limit: params?.limit ?? 50,
      page: params?.page,
    });
  }

  /**
   * Iterates call history. Assumes a `calls`/`data`/`results` array and
   * page-number paging — all three are tolerated because the real envelope
   * is unconfirmed. Stops when a page returns fewer rows than requested, so
   * a wrong paging parameter ends the loop rather than spinning forever.
   */
  async *iterateCalls(params?: {
    startDate?: string;
    endDate?: string;
    pageLimit?: number;
  }): AsyncGenerator<WavvCall> {
    const limit = params?.pageLimit ?? 100;
    let page = 1;

    while (true) {
      const payload = (await this.rawCallsPage({
        startDate: params?.startDate,
        endDate: params?.endDate,
        limit,
        page,
      })) as Record<string, unknown>;

      const rows = extractCalls(payload);
      for (const call of rows) yield call;

      if (rows.length < limit) return;
      page++;
      // Hard stop: without a confirmed paging contract, never loop unbounded.
      if (page > 200) return;
    }
  }
}

/** Finds the call array regardless of which key the envelope uses. */
export function extractCalls(payload: unknown): WavvCall[] {
  if (Array.isArray(payload)) return payload as WavvCall[];
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  for (const key of ["calls", "data", "results", "items", "records"]) {
    if (Array.isArray(obj[key])) return obj[key] as WavvCall[];
  }
  return [];
}
