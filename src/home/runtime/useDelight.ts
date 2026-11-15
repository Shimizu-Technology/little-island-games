import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RoomId } from "../catalogMore";
import { capabilityOf } from "../world";
import { anchorsFor } from "../scene/species";
import type { DropProposal } from "../scene/resolve";
import type { Face, Scene, SceneEntity } from "../scene/types";
import type { StagePiece } from "../art/Stage";
import { attaches, burps, COOK_MS, cookingIds, greeters, landingSound, materialOf } from "./delight";
import { effectLength, type Effect, type EffectKind } from "./Effects";
import { pieceSound, type Poke } from "./SetPieces";
import { useHomeFeedback } from "./homeSound";
import type { CueKind } from "./delight";

const tubs = new Set(["bathtub", "bubble-bath"]);
/** Where to put an effect on a friend: the mouth or the top of the head, in room units. */
function friendPoint(entity: SceneEntity, at: "mouth" | "head") {
  const a = anchorsFor(entity.character!.slot, entity.base, entity.facing, entity.action);
  const p = at === "mouth" ? a.mouth : a.head;
  return { x: entity.contact.x + p.x, y: entity.contact.y + p.y - (at === "head" ? 18 : 0) };
}
export const AFTER_EAT_MS = 760;
export const GREET_MOOD_MS = 900;

/**
 * H4: every delight on Island Home in one place. The screen calls it at its existing moments
 * (pickup, commit, eating, tap); it answers with sound, a light haptic, a short expression, a
 * resting cue on the UI thread, or a small effect. Cooking (HD-07) is the only one that
 * changes the world, through the reducer's `cook` step.
 */
export function useDelight({ soundOn, reduced, cue, getScene, cook }: {
  soundOn: boolean;
  reduced: boolean;
  cue: (id: string, kind: CueKind, dir?: number) => void;
  getScene: () => Scene;
  cook: (id: string, room: RoomId) => void;
}) {
  const feedback = useHomeFeedback(soundOn);
  // The screen passes fresh closures each render; reading them through a ref keeps every
  // callback below stable, so memoized screen callbacks and effects don't churn.
  const outside = useRef({ cue, getScene, cook });
  useLayoutEffect(() => { outside.current = { cue, getScene, cook }; });
  const cueOn = useCallback((id: string, kind: CueKind, dir?: number) => outside.current.cue(id, kind, dir), []);
  const sceneNow = useCallback(() => outside.current.getScene(), []);
  const cookNow = useCallback((id: string, room: RoomId) => outside.current.cook(id, room), []);
  const [moods, setMoods] = useState<Record<string, Face>>({});
  const [effects, setEffects] = useState<Effect[]>([]);
  const [poke, setPoke] = useState<Poke>();
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const later = useCallback((ms: number, run: () => void) => {
    const timer = setTimeout(() => { timers.current.delete(timer); run(); }, ms);
    timers.current.add(timer);
  }, []);
  useEffect(() => () => { for (const timer of timers.current) clearTimeout(timer); }, []);
  const serial = useRef(0);
  const effect = useCallback((kind: EffectKind, room: RoomId, x: number, y: number) => {
    const key = `${kind}-${++serial.current}`;
    setEffects((current) => [...current.slice(-11), { key, kind, room, x, y }]);
    later(effectLength[kind] + 80, () => setEffects((current) => current.filter((e) => e.key !== key)));
  }, [later]);
  const moodTokens = useRef<Record<string, number>>({});
  const mood = useCallback((id: string, face: Face, ms: number) => {
    const token = ++serial.current;
    moodTokens.current[id] = token;
    setMoods((current) => ({ ...current, [id]: face }));
    later(ms, () => {
      if (moodTokens.current[id] !== token) return;
      setMoods((current) => { const next = { ...current }; delete next[id]; return next; });
    });
  }, [later]);
  const meals = useRef<Record<string, number>>({});

  const pickedUp = useCallback((subject?: SceneEntity) => {
    feedback.haptic("pickup");
    feedback.play(subject?.character ? "lift" : "pick");
  }, [feedback]);

  const landed = useCallback((proposal: DropProposal, subject: SceneEntity | undefined, before: Scene, after: Scene, landedId?: string) => {
    // A catalog piece has no scene entity yet; its instance says what it is made of.
    const made = subject ?? (proposal.item ? ({ item: proposal.item } as SceneEntity) : undefined);
    const sound = landingSound(made, proposal, before);
    if (sound) feedback.play(sound);
    if (attaches(proposal)) feedback.haptic("attach");
    if (proposal.kind === "socket" && proposal.base === "bathe") {
      effect("bubbles", proposal.room, proposal.contact.x, proposal.contact.y - 10);
      effect("splash", proposal.room, proposal.contact.x, proposal.contact.y);
    }
    if (proposal.attachment.kind === "surface") {
      const parent = before.entities[proposal.attachment.parent]?.item;
      if (parent?.item === "sink-counter" && parent.powered) effect("splash", proposal.room, proposal.contact.x, proposal.contact.y);
    }
    // HD-06: friends close by turn to greet a friend set down beside them, and both smile.
    const friend = landedId ? after.entities[landedId] : undefined;
    if (friend?.character && proposal.kind !== "staging") {
      const near = greeters(after, friend);
      for (const g of near) { cueOn(g.id, "greet", g.dir); mood(g.id, "happy", GREET_MOOD_MS); }
      if (near.length) mood(friend.id, "happy", GREET_MOOD_MS);
    }
  }, [cueOn, effect, feedback, mood]);

  /** HD-05: a bite or a sip, crumbs, then a happy wiggle; now and then a small burp. */
  const ate = useCallback((owner: SceneEntity, consume: "eat" | "drink") => {
    feedback.play(consume === "eat" ? "munch" : "bubbles");
    const mouth = friendPoint(owner, "mouth");
    if (consume === "eat") later(180, () => effect("crumbs", owner.room, mouth.x, mouth.y));
    const meal = (meals.current[owner.id] ?? 0) + 1;
    meals.current[owner.id] = meal;
    later(AFTER_EAT_MS, () => {
      const latest = sceneNow().entities[owner.id];
      if (!latest?.character) return;
      if (consume === "eat" && burps(meal)) {
        mood(owner.id, "surprised", 260);
        cueOn(owner.id, "burp");
        later(200, () => {
          const point = friendPoint(latest, "mouth");
          effect("burp", latest.room, point.x, point.y);
          feedback.play("burp");
          mood(owner.id, "happy", 700);
        });
      } else {
        mood(owner.id, "happy", 800);
        cueOn(owner.id, "happy");
      }
    });
  }, [cueOn, effect, feedback, sceneNow, later, mood]);

  /** A touch on something in the room. Toggles have already been dispatched by the screen. */
  const tapped = useCallback((entity: SceneEntity, sleeping: Record<string, boolean>) => {
    // A bed, seat or tub with a friend in it: the touch is for the friend, who is mostly under
    // the blanket. The furniture never tilts out from under them.
    const occupant = entity.item ? entity.children.map((id) => sceneNow().entities[id]).find((e) => e?.character) : undefined;
    if (occupant) entity = occupant;
    if (entity.character) {
      if (sleeping[entity.id]) {
        // HD-09: a sleeping friend stirs and settles back to sleep.
        cueOn(entity.id, "stir");
        const head = friendPoint(entity, "head");
        effect("zzz", entity.room, head.x, head.y);
        feedback.play("rustle");
      } else {
        // Rule 42: a short greeting. It never changes where the friend is.
        cueOn(entity.id, "hop");
        mood(entity.id, "happy", 500);
        feedback.play("lift");
      }
      return;
    }
    const item = entity.item!;
    const toggle = capabilityOf(item.item).toggle;
    if (toggle) {
      // Read after the toggle: `item` is the state the child just changed from.
      const on = !(item.powered ?? item.state === "active");
      if (item.item === "stove") feedback.play("knob");
      else if (toggle === "water") {
        feedback.play(on ? "splash" : "pick");
        if (on) effect("splash", entity.room, entity.contact.x + 8, entity.contact.y - 108);
      } else feedback.play(toggle === "open" ? "wood" : "pick");
      return;
    }
    if (tubs.has(item.item)) {
      effect("bubbles", entity.room, entity.contact.x, entity.contact.y - 96);
      feedback.play("bubbles");
      return;
    }
    // HC-01: nothing that looks touchable stays silent. A small wiggle and its own sound; a
    // table or shelf holding things answers with the sound alone, so nothing slides off it.
    if (!entity.children.length) cueOn(entity.id, "tap");
    feedback.play(materialOf(item.item));
  }, [cueOn, effect, feedback, mood, sceneNow]);

  const touchedPiece = useCallback((room: RoomId, piece: StagePiece) => {
    setPoke((current) => ({ id: piece.id, serial: (current?.serial ?? 0) + 1 }));
    feedback.play(pieceSound[piece.kind]);
    if (piece.kind === "sink") later(120, () => effect("splash", room, piece.pivot.x, piece.pivot.y + 32));
  }, [effect, feedback, later]);

  /** HD-07 (rule 49): raw food in the pan of a lit stove cooks after COOK_MS. Taking it off,
   * or turning the stove off first, stops it; nothing cooks twice. */
  const cooking = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const watchCooking = useCallback((scene: Scene) => {
    const ids = cookingIds(scene);
    for (const id of Object.keys(cooking.current)) {
      if (ids.includes(id)) continue;
      clearTimeout(cooking.current[id]);
      delete cooking.current[id];
      if (!Object.keys(cooking.current).length) feedback.stop("sizzle");
    }
    for (const id of ids) {
      if (cooking.current[id]) continue;
      const food = scene.entities[id];
      effect("steam", food.room, food.contact.x, food.contact.y - 20);
      feedback.play("sizzle");
      cooking.current[id] = setTimeout(() => {
        delete cooking.current[id];
        const latest = sceneNow().entities[id];
        if (!latest?.item) return;
        cookNow(latest.item.id, latest.room);
        effect("steam", latest.room, latest.contact.x, latest.contact.y - 24);
        cueOn(id, "hop");
      }, COOK_MS);
    }
  }, [cookNow, cueOn, effect, feedback, sceneNow]);
  useEffect(() => () => { for (const timer of Object.values(cooking.current)) clearTimeout(timer); }, []);

  return { moods, effects, poke, pickedUp, landed, ate, tapped, touchedPiece, watchCooking, reduced };
}
