// Public contract: worklet resolution is independent of the JS validation/reducer graph.
import { storageCapacity } from '../storage';
import type { DropProposal } from "./resolve";
import { roomIds, type RoomId } from "../catalogMore";
import { validHome } from "../model";
import { worldRevision } from "./spatial";
import { characterEntityId, gridCell, gridToRoom, itemEntityId } from "./types";
import type { SceneState, EntityId } from "./types";
import type { Character, Instance } from "../model";

export { resolve, magnetRadius, faceRadius } from "./resolve";
export type { DropProposal, EntityMove, ResolveContext } from "./resolve";

/** Resolve item/character IDs from the original room before atomically moving a group. */
function locate(state: SceneState, id: EntityId): { room: RoomId; item?: Instance; character?: Character } | undefined {
  for (const room of roomIds) {
    const character = state.rooms[room].characters.find((c) => characterEntityId(c.slot) === id);
    if (character) return { room, character };
    const item = state.rooms[room].instances.find((i) => itemEntityId(room, i.id) === id);
    if (item) return { room, item };
  }
}
function parentItemId(id: string, names: Record<string, string>): string {
  return names[id] ?? id.split("/item/").slice(1).join("/item/");
}
/** Canonical complete transaction. Does not repair or independently re-resolve a proposal. */
export function apply(
  state: SceneState,
  proposal: DropProposal
): { state: SceneState; identities: Record<EntityId, EntityId> } | { stale: true } {
  if (proposal.refusal === "storage-capacity") return { stale: true };
  if (worldRevision(state) !== proposal.revision || !roomIds.includes(proposal.room)) return { stale: true };
  const moves = proposal.moves;
  if (!moves.length || new Set(moves.map((m) => m.id)).size !== moves.length) return { stale: true };
  const sources = new Map(moves.map((move) => [move.id, locate(state, move.id)]));
  if (!sources.get(proposal.id) && !proposal.item) return { stale: true };
  const rooms = Object.fromEntries(
    roomIds.map((id) => [
      id,
      {
        ...state.rooms[id],
        instances: [...state.rooms[id].instances],
        characters: [...state.rooms[id].characters],
      },
    ])
  ) as SceneState["rooms"];
  const names: Record<string, string> = {};
  // Remove every moving identity first, including current hand ownership.
  for (const move of moves) {
    const source = sources.get(move.id);
    if (source?.item)
      rooms[source.room].instances = rooms[source.room].instances.filter((i) => i.id !== source.item!.id);
    if (source?.character)
      rooms[source.room].characters = rooms[source.room].characters.filter((c) => c.slot !== source.character!.slot);
  }
  for (const room of roomIds) {
    rooms[room].characters = rooms[room].characters.map((c) => {
      if (
        !c.holding ||
        !moves.some((m) => sources.get(m.id)?.room === room && sources.get(m.id)?.item?.id === c.holding)
      )
        return c;
      const { holding, ...rest } = c;
      void holding;
      return rest;
    });
  }
  // Assign collision-free historical item names once; all relationships use the same map.
  for (const move of moves) {
    const item = move.id === proposal.id ? (proposal.item ?? sources.get(move.id)?.item) : sources.get(move.id)?.item;
    if (!item || (proposal.consume === "food" && move.id === proposal.id)) continue;
    let name = item.id;
    let suffix = 0;
    while (rooms[move.room].instances.some((i) => i.id === name) || Object.values(names).includes(name)) {
      name = `carry-${++suffix}-${item.id}`.slice(0, 48);
    }
    names[move.id] = name;
  }
  for (const move of moves) {
    const source = sources.get(move.id);
    const item = move.id === proposal.id ? (proposal.item ?? source?.item) : source?.item;
    if (item) {
      if (proposal.consume === "food" && move.id === proposal.id) continue;
      const { on, in: container, staged, at: lastDrop, ...rest } = item;
      void on;
      void container;
      void staged;
      void lastDrop;
      const attachment = move.attachment;
      const parent = attachment.kind === "surface" ? moves.find((m) => m.id === attachment.parent) : undefined;
      const originalParent = attachment.kind === "surface" ? locate(state, attachment.parent)?.item : undefined;
      const x =
        move.cell?.x ??
        (parent?.cell
          ? parent.cell.x + (attachment.kind === "surface" ? attachment.slot : 0)
          : originalParent && attachment.kind === "surface"
            ? originalParent.x + attachment.slot
            : item.x);
      const y = move.cell?.y ?? parent?.cell?.y ?? originalParent?.y ?? item.y;
      // Keep the save lean: a drop that landed exactly on its grid point stays as x/y alone.
      const grid = gridToRoom(gridCell(x, y), item.layer === "wall");
      // The floor point saved is the attachment's. It equals the contact except for the stove's
      // pan (HD-07), whose food is drawn up in the pan but saved on the floor in front of it.
      const at = attachment.kind === "floor" ? attachment.at : move.contact;
      const exactDrop = attachment.kind === "floor" && (Math.abs(at.x - grid.x) > 0.01 || Math.abs(at.y - grid.y) > 0.01);
      const next: Instance = {
        ...rest,
        id: names[move.id],
        x,
        y,
        ...(attachment.kind === "surface" ? { on: parentItemId(attachment.parent, names) } : {}),
        ...(attachment.kind === "container" ? { in: parentItemId(attachment.parent, names) } : {}),
        ...(attachment.kind === "staging" ? { staged: true } : {}),
        ...(exactDrop ? { at: { x: at.x, y: at.y } } : {}),
        ...(proposal.consume === "drink" && move.id === proposal.id ? { empty: true } : {}),
      };
      rooms[move.room].instances.push(next);
    } else if (source?.character) {
      const c = source.character;
      const attachment = move.attachment;
      const pose = move.base === "carry" ? "stand" : move.base;
      const next: Character =
        attachment.kind === "socket"
          ? {
              slot: c.slot,
              anchor: "seat",
              pose,
              seatId: parentItemId(attachment.item, names),
              socket: { itemId: parentItemId(attachment.item, names), socketId: attachment.socket },
            }
          : {
              slot: c.slot,
              anchor: "floor",
              pose: "stand",
              x: move.cell?.x ?? c.x ?? 8,
              y: move.cell?.y ?? c.y ?? 8,
              at: move.contact,
              facing: move.facing,
              ...(attachment.kind === "staging" ? { staged: true } : {}),
            };
      if (c.holding) {
        const heldId = itemEntityId(source.room, c.holding);
        next.holding = names[heldId] ?? c.holding;
      }
      if (c.action) next.action = c.action;
      rooms[move.room].characters.push(next);
    }
  }
  for (const move of moves) {
    if (move.attachment.kind !== "hand" || (proposal.consume === "food" && move.id === proposal.id)) continue;
    const ownerId = move.attachment.character;
    rooms[move.room].characters = rooms[move.room].characters.map((c) =>
      characterEntityId(c.slot) === ownerId
        ? (() => {
            const next = { ...c, holding: names[move.id] };
            if (!proposal.consume) delete next.action;
            return next;
          })()
        : c
    );
  }
  if (proposal.consume && proposal.attachment.kind === "hand") {
    const ownerId = proposal.attachment.character;
    rooms[proposal.room].characters = rooms[proposal.room].characters.map((c) =>
      characterEntityId(c.slot) === ownerId ? { ...c, action: proposal.consume === "food" ? "eat" : "drink" } : c
    );
  }
  // Opening and storing are one accepted edit; hover/cancel never writes state.
  if (proposal.attachment.kind === "container") {
    const parent = parentItemId(proposal.attachment.parent, names);
    rooms[proposal.room].instances = rooms[proposal.room].instances.map(i => i.id === parent && storageCapacity(i.item)
      ? { ...i, storage: { version: 1, open: true } } : i);
  }
  for (const room of roomIds) {
    const originalOrder = state.rooms[room].instances.map((i) => i.id);
    rooms[room].instances.sort((a, b) => {
      const ai = originalOrder.indexOf(a.id),
        bi = originalOrder.indexOf(b.id);
      return (ai < 0 ? 1000 : ai) - (bi < 0 ? 1000 : bi) || a.id.localeCompare(b.id);
    });
    rooms[room].characters.sort((a, b) => a.slot - b.slot);
  }
  const result: SceneState = { ...state, version: 4, rooms };
  const identities = Object.fromEntries(
    moves
      .filter((move) => !(proposal.consume === "food" && move.id === proposal.id))
      .map((move) => [move.id, sources.get(move.id)?.character ? move.id : itemEntityId(move.room, names[move.id])])
  );
  return validHome(result) ? { state: result, identities } : { stale: true };
}
