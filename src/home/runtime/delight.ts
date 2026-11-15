import { capabilityOf } from "../world";
import { roomIds } from "../catalogMore";
import { roomOrigin, type Building } from "../camera";
import { anchorsFor } from "../scene/species";
import type { DropProposal } from "../scene/resolve";
import type { Scene, SceneEntity } from "../scene/types";
import type { HomeSound } from "./homeSound";

/**
 * H4 Island Home delight: the rules behind each small reaction, kept pure so they are tested
 * without a device. Nothing here is random, nothing is a reward, and nothing is saved except
 * cooking (HD-07), which uses the instance's existing `powered` field.
 */

// HD-02 / HD-03: what something is made of decides how it lands and how it sounds.
export type Material = "cloth" | "wood" | "shell" | "splash";
const clothItems = new Set(["floor-cushion", "beanbag", "teddy", "ball", "rug", "mat", "round-rug", "striped-rug", "star-rug",
  "beach-towel", "bed", "cloud-bed", "bunk-bed", "hammock", "sofa", "armchair", "lounger", "mango", "banana", "rice-ball",
  "cupcake", "juice", "plant", "potted-fern", "banana-plant", "cactus"]);
const shellItems = new Set(["shell", "shell-pile", "teapot", "flower-vase", "cake-stand", "fruit-bowl", "mirror", "globe",
  "trophies", "island-lamp", "lantern", "table-lamp", "lamp"]);
export function materialOf(itemId: string): Material {
  return clothItems.has(itemId) ? "cloth" : shellItems.has(itemId) ? "shell" : "wood";
}
/** How much a material gives on landing: soft things squash most, hard things least. */
export const materialGive: Record<Material, number> = { cloth: 1, wood: 0.55, shell: 0.4, splash: 0.7 };
export const FRIEND_GIVE = 0.6;
/** Where a drop lands decides the sound: a bath or a running sink splashes. */
export function landingMaterial(subject: SceneEntity | undefined, proposal: DropProposal, scene: Scene): Material {
  if (proposal.kind === "socket" && proposal.base === "bathe") return "splash";
  if (proposal.attachment.kind === "surface") {
    const parent = scene.entities[proposal.attachment.parent]?.item;
    if (parent?.item === "sink-counter" && parent.powered) return "splash";
  }
  if (!subject || subject.character) return "cloth";
  return subject.item ? materialOf(subject.item.item) : "wood";
}
/** The landing cue, or none: food in a mouth and props in a hand get their own reactions. */
export function landingSound(subject: SceneEntity | undefined, proposal: DropProposal, scene: Scene): HomeSound | undefined {
  if (proposal.kind === "mouth" || proposal.kind === "staging" || proposal.kind === "transfer") return undefined;
  if (proposal.kind === "hand") return "pick";
  return landingMaterial(subject, proposal, scene);
}
/** Semantic attachments get a light haptic (rule 60); plain floor drops do not. */
export const attaches = (proposal: DropProposal) =>
  proposal.kind === "hand" || proposal.kind === "mouth" || proposal.kind === "socket" || proposal.kind === "surface";

/** Squash depth at full height. Large enough to read at the phone's 0.5 room scale. */
export const SQUASH_DEPTH = 0.22;
export const SQUASH_MS = 120;
export const SQUASH_PEAK_MS = 45;
/**
 * HD-02: squash scaled by drop height and material. `fall` is the screen-point distance the
 * art drops from release to its resting place, including the carry lift. Visual only: the
 * footprint and saved coordinates never change (rule 37).
 */
export function squashDepth(give: number, fall: number): number {
  "worklet";
  const height = Math.max(0.45, Math.min(1, fall / 60));
  return SQUASH_DEPTH * give * height;
}
/** 0…1…0 over the last SQUASH_MS of the settle, peaking SQUASH_PEAK_MS after contact. */
export function squashCurve(elapsed: number, duration: number): number {
  "worklet";
  const t = elapsed - Math.max(0, duration - SQUASH_MS);
  if (t <= 0 || t >= SQUASH_MS) return 0;
  if (t < SQUASH_PEAK_MS) { const u = t / SQUASH_PEAK_MS; return u * (2 - u); }
  const u = (t - SQUASH_PEAK_MS) / (SQUASH_MS - SQUASH_PEAK_MS);
  return 1 - u * u * (3 - 2 * u);
}
/** Volume-keeping squash about the contact point. */
export function squashScale(depth: number, curve: number): { sx: number; sy: number } {
  "worklet";
  return { sx: 1 + depth * curve * 0.6, sy: 1 - depth * curve };
}
/** Hands and mouths take a prop without a bounce; a staged thing is put away, not dropped. */
export function squashes(kind: DropProposal["kind"] | undefined): boolean {
  "worklet";
  return kind === "floor" || kind === "surface" || kind === "socket";
}

// HD-01 (rule 43): a friend picked up glances, then smiles and giggles, then dangles.
export const GLANCE_MS = 170;
export const SMILE_MS = 900;
export const GIGGLE_MS = 480;
export const GIGGLE_DEGREES = 3.5;
export const DANGLE_AFTER_MS = 240;
export const DANGLE_PERIOD_MS = 1300;
export const DANGLE_DEGREES = 2.5;
export const KICK_EVERY_MS = 2600;
export const KICK_MS = 160;
/** 0 none, 1 the glance (surprised), 2 the smile (happy). */
export function pickupFace(elapsed: number): 0 | 1 | 2 {
  "worklet";
  if (elapsed < 0 || elapsed >= SMILE_MS) return 0;
  return elapsed < GLANCE_MS ? 1 : 2;
}
/** Two small wiggles about the grip, so the finger's point never moves. */
export function giggleTilt(elapsed: number): number {
  "worklet";
  const t = elapsed - GLANCE_MS;
  if (t <= 0 || t >= GIGGLE_MS) return 0;
  const u = t / GIGGLE_MS;
  return Math.sin(u * Math.PI * 4) * GIGGLE_DEGREES * (1 - u);
}
/**
 * Held still, a friend's feet swing like a pendulum about the grip, legs trailing the swing,
 * with a small kick now and then. `still` is how long the finger has rested.
 */
export function dangle(still: number): { tilt: number; sample: number } {
  "worklet";
  const t = still - DANGLE_AFTER_MS;
  if (t <= 0) return { tilt: 0, sample: 0 };
  const ramp = Math.min(1, t / 300), phase = (t / DANGLE_PERIOD_MS) * Math.PI * 2;
  const kickAt = t % KICK_EVERY_MS, kick = t > KICK_EVERY_MS / 2 && kickAt < KICK_MS;
  const sample = kick ? 3 * (Math.floor(t / KICK_EVERY_MS) % 2 ? -1 : 1) : Math.round(-2 * ramp * Math.cos(phase));
  return { tilt: DANGLE_DEGREES * ramp * Math.sin(phase), sample };
}
/** During the glance and smile the limb samples are quantized to the mounted face frames. */
export const faceSamples = [-2, 0, 2] as const;
export function faceSample(sample: number): number {
  "worklet";
  return Math.max(-2, Math.min(2, Math.round(sample / 2) * 2));
}

// Resting reactions (HD-05, HD-06, HD-09, HC-01), drawn through the resting wobble channel.
export type CueKind = "tap" | "happy" | "burp" | "stir" | "greet" | "hop";
export type Cue = { at: number; kind: CueKind; dir: number };
export const cueLength: Record<CueKind, number> = { tap: 260, happy: 640, burp: 760, stir: 760, greet: 900, hop: 320 };
/** Degrees of rotation about the contact, a small rise, and a vertical squash, for one cue. */
export function cueMotion(cue: Cue, now: number): { deg: number; dy: number; sy: number } | undefined {
  "worklet";
  const e = now - cue.at, length = cueLength[cue.kind];
  if (e < 0 || e >= length) return undefined;
  const u = e / length;
  switch (cue.kind) {
    case "tap": return { deg: Math.sin(u * Math.PI * 4) * 2.5 * (1 - u), dy: 0, sy: 1 };
    case "happy": return { deg: Math.sin(u * Math.PI * 6) * 5 * (1 - u), dy: -6 * Math.sin(Math.min(1, u * 2.5) * Math.PI), sy: 1 };
    case "burp": {
      // A little jolt and puff out, then the same happy wiggle.
      if (u < 0.3) return { deg: 0, dy: 0, sy: 1 + 0.05 * Math.sin((u / 0.3) * Math.PI) };
      const v = (u - 0.3) / 0.7;
      return { deg: Math.sin(v * Math.PI * 4) * 4 * (1 - v), dy: 0, sy: 1 };
    }
    case "stir": return { deg: Math.sin(u * Math.PI * 3) * 3 * (1 - u * 0.6), dy: 0, sy: 1 + 0.03 * Math.sin(u * Math.PI) };
    case "greet": {
      const lean = u < 0.2 ? u / 0.2 : u > 0.75 ? (1 - u) / 0.25 : 1;
      return { deg: 6 * cue.dir * lean * (u < 0.2 ? 1 : 1 + 0.15 * Math.sin((u - 0.2) * Math.PI * 4)), dy: 0, sy: 1 };
    }
    case "hop": return { deg: 0, dy: -9 * Math.sin(u * Math.PI), sy: 1 };
  }
}

// HD-06: a friend at rest notices food carried near, or a friend carried near.
export const NOTICE_RADIUS = 230;
export const NOTICE_DEGREES = 5;
export type Watcher = { id: string; x: number; y: number };
export type Notice = { id: string; dir: number; food: boolean };
/** Friends' heads in house units, for the UI thread. Friends waiting in the drawer see nothing. */
export function watchersOf(scene: Scene, building: Building): Watcher[] {
  return Object.values(scene.entities).flatMap((e) => {
    // Lying friends rest (and may sleep); only standing, seated and bathing friends turn to look.
    if (!e.character || e.attachment.kind === "staging" || e.base === "lie") return [];
    const origin = roomOrigin(roomIds.indexOf(e.room), building);
    const head = anchorsFor(e.character.slot, e.base, e.facing, e.action).head;
    return [{ id: e.id, x: origin.x + e.contact.x + head.x, y: origin.y + e.contact.y + head.y }];
  });
}
/** `point` is the middle of the carried art, `watchers` friends' heads, both in house units. */
export function noticesFor(point: { x: number; y: number }, food: boolean, watchers: readonly Watcher[], skip: readonly string[]): Notice[] {
  "worklet";
  const out: Notice[] = [];
  for (const w of watchers) {
    if (skip.includes(w.id)) continue;
    const dx = point.x - w.x, dy = point.y - w.y;
    if (dx * dx + dy * dy > NOTICE_RADIUS * NOTICE_RADIUS) continue;
    out.push({ id: w.id, dir: dx < 0 ? -1 : 1, food });
  }
  return out;
}

// HD-06 on landing: friends close to where another friend is set down greet them.
export const GREET_RADIUS = 240;
export function greeters(scene: Scene, landed: SceneEntity, skip: readonly string[] = []): { id: string; dir: number }[] {
  if (!landed.character) return [];
  return Object.values(scene.rooms[landed.room].entities)
    .filter((e) => e.character && e.id !== landed.id && !skip.includes(e.id) && e.attachment.kind !== "staging" &&
      e.base !== "lie" && !e.action &&
      Math.hypot(e.contact.x - landed.contact.x, e.contact.y - landed.contact.y) <= GREET_RADIUS)
    .map((e) => ({ id: e.id, dir: landed.contact.x < e.contact.x ? -1 : 1 }));
}

// HD-05: a rare burp. Deterministic: the fifth meal of a visit, then every sixth after it.
export const FIRST_BURP = 5;
export const BURP_EVERY = 6;
export const burps = (meal: number) => meal >= FIRST_BURP && (meal - FIRST_BURP) % BURP_EVERY === 0;

// HD-07 (rule 49): food in the pan on a lit stove cooks. Removal or turning it off stops it.
export const COOK_MS = 700;
export function stoveOf(scene: Scene, entity: SceneEntity): SceneEntity | undefined {
  if (entity.attachment.kind !== "surface") return undefined;
  const parent = scene.entities[entity.attachment.parent];
  return parent?.item?.item === "stove" ? parent : undefined;
}
export const isCooked = (entity: SceneEntity) => !!entity.item && capabilityOf(entity.item.item).edible === "food" && !!entity.item.powered;
/** Raw food sitting on a burning stove: these cook. */
export function cookingIds(scene: Scene): string[] {
  return Object.values(scene.entities)
    .filter((e) => e.item && capabilityOf(e.item.item).edible === "food" && !e.item.powered && !!stoveOf(scene, e)?.item?.powered)
    .map((e) => e.id)
    .sort();
}

// HD-08: a lit lamp throws a soft shadow from each friend standing near it.
export const LAMP_REACH = 260;
export type LampShadow = { angle: number; length: number; opacity: number };
const lampIds = new Set(["lamp", "table-lamp", "floor-lamp", "island-lamp", "lantern"]);
export function lampShadow(scene: Scene, entity: SceneEntity): LampShadow | undefined {
  if (!entity.character || entity.base !== "stand" || entity.attachment.kind === "staging") return undefined;
  let best: LampShadow | undefined, bestDistance = Infinity;
  for (const lamp of Object.values(scene.rooms[entity.room].entities)) {
    const item = lamp.item;
    if (!item || !lampIds.has(item.item) || !(item.powered ?? item.state === "active") || item.staged) continue;
    const dx = entity.contact.x - lamp.contact.x, dy = entity.contact.y - lamp.contact.y;
    const distance = Math.hypot(dx, dy);
    if (distance > LAMP_REACH || distance >= bestDistance) continue;
    bestDistance = distance;
    const near = 1 - distance / LAMP_REACH;
    // Away from the lamp along the floor; a friend right beside it gets a short, darker shadow.
    best = { angle: (Math.atan2(dy * 0.5, dx || 0.001) * 180) / Math.PI, length: 40 + 70 * (1 - near), opacity: 0.1 + 0.12 * near };
  }
  return best;
}
