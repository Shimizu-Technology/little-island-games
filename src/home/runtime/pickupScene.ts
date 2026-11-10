import type { Scene, SceneEntity } from '../scene/types';

export type PickupScene = Pick<Scene, "revision" | "entities">;

/** Rendering needs the source graph, not the resolver's large prepared sample caches.
 * Keep those caches on UI instead of serializing them back to JS on pickup. */
export function pickupScene(scene: Scene, subject: SceneEntity): PickupScene {
  'worklet';
  const entities = Object.fromEntries(Object.entries({ ...scene.entities, [subject.id]: subject })
    .map(([id, entity]) => [id, { ...entity, catalogSamples: undefined }]));
  return { revision: scene.revision, entities };
}
