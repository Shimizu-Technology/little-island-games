import type { RoomId } from "../catalogMore";
import { MAX_INSTANCES } from "../limits";
import { anchorsFor, species } from "./species";
import {
  contained,
  contains,
  movingGroup,
  occludedFraction,
  overlaps,
  standingContact,
  translatedBounds,
} from "./spatial";
import { gridCell, gridToRoom, itemEntityId, roomPoint, roomToGrid } from "./types";
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
  reason: string;
  /** Includes the subject, descendants and displaced objects, exactly once. */
  moves: EntityMove[];
  target?: string;
  consume?: "food" | "drink";
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
  /** Finger/contact in destination-room units. Body overlap cannot express drop intent. */
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
  if (
    (target.hidden && ctx.target !== target.id) ||
    (target.closed && target.occupied !== subject.id) ||
    group.some((e) => e.id === target.owner)
  )
    return false;
  if (ctx.kinds && !ctx.kinds.includes(target.kind)) return false;
  const reserved = ctx.reservations?.[target.id];
  if (reserved && reserved !== subject.id) return false;
  if (target.occupied && target.occupied !== subject.id && !(target.kind === "hand" && ctx.replaceHand)) return false;
  if (subject.character) {
    return (
      target.kind === "socket" &&
      !!target.pet === (subject.character.slot === 2) &&
      species[subject.character.slot].supportedSockets.includes(target.base as "sit" | "lie" | "bathe")
    );
  }
  if (!subject.body) return false;
  if (target.kind === "hand") return !!subject.body.holdable;
  if (target.kind === "mouth") return !!subject.body.edible;
  if (target.kind === "surface" || target.kind === "container") return !!subject.body.small;
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
function fitsGroup(index: RoomIndex, subject: SceneEntity, root: EntityMove, group: SceneEntity[], avoidFurnitureOverlap = false): boolean {
  "worklet";
  const moves = movedGroup(index, subject, root, group);
  return moves.every((move) => {
    const entity = move.id === subject.id ? subject : index.entities[move.id];
    const bounds = entity.character ? anchorsFor(entity.character.slot, move.base, move.facing).bounds : entity.bounds;
    const placed = translatedBounds(bounds, move.contact);
    if (!contained(placed)) return false;
    // Grid footprints alone do not describe tall/wide fixture silhouettes. A Design
    // move must not hide a neighbouring piece of floor furniture behind its art.
    if (avoidFurnitureOverlap && entity.body?.layer === "furniture" && !entity.body.small && move.attachment.kind === "floor") {
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
      if (location.occlusion[slot] > 0.25) continue;
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
    consume: target?.kind === "mouth" ? subject.body?.edible : undefined,
    item: subject.item,
  };
}
function targetMove(index: RoomIndex, subject: SceneEntity, target: Target): EntityMove {
  "worklet";
  let cell: GridCell | undefined;
  if (target.attachment.kind === "surface") {
    const parent = index.entities[target.attachment.parent]?.item;
    if (parent) cell = gridCell(parent.x + target.attachment.slot, parent.y);
  }
  return rootMove(
    subject,
    index.room,
    target.attachment,
    target.kind === "hand" || (target.kind === "mouth" && subject.body?.edible === "drink")
      ? (target.projectedContact ?? target.contact)
      : target.contact,
    subject.character ? target.base : subject.base,
    subject.character ? target.facing : subject.facing,
    cell
  );
}
/** Open floor lands where the finger let go. The grid only decides what is legal. */
function exactFloorMove(index: RoomIndex, subject: SceneEntity, best: EntityMove, point: RoomPoint, group: SceneEntity[], ctx: ResolveContext): EntityMove {
  "worklet";
  const slot = subject.character?.slot;
  if (slot === undefined && !(subject.body?.portable && !subject.children.length && subject.body.layer !== "wall")) return best;
  const own = roomToGrid(point);
  if (!best.cell || Math.round(own.y) !== best.cell.y || Math.round(own.x) !== best.cell.x) return best;
  const contact = slot !== undefined ? standingContact(point, slot) : roomPoint(Math.max(8, Math.min(792, point.x)), Math.max(350, Math.min(552, point.y)));
  if (slot !== undefined && occludedFraction(translatedBounds(anchorsFor(slot, "stand", "front").bounds, contact), contact.y + 1, index.occlusionBands) > 0.25)
    return best;
  const exact: EntityMove = { ...best, contact, attachment: { kind: "floor", room: index.room, at: contact } };
  return fitsGroup(index, subject, exact, group, ctx.avoidFurnitureOverlap) ? exact : best;
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
export function resolve(index: RoomIndex, subject: SceneEntity, anchor: RoomPoint, ctx: ResolveContext): DropProposal {
  "worklet";
  const group = movingGroup(index, subject);
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
      const targetPoint = target.kind === "socket" ? (ctx.contact ?? point) : target.kind === "surface" || target.kind === "container" ? point : aim;
      const centre = face ?? target.contact;
      const distance = Math.hypot(targetPoint.x - centre.x, targetPoint.y - centre.y);
      const activationHit =
        !!ctx.contact &&
        target.kind === "socket" &&
        !!target.activation &&
        contains(target.activation, targetPoint);
      const exitRadius = ctx.previous?.target === target.id ? radius * 1.25 : radius;
      const onFace = !!face && !!subject.body?.edible && distance <= exitRadius;
      const core = contains(target.core, targetPoint) || activationHit || onFace;
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
      if (!fitsGroup(index, subject, move, group, ctx.avoidFurnitureOverlap)) continue;
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
  candidates.sort(
    (a, b) =>
      Number(b.core) - Number(a.core) ||
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
      const fallback = resolve(index, displaced, roomPoint(target.contact.x + 60, target.contact.y + 84), {
        scale: ctx.scale,
        floorOnly: true,
        release: true,
      });
      proposal.moves.push(...fallback.moves);
    }
    return proposal;
  }
  let best: EntityMove | undefined;
  let bestDistance = Infinity;
  const wall = subject.body?.layer === "wall";
  const allowed = (cell: GridCell, overlapProps = false): boolean => {
    "worklet";
    const body = subject.body;
    if (!body) return true;
    if (cell.x + body.w > 16 || cell.y + body.h > (wall ? 4 : 12)) return false;
    for (let y = cell.y; y < cell.y + body.h; y++) {
      for (let x = cell.x; x < cell.x + body.w; x++) {
        if (
          (index.occupancy[`${body.layer}:${x}:${y}`] ?? []).some(
            (id) => !group.some((e) => e.id === id) && !(overlapProps && index.entities[id]?.body?.small)
          )
        )
          return false;
      }
    }
    return true;
  };
  for (const location of index.floor) {
    const cell = location.cell;
    if (capacityOverflow) continue;
    if (wall && (cell.x >= 16 || cell.y >= 4)) continue;
    if (!allowed(cell)) continue;
    if (
      subject.character &&
      (location.occlusion[subject.character.slot] > 0.25 ||
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
    if (distance >= bestDistance || !fitsGroup(index, subject, move, group, ctx.avoidFurnitureOverlap)) continue;
    best = move;
    bestDistance = distance;
  }
  // Portable props may overlap harmlessly if every collision-free support is full.
  if (!best && subject.body?.small && !capacityOverflow) {
    for (const location of index.floor) {
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
      if (distance < bestDistance && fitsGroup(index, subject, move, group, ctx.avoidFurnitureOverlap)) {
        best = move;
        bestDistance = distance;
      }
    }
  }
  if (best)
    return {
      ...makeProposal(index, subject, exactFloorMove(index, subject, best, point, group, ctx), group, "floor", "Nearest contained visible floor support"),
      pending,
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
    pending,
  };
}
