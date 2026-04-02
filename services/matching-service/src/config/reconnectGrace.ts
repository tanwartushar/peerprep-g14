/**
 * F9 — grace period to reconnect after temporary disconnect while PENDING.
 * Set `RECONNECT_GRACE_SECONDS` (e.g. `10` for quick local tests).
 */
export function getReconnectGraceSeconds(): number {
  const raw = process.env.RECONNECT_GRACE_SECONDS;
  if (raw === undefined || String(raw).trim() === "") {
    return 30;
  }
  const n = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) {
    return 30;
  }
  return n;
}

export const MATCH_REQUEST_RECONNECT_EXPIRED_MESSAGE =
  "Your previous match request expired while disconnected. Please start a new search from the dashboard.";
