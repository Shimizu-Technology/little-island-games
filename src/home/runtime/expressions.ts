import type { SceneEntity } from "../scene/types";
import type { HomeMood } from "./delight";

export const isRestingSleeper = (entity: SceneEntity) =>
  !!entity.character && entity.base === "lie" && entity.action !== "eat" && entity.action !== "drink";

/** Activity wins on the first paint, including pre-mounted landing art. Meals own
 * their bite/chew/sip frames; a greeting must never wake a tucked-in friend. */
export function activityFaceOf(entity: SceneEntity, sleeping = false, mood?: HomeMood, carry = false, meal = false): HomeMood | undefined {
  if (!entity.character) return mood;
  if (carry || entity.base === "carry") return mood && mood !== "sleepy" ? mood : "happy";
  if (meal || entity.action === "eat" || entity.action === "drink") return mood;
  if (sleeping || isRestingSleeper(entity)) return "sleepy";
  if (mood) return mood;
  // All current sit sockets are leisure/dining seats (world.ts); no toilet exists.
  if (entity.base === "bathe" || entity.base === "sit" || entity.character.holding) return "happy";
  return undefined;
}
