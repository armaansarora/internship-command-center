export const ARTLAB_PRIORITIES = ["human-flagged", "scheduled", "default"] as const;
export type ArtLabPriority = (typeof ARTLAB_PRIORITIES)[number];

export function priorityRank(priority: ArtLabPriority): number {
  return ARTLAB_PRIORITIES.indexOf(priority);
}
