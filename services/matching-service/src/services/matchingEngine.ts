/**
 * F4 / F6 queue matching: hard constraints (topic, programmingLanguage, difficulty),
 * longest-waiting requester first, deterministic partner tie-breaks.
 */

export type MatchRequestRow = {
  id: string;
  userId: string;
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  createdAt: Date;
};

function poolKey(r: MatchRequestRow): string {
  return `${r.topic}\0${r.programmingLanguage}\0${r.difficulty}`;
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
 * Finds the first pair to match under F6, or null if none.
 * Pools are (topic, programmingLanguage, difficulty); only same-pool rows can pair.
 */
export function findFirstPair(
  pending: MatchRequestRow[],
): [MatchRequestRow, MatchRequestRow] | null {
  if (pending.length < 2) return null;

  const byPool = new Map<string, MatchRequestRow[]>();
  for (const r of pending) {
    const k = poolKey(r);
    let list = byPool.get(k);
    if (!list) {
      list = [];
      byPool.set(k, list);
    }
    list.push(r);
  }

  const poolKeys = [...byPool.keys()].sort((a, b) => a.localeCompare(b));

  for (const k of poolKeys) {
    const group = byPool.get(k)!;
    group.sort(compareMatchRequests);

    for (let i = 0; i < group.length; i++) {
      const requester = group[i];
      if (requester === undefined) continue;
      const partners = group.filter((p) => p.userId !== requester.userId);
      partners.sort(compareMatchRequests);
      const best = partners[0];
      if (best !== undefined) {
        return [requester, best];
      }
    }
  }

  return null;
}
