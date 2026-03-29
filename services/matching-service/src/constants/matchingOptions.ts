/**
 * Allowed values for match requests. Keep in sync with frontend selects where applicable.
 */
export const MATCH_TOPICS = [
  "arrays",
  "two-pointers",
  "sliding-window",
  "stack",
  "binary-search",
  "linked-list",
  "trees",
  "graphs",
  "dp",
] as const;

export type MatchTopic = (typeof MATCH_TOPICS)[number];

export const MATCH_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type MatchDifficulty = (typeof MATCH_DIFFICULTIES)[number];

export const PROGRAMMING_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "go",
] as const;

export type ProgrammingLanguage = (typeof PROGRAMMING_LANGUAGES)[number];
