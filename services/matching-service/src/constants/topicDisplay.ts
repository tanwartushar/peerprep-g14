/** Human-readable labels for match topic ids (aligned with product copy). */
export const TOPIC_DISPLAY_LABELS: Record<string, string> = {
  arrays: "Arrays & Hashing",
  "two-pointers": "Two Pointers",
  "sliding-window": "Sliding Window",
  stack: "Stack",
  "binary-search": "Binary Search",
  "linked-list": "Linked List",
  trees: "Trees",
  graphs: "Graphs",
  dp: "Dynamic Programming",
};

export function topicDisplayLabel(topicId: string): string {
  return TOPIC_DISPLAY_LABELS[topicId] ?? topicId;
}
