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
import type { MatchRequestRow } from "../types/matchRequestRow.js";
import {
  buildMatchFoundPayload,
  publishMatchQueueEffects,
  publishMatchRequestCancelled,
  publishMatchRequestCreated,
  type MatchFoundEventPayload,
} from "../messaging/matchingDomainEvents.js";
import {
  findFirstPair,
  poolKeyString,
  type MatchPairResult,
  type MatchRequestRow as EngineMatchRequestRow,
} from "./matchingEngine.js";
import { broadcastMatchRequestDto } from "../sse/matchRequestSseHub.js";

type MRWhere = Prisma.MatchRequestWhereInput;
type MRUpdateManyData = Prisma.MatchRequestUncheckedUpdateManyInput;
type MRCreateData = Prisma.MatchRequestUncheckedCreateInput;

/** DB rows always match the schema; narrow when the language service uses a stale `@prisma/client`. */
function asMatchRow(v: unknown): MatchRequestRow {
  return v as MatchRequestRow;
}

/** Prisma `updateMany` `data` is an XOR type in generated clients; assert unchecked shape. */
function matchedRowUpdateData(
  partnerUserId: string,
  partnerRequestId: string,
  partnerDifficulty: string,
  partnerTimeAvailableMinutes: number | null,
  pairType: "SAME_DIFFICULTY" | "DOWNWARD",
): MRUpdateManyData {
  return {
    status: "MATCHED",
    peerUserId: partnerUserId,
    peerMatchRequestId: partnerRequestId,
    peerRequestedDifficulty: partnerDifficulty,
    peerTimeAvailableMinutes: partnerTimeAvailableMinutes,
    matchingPairType: pairType,
  } as MRUpdateManyData;
}

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
  /** When status is PENDING: server-computed match-wait deadline (createdAt + timeout). Else null. */
  expiresAt: string | null;
  /** Server `MATCH_TIMEOUT_SECONDS` (for display cap; timeout status is still server-authoritative). */
  matchTimeoutSeconds: number;
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
 * F10.1 — Map DB rows to the engine input shape after eligibility filtering.
 * Eligibility (enforced in `tryMatchQueue`): `PENDING`, `disconnectedAt == null`
 * (connected / not beyond grace for matching), not `MATCHED`; `expirePendingRequests`
 * runs first so timed-out and reconnect-expired rows are not `PENDING`.
 */
function toEngineRow(r: MatchRequestRow): EngineMatchRequestRow {
  return {
    id: r.id,
    userId: r.userId,
    topic: r.topic,
    difficulty: r.difficulty,
    programmingLanguage: r.programmingLanguage,
    allowLowerDifficultyMatch: r.allowLowerDifficultyMatch,
    timeAvailableMinutes: r.timeAvailableMinutes,
    createdAt: r.createdAt,
  };
}

/**
 * F8 / F9 — expire reconnect grace first, then match-timeout for non-disconnected PENDING rows.
 * Returns rows that transitioned to `TIMED_OUT` (for domain events after commit).
 */
async function expirePendingRequests(
  tx: Prisma.TransactionClient | typeof prisma,
): Promise<{
  timedOutRows: MatchRequestRow[];
  reconnectExpiredPairs: { id: string; userId: string }[];
}> {
  const now = new Date();

  const reconnectCandidates = await tx.matchRequest.findMany({
    where: {
      status: "PENDING",
      disconnectedAt: { not: null },
      reconnectDeadlineAt: { lte: now },
    } as MRWhere,
  });
  const reconnectExpiredPairs = reconnectCandidates.map((r) => ({
    id: r.id,
    userId: r.userId,
  }));

  if (reconnectExpiredPairs.length > 0) {
    await tx.matchRequest.updateMany({
      where: {
        id: { in: reconnectExpiredPairs.map((p) => p.id) },
        status: "PENDING",
        disconnectedAt: { not: null },
        reconnectDeadlineAt: { lte: now },
      } as MRWhere,
      data: {
        status: "RECONNECT_EXPIRED",
        disconnectedAt: null,
        reconnectDeadlineAt: null,
      } as unknown as MRUpdateManyData,
    });
  }

  const cutoff = pendingMatchTimeoutCutoff();
  const toTimeOut = await tx.matchRequest.findMany({
    where: {
      status: "PENDING",
      disconnectedAt: null,
      createdAt: { lte: cutoff },
    } as MRWhere,
  });
  if (toTimeOut.length === 0) {
    return { timedOutRows: [], reconnectExpiredPairs };
  }

  await tx.matchRequest.updateMany({
    where: {
      id: { in: toTimeOut.map((r) => r.id) },
    } as MRWhere,
    data: { status: "TIMED_OUT" } as unknown as MRUpdateManyData,
  });
  return {
    timedOutRows: toTimeOut.map((r) => asMatchRow(r)),
    reconnectExpiredPairs,
  };
}

export type MatchQueueEffects = {
  timedOutRows: MatchRequestRow[];
  reconnectExpiredPairs: { id: string; userId: string }[];
  matches: MatchFoundEventPayload[];
};

function dtoMessage(
  status: MatchRequestDTO["status"],
): string | null {
  if (status === "TIMED_OUT") return MATCH_REQUEST_TIMEOUT_MESSAGE;
  if (status === "RECONNECT_EXPIRED") {
    return MATCH_REQUEST_RECONNECT_EXPIRED_MESSAGE;
  }
  return null;
}

function toDTO(row: MatchRequestRow): MatchRequestDTO {
  const timeoutSec = getMatchTimeoutSeconds();
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

  const expiresAt =
    row.status === "PENDING"
      ? new Date(
          row.createdAt.getTime() + timeoutSec * 1000,
        ).toISOString()
      : null;

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
    expiresAt,
    matchTimeoutSeconds: timeoutSec,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Read-through DTO without running the matcher (used for SSE after queue effects already ran). */
async function loadMatchRequestDtoForUserNoSideEffect(
  id: string,
  userId: string,
): Promise<MatchRequestDTO | null> {
  const row = await prisma.matchRequest.findFirst({
    where: { id, userId } as MRWhere,
  });
  return row ? toDTO(asMatchRow(row)) : null;
}

async function notifyMatchRequestSseAfterQueueEffects(
  q: MatchQueueEffects,
): Promise<void> {
  for (const p of q.reconnectExpiredPairs) {
    const dto = await loadMatchRequestDtoForUserNoSideEffect(p.id, p.userId);
    if (dto) broadcastMatchRequestDto(p.id, dto);
  }
  for (const r of q.timedOutRows) {
    const dto = await loadMatchRequestDtoForUserNoSideEffect(r.id, r.userId);
    if (dto) broadcastMatchRequestDto(r.id, dto);
  }
  for (const m of q.matches) {
    const dtoA = await loadMatchRequestDtoForUserNoSideEffect(
      m.requestAId,
      m.userAId,
    );
    const dtoB = await loadMatchRequestDtoForUserNoSideEffect(
      m.requestBId,
      m.userBId,
    );
    if (dtoA) broadcastMatchRequestDto(m.requestAId, dtoA);
    if (dtoB) broadcastMatchRequestDto(m.requestBId, dtoB);
  }
}

export async function tryMatchQueue(): Promise<MatchQueueEffects> {
  const timedOutRows: MatchRequestRow[] = [];
  const matches: MatchFoundEventPayload[] = [];
  let reconnectExpiredPairs: { id: string; userId: string }[] = [];

  await prisma.$transaction(async (tx) => {
    const expired = await expirePendingRequests(tx);
    timedOutRows.push(...expired.timedOutRows);
    reconnectExpiredPairs = expired.reconnectExpiredPairs;

    /**
     * Per-pool matching: load only `(topic, programmingLanguage)` slices (not all PENDING rows).
     * Order matches `sortedPoolKeys` / F10.1 — same outcome as one global `findFirstPair`, less memory.
     */
    while (true) {
      const pendingPoolKeys = await tx.matchRequest.findMany({
        where: {
          status: "PENDING",
          disconnectedAt: null,
        } as MRWhere,
        select: { topic: true, programmingLanguage: true },
        distinct: ["topic", "programmingLanguage"],
      });

      if (pendingPoolKeys.length === 0) {
        return;
      }

      const sortedPools = [...pendingPoolKeys].sort((x, y) =>
        poolKeyString(x.topic, x.programmingLanguage).localeCompare(
          poolKeyString(y.topic, y.programmingLanguage),
        ),
      );

      let pair: MatchPairResult | null = null;
      for (const { topic, programmingLanguage } of sortedPools) {
        const pendingRows = await tx.matchRequest.findMany({
          where: {
            status: "PENDING",
            disconnectedAt: null,
            topic,
            programmingLanguage,
          } as MRWhere,
        });
        const pending = pendingRows
          .map((r) => asMatchRow(r))
          .filter((r) => r.disconnectedAt === null);

        pair = findFirstPair(pending.map(toEngineRow));
        if (pair !== null) {
          break;
        }
      }

      if (pair === null) {
        return;
      }

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
        } as MRWhere,
        data: matchedRowUpdateData(
          b.userId,
          b.id,
          b.difficulty,
          b.timeAvailableMinutes,
          prismaPairType,
        ),
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
        } as MRWhere,
        data: matchedRowUpdateData(
          a.userId,
          a.id,
          a.difficulty,
          a.timeAvailableMinutes,
          prismaPairType,
        ),
      });

      if (second.count !== 1) {
        throw new Error("Match finalization invariant failed");
      }

      matches.push(buildMatchFoundPayload(a, b, matchingType));
    }
  });

  return { timedOutRows, reconnectExpiredPairs, matches };
}

/**
 * Best-effort matcher + RabbitMQ publish. Logs failures; does not throw (callers stay HTTP-safe).
 * Single place for timeout `match.timed_out` publishes to avoid duplicate events vs ad-hoc publish.
 */
async function tryMatchQueueAndPublish(): Promise<void> {
  try {
    const q = await tryMatchQueue();
    await publishMatchQueueEffects(q);
    await notifyMatchRequestSseAfterQueueEffects(q);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[matching] tryMatchQueueAndPublish failed: ${msg}`);
  }
}

/** Matcher + Rabbit + SSE fan-out; safe to call from a background tick. */
export async function runMatchQueueTick(): Promise<void> {
  await tryMatchQueueAndPublish();
}

export async function createMatchRequest(
  userId: string,
  input: CreateMatchRequestInput,
): Promise<{ ok: true; data: MatchRequestDTO } | { ok: false; code: "CONFLICT" }> {
  try {
    await tryMatchQueueAndPublish();

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
      } as MRCreateData,
    });

    await publishMatchRequestCreated(asMatchRow(created));

    await tryMatchQueueAndPublish();

    const refreshed = await prisma.matchRequest.findUnique({
      where: { id: created.id },
    });
    if (!refreshed) {
      throw new Error("Match request missing after create");
    }
    return { ok: true, data: toDTO(asMatchRow(refreshed)) };
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
  await tryMatchQueueAndPublish();

  const row = await prisma.matchRequest.findFirst({
    where: { id, userId } as MRWhere,
  });
  return row ? toDTO(asMatchRow(row)) : null;
}

/** At most one PENDING row per user (partial unique index). */
export async function getActiveMatchRequestForUser(
  userId: string,
): Promise<MatchRequestDTO | null> {
  await tryMatchQueueAndPublish();

  const row = await prisma.matchRequest.findFirst({
    where: { userId, status: "PENDING" } as MRWhere,
  });
  return row ? toDTO(asMatchRow(row)) : null;
}

export async function disconnectMatchRequestForUser(
  id: string,
  userId: string,
): Promise<
  | { ok: true; data: MatchRequestDTO }
  | { ok: false; code: "NOT_FOUND" | "NOT_PENDING" }
> {
  await tryMatchQueueAndPublish();

  const row = await prisma.matchRequest.findFirst({
    where: { id, userId } as MRWhere,
  });
  if (!row) {
    return { ok: false, code: "NOT_FOUND" };
  }
  const r0 = asMatchRow(row);
  if (r0.status !== "PENDING") {
    return { ok: false, code: "NOT_PENDING" };
  }

  if (r0.disconnectedAt !== null) {
    const d = toDTO(r0);
    broadcastMatchRequestDto(id, d);
    return { ok: true, data: d };
  }

  const now = new Date();
  const deadline = new Date(
    now.getTime() + getReconnectGraceSeconds() * 1000,
  );

  const updated = await prisma.matchRequest.updateMany({
    where: {
      id,
      userId,
      status: "PENDING",
      disconnectedAt: null,
    } as MRWhere,
    data: {
      disconnectedAt: now,
      reconnectDeadlineAt: deadline,
    } as MRUpdateManyData,
  });

  if (updated.count === 0) {
    const again = await prisma.matchRequest.findFirst({
      where: { id, userId } as MRWhere,
    });
    if (!again) {
      return { ok: false, code: "NOT_FOUND" };
    }
    const ra = asMatchRow(again);
    if (ra.status !== "PENDING") {
      return { ok: false, code: "NOT_PENDING" };
    }
    await tryMatchQueueAndPublish();
    const dRa = toDTO(ra);
    broadcastMatchRequestDto(id, dRa);
    return { ok: true, data: dRa };
  }

  const refreshed = await prisma.matchRequest.findFirst({
    where: { id, userId } as MRWhere,
  });
  if (!refreshed) {
    return { ok: false, code: "NOT_FOUND" };
  }
  await tryMatchQueueAndPublish();
  const dRef = toDTO(asMatchRow(refreshed));
  broadcastMatchRequestDto(id, dRef);
  return { ok: true, data: dRef };
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
  await tryMatchQueueAndPublish();

  const row = await prisma.matchRequest.findFirst({
    where: { id, userId } as MRWhere,
  });
  if (!row) {
    return { ok: false, code: "NOT_FOUND" };
  }
  const r = asMatchRow(row);
  if (r.status === "RECONNECT_EXPIRED") {
    return { ok: false, code: "RECONNECT_EXPIRED" };
  }
  if (r.status !== "PENDING") {
    return { ok: false, code: "NOT_PENDING" };
  }
  if (r.disconnectedAt === null) {
    return { ok: false, code: "NOT_DISCONNECTED" };
  }

  const now = new Date();
  const deadlineMs = r.reconnectDeadlineAt?.getTime() ?? null;
  const graceExpired =
    deadlineMs !== null && deadlineMs <= now.getTime();

  if (graceExpired) {
    const expired = await prisma.matchRequest.updateMany({
      where: {
        id,
        userId,
        status: "PENDING",
        disconnectedAt: { not: null },
        reconnectDeadlineAt: { lte: now },
      } as MRWhere,
      data: {
        status: "RECONNECT_EXPIRED",
        disconnectedAt: null,
        reconnectDeadlineAt: null,
      } as unknown as MRUpdateManyData,
    });
    if (expired.count === 0) {
      const again = await prisma.matchRequest.findFirst({
        where: { id, userId } as MRWhere,
      });
      if (!again) {
        return { ok: false, code: "NOT_FOUND" };
      }
      const ag = asMatchRow(again);
      if (ag.status === "RECONNECT_EXPIRED") {
        return { ok: false, code: "RECONNECT_EXPIRED" };
      }
      if (ag.status === "PENDING" && ag.disconnectedAt === null) {
        await tryMatchQueueAndPublish();
        const after = await prisma.matchRequest.findFirst({
          where: { id, userId } as MRWhere,
        });
        if (!after) {
          return { ok: false, code: "NOT_FOUND" };
        }
        const dAfter = toDTO(asMatchRow(after));
        broadcastMatchRequestDto(id, dAfter);
        return { ok: true, data: dAfter };
      }
      if (ag.status !== "PENDING") {
        return { ok: false, code: "NOT_PENDING" };
      }
      return { ok: false, code: "NOT_DISCONNECTED" };
    }
    return { ok: false, code: "RECONNECT_EXPIRED" };
  }

  const cleared = await prisma.matchRequest.updateMany({
    where: {
      id,
      userId,
      status: "PENDING",
      disconnectedAt: { not: null },
      OR: [
        { reconnectDeadlineAt: null },
        { reconnectDeadlineAt: { gt: now } },
      ],
    } as unknown as MRWhere,
    data: {
      disconnectedAt: null,
      reconnectDeadlineAt: null,
    } as MRUpdateManyData,
  });

  if (cleared.count === 0) {
    const again = await prisma.matchRequest.findFirst({
      where: { id, userId } as MRWhere,
    });
    if (!again) {
      return { ok: false, code: "NOT_FOUND" };
    }
    const ag2 = asMatchRow(again);
    if (ag2.disconnectedAt === null && ag2.status === "PENDING") {
      await tryMatchQueueAndPublish();
      const after = await prisma.matchRequest.findFirst({
        where: { id, userId } as MRWhere,
      });
      if (!after) {
        return { ok: false, code: "NOT_FOUND" };
      }
      const dAfter2 = toDTO(asMatchRow(after));
      broadcastMatchRequestDto(id, dAfter2);
      return { ok: true, data: dAfter2 };
    }
    if (ag2.status !== "PENDING") {
      return { ok: false, code: "NOT_PENDING" };
    }
    return { ok: false, code: "NOT_DISCONNECTED" };
  }

  await tryMatchQueueAndPublish();

  const refreshed = await prisma.matchRequest.findFirst({
    where: { id, userId } as MRWhere,
  });
  if (!refreshed) {
    return { ok: false, code: "NOT_FOUND" };
  }
  const dRecon = toDTO(asMatchRow(refreshed));
  broadcastMatchRequestDto(id, dRecon);
  return { ok: true, data: dRecon };
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
  await tryMatchQueueAndPublish();

  const existing = await prisma.matchRequest.findFirst({
    where: { id, userId } as MRWhere,
  });

  if (!existing) {
    return { ok: false, code: "NOT_FOUND" };
  }
  const ex = asMatchRow(existing);
  if (ex.status === "TIMED_OUT") {
    return { ok: false, code: "TIMED_OUT" };
  }
  if (ex.status === "RECONNECT_EXPIRED") {
    return { ok: false, code: "RECONNECT_EXPIRED" };
  }
  if (ex.status !== "PENDING") {
    return { ok: false, code: "NOT_PENDING" };
  }

  const cancelled = await prisma.matchRequest.updateMany({
    where: { id, userId, status: "PENDING" } as MRWhere,
    data: {
      status: "CANCELLED",
      disconnectedAt: null,
      reconnectDeadlineAt: null,
    } as MRUpdateManyData,
  });

  if (cancelled.count === 0) {
    const again = await prisma.matchRequest.findFirst({
      where: { id, userId } as MRWhere,
    });
    if (!again) {
      return { ok: false, code: "NOT_FOUND" };
    }
    const ag = asMatchRow(again);
    if (ag.status === "TIMED_OUT") {
      return { ok: false, code: "TIMED_OUT" };
    }
    if (ag.status === "RECONNECT_EXPIRED") {
      return { ok: false, code: "RECONNECT_EXPIRED" };
    }
    if (ag.status !== "PENDING") {
      return { ok: false, code: "NOT_PENDING" };
    }
    return { ok: false, code: "NOT_PENDING" };
  }

  const updated = await prisma.matchRequest.findFirst({
    where: { id, userId } as MRWhere,
  });
  if (!updated) {
    return { ok: false, code: "NOT_FOUND" };
  }
  await publishMatchRequestCancelled(id, userId);
  await tryMatchQueueAndPublish();
  const cancelledDto = toDTO(asMatchRow(updated));
  broadcastMatchRequestDto(id, cancelledDto);
  return { ok: true, data: cancelledDto };
}
