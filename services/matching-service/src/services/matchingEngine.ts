/**
 * F4 / F6 / F5 queue matching: hard constraints (topic, programmingLanguage),
 * longest-waiting requester first within each (topic, language) group,
 * same difficulty before optional downward (F5), optional time preference (F2) as ranking only,
 * deterministic tie-breaks.
 *
 * Difficulty order: hard > medium > easy (F5.1).
 */

export type MatchRequestRow = {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  allowLowerDifficultyMatch: boolean;
  /** F2 — null if not specified; never a hard filter */
  timeAvailableMinutes: number | null;
  createdAt: Date;
};

export type MatchingTypeApi = "same_difficulty" | "downward";

export type MatchPairResult = {
  requester: MatchRequestRow;
  partner: MatchRequestRow;
  matchingType: MatchingTypeApi;
};

function topicLanguageKey(r: MatchRequestRow): string {
  return `${r.topic}\0${r.programmingLanguage}`;
}

/** Deterministic ordering for tie-breaking (F6.3): createdAt, userId, id. */
export function compareMatchRequests(
  a: MatchRequestRow,
  b: MatchRequestRow,
): number {
  const t = a.createdAt.getTime() - b.createdAt.getTime();
  if (t !== 0) return t;
  const u = a.userId.localeCompare(b.userId);
  if (u !== 0) return u;
  return a.id.localeCompare(b.id);
}

/**
 * F2.5: among eligible partners, prefer exact time match when both specified the same value.
 * Returns 1 if preferred, 0 otherwise — used for descending sort.
 */
function timePreferenceRank(
  requester: MatchRequestRow,
  candidate: MatchRequestRow,
): number {
  const rt = requester.timeAvailableMinutes;
  const ct = candidate.timeAvailableMinutes;
  if (rt != null && ct != null && rt === ct) return 1;
  return 0;
}

/** Sort eligible partners: time preference first (F2), then deterministic tie-break. */
function sortPartnersForRequester(
  requester: MatchRequestRow,
  partners: MatchRequestRow[],
): MatchRequestRow[] {
  return [...partners].sort((a, b) => {
    const pa = timePreferenceRank(requester, a);
    const pb = timePreferenceRank(requester, b);
    if (pa !== pb) return pb - pa;
    return compareMatchRequests(a, b);
  });
}

/** F5.1: Hard > Medium > Easy */
const DIFFICULTY_RANK: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

function difficultyRank(d: string): number {
  return DIFFICULTY_RANK[d] ?? 0;
}

/** True iff partner’s requested difficulty is strictly lower than requester’s (F5.4.2). */
export function isStrictlyLowerDifficulty(
  partnerDifficulty: string,
  requesterDifficulty: string,
): boolean {
  return difficultyRank(partnerDifficulty) < difficultyRank(requesterDifficulty);
}

/**
 * Finds the first pair to match: within each (topic, programmingLanguage) group,
 * try each requester in longest-waiting order; same-difficulty partners first (F5.3),
 * then downward only if requester.allowLowerDifficultyMatch (F5.4.1), never upward (F5.5).
 * F2 time preference ranks eligible partners only; never excludes candidates.
 */
export function findFirstPair(
  pending: MatchRequestRow[],
): MatchPairResult | null {
  if (pending.length < 2) return null;

  const byGroup = new Map<string, MatchRequestRow[]>();
  for (const r of pending) {
    const k = topicLanguageKey(r);
    let list = byGroup.get(k);
    if (!list) {
      list = [];
      byGroup.set(k, list);
    }
    list.push(r);
  }

  const groupKeys = [...byGroup.keys()].sort((a, b) => a.localeCompare(b));

  for (const k of groupKeys) {
    const group = byGroup.get(k)!;
    group.sort(compareMatchRequests);

    for (const requester of group) {
      const others = group.filter((p) => p.userId !== requester.userId);

      const sameDifficulty = others.filter(
        (p) => p.difficulty === requester.difficulty,
      );
      const sortedSame = sortPartnersForRequester(requester, sameDifficulty);
      const bestSame = sortedSame[0];
      if (bestSame !== undefined) {
        return {
          requester,
          partner: bestSame,
          matchingType: "same_difficulty",
        };
      }

      if (!requester.allowLowerDifficultyMatch) {
        continue;
      }

      const downward = others.filter((p) =>
        isStrictlyLowerDifficulty(p.difficulty, requester.difficulty),
      );
      const sortedDown = sortPartnersForRequester(requester, downward);
      const bestDown = sortedDown[0];
      if (bestDown !== undefined) {
        return {
          requester,
          partner: bestDown,
          matchingType: "downward",
        };
      }
    }
  }

  return null;
}
