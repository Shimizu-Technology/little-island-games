import type { Attachment, CharacterBase, EntityId, Facing, GridCell, RoomIndex, RoomPoint, SceneEntity, SceneState } from "./types";
import type { RoomId } from "../catalogMore";

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
};
export type DropProposal = {
  [K in "hand" | "mouth" | "socket" | "surface" | "floor" | "staging" | "transfer"]: ProposalData & { kind: K }
}["hand" | "mouth" | "socket" | "surface" | "floor" | "staging" | "transfer"];
export type ResolveContext = {
  scale: number;
  previous?: DropProposal;
  pending?: { target: string; since: number };
  now?: number;
  release?: boolean;
  floorOnly?: boolean;
  reservations?: Record<string, EntityId>;
  /** An explicit accessibility destination still passes compatibility checks. */
  target?: string;
};
/** Contract bootstrap: push 2 fills semantic ranking and canonical transactions. */
export function resolve(index: RoomIndex, subject: SceneEntity, anchor: RoomPoint, ctx: ResolveContext): DropProposal {
  "worklet";
  const move: EntityMove = { id: subject.id, room: index.room, attachment: { kind: "staging", room: index.room }, contact: anchor, base: subject.base, facing: subject.facing };
  return { ...move, kind: "staging", revision: index.revision, reason: "No legal support; visible staging tray", moves: [move] };
}
export function apply(state: SceneState, proposal: DropProposal): { state: SceneState } | { stale: true } {
  // Deliberately unavailable until the second push; no live caller uses this bootstrap.
  return { stale: true };
}
