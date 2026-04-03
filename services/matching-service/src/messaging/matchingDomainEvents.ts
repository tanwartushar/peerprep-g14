import type { MatchRequestRow as EngineMatchRequestRow } from "../services/matchingEngine.js";
import { publishToMatchingExchange } from "./rabbitmqPublisher.js";

function logPublishFailure(routingKey: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[matching-events] publish failed routingKey=${routingKey}: ${msg}`);
}

export type MatchRequestCreatedPayload = {
  eventType: "match.request.created";
  requestId: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  timeAvailableMinutes: number | null;
  allowLowerDifficultyMatch: boolean;
  occurredAt: string;
};

export type MatchRequestCancelledPayload = {
  eventType: "match.request.cancelled";
  requestId: string;
  userId: string;
  occurredAt: string;
};

export type MatchFoundEventPayload = {
  eventType: "match.found";
  matchId: string;
  requestAId: string;
  requestBId: string;
  userAId: string;
  userBId: string;
  topic: string;
  programmingLanguage: string;
  requesterDifficulty: string;
  partnerDifficulty: string;
  matchingType: "same_difficulty" | "downward";
  matchedTimeAvailableMinutes: number | null;
  occurredAt: string;
};

export type MatchTimedOutPayload = {
  eventType: "match.timed_out";
  requestId: string;
  userId: string;
  occurredAt: string;
};

export function buildMatchFoundPayload(
  requester: EngineMatchRequestRow,
  partner: EngineMatchRequestRow,
  matchingType: "same_difficulty" | "downward",
): MatchFoundEventPayload {
  const [id1, id2] = [requester.id, partner.id].sort((x, y) =>
    x.localeCompare(y),
  );
  const matchedTimeAvailableMinutes =
    requester.timeAvailableMinutes != null &&
    partner.timeAvailableMinutes != null &&
    requester.timeAvailableMinutes === partner.timeAvailableMinutes
      ? requester.timeAvailableMinutes
      : null;

  return {
    eventType: "match.found",
    matchId: `${id1}:${id2}`,
    requestAId: requester.id,
    requestBId: partner.id,
    userAId: requester.userId,
    userBId: partner.userId,
    topic: requester.topic,
    programmingLanguage: requester.programmingLanguage,
    requesterDifficulty: requester.difficulty,
    partnerDifficulty: partner.difficulty,
    matchingType,
    matchedTimeAvailableMinutes,
    occurredAt: new Date().toISOString(),
  };
}

export async function publishMatchRequestCreated(row: {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  timeAvailableMinutes: number | null;
  allowLowerDifficultyMatch: boolean;
}): Promise<void> {
  const payload: MatchRequestCreatedPayload = {
    eventType: "match.request.created",
    requestId: row.id,
    userId: row.userId,
    topic: row.topic,
    difficulty: row.difficulty,
    programmingLanguage: row.programmingLanguage,
    timeAvailableMinutes: row.timeAvailableMinutes,
    allowLowerDifficultyMatch: row.allowLowerDifficultyMatch,
    occurredAt: new Date().toISOString(),
  };
  try {
    await publishToMatchingExchange("match.request.created", {
      ...payload,
    });
  } catch (e) {
    logPublishFailure("match.request.created", e);
  }
}

export async function publishMatchRequestCancelled(
  requestId: string,
  userId: string,
): Promise<void> {
  const payload: MatchRequestCancelledPayload = {
    eventType: "match.request.cancelled",
    requestId,
    userId,
    occurredAt: new Date().toISOString(),
  };
  try {
    await publishToMatchingExchange("match.request.cancelled", {
      ...payload,
    });
  } catch (e) {
    logPublishFailure("match.request.cancelled", e);
  }
}

export async function publishMatchFound(
  payload: MatchFoundEventPayload,
): Promise<void> {
  try {
    await publishToMatchingExchange("match.found", { ...payload });
  } catch (e) {
    logPublishFailure("match.found", e);
  }
}

export async function publishMatchTimedOut(
  requestId: string,
  userId: string,
): Promise<void> {
  const payload: MatchTimedOutPayload = {
    eventType: "match.timed_out",
    requestId,
    userId,
    occurredAt: new Date().toISOString(),
  };
  try {
    await publishToMatchingExchange("match.timed_out", { ...payload });
  } catch (e) {
    logPublishFailure("match.timed_out", e);
  }
}

/** Publish timeouts and matches from a successful `tryMatchQueue` run. */
export async function publishMatchQueueEffects(effects: {
  timedOutRows: Array<{ id: string; userId: string }>;
  matches: MatchFoundEventPayload[];
}): Promise<void> {
  for (const r of effects.timedOutRows) {
    await publishMatchTimedOut(r.id, r.userId);
  }
  for (const m of effects.matches) {
    await publishMatchFound(m);
  }
}

export async function publishTimedOutRows(
  rows: Array<{ id: string; userId: string }>,
): Promise<void> {
  for (const r of rows) {
    await publishMatchTimedOut(r.id, r.userId);
  }
}
