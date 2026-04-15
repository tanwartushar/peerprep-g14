import type { Request } from "express";

const HEADER = "x-user-id";

/**
 * Resolves the authenticated user id for matching routes from `x-user-id`
 * (set by the auth gateway after JWT verification).
 */
export function resolveEffectiveUserIdFromRequest(req: Request): string | null {
  const raw = req.header(HEADER);
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  return raw.trim();
}
