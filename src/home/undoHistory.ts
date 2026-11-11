import { itemSpec } from "./catalog";
import { roomIds, type RoomId } from "./catalogMore";
import type { Character, HomeStateV2, Instance, RoomState } from "./model";

/**
 * Saved undo (rule 57). Each step is the smallest patch that turns the state after one
 * committed action back into the state before it. Only the last 20 steps, and at most
 * HOME_UNDO_BYTES of them, are kept in the save; the oldest go first. Navigation is never
 * part of history.
 *
 * HOME_UNDO_BYTES is 20 KB (it was 6 KB) so a restored room's things fit: restoring a room
 * with 48 basket shells takes about 4.3 KB in the compact form below. Five learners at the
 * cap still fit the measured whole-save headroom (docs/evidence/f1-save/SIZE.json).
 * A removal must stay recoverable for its whole 20 steps, so `undoAdmits` refuses an edit
 * that could ever push a removal out. Every later step has HOME_UNDO_RESERVE bytes kept for it.
 */
export const HOME_UNDO_STEPS = 20;
export const HOME_UNDO_BYTES = 20_480;
export const HOME_UNDO_RESERVE = 512;

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
/** Saved puts leave out fields an instance has by default, so a restored room's things stay small. */
function lean(v: Instance): Instance {
  const { rotation, mirrored, layer, state, ...rest } = v;
  return {
    ...rest,
    ...(rotation === 0 ? {} : { rotation }),
    ...(mirrored === false ? {} : { mirrored }),
    ...(typeof v.item === "string" && layer === itemSpec(v.item)?.layer ? {} : { layer }),
    ...(state === "rest" ? {} : { state }),
  } as Instance;
}
/** The inverse of `lean`. Never throws on saved input; the room validator judges the result. */
function full(v: Instance): Instance {
  const value = v as Partial<Instance> & Record<string, unknown>;
  const layer = value.layer ?? (typeof value.item === "string" ? itemSpec(value.item)?.layer : undefined);
  return {
    id: value.id,
    item: value.item,
    x: value.x,
    y: value.y,
    rotation: value.rotation ?? 0,
    mirrored: value.mirrored ?? false,
    ...(layer === undefined ? {} : { layer }),
    state: value.state ?? "rest",
    ...value,
  } as Instance;
}
export function applyRoomPatch(after: RoomState, patch: RoomPatch): RoomState {
  if ("room" in patch) return patch.room;
  const instances = patch.instances && { ...patch.instances, put: patch.instances.put.map((p) => ({ index: p.index, value: full(p.value) })) };
  return {
    ...after,
    instances: instances ? applyList(after.instances, instances, (i) => i.id) : after.instances,
    characters: patch.characters ? applyList(after.characters, patch.characters, (c) => c.slot) : after.characters,
    theme: patch.theme ?? after.theme,
  };
}
/** Exact by construction: a patch that cannot reproduce `before` falls back to the whole room. */
export function roomPatch(before: RoomState, after: RoomState): RoomPatch | undefined {
  if (same(before, after)) return undefined;
  const patch: RoomPatch = {};
  if (!same(before.instances, after.instances)) {
    const list = listPatch(before.instances, after.instances, (i) => i.id) as { remove: string[]; put: Put<Instance>[] };
    patch.instances = { remove: list.remove, put: list.put.map((p) => ({ index: p.index, value: lean(p.value) })) };
  }
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
/** One saved step, its size inside the saved list, and whether undoing it brings back removed things. */
export type UndoEntry = { step: UndoStep; bytes: number; removal: boolean };
/** Removed things: ids the step puts back that are nowhere in the home after the action. */
export function undoEntry(step: UndoStep, after: HomeStateV2): UndoEntry {
  const present = new Set(roomIds.flatMap((id) => after.rooms[id].instances.map((i) => i.id)));
  const restored = Object.values(step).flatMap((patch) =>
    "room" in patch! ? patch.room.instances.map((i) => i.id) : (patch!.instances?.put ?? []).map((p) => p.value.id)
  );
  return { step, bytes: JSON.stringify(step).length, removal: restored.some((id) => !present.has(id)) };
}
const listBytes = (entries: readonly UndoEntry[]) =>
  undoBytes({ version: 1, steps: [] }) + entries.reduce((n, e) => n + e.bytes, 0) + Math.max(0, entries.length - 1);
/** Newest steps win. Drops the oldest until the step count and byte bound both hold. */
export function boundedUndo(entries: readonly UndoEntry[]): HomeUndo | undefined {
  let kept = entries.slice(-HOME_UNDO_STEPS);
  while (kept.length && listBytes(kept) > HOME_UNDO_BYTES) kept = kept.slice(1);
  return kept.length ? { version: 1, steps: kept.map((e) => e.step) } : undefined;
}
/**
 * R1: whether saving these steps keeps every promise. The newest step must fit. Every removal
 * still among the last 20 steps must survive until it ages out: it, everything newer, and
 * HOME_UNDO_RESERVE for each step still to come before it leaves the window all fit the budget.
 * Ordinary edits up to the reserve are therefore never refused because of an earlier removal.
 */
export function undoAdmits(entries: readonly UndoEntry[]): boolean {
  const window = entries.slice(-HOME_UNDO_STEPS);
  if (!window.length) return true;
  const oldestRemoval = window.findIndex((e) => e.removal);
  if (oldestRemoval < 0) return listBytes(window.slice(-1)) <= HOME_UNDO_BYTES;
  const kept = window.slice(oldestRemoval);
  const toCome = HOME_UNDO_STEPS - kept.length;
  return listBytes(kept) + toCome * (HOME_UNDO_RESERVE + 1) <= HOME_UNDO_BYTES;
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
