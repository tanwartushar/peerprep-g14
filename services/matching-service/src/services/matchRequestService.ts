import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import {
  getMatchTimeoutSeconds,
  MATCH_REQUEST_TIMEOUT_MESSAGE,
} from "../config/matchTimeout.js";
import type { CreateMatchRequestInput } from "../validation/matchRequestValidation.js";
import { findFirstPair } from "./matchingEngine.js";

export type MatchPeerDTO = {
  userId: string;
  matchRequestId: string;
};

export type MatchRequestDTO = {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  allowLowerDifficultyMatch: boolean;
  /** F2 — your preference; null if not set */
  timeAvailableMinutes: number | null;
  status: "PENDING" | "MATCHED" | "CANCELLED" | "TIMED_OUT";
  peerUserId: string | null;
  peerMatchRequestId: string | null;
  peer: MatchPeerDTO | null;
  /** Partner’s requested difficulty when MATCHED; null otherwise */
  peerRequestedDifficulty: string | null;
  /** Partner’s time preference when MATCHED; null if not set or not yet matched */
  peerTimeAvailableMinutes: number | null;
  /** F2 — both specified and equal; else null */
  matchedTimeAvailableMinutes: number | null;
  /** Present when MATCHED with a peer */
  matchingType: "same_difficulty" | "downward" | null;
  /** F8 — present when status is TIMED_OUT */
  message: string | null;
  createdAt: string;
  updatedAt: string;
};

function matchingPairTypeToApi(
  t: "SAME_DIFFICULTY" | "DOWNWARD" | null,
): "same_difficulty" | "downward" | null {
  if (t === null) return null;
  return t === "SAME_DIFFICULTY" ? "same_difficulty" : "downward";
}

function computedMatchedTimeMinutes(
  self: number | null,
  peer: number | null,
): number | null {
  if (self != null && peer != null && self === peer) return self;
  return null;
}

function pendingExpiryCutoff(): Date {
  const sec = getMatchTimeoutSeconds();
  return new Date(Date.now() - sec * 1000);
}

/**
 * Marks stale PENDING rows as TIMED_OUT (F8). Call before matching and on poll.
 */
async function expireStalePendingRequests(
  tx: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  const cutoff = pendingExpiryCutoff();
  await tx.matchRequest.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
    },
    data: { status: "TIMED_OUT" },
  });
}

function toDTO(row: {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  allowLowerDifficultyMatch: boolean;
  timeAvailableMinutes: number | null;
  status: "PENDING" | "MATCHED" | "CANCELLED" | "TIMED_OUT";
  peerUserId: string | null;
  peerMatchRequestId: string | null;
  peerRequestedDifficulty: string | null;
  peerTimeAvailableMinutes: number | null;
  matchingPairType: "SAME_DIFFICULTY" | "DOWNWARD" | null;
  createdAt: Date;
  updatedAt: Date;
}): MatchRequestDTO {
  const peer =
    row.status === "MATCHED" &&
    row.peerUserId !== null &&
    row.peerMatchRequestId !== null
      ? {
          userId: row.peerUserId,
          matchRequestId: row.peerMatchRequestId,
        }
      : null;

  const matchedTimeAvailableMinutes = computedMatchedTimeMinutes(
    row.timeAvailableMinutes,
    row.peerTimeAvailableMinutes,
  );

  return {
    id: row.id,
    userId: row.userId,
    topic: row.topic,
    difficulty: row.difficulty,
    programmingLanguage: row.programmingLanguage,
    allowLowerDifficultyMatch: row.allowLowerDifficultyMatch,
    timeAvailableMinutes: row.timeAvailableMinutes,
    status: row.status,
    peerUserId: row.peerUserId,
    peerMatchRequestId: row.peerMatchRequestId,
    peer,
    peerRequestedDifficulty: row.peerRequestedDifficulty,
    peerTimeAvailableMinutes: row.peerTimeAvailableMinutes,
    matchedTimeAvailableMinutes,
    matchingType: matchingPairTypeToApi(row.matchingPairType),
    message: row.status === "TIMED_OUT" ? MATCH_REQUEST_TIMEOUT_MESSAGE : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Attempts to form one pair from the current PENDING queue (F4 / F5 / F6 / F2).
 * Runs in a transaction; safe to call after each new pending request.
 */
export async function tryMatchQueue(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await expireStalePendingRequests(tx);

    const pending = await tx.matchRequest.findMany({
      where: { status: "PENDING" },
    });

    const pair = findFirstPair(
      pending.map((r) => ({
        id: r.id,
        userId: r.userId,
        topic: r.topic,
        difficulty: r.difficulty,
        programmingLanguage: r.programmingLanguage,
        allowLowerDifficultyMatch: r.allowLowerDifficultyMatch,
        timeAvailableMinutes: r.timeAvailableMinutes,
        createdAt: r.createdAt,
      })),
    );
    if (!pair) return;

    const { requester: a, partner: b, matchingType } = pair;

    const prismaPairType =
      matchingType === "same_difficulty"
        ? ("SAME_DIFFICULTY" as const)
        : ("DOWNWARD" as const);

    const first = await tx.matchRequest.updateMany({
      where: {
        id: a.id,
        status: "PENDING",
        userId: a.userId,
      },
      data: {
        status: "MATCHED",
        peerUserId: b.userId,
        peerMatchRequestId: b.id,
        peerRequestedDifficulty: b.difficulty,
        peerTimeAvailableMinutes: b.timeAvailableMinutes,
        matchingPairType: prismaPairType,
      },
    });

    if (first.count !== 1) {
      return;
    }

    const second = await tx.matchRequest.updateMany({
      where: {
        id: b.id,
        status: "PENDING",
        userId: b.userId,
      },
      data: {
        status: "MATCHED",
        peerUserId: a.userId,
        peerMatchRequestId: a.id,
        peerRequestedDifficulty: a.difficulty,
        peerTimeAvailableMinutes: a.timeAvailableMinutes,
        matchingPairType: prismaPairType,
      },
    });

    if (second.count !== 1) {
      throw new Error("Match finalization invariant failed");
    }
  });
}

export async function createMatchRequest(
  userId: string,
  input: CreateMatchRequestInput,
): Promise<{ ok: true; data: MatchRequestDTO } | { ok: false; code: "CONFLICT" }> {
  try {
    await expireStalePendingRequests(prisma);

    const created = await prisma.matchRequest.create({
      data: {
        userId,
        topic: input.topic,
        difficulty: input.difficulty,
        programmingLanguage: input.programmingLanguage,
        allowLowerDifficultyMatch: input.allowLowerDifficultyMatch,
        ...(input.timeAvailableMinutes != null
          ? { timeAvailableMinutes: input.timeAvailableMinutes }
          : {}),
        status: "PENDING",
      },
    });

    try {
      await tryMatchQueue();
    } catch {
      // Best-effort pairing; request stays PENDING. Next create or a later retry can match.
    }

    const refreshed = await prisma.matchRequest.findUnique({
      where: { id: created.id },
    });
    if (!refreshed) {
      throw new Error("Match request missing after create");
    }
    return { ok: true, data: toDTO(refreshed) };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { ok: false, code: "CONFLICT" };
    }
    throw e;
  }
}

export async function getMatchRequestForUser(
  id: string,
  userId: string,
): Promise<MatchRequestDTO | null> {
  await expireStalePendingRequests(prisma);

  const row = await prisma.matchRequest.findFirst({
    where: { id, userId },
  });
  return row ? toDTO(row) : null;
}

export async function cancelMatchRequestForUser(
  id: string,
  userId: string,
): Promise<
  | { ok: true; data: MatchRequestDTO }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "NOT_PENDING" }
  | { ok: false; code: "TIMED_OUT" }
> {
  const existing = await prisma.matchRequest.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (existing.status === "TIMED_OUT") {
    return { ok: false, code: "TIMED_OUT" };
  }
  if (existing.status !== "PENDING") {
    return { ok: false, code: "NOT_PENDING" };
  }

  const updated = await prisma.matchRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  return { ok: true, data: toDTO(updated) };
}
