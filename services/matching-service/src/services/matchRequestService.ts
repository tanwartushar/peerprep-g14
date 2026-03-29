import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import type { CreateMatchRequestInput } from "../validation/matchRequestValidation.js";

export type MatchRequestDTO = {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  status: "PENDING" | "MATCHED" | "CANCELLED";
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
  createdAt: Date;
  updatedAt: Date;
}): MatchRequestDTO {
  return {
    id: row.id,
    userId: row.userId,
    topic: row.topic,
    difficulty: row.difficulty,
    programmingLanguage: row.programmingLanguage,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
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
    return { ok: true, data: toDTO(created) };
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
