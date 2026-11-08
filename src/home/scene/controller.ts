import { screenToRoom } from "./camera";
import { roomPoint } from "./types";
import type { CameraMatrix } from "./camera";
import type { DropProposal } from "./proposal";
import type { EntityId, HousePoint, RoomPoint, ScreenPoint } from "./types";

export type InteractionPhase = "idle" | "pending" | "dragging" | "settling" | "camera" | "cancelled";
export type PointerCapture = {
  pointer: number;
  entity?: EntityId;
  start: ScreenPoint;
  point: ScreenPoint;
  startedAt: number;
  phase: InteractionPhase;
  grip: RoomPoint;
  proposal?: DropProposal;
};
export type ControllerState = {
  phase: InteractionPhase;
  pointers: PointerCapture[];
  settling: EntityId[];
  reservations: Record<string, EntityId>;
};
export type ControllerEffect =
  | { type: "contact" | "pickup" | "tap" | "restore"; entity: EntityId }
  | { type: "drag"; entity: EntityId; anchor: RoomPoint }
  | { type: "commit"; entity: EntityId; proposal: DropProposal }
  | { type: "pan"; dx: number; dy: number }
  | { type: "pinch"; pointers: readonly [ScreenPoint, ScreenPoint] };
export type ControllerEvent =
  | { type: "down"; pointer: number; point: ScreenPoint; now: number; entity?: EntityId; contact?: RoomPoint }
  | { type: "move"; pointer: number; point: ScreenPoint; proposal?: DropProposal }
  | { type: "up" | "cancel"; pointer: number; now: number; proposal?: DropProposal }
  /** A touch on something that stays put becomes the camera's, with no pickup and no snap. */
  | { type: "to-camera"; pointer: number; point: ScreenPoint }
  | { type: "settled"; entity: EntityId };
export const idleController: ControllerState = { phase: "idle", pointers: [], settling: [], reservations: {} };
/** No native imports. A captured object never becomes a camera gesture. */
export function transition(
  state: ControllerState,
  event: ControllerEvent,
  camera: CameraMatrix,
  origin: HousePoint
): { state: ControllerState; effects: ControllerEffect[] } {
  "worklet";
  const effects: ControllerEffect[] = [];
  let pointers = [...state.pointers];
  let settling = [...state.settling];
  if (event.type === "settled") {
    settling = settling.filter((id) => id !== event.entity);
  } else if (event.type === "down") {
    if (pointers.some((p) => p.pointer === event.pointer || (event.entity && p.entity === event.entity)))
      return { state, effects };
    if (event.entity && pointers.filter((p) => p.entity).length >= 2) return { state, effects };
    if (!event.entity && pointers.filter((p) => !p.entity).length >= 2) return { state, effects };
    const point = screenToRoom(event.point, camera, origin);
    const grip = roomPoint(point.x - (event.contact?.x ?? point.x), point.y - (event.contact?.y ?? point.y));
    pointers.push({
      pointer: event.pointer,
      entity: event.entity,
      start: event.point,
      point: event.point,
      startedAt: event.now,
      phase: "pending",
      grip,
    });
    if (event.entity) {
      settling = settling.filter((id) => id !== event.entity);
      effects.push({ type: "contact", entity: event.entity });
    }
  } else {
    const capture = pointers.find((p) => p.pointer === event.pointer);
    if (!capture) return { state, effects };
    if (event.type === "to-camera") {
      pointers = pointers.map((p) => (p.pointer === event.pointer ? { ...p, entity: undefined, proposal: undefined, phase: "camera" as const, point: event.point } : p));
    } else if (event.type === "move") {
      const offered = event.proposal ?? capture.proposal;
      const proposed = offered?.id === capture.entity ? offered : undefined;
      const owner = proposed?.target && state.reservations[proposed.target];
      const moved = {
        ...capture,
        point: event.point,
        proposal: owner && owner !== capture.entity ? undefined : proposed,
      };
      const distance = Math.hypot(event.point.x - capture.start.x, event.point.y - capture.start.y);
      if (capture.entity && (capture.phase === "dragging" || distance > 6)) {
        moved.phase = "dragging";
        if (capture.phase !== "dragging") effects.push({ type: "pickup", entity: capture.entity });
        const point = screenToRoom(event.point, camera, origin);
        effects.push({
          type: "drag",
          entity: capture.entity,
          anchor: roomPoint(point.x - capture.grip.x, point.y - capture.grip.y),
        });
      } else if (!capture.entity) {
        const backgrounds = pointers.filter((p) => !p.entity);
        if (backgrounds.length === 2) {
          moved.phase = "camera";
          effects.push({
            type: "pinch",
            pointers: [event.point, backgrounds.find((p) => p.pointer !== event.pointer)!.point],
          });
        } else if (capture.phase === "camera" || distance > 8) {
          moved.phase = "camera";
          effects.push({ type: "pan", dx: event.point.x - capture.point.x, dy: event.point.y - capture.point.y });
        }
      }
      pointers = pointers.map((p) => (p.pointer === event.pointer ? moved : p));
    } else {
      pointers = pointers.filter((p) => p.pointer !== event.pointer);
      if (capture.entity) {
        if (event.type === "cancel") effects.push({ type: "restore", entity: capture.entity });
        else if (capture.phase === "dragging") {
          const proposal = event.proposal ?? capture.proposal;
          const owner = proposal?.target && state.reservations[proposal.target];
          if (proposal && proposal.id === capture.entity && (!owner || owner === capture.entity)) {
            effects.push({ type: "commit", entity: capture.entity, proposal });
            settling.push(capture.entity);
          } else effects.push({ type: "restore", entity: capture.entity });
        } else if (event.now - capture.startedAt <= 500) effects.push({ type: "tap", entity: capture.entity });
      }
    }
  }
  const phase = pointers.some((p) => p.phase === "dragging")
    ? "dragging"
    : pointers.some((p) => p.phase === "camera")
      ? "camera"
      : pointers.length
        ? "pending"
        : settling.length
          ? "settling"
          : event.type === "cancel"
            ? "cancelled"
            : "idle";
  const reservations: Record<string, EntityId> = {};
  for (const pointer of pointers) {
    if (pointer.entity && pointer.proposal?.target) reservations[pointer.proposal.target] = pointer.entity;
  }
  return { state: { phase, pointers, settling, reservations }, effects };
}
