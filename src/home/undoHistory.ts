import { roomIds, type RoomId } from "./catalogMore";
import type { Character, HomeStateV2, Instance, RoomState } from "./model";

/**
 * Saved undo (rule 57). Each step is the smallest patch that turns the state after one
 * committed action back into the state before it. Only the last 20 steps, and at most
 * HOME_UNDO_BYTES of them, are kept in the save. Navigation is never part of history.
 */
export const HOME_UNDO_STEPS = 20;
export const HOME_UNDO_BYTES = 6144;

type Put<T> = { index: number; value: T };
export type RoomPatch =
  | { room: RoomState }
  | {
      instances?: { remove: string[]; put: Put<Instance>[] };
      characters?: { remove: number[]; put: Put<Character>[] };
      theme?: RoomState["theme"];
    };
export type UndoStep = Partial<Record<RoomId, RoomPatch>>;
export type HomeUndo = { version: 1; steps: UndoStep[] };

/** Key order is not meaning: saves written by different code paths order keys differently. */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (!v || typeof v !== "object") return v;
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]));
}
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

function listPatch<T>(before: readonly T[], after: readonly T[], key: (v: T) => string | number) {
  const afterKeys = new Map(after.map((v) => [key(v), v]));
  const beforeKeys = new Set(before.map(key));
  const put: Put<T>[] = [];
  before.forEach((value, index) => {
    const now = afterKeys.get(key(value));
    if (now === undefined || !same(now, value)) put.push({ index, value });
  });
  const remove = after.filter((v) => !beforeKeys.has(key(v))).map(key);
  return { remove, put };
}
function applyList<T>(after: readonly T[], patch: { remove: (string | number)[]; put: Put<T>[] }, key: (v: T) => string | number): T[] {
  const changed = new Set<string | number>([...patch.remove, ...patch.put.map((p) => key(p.value))]);
  const result = after.filter((v) => !changed.has(key(v)));
  for (const { index, value } of [...patch.put].sort((a, b) => a.index - b.index)) result.splice(index, 0, value);
  return result;
}
export function applyRoomPatch(after: RoomState, patch: RoomPatch): RoomState {
  if ("room" in patch) return patch.room;
  return {
    ...after,
    instances: patch.instances ? applyList(after.instances, patch.instances, (i) => i.id) : after.instances,
    characters: patch.characters ? applyList(after.characters, patch.characters, (c) => c.slot) : after.characters,
    theme: patch.theme ?? after.theme,
  };
}
/** Exact by construction: a patch that cannot reproduce `before` falls back to the whole room. */
export function roomPatch(before: RoomState, after: RoomState): RoomPatch | undefined {
  if (same(before, after)) return undefined;
  const patch: RoomPatch = {};
  if (!same(before.instances, after.instances)) patch.instances = listPatch(before.instances, after.instances, (i) => i.id) as { remove: string[]; put: Put<Instance>[] };
  if (!same(before.characters, after.characters)) patch.characters = listPatch(before.characters, after.characters, (c) => c.slot) as { remove: number[]; put: Put<Character>[] };
  if (!same(before.theme, after.theme)) patch.theme = before.theme;
  return same(applyRoomPatch(after, patch), before) ? patch : { room: before };
}
/** The patch that turns `after` back into `before`. `current` is navigation, not history. */
export function undoStep(before: HomeStateV2, after: HomeStateV2): UndoStep {
  const step: UndoStep = {};
  for (const id of roomIds) {
    const patch = roomPatch(before.rooms[id], after.rooms[id]);
    if (patch) step[id] = patch;
  }
  return step;
}
export function applyUndoStep(after: HomeStateV2, step: UndoStep): HomeStateV2 {
  const rooms = { ...after.rooms };
  for (const id of roomIds) if (step[id]) rooms[id] = applyRoomPatch(after.rooms[id], step[id]!);
  return { version: after.version, current: after.current, rooms };
}
export const undoBytes = (undo: HomeUndo) => JSON.stringify(undo).length;
/** Newest steps win. Drops the oldest until the step count and byte bound both hold. */
export function boundedUndo(steps: readonly UndoStep[]): HomeUndo | undefined {
  let kept = steps.slice(-HOME_UNDO_STEPS);
  while (kept.length && undoBytes({ version: 1, steps: kept }) > HOME_UNDO_BYTES) kept = kept.slice(1);
  return kept.length ? { version: 1, steps: kept } : undefined;
}
/** Past states, oldest first, rebuilt from the present. Never mutates either input. */
export function undoPast(present: HomeStateV2, undo: HomeUndo): HomeStateV2[] {
  const past: HomeStateV2[] = [];
  let cursor = present;
  for (let i = undo.steps.length - 1; i >= 0; i--) {
    cursor = applyUndoStep(cursor, undo.steps[i]);
    past.unshift(cursor);
  }
  return past;
}
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keysWithin = (v: Record<string, unknown>, keys: readonly string[]) => Object.keys(v).every((k) => keys.includes(k));
function validPuts(puts: unknown, max: number): boolean {
  return Array.isArray(puts) && puts.length <= max && puts.every((p) => plain(p) && Object.keys(p).length === 2 &&
    Number.isSafeInteger(p.index) && (p.index as number) >= 0 && (p.index as number) < max && plain(p.value));
}
/** Structure only; the save validator also checks every rebuilt state with `validHome`. */
export function validUndoShape(v: unknown): v is HomeUndo {
  if (!plain(v) || Object.keys(v).length !== 2 || v.version !== 1 || !Array.isArray(v.steps)) return false;
  if (!v.steps.length || v.steps.length > HOME_UNDO_STEPS || JSON.stringify(v).length > HOME_UNDO_BYTES) return false;
  return v.steps.every((step) => plain(step) && Object.keys(step).length > 0 && keysWithin(step, roomIds) &&
    Object.values(step).every((patch) => {
      if (!plain(patch)) return false;
      if ("room" in patch) return Object.keys(patch).length === 1 && plain(patch.room);
      if (!Object.keys(patch).length || !keysWithin(patch, ["instances", "characters", "theme"])) return false;
      const { instances, characters, theme } = patch as Record<string, unknown>;
      return (instances === undefined || (plain(instances) && Object.keys(instances).length === 2 &&
          Array.isArray(instances.remove) && instances.remove.length <= 256 && instances.remove.every((id) => typeof id === "string") &&
          validPuts(instances.put, 256))) &&
        (characters === undefined || (plain(characters) && Object.keys(characters).length === 2 &&
          Array.isArray(characters.remove) && characters.remove.length <= 3 && characters.remove.every((s) => s === 0 || s === 1 || s === 2) &&
          validPuts(characters.put, 3))) &&
        (theme === undefined || plain(theme));
    }));
}
