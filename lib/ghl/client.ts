/**
 * Thin wrapper around the GHL API v3 (services.leadconnectorhq.com), authenticated
 * with a location-scoped Private Integration Token.
 *
 * Response shapes here are taken from GHL's public OpenAPI specs
 * (github.com/GoHighLevel/highlevel-api-docs), which are known to be incomplete in
 * places — e.g. `ContactsSearchSchema` doesn't list `firstName`/`phone`, and the
 * `/contacts/search` pagination cursor isn't documented at all. Every method here
 * returns the full raw JSON alongside anything we parse, and the sync job stores
 * that raw payload — so nothing is lost even if a promoted field turns out to be
 * named differently in RG's real account. Run `npm run discover` against the real
 * account first and fix field names here before trusting the sync output.
 */

const BASE_URL = "https://services.leadconnectorhq.com";
const API_VERSION = "v3";
// GHL has not migrated every endpoint to v3 — /users/ still requires the
// dated version header, and sending "v3" there fails.
const LEGACY_API_VERSION = "2021-07-28";

export interface GhlPipelineStage {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface GhlPipeline {
  id: string;
  name: string;
  stages: GhlPipelineStage[];
  [key: string]: unknown;
}

export interface GhlOpportunity {
  id: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  assignedTo?: string;
  contactId?: string;
  monetaryValue?: number;
  /** Free-text lead source, used for campaign attribution. */
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  lastStageChangeAt?: string;
  [key: string]: unknown;
}

export interface GhlUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  roles?: { type?: string; role?: string };
  [key: string]: unknown;
}

export interface GhlContact {
  id: string;
  email?: string;
  [key: string]: unknown;
}

export class GhlApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown
  ) {
    super(message);
    this.name = "GhlApiError";
  }
}

export class GhlClient {
  private token: string;
  private locationId: string;

  constructor(opts?: { token?: string; locationId?: string }) {
    const token = opts?.token ?? process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
    const locationId = opts?.locationId ?? process.env.GHL_LOCATION_ID;
    if (!token) throw new Error("GHL_PRIVATE_INTEGRATION_TOKEN is not set");
    if (!locationId) throw new Error("GHL_LOCATION_ID is not set");
    this.token = token;
    this.locationId = locationId;
  }

  private async request<T>(
    path: string,
    init?: RequestInit & {
      query?: Record<string, string | number | boolean | undefined>;
      version?: string;
    }
  ): Promise<T> {
    const url = new URL(BASE_URL + path);
    if (init?.query) {
      for (const [key, value] of Object.entries(init.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Version: init?.version ?? API_VERSION,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => undefined);
      throw new GhlApiError(
        `GHL API ${init?.method ?? "GET"} ${path} failed: ${res.status}`,
        res.status,
        body
      );
    }

    return res.json() as Promise<T>;
  }

  /** GET /opportunities/pipelines — the real pipeline/stage IDs and names for this location. */
  async listPipelines(): Promise<GhlPipeline[]> {
    const data = await this.request<{ pipelines: GhlPipeline[] }>(
      "/opportunities/pipelines",
      { query: { locationId: this.locationId } }
    );
    return data.pipelines;
  }

  /**
   * GET /users/ — the location's employees. Uses the legacy version header
   * (see LEGACY_API_VERSION); returns all users in one response, no paging.
   */
  async listUsers(): Promise<GhlUser[]> {
    const data = await this.request<{ users: GhlUser[] }>("/users/", {
      query: { locationId: this.locationId },
      version: LEGACY_API_VERSION,
    });
    return data.users ?? [];
  }

  /**
   * GET /opportunities/search, paginated via the documented `startAfter` /
   * `startAfterId` cursor (from `meta` in each response page).
   */
  async *iterateOpportunities(
    pageLimit = 100,
    options?: { updatedAfter?: Date }
  ): AsyncGenerator<GhlOpportunity> {
    let startAfter: string | undefined;
    let startAfterId: string | undefined;

    // There is no server-side "updated since" filter for opportunities — the
    // `date` parameter filters createdAt, which would miss a lead created in
    // January that moved stage yesterday, i.e. exactly what needs syncing.
    // `order=updated_desc` IS honored (verified live), so sort newest-updated
    // first and stop as soon as a page falls entirely behind the watermark.
    const incremental = options?.updatedAfter;

    while (true) {
      const data = await this.request<{
        opportunities: GhlOpportunity[];
        meta?: { startAfter?: number; startAfterId?: string };
      }>("/opportunities/search", {
        query: {
          locationId: this.locationId,
          limit: pageLimit,
          startAfter,
          startAfterId,
          ...(incremental ? { order: "updated_desc" } : {}),
        },
      });

      for (const opp of data.opportunities) {
        if (incremental && opp.updatedAt && new Date(opp.updatedAt) < incremental) return;
        yield opp;
      }

      if (data.opportunities.length < pageLimit) return;
      if (!data.meta?.startAfterId) return; // no cursor to continue with
      startAfter = data.meta.startAfter ? String(data.meta.startAfter) : undefined;
      startAfterId = data.meta.startAfterId;
    }
  }

  /**
   * POST /contacts/search. Pagination cursor shape isn't documented publicly;
   * this reads a `searchAfter` array off the last contact of each page, which
   * matches GHL's older Elasticsearch-backed contacts search. Verify against
   * a real response (`npm run discover`) — if `searchAfter` isn't actually
   * there, this stops after page 1 rather than looping incorrectly.
   */
  async *iterateContacts(
    pageLimit = 100,
    options?: { updatedAfter?: Date }
  ): AsyncGenerator<GhlContact> {
    let searchAfter: unknown[] | undefined;

    // Verified against the live account: this filter is honored and
    // monotonic, cutting 31,624 contacts to 17 for a recent watermark.
    const filters = options?.updatedAfter
      ? [
          {
            field: "dateUpdated",
            operator: "range",
            value: { gte: options.updatedAfter.toISOString() },
          },
        ]
      : undefined;

    while (true) {
      const data = await this.request<{ contacts: GhlContact[]; count?: number }>(
        "/contacts/search",
        {
          method: "POST",
          body: JSON.stringify({
            locationId: this.locationId,
            pageLimit,
            ...(filters ? { filters } : {}),
            ...(searchAfter ? { searchAfter } : {}),
          }),
        }
      );

      for (const contact of data.contacts) yield contact;

      if (data.contacts.length < pageLimit) return;
      const last = data.contacts[data.contacts.length - 1] as {
        searchAfter?: unknown[];
      };
      if (!last.searchAfter) return; // no cursor found — see doc comment above
      searchAfter = last.searchAfter;
    }
  }
}
