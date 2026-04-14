/** Persist active match request id across refresh; localStorage survives tab close in the same browser profile. */
export const PEERPREP_ACTIVE_MATCH_REQUEST_ID_KEY =
  "peerprep_active_match_request_id";

export function setActiveMatchRequestId(id: string): void {
  try {
    sessionStorage.setItem(PEERPREP_ACTIVE_MATCH_REQUEST_ID_KEY, id);
    localStorage.setItem(PEERPREP_ACTIVE_MATCH_REQUEST_ID_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getActiveMatchRequestId(): string | null {
  try {
    return (
      sessionStorage.getItem(PEERPREP_ACTIVE_MATCH_REQUEST_ID_KEY) ??
      localStorage.getItem(PEERPREP_ACTIVE_MATCH_REQUEST_ID_KEY)
    );
  } catch {
    return null;
  }
}

export function clearActiveMatchRequestId(): void {
  try {
    sessionStorage.removeItem(PEERPREP_ACTIVE_MATCH_REQUEST_ID_KEY);
    localStorage.removeItem(PEERPREP_ACTIVE_MATCH_REQUEST_ID_KEY);
  } catch {
    /* ignore */
  }
}
