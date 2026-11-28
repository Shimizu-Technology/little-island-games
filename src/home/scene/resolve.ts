import { capabilityOf } from "../world";
import { rigSlot } from "../family";
import type { RoomId } from "../catalogMore";
import { MAX_INSTANCES } from "../limits";
import { anchorsFor, species } from "./species";
import {
  contained,
  contains,
  movingGroup,
  occludedFraction,
  catalogCovered,
  catalogNeighbours,
  bandCovers,
  overlaps,
  standingContact,
  translatedBounds,
} from "./spatial";
import { gridCell, gridToRoom, itemEntityId, roomPoint } from "./types";
import type {
  Attachment,
  Bounds,
  CharacterBase,
  EntityId,
  Facing,
  GridCell,
  RoomIndex,
  RoomPoint,
  SceneEntity,
  Target,
} from "./types";
import type { Instance } from "../model";

export type EntityMove = {
  id: EntityId;
  room: RoomId;
  attachment: Attachment;
  contact: RoomPoint;
  cell?: GridCell;
  base: CharacterBase;
  facing: Facing;
};
type ProposalData = EntityMove & {
  revision: string;
  /** Geometry used by the preview, retained for authoritative catalog revalidation. */
  catalogIntent?: Pick<ResolveContext, "scale" | "aim" | "contact">;
  reason: string;
  refusal?: "capacity" | "storage-capacity";
  /** Includes the subject, descendants and displaced objects, exactly once. */
  moves: EntityMove[];
  target?: string;
  consume?: "food" | "drink";
  discard?: boolean;
  pending?: { target: string; since: number };
  /** Catalog/rotation adapters supply the complete authored item, never a second rule path. */
  item?: Instance;
};
export type DropProposal = {
  [K in "hand" | "mouth" | "socket" | "surface" | "floor" | "staging" | "transfer"]: ProposalData & { kind: K };
}["hand" | "mouth" | "socket" | "surface" | "floor" | "staging" | "transfer"];
export type ResolveContext = {
  scale: number;
  /** Middle of the carried art in destination-room units. Hand and face are tested here. */
  aim?: RoomPoint;
  /** Finger/contact supplements the carried body, without replacing its anchor. */
  contact?: RoomPoint;
  /** Actual dragged art in destination room coordinates, after grip/camera conversion. */
  silhouette?: Bounds;
  intent?: "staging";
  previous?: DropProposal;
  pending?: { target: string; since: number };
  now?: number;
  release?: boolean;
  floorOnly?: boolean;
  /** Interactive Design placement also protects visible furniture silhouettes. */
  avoidFurnitureOverlap?: boolean;
  /** Uncommitted catalog placement requires at least half its art to remain visible. */
  catalog?: boolean;
  reservations?: Record<string, EntityId>;
  target?: string;
  kinds?: Target["kind"][];
  /** Explicit Give can replace a hand's prop; ordinary magnets filter occupied hands. */
  replaceHand?: boolean;
};
type Candidate = {
  target: Target;
  distance: number;
  normalized: number;
  core: boolean;
  /** The aim is on the visible head, so food belongs to the face even with a hand nearby. */
  onHead: boolean;
  radius: number;
};
const priority: Record<Target["kind"], number> = { hand: 0, mouth: 1, socket: 2, container: 2, surface: 3 };

export const faceZone = { minPt: 32, headFactor: 1.1 };
export const handMagnet = { minPt: 24, heightFactor: 0.14, maxPt: 34 };
export function magnetRadius(kind: Exclude<Target["kind"], "mouth">, height: number, scale: number): number {
  "worklet";
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const h = height * safeScale;
  const pt =
    kind === "hand"
      ? Math.max(handMagnet.minPt, Math.min(handMagnet.maxPt, handMagnet.heightFactor * h))
      : kind === "socket"
        ? Math.max(20, Math.min(48, 0.22 * h))
        : Math.max(14, Math.min(26, 0.1 * h));
  return pt / safeScale;
}
/** A face is a head-sized place, never the single mouth point: never below 32 pt on screen. */
export function faceRadius(headRadius: number, scale: number): number {
  "worklet";
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return Math.max(faceZone.minPt / safeScale, headRadius * faceZone.headFactor);
}
function targetHeight(index: RoomIndex, subject: SceneEntity, target: Target): number {
  "worklet";
  const slot = subject.character?.slot ?? index.entities[target.owner]?.character?.slot ?? 0;
  return species[slot].standingHeight;
}
function eligible(
  index: RoomIndex,
  subject: SceneEntity,
  target: Target,
  ctx: ResolveContext,
  group: SceneEntity[]
): boolean {
  "worklet";
  const ownContainer =
    target.kind === "container" &&
    subject.attachment.kind === "container" &&
    subject.attachment.parent === target.owner;
  if (
    (target.hidden && ctx.target !== target.id) ||
    (target.closed && target.occupied !== subject.id && !ownContainer) ||
    group.some((e) => e.id === target.owner)
  )
    return false;
  if (ctx.kinds && !ctx.kinds.includes(target.kind)) return false;
  if (target.conflicts?.some(id => id !== subject.id)) return false;
  const reserved = ctx.reservations?.[target.id];
  if (reserved && reserved !== subject.id) return false;
  if (target.occupied && target.occupied !== subject.id && !(target.kind === "hand" && ctx.replaceHand)) return false;
  if (target.trash) return !!subject.item && !!capabilityOf(subject.item.item).edible && group.length === 1;
  if (subject.character) {
    return (
      target.kind === "socket" &&
      !!target.pet === (subject.character.slot === 2) &&
      species[subject.character.slot].supportedSockets.includes(target.base as "stand" | "sit" | "lie" | "bathe")
    );
  }
  if (!subject.body) return false;
  if (target.kind === "hand") return !!subject.body.holdable;
  if (target.kind === "mouth") return !!subject.body.edible;
  // HD-07: the stove's pan takes food only; a toy dropped there lands on the floor as usual.
  if (target.pan) return subject.body.edible === "food" && !subject.children.length;
  if (target.kind === "container") return !!subject.body.small && !subject.body.container && group.length === 1;
  if (target.kind === "surface") return !!subject.body.small;
  return false;
}
function movedGroup(index: RoomIndex, subject: SceneEntity, root: EntityMove, group: SceneEntity[]): EntityMove[] {
  "worklet";
  const moves = [root];
  for (const child of group.slice(1)) {
    const parent = moves.find((m) => m.id === child.parent);
    const oldParent = index.entities[child.parent ?? ""];
    let contact = roomPoint(
      child.contact.x + root.contact.x - subject.contact.x,
      child.contact.y + root.contact.y - subject.contact.y
    );
    let cell: GridCell | undefined;
    if (parent && oldParent) {
      contact = roomPoint(
        parent.contact.x + child.contact.x - oldParent.contact.x,
        parent.contact.y + child.contact.y - oldParent.contact.y
      );
      if (child.attachment.kind === "hand" && oldParent.character) {
        const anchors = anchorsFor(oldParent.character.slot, parent.base, parent.facing, oldParent.action);
        contact = roomPoint(parent.contact.x + anchors.hand.x, parent.contact.y + anchors.hand.y);
      }
    }
    if (child.item && root.cell && subject.item) {
      cell = gridCell(
        child.item.x + root.cell.x - (index.entities[subject.id]?.item?.x ?? subject.item.x),
        child.item.y + root.cell.y - (index.entities[subject.id]?.item?.y ?? subject.item.y)
      );
    }
    moves.push({
      id: child.id,
      room: root.room,
      attachment: child.attachment,
      contact,
      cell,
      base: child.base,
      facing: child.facing,
    });
  }
  return moves;
}
function fitsGroup(index: RoomIndex, subject: SceneEntity, root: EntityMove, group: SceneEntity[], avoidFurnitureOverlap = false, catalog = false): boolean {
  "worklet";
  const moves = movedGroup(index, subject, root, group);
  return moves.every((move) => {
    const entity = move.id === subject.id ? subject : index.entities[move.id];
    if (move.attachment.kind === "container") return true;
    const bounds = entity.character ? anchorsFor(entity.character.slot, move.base, move.facing).bounds : entity.bounds;
    const placed = translatedBounds(bounds, move.contact);
    if (!contained(placed)) return false;
    // Grid footprints alone do not describe tall/wide fixture silhouettes. A Design
    // move must not hide a neighbouring piece of floor furniture behind its art.
    if (catalog && (occludedFraction(placed, move.contact.y, index.occlusionBands.filter(b => !group.some(g => g.id === b.id))) > .5 || catalogCovered(entity, move.contact, move.contact.y, index.occlusionBands.filter(b => !group.some(g => g.id === b.id))) > .4)) return false;
    if (catalog && avoidFurnitureOverlap && move.attachment.kind === "floor") {
      const added = { id: entity.id, bounds: placed, depth: move.contact.y, shapes: entity.shapes, contact: move.contact };
      for (const other of index.catalogNeighbours ?? catalogNeighbours(index.entities, index.occlusionBands)) {
        if (group.some(member => member.id === other.id) || added.depth <= other.depth || !overlaps(placed, other.bounds)) continue;
        let before = 0, newlyCovered = 0;
        for (const sample of other.samples) {
          if (sample.blockers.some(id => !group.some(member => member.id === id))) before++;
          else if (bandCovers(added, sample.x, sample.y)) newlyCovered++;
        }
        // Compare integer counts: exactly the original after <= max(.5, before) rule.
        if (before + newlyCovered > Math.max(other.samples.length / 2, before)) return false;
      }
    }
    if (!catalog && avoidFurnitureOverlap && entity.body?.layer === "furniture" && !entity.body.small && move.attachment.kind === "floor") {
      for (const other of Object.values(index.entities)) {
        if (other.room !== index.room || group.some((member) => member.id === other.id) || other.attachment.kind !== "floor" ||
            other.body?.layer !== "furniture" || other.body.small) continue;
        if (overlaps(placed, translatedBounds(other.bounds, other.contact))) return false;
      }
    }
    return true;
  });
}
function rootMove(
  subject: SceneEntity,
  room: RoomId,
  attachment: Attachment,
  contact: RoomPoint,
  base = subject.base,
  facing = subject.facing,
  cell?: GridCell
): EntityMove {
  "worklet";
  return { id: subject.id, room, attachment, contact, base, facing, cell };
}

/** Project hidden bystanders once per proposal, never run rectangle unions per floor cell. */
function displacedFriends(
  index: RoomIndex,
  subject: SceneEntity,
  move: EntityMove,
  group: SceneEntity[]
): EntityMove[] {
  "worklet";
  if (!subject.body || subject.body.small || subject.body.layer !== "furniture" || move.attachment.kind === "staging")
    return [];
  const deltaY = move.contact.y - subject.contact.y;
  const bands = index.occlusionBands.filter((b) => !group.some((e) => e.id === b.id));
  const movedBands = group
    .filter((e) => e.body?.layer === "furniture")
    .flatMap((e) => (e.occluders ?? [e.bounds]).map((bounds) => ({
      bounds: translatedBounds(
        bounds,
        roomPoint(e.contact.x + move.contact.x - subject.contact.x, e.contact.y + deltaY)
      ),
      depth: e.depth + deltaY,
    })));
  const allBands = [...bands, ...movedBands];
  const result: EntityMove[] = [];
  for (const friend of Object.values(index.entities)
    .filter((e) => e.character && e.room === index.room && !e.parent && !group.some((m) => m.id === e.id))
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const bounds = translatedBounds(friend.bounds, friend.contact);
    if (occludedFraction(bounds, friend.depth, allBands) <= 0.25) continue;
    let best: EntityMove | undefined;
    let distance = Infinity;
    const slot = friend.character!.slot;
    for (const location of index.floor) {
      if (location.occlusion[rigSlot(slot)] > 0.25) continue;
      if (location.blockers.some((id) => !group.some((e) => e.id === id) && !index.entities[id]?.body?.underfoot)) continue;
      const contact = standingContact(location.contact, slot);
      if (
        movedBands.some((b) => b.depth > contact.y + 1 && overlaps(b.bounds, translatedBounds(friend.bounds, contact)))
      )
        continue;
      const score = (contact.x - friend.contact.x) ** 2 + (contact.y - friend.contact.y) ** 2;
      const candidate = rootMove(
        friend,
        index.room,
        { kind: "floor", room: index.room, at: contact },
        contact,
        "stand",
        friend.facing,
        location.cell
      );
      if (score < distance && fitsGroup(index, friend, candidate, movingGroup(index, friend))) {
        best = candidate;
        distance = score;
      }
    }
    const destination =
      best ?? rootMove(friend, index.room, { kind: "staging", room: index.room }, roomPoint(400, 510), "stand");
    result.push(...movedGroup(index, friend, destination, movingGroup(index, friend)));
  }
  return result;
}
function makeProposal(
  index: RoomIndex,
  subject: SceneEntity,
  move: EntityMove,
  group: SceneEntity[],
  kind: DropProposal["kind"],
  reason: string,
  target?: Target
): DropProposal {
  "worklet";
  return {
    ...move,
    kind,
    revision: index.revision,
    reason,
    moves: [...movedGroup(index, subject, move, group), ...displacedFriends(index, subject, move, group)],
    target: target?.id,
    consume: target?.trash ? "food" : target?.kind === "mouth" ? subject.body?.edible : undefined,
    ...(target?.trash ? { discard: true } : {}),
    item: subject.item,
  };
}
function targetMove(index: RoomIndex, subject: SceneEntity, target: Target): EntityMove {
  "worklet";
  let cell: GridCell | undefined = target.cell;
  if (target.attachment.kind === "surface") {
    const parent = index.entities[target.attachment.parent]?.item;
    if (parent) cell = gridCell(parent.x + target.attachment.slot, parent.y);
  }
  const ownContainer =
    target.kind === "container" &&
    subject.attachment.kind === "container" &&
    subject.attachment.parent === target.owner;
  return rootMove(
    subject,
    index.room,
    target.attachment,
    ownContainer
      ? subject.contact
      : target.kind === "hand" || (target.kind === "mouth" && subject.body?.edible === "drink")
        ? (target.projectedContact ?? target.contact)
        : target.contact,
    subject.character ? target.base : subject.base,
    subject.character ? target.facing : subject.facing,
    cell
  );
}
/** Open floor lands where the finger let go. The grid only decides what is legal. */
function floorCellAllowed(index: RoomIndex, subject: SceneEntity, group: SceneEntity[], cell: GridCell, overlapProps = false): boolean {
  "worklet";
  const body = subject.body;
  if (!body) return true;
  if (cell.x < 0 || cell.y < 0 || cell.x + body.w > 16 || cell.y + body.h > (body.layer === "wall" ? 4 : 12)) return false;
  for (let y = cell.y; y < cell.y + body.h; y++) for (let x = cell.x; x < cell.x + body.w; x++) {
    if ((index.occupancy[`${body.layer}:${x}:${y}`] ?? []).some(
      (id) => !group.some((e) => e.id === id) && !(overlapProps && index.entities[id]?.body?.small)
    )) return false;
  }
  return true;
}
function exactFloorMove(index: RoomIndex, subject: SceneEntity, point: RoomPoint, group: SceneEntity[], ctx: ResolveContext): EntityMove | undefined {
  "worklet";
  const slot = subject.character?.slot;
  if (slot === undefined && !(subject.body?.portable && (!subject.children.length || subject.body.container) && subject.body.layer !== "wall")) return;
  const beachMinY = index.room === "tumon-beach" ? 286 : index.room === "cocos-island" ? 308 : 350;
  const waterProp = !!subject.item && (subject.item.item === "swim-ring" || subject.item.item === "outrigger-canoe" || subject.item.item === "beach-surfboard" || subject.item.item === "sea-turtle");
  const contact = slot !== undefined ? standingContact(point, slot, beachMinY) : roomPoint(Math.max(8, Math.min(792, point.x)), Math.max(waterProp ? beachMinY : 350, Math.min(552, point.y)));
  // The exact contact decides containment and visibility. The bounded grid cell only decides
  // occupancy, including the legal floor strip above row zero and the room edges.
  const y = Math.max(0, Math.min(12 - (subject.body?.h ?? 1), Math.round((contact.y - 386) / 14.4)));
  const x = Math.max(0, Math.min((subject.body ? 16 : 20) - (subject.body?.w ?? 1), Math.round((contact.x - 43 - y * 1.5) / 37.5)));
  const cell = gridCell(x, y);
  if (!floorCellAllowed(index, subject, group, cell)) return;
  if (slot !== undefined) {
    if (contact.y >= 350 && (index.floor.find((location) => location.cell.x === x && location.cell.y === y)?.blockers ?? []).some((id) => !group.some((e) => e.id === id) && !index.entities[id]?.body?.underfoot)) return;
    if (occludedFraction(translatedBounds(anchorsFor(slot, "stand", "front").bounds, contact), contact.y + 1, index.occlusionBands) > 0.25) return;
  }
  const exact = rootMove(subject, index.room, { kind: "floor", room: index.room, at: contact }, contact, slot !== undefined ? "stand" : subject.base, subject.facing, cell);
  return fitsGroup(index, subject, exact, group, ctx.avoidFurnitureOverlap, ctx.catalog) ? exact : undefined;
}
function placedInRoom(index: RoomIndex, entity: SceneEntity): boolean {
  "worklet";
  if (!entity.item || entity.room !== index.room || !["floor", "surface"].includes(entity.attachment.kind))
    return false;
  let parent = entity.parent && index.entities[entity.parent];
  const seen: Record<string, boolean> = {};
  while (parent && !seen[parent.id]) {
    if (
      parent.attachment.kind === "staging" ||
      parent.attachment.kind === "container" ||
      parent.attachment.kind === "hand"
    )
      return false;
    seen[parent.id] = true;
    parent = parent.parent && index.entities[parent.parent];
  }
  return true;
}
/** One query for hover, release, tap and accessibility. Always floor or staging fallback. */
/** Require meaningful overlap, so a stray limb never steals a neighbouring cushion. */
function bodyOverlap(a: Bounds, b: Bounds): number {
  "worklet";
  const width = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  return width * height / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}

export function resolve(index: RoomIndex, subject: SceneEntity, anchor: RoomPoint, ctx: ResolveContext): DropProposal {
  "worklet";
  const group = movingGroup(index, subject);
  const catalogIntent = ctx.catalog ? { scale: ctx.scale, aim: ctx.aim, contact: ctx.contact } : undefined;
  if (ctx.intent === "staging")
    return makeProposal(
      index,
      subject,
      rootMove(
        subject,
        index.room,
        { kind: "staging", room: index.room },
        roomPoint(400, 510),
        subject.character ? "stand" : subject.base
      ),
      group,
      "staging",
      "Explicit recoverable tray destination"
    );
  const existingPlaced = Object.values(index.entities).filter(
    (e) => placedInRoom(index, e) && !group.some((g) => g.id === e.id)
  ).length;
  const placedGroup = group.filter((e) => e.item && (e.id === subject.id || e.attachment.kind === "surface")).length;
  const capacityOverflow = existingPlaced + placedGroup > MAX_INSTANCES;
  const point =
    Number.isFinite(anchor.x) && Number.isFinite(anchor.y)
      ? anchor
      : Number.isFinite(subject.contact.x) && Number.isFinite(subject.contact.y)
        ? subject.contact
        : roomPoint(400, 500);
  const candidates: Candidate[] = [];
  const nearby =
    ctx.scale >= 0.2 && !ctx.silhouette && !ctx.contact
      ? (index.buckets[`${Math.floor(point.x / 128)}:${Math.floor(point.y / 128)}`] ?? [])
      : index.targets.map((_, i) => i);
  if (!ctx.floorOnly) {
    for (const i of nearby) {
      const target = index.targets[i];
      if (ctx.target && ctx.target !== target.id) continue;
      if (capacityOverflow && target.kind === "surface") continue;
      if (!eligible(index, subject, target, ctx, group)) continue;
      const face = target.kind === "mouth" ? target.face : undefined;
      const radius = target.kind === "mouth" && face
        ? faceRadius(face.headRadius, ctx.scale)
        : target.kind === "mouth"
          ? magnetRadius("hand", targetHeight(index, subject, target), ctx.scale)
          : magnetRadius(target.kind, targetHeight(index, subject, target), ctx.scale);
      const aim = ctx.aim && Number.isFinite(ctx.aim.x) && Number.isFinite(ctx.aim.y) ? ctx.aim : point;
      const targetPoint = target.kind === "socket" ? point : target.kind === "surface" || target.kind === "container" ? point : aim;
      const centre = face ?? target.contact;
      const bodyBounds = ctx.silhouette ?? translatedBounds(subject.bounds, point);
      // A head/arm passing a seat is not a landing. The lower body can supplement the
      // feet only on an authored cushion/blanket/water region, never a legacy point seat.
      const lowerBody = { ...bodyBounds, top: bodyBounds.top + bodyBounds.height / 2, height: bodyBounds.height / 2 };
      const bodyCentre = roomPoint(lowerBody.left + lowerBody.width / 2, lowerBody.top + lowerBody.height / 2);
      const socketBody = target.kind === "socket" && !!subject.character && !!(ctx.contact || ctx.aim || ctx.silhouette);
      const activationHit =
        socketBody && !!target.activation && (
          contains(target.activation, point) || contains(target.activation, bodyCentre) ||
          (!!ctx.contact && contains(target.activation, ctx.contact)) ||
          bodyOverlap(lowerBody, target.activation) >= 0.2
        );
      const distance = socketBody ? Math.min(
        Math.hypot(point.x - centre.x, point.y - centre.y),
        activationHit ? Math.hypot(bodyCentre.x - centre.x, bodyCentre.y - centre.y) : Infinity,
        ctx.contact ? Math.hypot(ctx.contact.x - centre.x, ctx.contact.y - centre.y) : Infinity,
      ) : Math.hypot(targetPoint.x - centre.x, targetPoint.y - centre.y);
      const exitRadius = ctx.previous?.target === target.id ? radius * 1.25 : radius;
      const onFace = !!face && !!subject.body?.edible && distance <= exitRadius;
      const torsoHalfW = face ? face.headRadius * 1.1 : 0;
      const onUpperTorso =
        !!face &&
        !!subject.body?.edible &&
        targetPoint.y >= face.y - face.headRadius * 0.2 &&
        targetPoint.y <= face.y + face.headRadius * 2.15 &&
        Math.abs(targetPoint.x - face.x) <= torsoHalfW;
      const containerHit = target.kind === "container" && (contains(target.core, point) || contains(target.core, aim));
      const core = contains(target.core, targetPoint) || containerHit || activationHit || onFace || onUpperTorso;
      const catchSeat =
        target.kind === "socket" &&
        overlaps(translatedBounds(subject.bounds, point), target.core) &&
        distance <= Math.min(targetHeight(index, subject, target) * 0.5, exitRadius * 1.25);
      if (!core && distance > exitRadius && !catchSeat) continue;
      const move = targetMove(index, subject, target);
      if (target.kind === "surface") {
        const supportWidth = Math.min(subject.bounds.width, subject.body ? 37.5 : subject.bounds.width);
        const support = target.support ?? target.core;
        const overlap = Math.max(
          0,
          Math.min(point.x + supportWidth / 2, support.left + support.width) -
            Math.max(point.x - supportWidth / 2, support.left)
        );
        if (!contains(support, point) || overlap / supportWidth < 0.6) continue;
      }
      if (!target.trash && !fitsGroup(index, subject, move, group, ctx.avoidFurnitureOverlap, ctx.catalog)) continue;
      candidates.push({
        target,
        distance,
        normalized: distance / Math.max(1, face ? radius : core ? target.core.width / 2 : radius),
        core,
        onHead: onFace && distance <= face!.headRadius,
        radius,
      });
    }
  }
  const actorTarget = (c: Candidate) => c.target.kind === "hand" || c.target.kind === "mouth";
  candidates.sort(
    (a, b) =>
      Number(b.core) - Number(a.core) ||
      Number(actorTarget(b)) - Number(actorTarget(a)) ||
      Number(b.onHead) - Number(a.onHead) ||
      (a.core && b.core ? a.normalized - b.normalized : priority[a.target.kind] - priority[b.target.kind]) ||
      a.distance - b.distance ||
      a.target.id.localeCompare(b.target.id)
  );
  let winner: Candidate | undefined = candidates[0];
  const previous = candidates.find((c) => c.target.id === ctx.previous?.target);
  // Exact competing intent may switch immediately. A magnet never steals a retained core.
  if (previous && !winner?.core) winner = previous;
  let pending: DropProposal["pending"];
  if (
    winner &&
    !winner.core &&
    !ctx.release &&
    ((ctx.previous?.target && winner.target.id !== ctx.previous.target) ||
      (ctx.pending ?? ctx.previous?.pending)?.target === winner.target.id)
  ) {
    const before = ctx.pending ?? ctx.previous?.pending;
    const since = before?.target === winner.target.id ? before.since : (ctx.now ?? 0);
    if ((ctx.now ?? 0) - since < 60) {
      pending = { target: winner.target.id, since };
      winner = previous;
    }
  }
  if (winner) {
    const target = winner.target;
    const proposal = makeProposal(
      index,
      subject,
      targetMove(index, subject, target),
      group,
      target.kind === "container" ? "socket" : target.kind,
      winner.core ? "Explicit target core" : "Compatible nearby target",
      target
    );
    const owner = index.entities[target.owner]?.character;
    const previousHeld =
      target.kind === "hand"
        ? target.occupied
        : target.kind === "mouth" && subject.body?.edible === "drink" && owner?.holding
          ? itemEntityId(index.room, owner.holding)
          : undefined;
    if (previousHeld && previousHeld !== subject.id) {
      const displaced = index.entities[previousHeld];
      const actor = index.entities[target.owner];
      const hand = actor.character && anchorsFor(actor.character.slot, actor.base, actor.facing, "hold").hand;
      // Set a replaced drink beside the feet, on the side opposite the resting hand.
      // A reachable free table/counter is preferable to the floor.
      const side = hand && hand.x < 0 ? 1 : -1;
      const point = roomPoint(actor.contact.x + side * (actor.bounds.width / 2 + displaced.body!.w * 37.5 / 2 + 14), actor.contact.y);
      const surface = index.targets.filter(t => t.kind === "surface" && !t.occupied && !t.hidden && !t.closed &&
        Math.hypot(t.contact.x - actor.contact.x, t.contact.y - actor.contact.y) <= actor.bounds.width + 90)
        .sort((a,b) => Math.hypot(a.contact.x-point.x,a.contact.y-point.y)-Math.hypot(b.contact.x-point.x,b.contact.y-point.y))
        .map(t => resolve(index, displaced, t.contact, {scale:ctx.scale, contact:t.contact, target:t.id, kinds:["surface"], release:true}))
        .find(p => p.kind === "surface");
      const fallback = surface ?? resolve(index, displaced, point, {
        scale: ctx.scale, floorOnly: true, release: true,
      });
      proposal.moves.push(...fallback.moves);
    }
    return { ...proposal, catalogIntent };
  }
  const fullAim = ctx.aim && Number.isFinite(ctx.aim.x) && Number.isFinite(ctx.aim.y) ? ctx.aim : undefined;
  const full = !ctx.floorOnly && subject.body?.small && !subject.body.container && group.length === 1 && index.targets.find(t =>
    t.kind === "container" && t.closed && (!ctx.target || t.id === ctx.target) &&
    !group.some(e => e.id === t.owner) && subject.parent !== t.owner &&
    (contains(t.core, point) || (!!fullAim && contains(t.core, fullAim))));
  if (full) return { ...makeProposal(index, subject, rootMove(subject, subject.room, subject.attachment, subject.contact), group, "floor", "Container full", full), refusal: "storage-capacity" };
  let best: EntityMove | undefined;
  let bestDistance = Infinity;
  const wall = subject.body?.layer === "wall";
  const allowed = (cell: GridCell, overlapProps = false): boolean => {
    "worklet";
    return floorCellAllowed(index, subject, group, cell, overlapProps);
  };
  const boundedFloor = !!subject.character && !!(ctx.contact || ctx.aim || ctx.silhouette);
  const maxFloorDistance = Math.min(160, 100 / Math.max(0.2, ctx.scale));
  const exact = !capacityOverflow && exactFloorMove(index, subject, point, group, ctx);
  if (exact && (!boundedFloor || Math.hypot(exact.contact.x - point.x, exact.contact.y - point.y) <= maxFloorDistance)) return { ...makeProposal(index, subject, exact, group, "floor", "Exact contained visible floor support"), pending, catalogIntent };
  const floor = ctx.catalog ? [...index.floor].sort((a, b) => {
    const ac = wall ? gridToRoom(a.cell, true) : a.contact, bc = wall ? gridToRoom(b.cell, true) : b.contact;
    return (ac.x - point.x) ** 2 + (ac.y - point.y) ** 2 - (bc.x - point.x) ** 2 - (bc.y - point.y) ** 2;
  }) : index.floor;
  for (const location of floor) {
    const cell = location.cell;
    if (capacityOverflow) continue;
    if (wall && (cell.x >= 16 || cell.y >= 4)) continue;
    if (!allowed(cell)) continue;
    if (
      subject.character &&
      (location.occlusion[rigSlot(subject.character.slot)] > 0.25 ||
        location.blockers.some((id) => !group.some((e) => e.id === id) && !index.entities[id]?.body?.underfoot))
    )
      continue;
    let contact = wall ? gridToRoom(cell, true) : location.contact;
    if (subject.character) contact = standingContact(contact, subject.character.slot);
    const attachment: Attachment = { kind: "floor", room: index.room, at: contact };
    const move = rootMove(
      subject,
      index.room,
      attachment,
      contact,
      subject.character ? "stand" : subject.base,
      subject.facing,
      cell
    );
    const distance = (contact.x - point.x) ** 2 + (contact.y - point.y) ** 2;
    if ((boundedFloor && distance > maxFloorDistance ** 2) || distance >= bestDistance || !fitsGroup(index, subject, move, group, ctx.avoidFurnitureOverlap, ctx.catalog)) continue;
    best = move;
    bestDistance = distance;
    if (ctx.catalog) break;
  }
  // Portable props may overlap harmlessly if every collision-free support is full.
  if (!best && subject.body?.small && !capacityOverflow) {
    for (const location of floor) {
      if (!allowed(location.cell, true)) continue;
      const contact = location.contact;
      const move = rootMove(
        subject,
        index.room,
        { kind: "floor", room: index.room, at: contact },
        contact,
        subject.base,
        subject.facing,
        location.cell
      );
      const distance = (contact.x - point.x) ** 2 + (contact.y - point.y) ** 2;
      if (distance < bestDistance && fitsGroup(index, subject, move, group, ctx.avoidFurnitureOverlap, ctx.catalog)) {
        best = move;
        bestDistance = distance;
        if (ctx.catalog) break;
      }
    }
  }
  if (best)
    return {
      ...makeProposal(index, subject, best, group, "floor", "Nearest contained visible floor support"),
      pending,
      catalogIntent,
    };
  if (boundedFloor && !capacityOverflow) return {
    ...makeProposal(index, subject, rootMove(subject, subject.room, subject.attachment, subject.contact, subject.base, subject.facing), group,
      subject.attachment.kind === "staging" ? "staging" : "floor", "No nearby legal floor; return to the original place"), pending,
  };
  const staging = rootMove(
    subject,
    index.room,
    { kind: "staging", room: index.room },
    roomPoint(400, 510),
    subject.character ? "stand" : subject.base
  );
  return {
    ...makeProposal(index, subject, staging, group, "staging", "No legal support; recoverable visible staging tray"),
    refusal: capacityOverflow ? "capacity" : undefined,
    pending,
  };
}
