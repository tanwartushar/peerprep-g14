import type { Request } from "express";

const HEADER = "x-user-id";

/**
 * Resolves the authenticated user id for matching routes.
 * In development, the client may send `x-user-id` for local fake users.
 * In production, the gateway must set `x-user-id` after real auth; the browser does not send fake identities.
 */
export function resolveEffectiveUserIdFromRequest(req: Request): string | null {
  const raw = req.header(HEADER);
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  return raw.trim();
}
