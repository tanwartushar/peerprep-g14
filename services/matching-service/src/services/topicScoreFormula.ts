/**
 * topicScore =
 *   0.5 * activeSeekersLast15Min +
 *   0.4 * matchesLast30Min -
 *   0.1 * timeoutsLast30Min
 */
export function topicScoreFromComponents(
  seekers15: number,
  matches30: number,
  timeouts30: number,
): number {
  return 0.5 * seekers15 + 0.4 * matches30 - 0.1 * timeouts30;
}
