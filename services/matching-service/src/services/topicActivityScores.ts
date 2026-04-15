import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import { MATCH_TOPICS } from "../constants/matchingOptions.js";
import { topicScoreFromComponents } from "./topicScoreFormula.js";

type MRWhere = Prisma.MatchRequestWhereInput;

export { topicScoreFromComponents } from "./topicScoreFormula.js";

/**
 * - Seekers: rows created in the last 15m for that topic (aggregate intent, not live pool).
 * - Matches / timeouts: rows that transitioned to that status in the last 30m for that topic.
 */

let cache: { at: number; scores: Record<string, number> } | null = null;
const CACHE_MS = 60_000;

export async function getTopicActivityScoresCached(): Promise<
  Record<string, number>
> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return cache.scores;
  }
  const t15 = new Date(now - 15 * 60 * 1000);
  const t30 = new Date(now - 30 * 60 * 1000);

  const scores: Record<string, number> = {};
  for (const topic of MATCH_TOPICS) {
    const [seekers15, matches30, timeouts30] = await Promise.all([
      prisma.matchRequest.count({
        where: {
          topic,
          createdAt: { gte: t15 },
        } as MRWhere,
      }),
      prisma.matchRequest.count({
        where: {
          topic,
          status: "MATCHED",
          updatedAt: { gte: t30 },
        } as MRWhere,
      }),
      prisma.matchRequest.count({
        where: {
          topic,
          status: "TIMED_OUT",
          updatedAt: { gte: t30 },
        } as MRWhere,
      }),
    ]);
    scores[topic] = topicScoreFromComponents(seekers15, matches30, timeouts30);
  }

  cache = { at: now, scores };
  return scores;
}
