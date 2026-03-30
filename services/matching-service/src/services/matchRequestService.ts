import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
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
  status: "PENDING" | "MATCHED" | "CANCELLED";
  peerUserId: string | null;
  peerMatchRequestId: string | null;
  peer: MatchPeerDTO | null;
  createdAt: string;
  updatedAt: string;
};

function toDTO(row: {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  status: "PENDING" | "MATCHED" | "CANCELLED";
  peerUserId: string | null;
  peerMatchRequestId: string | null;
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

  return {
    id: row.id,
    userId: row.userId,
    topic: row.topic,
    difficulty: row.difficulty,
    programmingLanguage: row.programmingLanguage,
    status: row.status,
    peerUserId: row.peerUserId,
    peerMatchRequestId: row.peerMatchRequestId,
    peer,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Attempts to form one pair from the current PENDING queue (F4 / F6).
 * Runs in a transaction; safe to call after each new pending request.
 */
export async function tryMatchQueue(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const pending = await tx.matchRequest.findMany({
      where: { status: "PENDING" },
    });

    const pair = findFirstPair(pending);
    if (!pair) return;

    const [a, b] = pair;

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
    const created = await prisma.matchRequest.create({
      data: {
        userId,
        topic: input.topic,
        difficulty: input.difficulty,
        programmingLanguage: input.programmingLanguage,
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
> {
  const existing = await prisma.matchRequest.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
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
