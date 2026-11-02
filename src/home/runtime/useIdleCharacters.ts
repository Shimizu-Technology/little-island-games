import { useCallback, useEffect, useRef, useState } from "react";
import type { Scene } from "../scene/types";
import { groupIds } from "./group";
import type { Pickup } from "./useInteraction";

export const sleepDelay = 8000;
/** Sleep is a temporary face after eight still seconds in a lying base, never saved pose. */
export function useIdleCharacters(scene: Scene, pickups: (Pickup | undefined)[]) {
  const idle = useRef<Record<string, { key: string; since: number; active?: boolean }>>({});
  const [sleeping, setSleeping] = useState<Record<string, boolean>>({});
  const [wakeRevision, setWakeRevision] = useState(0);
  const wake = useCallback((id: string) => {
    const entry = idle.current[id];
    if (entry) idle.current[id] = { ...entry, since: Date.now() };
    setSleeping((current) => (current[id] ? { ...current, [id]: false } : current));
    setWakeRevision((n) => n + 1);
  }, []);
  useEffect(() => {
    const now = Date.now();
    const active = new Set(pickups.flatMap((p) => (p ? groupIds(p.scene, p.id) : [])));
    const next: Record<string, boolean> = {};
    let wait = Infinity;
    for (const entity of Object.values(scene.entities)) {
      if (!entity.character) continue;
      const key = `${entity.room}|${entity.base}|${entity.contact.x}|${entity.contact.y}|${entity.action}|${entity.character.holding ?? ""}`;
      const before = idle.current[entity.id];
      const entry = {
        key,
        since:
          !before || before.key !== key || active.has(entity.id) || before.active || entity.action ? now : before.since,
        active: active.has(entity.id),
      };
      idle.current[entity.id] = entry;
      const eligible = entity.base === "lie" && !active.has(entity.id) && !entity.action;
      next[entity.id] = eligible && now - entry.since >= sleepDelay;
      if (eligible && !next[entity.id]) wait = Math.min(wait, sleepDelay - (now - entry.since));
    }
    // Freeze unrelated idle faces during manipulation; no clock-driven React work while dragging.
    if (active.size) return;
    const publish = setTimeout(
      () =>
        setSleeping((current) =>
          Object.keys(next).length === Object.keys(current).length &&
          Object.keys(next).every((id) => next[id] === current[id])
            ? current
            : next
        ),
      0
    );
    const timer = Number.isFinite(wait)
      ? setTimeout(() => setWakeRevision((n) => n + 1), Math.max(1, wait))
      : undefined;
    return () => {
      clearTimeout(publish);
      if (timer) clearTimeout(timer);
    };
  }, [scene, pickups, wakeRevision]);
  return { sleeping, wake };
}
