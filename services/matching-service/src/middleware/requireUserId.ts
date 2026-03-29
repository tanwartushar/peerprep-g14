import type { RequestHandler } from "express";

const HEADER = "x-user-id";

/**
 * Development/testing: trusted caller supplies the authenticated user id.
 */
export const requireUserId: RequestHandler = (req, res, next) => {
  const raw = req.header(HEADER);
  if (raw === undefined || raw.trim() === "") {
    res.status(401).json({ error: "Missing or empty x-user-id header" });
    return;
  }
  req.userId = raw.trim();
  next();
};
