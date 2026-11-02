import { TOPICS, type ExploreTopic } from '../explore/content';
/** A proposal only: never writes or replaces Explore data, narration, IDs or favorites. */
export function legacyEnvelope(topic: ExploreTopic) {
  return { legacyId: topic.id, original: structuredClone(topic),
    proposedCategory: ({ oceans: 'ocean', world: 'guam', space: 'space', weather: 'weather', animals: 'animals' } as const)[topic.world],
    layers: { tell: topic.short, more: topic.deeper, deep: null },
    activityPrompt: topic.question, needsReview: true as const };
}
export const LEGACY_MIGRATION_PLAN = TOPICS.map(legacyEnvelope);
