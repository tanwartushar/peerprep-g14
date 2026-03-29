/**
 * Base URL for the matching API.
 * - In Vite dev, use same origin so `/matching` is proxied to port 3003 (see vite.config.ts).
 * - Set `VITE_MATCHING_SERVICE_URL` when the app is served without that proxy (e.g. production).
 */
export function getMatchingServiceBaseUrl(): string {
  const envUrl = import.meta.env.VITE_MATCHING_SERVICE_URL as string | undefined;
  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return "http://localhost:3003";
}

export type MatchRequestResponse = {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  status: "PENDING" | "MATCHED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export async function createMatchRequest(
  userId: string,
  body: {
    topic: string;
    difficulty: string;
    programmingLanguage: string;
  },
): Promise<{ ok: true; data: MatchRequestResponse } | { ok: false; status: number; message: string }> {
  const base = getMatchingServiceBaseUrl();
  const url = `${base}/matching/requests`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const hint =
      e instanceof Error ? e.message : "Network error";
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

export async function cancelMatchRequest(
  userId: string,
  requestId: string,
): Promise<{ ok: true; data: MatchRequestResponse } | { ok: false; status: number; message: string }> {
  const base = getMatchingServiceBaseUrl();
  const url = `${base}/matching/requests/${encodeURIComponent(requestId)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "DELETE",
      headers: {
        "x-user-id": userId,
      },
    });
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
