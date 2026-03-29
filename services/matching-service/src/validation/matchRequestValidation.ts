import {
  MATCH_DIFFICULTIES,
  MATCH_TOPICS,
  PROGRAMMING_LANGUAGES,
  type MatchDifficulty,
  type MatchTopic,
  type ProgrammingLanguage,
} from "../constants/matchingOptions.js";

export type CreateMatchRequestInput = {
  topic: MatchTopic;
  difficulty: MatchDifficulty;
  programmingLanguage: ProgrammingLanguage;
};

export class MatchRequestValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join("; "));
    this.name = "MatchRequestValidationError";
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(
  body: Record<string, unknown>,
  key: string,
  missing: string[],
  wrongType: string[],
): string | undefined {
  const raw = body[key];
  if (raw === undefined || raw === null) {
    missing.push(`Missing required field: ${key}`);
    return undefined;
  }
  if (typeof raw !== "string") {
    wrongType.push(`Field ${key} must be a string`);
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    missing.push(`Missing required field: ${key}`);
    return undefined;
  }
  return trimmed;
}

function isMember<T extends string>(
  value: string,
  allowed: readonly T[],
): value is T {
  return (allowed as readonly string[]).includes(value);
}

/**
 * Validates POST /matching/requests JSON body (F1.1.x).
 */
export function parseCreateMatchRequestBody(
  body: unknown,
): CreateMatchRequestInput {
  if (!isRecord(body)) {
    throw new MatchRequestValidationError([
      "Request body must be a JSON object",
    ]);
  }

  const missing: string[] = [];
  const wrongType: string[] = [];
  const topicRaw = readStringField(body, "topic", missing, wrongType);
  const difficultyRaw = readStringField(body, "difficulty", missing, wrongType);
  const languageRaw = readStringField(
    body,
    "programmingLanguage",
    missing,
    wrongType,
  );

  if (wrongType.length > 0) {
    throw new MatchRequestValidationError(wrongType);
  }
  if (missing.length > 0) {
    throw new MatchRequestValidationError(missing);
  }

  const invalid: string[] = [];

  if (!topicRaw || !isMember(topicRaw, MATCH_TOPICS)) {
    invalid.push(
      `Invalid topic: must be exactly one of: ${MATCH_TOPICS.join(", ")}`,
    );
  }
  if (!difficultyRaw || !isMember(difficultyRaw, MATCH_DIFFICULTIES)) {
    invalid.push(
      `Invalid difficulty: must be exactly one of: ${MATCH_DIFFICULTIES.join(", ")}`,
    );
  }
  if (!languageRaw || !isMember(languageRaw, PROGRAMMING_LANGUAGES)) {
    invalid.push(
      `Invalid programmingLanguage: must be exactly one of: ${PROGRAMMING_LANGUAGES.join(", ")}`,
    );
  }

  if (invalid.length > 0) {
    throw new MatchRequestValidationError(invalid);
  }

  if (
    !topicRaw ||
    !difficultyRaw ||
    !languageRaw ||
    !isMember(topicRaw, MATCH_TOPICS) ||
    !isMember(difficultyRaw, MATCH_DIFFICULTIES) ||
    !isMember(languageRaw, PROGRAMMING_LANGUAGES)
  ) {
    throw new MatchRequestValidationError(["Invalid match request payload"]);
  }

  return {
    topic: topicRaw,
    difficulty: difficultyRaw,
    programmingLanguage: languageRaw,
  };
}
