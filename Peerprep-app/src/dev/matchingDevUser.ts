const STORAGE_KEY = "peerprep_matching_dev_user";

/**
 * Development-only: persist `?user=...` from the URL so two sessions (e.g. incognito) can use different fake ids.
 */
export function syncMatchingDevUserFromSearch(search: string): void {
  if (!import.meta.env.DEV) return;
  const params = new URLSearchParams(search);
  const fromQuery = params.get("user");
  if (fromQuery !== null && fromQuery.trim() !== "") {
    sessionStorage.setItem(STORAGE_KEY, fromQuery.trim());
  }
}

/**
 * Dev fake user id from `?user=` (stored) or null if unset (use real auth user id from context).
 */
export function getMatchingDevUserOverride(): string | null {
  if (!import.meta.env.DEV) return null;
  const v = sessionStorage.getItem(STORAGE_KEY);
  return v !== null && v.trim() !== "" ? v.trim() : null;
}

/**
 * Effective identity for matching API calls: dev override wins, else authenticated user id.
 */
export function getEffectiveMatchingUserId(
  authUserId: string | null,
): string | null {
  if (import.meta.env.DEV) {
    const dev = getMatchingDevUserOverride();
    if (dev) return dev;
  }
  return authUserId;
}
