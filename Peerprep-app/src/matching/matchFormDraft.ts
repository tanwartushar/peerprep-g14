/**
 * Persist “Configure Session” choices in localStorage so they survive
 * navigating to Matching, cancel/back, refresh, etc.
 */
const STORAGE_KEY = "peerprep_match_form_draft_v1";

const TOPICS = new Set([
  "arrays",
  "two-pointers",
  "sliding-window",
  "stack",
  "binary-search",
  "linked-list",
  "trees",
  "graphs",
  "dp",
]);

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

const LANGUAGES = new Set([
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "go",
]);

/** "" | "30" | "45" | "60" */
const TIME_AVAILABLE = new Set(["", "30", "45", "60"]);

export type MatchFormDraft = {
  topic: string;
  difficulty: string;
  programmingLanguage: string;
  allowLowerDifficultyMatch: boolean;
  timeAvailable: string;
};

function pickTopic(v: unknown): string {
  return typeof v === "string" && TOPICS.has(v) ? v : "";
}

function pickDifficulty(v: unknown): string {
  return typeof v === "string" && DIFFICULTIES.has(v) ? v : "";
}

function pickLanguage(v: unknown): string {
  return typeof v === "string" && LANGUAGES.has(v) ? v : "";
}

function pickTimeAvailable(v: unknown): string {
  return typeof v === "string" && TIME_AVAILABLE.has(v) ? v : "";
}

function pickBool(v: unknown): boolean {
  return typeof v === "boolean" ? v : false;
}

export function loadMatchFormDraft(): MatchFormDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      topic: pickTopic(parsed["topic"]),
      difficulty: pickDifficulty(parsed["difficulty"]),
      programmingLanguage: pickLanguage(parsed["programmingLanguage"]),
      allowLowerDifficultyMatch: pickBool(
        parsed["allowLowerDifficultyMatch"],
      ),
      timeAvailable: pickTimeAvailable(parsed["timeAvailable"]),
    };
  } catch {
    return null;
  }
}

export function saveMatchFormDraft(draft: MatchFormDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}
