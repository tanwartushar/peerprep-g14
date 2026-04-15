/**
 * Path prefix for matching HTTP API.
 * - Default: `/api/matching` → gateway → auth-service (JWT) → matching-service (`/matching/...`).
 * - Set `VITE_MATCHING_SERVICE_URL` (e.g. `http://localhost:3003`) to call matching-service directly (bypass gateway).
 */
export function getMatchingApiPrefix(): string {
  const envUrl = import.meta.env.VITE_MATCHING_SERVICE_URL as string | undefined;
  if (envUrl && envUrl.length > 0) {
    const base = envUrl.replace(/\/$/, "");
    return `${base}/matching`;
  }
  return "/api/matching";
}

function matchingFetchInit(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...init,
    headers,
    credentials: import.meta.env.PROD ? "include" : "same-origin",
  };
}

export type MatchRequestResponse = {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  allowLowerDifficultyMatch: boolean;
  /** F2 — optional minutes preference */
  timeAvailableMinutes: number | null;
  status:
    | "PENDING"
    | "MATCHED"
    | "CANCELLED"
    | "TIMED_OUT"
    | "RECONNECT_EXPIRED";
  /** F8 / F9 — when status is TIMED_OUT or RECONNECT_EXPIRED */
  message: string | null;
  /** F9 — temporary disconnect (grace) */
  disconnectedAt: string | null;
  reconnectDeadlineAt: string | null;
  peerUserId: string | null;
  peerMatchRequestId: string | null;
  peer: { userId: string; matchRequestId: string } | null;
  /** Partner’s requested difficulty when MATCHED */
  peerRequestedDifficulty: string | null;
  /** Partner’s time preference when MATCHED */
  peerTimeAvailableMinutes: number | null;
  /** Both specified and equal; else null */
  matchedTimeAvailableMinutes: number | null;
  /** Same-difficulty vs cross-level (downward) match when MATCHED */
  matchingType: "same_difficulty" | "downward" | null;
  /** When PENDING: match-wait deadline (for display). Null otherwise. */
  expiresAt: string | null;
  /** Server match timeout seconds (display cap only). */
  matchTimeoutSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export async function createMatchRequest(body: {
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  allowLowerDifficultyMatch?: boolean;
  /** Omit when user leaves “no preference” */
  timeAvailableMinutes?: number;
}): Promise<
  { ok: true; data: MatchRequestResponse } | { ok: false; status: number; message: string }
> {
  const prefix = getMatchingApiPrefix();
  const url = `${prefix}/requests`;

  let res: Response;
  try {
    res = await fetch(
      url,
      matchingFetchInit({
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  } catch (e) {
    const hint = e instanceof Error ? e.message : "Network error";
    return {
      ok: false,
      status: 0,
      message: `Cannot reach matching service (${hint}). Start it with: cd services/matching-service && npm run dev`,
    };
  }

  if (res.ok) {
    const data = (await res.json()) as MatchRequestResponse;
    return { ok: true, data };
  }

  let message = res.statusText;
  try {
    const err = (await res.json()) as { error?: string; details?: string[] };
    if (err.error) message = err.error;
    else if (err.details?.length) message = err.details.join("; ");
  } catch {
    /* ignore */
  }
  return { ok: false, status: res.status, message };
}

export async function disconnectMatchRequest(
  requestId: string,
): Promise<
  { ok: true; data: MatchRequestResponse } | { ok: false; status: number; message: string }
> {
  const prefix = getMatchingApiPrefix();
  const url = `${prefix}/requests/${encodeURIComponent(requestId)}/disconnect`;

  let res: Response;
  try {
    res = await fetch(
      url,
      matchingFetchInit({
        method: "POST",
        body: "{}",
      }),
    );
  } catch (e) {
    const hint = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, message: hint };
  }

  if (res.ok) {
    const data = (await res.json()) as MatchRequestResponse;
    return { ok: true, data };
  }

  let message = res.statusText;
  try {
    const err = (await res.json()) as { error?: string };
    if (err.error) message = err.error;
  } catch {
    /* ignore */
  }
  return { ok: false, status: res.status, message };
}

export async function reconnectMatchRequest(
  requestId: string,
): Promise<
  { ok: true; data: MatchRequestResponse } | { ok: false; status: number; message: string }
> {
  const prefix = getMatchingApiPrefix();
  const url = `${prefix}/requests/${encodeURIComponent(requestId)}/reconnect`;

  let res: Response;
  try {
    res = await fetch(
      url,
      matchingFetchInit({
        method: "POST",
        body: "{}",
      }),
    );
  } catch (e) {
    const hint = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, message: hint };
  }

  if (res.ok) {
    const data = (await res.json()) as MatchRequestResponse;
    return { ok: true, data };
  }

  let message = res.statusText;
  try {
    const err = (await res.json()) as { error?: string };
    if (err.error) message = err.error;
  } catch {
    /* ignore */
  }
  return { ok: false, status: res.status, message };
}

/**
 * Fire-and-forget disconnect for tab close / navigation (F9).
 * Prefer `sendBeacon` (more reliable on unload); fall back to `fetch({ keepalive: true })`.
 */
export function disconnectMatchRequestKeepalive(requestId: string): void {
  const prefix = getMatchingApiPrefix();
  const url = `${prefix}/requests/${encodeURIComponent(requestId)}/disconnect`;
  const body = "{}";
  const blob = new Blob([body], { type: "application/json" });

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const ok = navigator.sendBeacon(url, blob);
    if (ok) return;
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  void fetch(url, {
    method: "POST",
    headers,
    body,
    keepalive: true,
    credentials: import.meta.env.PROD ? "include" : "same-origin",
  });
}

/**
 * Current user’s single PENDING match request, if any (`GET .../requests/active` → 200 or 204).
 */
export async function getActiveMatchRequest(): Promise<
  | { ok: true; data: MatchRequestResponse }
  | { ok: false; status: number; message: string }
> {
  const prefix = getMatchingApiPrefix();
  const url = `${prefix}/requests/active`;

  let res: Response;
  try {
    res = await fetch(url, matchingFetchInit({ method: "GET" }));
  } catch (e) {
    const hint = e instanceof Error ? e.message : "Network error";
    return {
      ok: false,
      status: 0,
      message: `Cannot reach matching service (${hint})`,
    };
  }

  if (res.status === 204) {
    return {
      ok: false,
      status: 204,
      message: "No active match request",
    };
  }

  if (res.ok) {
    const data = (await res.json()) as MatchRequestResponse;
    return { ok: true, data };
  }

  let message = res.statusText;
  try {
    const err = (await res.json()) as { error?: string };
    if (err.error) message = err.error;
  } catch {
    /* ignore */
  }
  return { ok: false, status: res.status, message };
}

/**
 * True when calls go through `/api/matching` (cookies + gateway auth).
 * Direct `http(s)` base URL skips the gateway — `EventSource` cannot send cookies the same way in all setups, so the UI falls back to HTTP polling for live updates.
 */
export function matchingApiUsesGatewayProxy(): boolean {
  return !getMatchingApiPrefix().startsWith("http");
}

/** Relative or absolute URL for `EventSource` (same shape as GET detail, streamed as SSE). */
export function getMatchRequestSseUrl(requestId: string): string {
  const prefix = getMatchingApiPrefix();
  return `${prefix}/requests/${encodeURIComponent(requestId)}/events`;
}

export async function getMatchRequest(
  requestId: string,
): Promise<
  | { ok: true; data: MatchRequestResponse }
  | { ok: false; status: number; message: string }
> {
  const prefix = getMatchingApiPrefix();
  const url = `${prefix}/requests/${encodeURIComponent(requestId)}`;

  let res: Response;
  try {
    res = await fetch(url, matchingFetchInit({ method: "GET" }));
  } catch (e) {
    const hint = e instanceof Error ? e.message : "Network error";
    return {
      ok: false,
      status: 0,
      message: `Cannot reach matching service (${hint})`,
    };
  }

  if (res.ok) {
    const data = (await res.json()) as MatchRequestResponse;
    return { ok: true, data };
  }

  let message = res.statusText;
  try {
    const err = (await res.json()) as { error?: string };
    if (err.error) message = err.error;
  } catch {
    /* ignore */
  }
  return { ok: false, status: res.status, message };
}

export async function cancelMatchRequest(
  requestId: string,
): Promise<
  { ok: true; data: MatchRequestResponse } | { ok: false; status: number; message: string }
> {
  const prefix = getMatchingApiPrefix();
  const url = `${prefix}/requests/${encodeURIComponent(requestId)}`;

  let res: Response;
  try {
    res = await fetch(url, matchingFetchInit({ method: "DELETE" }));
  } catch (e) {
    const hint = e instanceof Error ? e.message : "Network error";
    return {
      ok: false,
      status: 0,
      message: `Cannot reach matching service (${hint}). Is it running on port 3003?`,
    };
  }

  if (res.ok) {
    const data = (await res.json()) as MatchRequestResponse;
    return { ok: true, data };
  }

  let message = res.statusText;
  try {
    const err = (await res.json()) as { error?: string };
    if (err.error) message = err.error;
  } catch {
    /* ignore */
  }
  return { ok: false, status: res.status, message };
}
