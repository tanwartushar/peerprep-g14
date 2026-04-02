import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import {
  getMatchTimeoutSeconds,
  MATCH_REQUEST_TIMEOUT_MESSAGE,
} from "../config/matchTimeout.js";
import {
  getReconnectGraceSeconds,
  MATCH_REQUEST_RECONNECT_EXPIRED_MESSAGE,
} from "../config/reconnectGrace.js";
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
  timeAvailableMinutes: number | null;
  status:
    | "PENDING"
    | "MATCHED"
    | "CANCELLED"
    | "TIMED_OUT"
    | "RECONNECT_EXPIRED";
  peerUserId: string | null;
  peerMatchRequestId: string | null;
  peer: MatchPeerDTO | null;
  peerRequestedDifficulty: string | null;
  peerTimeAvailableMinutes: number | null;
  matchedTimeAvailableMinutes: number | null;
  matchingType: "same_difficulty" | "downward" | null;
  message: string | null;
  /** F9 — while temporarily disconnected (grace active) */
  disconnectedAt: string | null;
  reconnectDeadlineAt: string | null;
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

function pendingMatchTimeoutCutoff(): Date {
  const sec = getMatchTimeoutSeconds();
  return new Date(Date.now() - sec * 1000);
}

/**
 * F8 / F9 — expire reconnect grace first, then match-timeout for non-disconnected PENDING rows.
 */
async function expirePendingRequests(
  tx: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  const now = new Date();

  await tx.matchRequest.updateMany({
    where: {
      status: "PENDING",
      disconnectedAt: { not: null },
      reconnectDeadlineAt: { lt: now },
    },
    data: {
      status: "RECONNECT_EXPIRED",
      disconnectedAt: null,
      reconnectDeadlineAt: null,
    },
  });

  const cutoff = pendingMatchTimeoutCutoff();
  await tx.matchRequest.updateMany({
    where: {
      status: "PENDING",
      disconnectedAt: null,
      createdAt: { lt: cutoff },
    },
    data: { status: "TIMED_OUT" },
  });
}

function dtoMessage(
  status: MatchRequestDTO["status"],
): string | null {
  if (status === "TIMED_OUT") return MATCH_REQUEST_TIMEOUT_MESSAGE;
  if (status === "RECONNECT_EXPIRED") {
    return MATCH_REQUEST_RECONNECT_EXPIRED_MESSAGE;
  }
  return null;
}

function toDTO(row: {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  allowLowerDifficultyMatch: boolean;
  timeAvailableMinutes: number | null;
  status:
    | "PENDING"
    | "MATCHED"
    | "CANCELLED"
    | "TIMED_OUT"
    | "RECONNECT_EXPIRED";
  peerUserId: string | null;
  peerMatchRequestId: string | null;
  peerRequestedDifficulty: string | null;
  peerTimeAvailableMinutes: number | null;
  matchingPairType: "SAME_DIFFICULTY" | "DOWNWARD" | null;
  disconnectedAt: Date | null;
  reconnectDeadlineAt: Date | null;
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
    message: dtoMessage(row.status),
    disconnectedAt: row.disconnectedAt?.toISOString() ?? null,
    reconnectDeadlineAt: row.reconnectDeadlineAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function tryMatchQueue(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await expirePendingRequests(tx);

    const pendingRows = await tx.matchRequest.findMany({
      where: { status: "PENDING" },
    });
    const pending = pendingRows.filter((r) => r.disconnectedAt === null);

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
        disconnectedAt: null,
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
        disconnectedAt: null,
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
    await expirePendingRequests(prisma);

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
  await expirePendingRequests(prisma);

  const row = await prisma.matchRequest.findFirst({
    where: { id, userId },
  });
  return row ? toDTO(row) : null;
}

export async function disconnectMatchRequestForUser(
  id: string,
  userId: string,
): Promise<
  | { ok: true; data: MatchRequestDTO }
  | { ok: false; code: "NOT_FOUND" | "NOT_PENDING" }
> {
  await expirePendingRequests(prisma);

  const row = await prisma.matchRequest.findFirst({
    where: { id, userId },
  });
  if (!row) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (row.status !== "PENDING") {
    return { ok: false, code: "NOT_PENDING" };
  }

  if (row.disconnectedAt !== null) {
    return { ok: true, data: toDTO(row) };
  }

  const now = new Date();
  const deadline = new Date(
    now.getTime() + getReconnectGraceSeconds() * 1000,
  );

  const updated = await prisma.matchRequest.update({
    where: { id },
    data: {
      disconnectedAt: now,
      reconnectDeadlineAt: deadline,
    },
  });

  return { ok: true, data: toDTO(updated) };
}

export async function reconnectMatchRequestForUser(
  id: string,
  userId: string,
): Promise<
  | { ok: true; data: MatchRequestDTO }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "NOT_PENDING"
        | "NOT_DISCONNECTED"
        | "RECONNECT_EXPIRED";
    }
> {
  await expirePendingRequests(prisma);

  const row = await prisma.matchRequest.findFirst({
    where: { id, userId },
  });
  if (!row) {
    return { ok: false, code: "NOT_FOUND" };
  }
  if (row.status === "RECONNECT_EXPIRED") {
    return { ok: false, code: "RECONNECT_EXPIRED" };
  }
  if (row.status !== "PENDING") {
    return { ok: false, code: "NOT_PENDING" };
  }
  if (row.disconnectedAt === null) {
    return { ok: false, code: "NOT_DISCONNECTED" };
  }

  const now = new Date();
  if (
    row.reconnectDeadlineAt !== null &&
    row.reconnectDeadlineAt.getTime() < now.getTime()
  ) {
    await prisma.matchRequest.updateMany({
      where: { id, status: "PENDING" },
      data: {
        status: "RECONNECT_EXPIRED",
        disconnectedAt: null,
        reconnectDeadlineAt: null,
      },
    });
    return { ok: false, code: "RECONNECT_EXPIRED" };
  }

  const updated = await prisma.matchRequest.update({
    where: { id },
    data: {
      disconnectedAt: null,
      reconnectDeadlineAt: null,
    },
  });

  return { ok: true, data: toDTO(updated) };
}

export async function cancelMatchRequestForUser(
  id: string,
  userId: string,
): Promise<
  | { ok: true; data: MatchRequestDTO }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "NOT_PENDING" }
  | { ok: false; code: "TIMED_OUT" }
  | { ok: false; code: "RECONNECT_EXPIRED" }
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
  if (existing.status === "RECONNECT_EXPIRED") {
    return { ok: false, code: "RECONNECT_EXPIRED" };
  }
  if (existing.status !== "PENDING") {
    return { ok: false, code: "NOT_PENDING" };
  }

  const updated = await prisma.matchRequest.update({
    where: { id },
    data: {
      status: "CANCELLED",
      disconnectedAt: null,
      reconnectDeadlineAt: null,
    },
  });

  return { ok: true, data: toDTO(updated) };
}
