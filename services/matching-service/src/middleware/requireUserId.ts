import type { RequestHandler } from "express";
import { resolveEffectiveUserIdFromRequest } from "../auth/resolveEffectiveUserId.js";

/**
 * Requires a non-empty `x-user-id` (dev fake user or gateway-injected identity).
 */
export const requireUserId: RequestHandler = (req, res, next) => {
  const id = resolveEffectiveUserIdFromRequest(req);
  if (!id) {
    res.status(401).json({ error: "Missing or empty x-user-id header" });
    return;
  }
  req.userId = id;
  next();
};
