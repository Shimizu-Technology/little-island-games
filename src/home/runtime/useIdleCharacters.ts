import { useMemo } from "react";
import type { Scene } from "../scene/types";
import { groupIds } from "./group";
import { isRestingSleeper } from "./expressions";
import type { Pickup } from "./useInteraction";

// Capture owns waking; there is no timer or second sleep-state publication.
export function useIdleCharacters(scene: Scene, pickups: (Pickup | undefined)[]) {
  const sleeping = useMemo(() => {
    const active = new Set(pickups.flatMap(p => p ? groupIds(p.scene, p.id) : []));
    return Object.fromEntries(Object.values(scene.entities).filter(e => e.character)
      .map(e => [e.id, isRestingSleeper(e) && !active.has(e.id)]));
  }, [scene, pickups]);
  return { sleeping };
}
