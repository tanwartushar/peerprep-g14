import { Router, type Request, type Response } from "express";
import {
  MatchRequestValidationError,
  parseCreateMatchRequestBody,
} from "../validation/matchRequestValidation.js";
import {
  cancelMatchRequestForUser,
  createMatchRequest,
  getMatchRequestForUser,
} from "../services/matchRequestService.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.post(
  "/requests",
  requireUserId,
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    try {
      const input = parseCreateMatchRequestBody(req.body);
      const result = await createMatchRequest(userId, input);
      if (!result.ok) {
        res.status(409).json({
          error:
            "You already have an active match request. Cancel it before starting a new one.",
        });
        return;
      }
      res.status(201).json(result.data);
    } catch (e) {
      if (e instanceof MatchRequestValidationError) {
        res.status(400).json({ error: "Validation failed", details: e.issues });
        return;
      }
      res.status(500).json({ error: "Could not save match request" });
    }
  },
);

router.get(
  "/requests/:id",
  requireUserId,
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    const id = req.params["id"];
    if (typeof id !== "string") {
      res.status(400).json({ error: "Invalid request id" });
      return;
    }
    const row = await getMatchRequestForUser(id, userId);
    if (!row) {
      res.status(404).json({ error: "Match request not found" });
      return;
    }
    res.status(200).json(row);
  },
);

router.delete(
  "/requests/:id",
  requireUserId,
  async (req: Request, res: Response) => {
    const userId = req.userId!;
    const id = req.params["id"];
    if (typeof id !== "string") {
      res.status(400).json({ error: "Invalid request id" });
      return;
    }
    const result = await cancelMatchRequestForUser(id, userId);
    if (result.ok) {
      res.status(200).json(result.data);
      return;
    }
    if (result.code === "NOT_FOUND") {
      res.status(404).json({ error: "Match request not found" });
      return;
    }
    if (result.code === "TIMED_OUT") {
      res.status(409).json({
        error:
          "This match request has timed out and cannot be cancelled. Start a new search from the dashboard.",
      });
      return;
    }
    res.status(409).json({
      error: "Only pending match requests can be cancelled",
    });
  },
);

export default router;
