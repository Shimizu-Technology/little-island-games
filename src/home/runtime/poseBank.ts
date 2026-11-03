import type { CharacterAction, CharacterBase, Facing, SceneEntity } from "../scene/types";
export const restingBases: readonly CharacterBase[] = ["stand", "sit", "lie", "bathe"];
export const restingFacings: readonly Facing[] = ["front", "left"];
/** front/right share the canonical right-facing drawing. */
export function poseToken(base: CharacterBase, facing: Facing, action: CharacterAction): string {
  "worklet";
  return `${base}:${facing === "left" ? "left" : "front"}:${action ?? "none"}`;
}
export function poseVariants(source: SceneEntity): SceneEntity[] {
  return restingBases.flatMap((base) => restingFacings.map((facing) => ({ ...source, base, facing })));
}
