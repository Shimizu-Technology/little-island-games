import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, runOnUI, useFrameCallback, useSharedValue, type SharedValue, type FrameInfo } from "react-native-reanimated";
import { roomIds, type RoomId } from "../catalogMore";
import { roomOrigin, type Building } from "../camera";
import { transition, idleController, type ControllerState, type ControllerEvent } from "../scene/controller";
import { screenToRoom, type CameraMatrix } from "../scene/camera";
import { resolve, type DropProposal } from "../scene/proposal";
import {
  housePoint,
  roomPoint,
  screenPoint,
  type Scene,
  type EntityId,
  type ScreenPoint,
  type SceneEntity,
  type Bounds,
} from "../scene/types";
import { capabilityOf } from "../world";
import {
  boundCamera,
  edgeVelocity,
  EDGE_BAND,
  focusCamera,
  panInertia,
  includeBounds,
  roomAtScreen,
  shoreAtScreen,
  zoomCamera,
  type Viewport,
} from "./CameraController";
import { translatedBounds } from "../scene/spatial";
import { carriedCentre } from "./carry";
import { prepareHits, pickEntity, onShapes } from "./pick";
import { pickupScene, type PickupScene } from "./pickupScene";
import { layoutToken } from "./layout";
import { settleProgress, canRevealResting } from "./settle";
import { releaseWindow, type ProbeFrame, type ProbeRelease, type ReleaseProbe } from "./frameProbe";
import { anchorsFor } from "../scene/species";
import { poseToken } from "./poseBank";
import type { TraceEvent } from "./trace";
import {
  emptyRestingFlags,
  emptyRestingMotion,
  restingFlagsOf,
  restingMotionOf,
  type RestingFlags,
  type RestingMotion,
} from "./restingState";

export type CaptureToken = { generation: number; epoch: number };
export type DragSlot = CaptureToken & {
  id: EntityId;
  restId?: EntityId;
  settledId?: EntityId;
  subject?: SceneEntity;
  carryBounds?: Bounds;
  pointer: number;
  ready: boolean;
  painted: boolean;
  readyFrame: number;
  synthetic?: boolean;
  catalog?: boolean;
  duration?: number;
  landedAt?: number;
  phase: "pending" | "dragging" | "settling";
  consumed: boolean;
  absoluteX: number;
  absoluteY: number;
  x: number;
  y: number;
  sourceX: number;
  sourceY: number;
  releaseX: number;
  releaseY: number;
  targetX: number;
  targetY: number;
  gripX: number;
  gripY: number;
  pointerX: number;
  pointerY: number;
  tilt: number;
  lag: number;
  lastMoveAt: number;
  liftedAt: number;
  edgeAt: number;
  settleAt: number;
  travelDelay: number;
  pausedElapsed: number;
  committed: boolean;
  revision: string;
  finished: boolean;
  commitRequested?: boolean;
  /** Resting art and overlay overlap for two presented ticks before clearing. */
  revealFrame?: number;
  proposal?: DropProposal;
};
export type Pickup = CaptureToken & {
  id: EntityId;
  slot: number;
  scene: PickupScene;
  grip?: { x: number; y: number };
  destination?: Scene;
  identities?: Record<string, string>;
  committedId?: string;
};
export const ROOM_HOVER_MS = 300;
export type DropZone =
  | { kind: "room"; room: RoomId; x: number; y: number; width: number; height: number }
  | { kind: "drawer"; x: number; y: number; width: number; height: number };
export type RoomHover = { room: RoomId; since: number; progress: number; switched: boolean };
/** Window coordinates, as gesture absolute positions are. */
export function zoneAt(zones: readonly DropZone[], x: number, y: number): DropZone | undefined {
  "worklet";
  for (const zone of zones) if (x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) return zone;
  return undefined;
}
export const CAMERA_EASE_MS = 180;
export const DOOR_MS = 160;
export type CameraTween = { from: CameraMatrix; to: CameraMatrix; since: number; duration: number; door: boolean };
/** Smooth ease for one room move; a door holds the old view, swaps under a full veil, then clears. */
export function cameraTweenSample(tween: CameraTween, now: number): { camera: CameraMatrix; veil: number; done: boolean } {
  "worklet";
  const t = Math.max(0, Math.min(1, (now - tween.since) / tween.duration));
  if (tween.door) return { camera: t < 0.5 ? tween.from : tween.to, veil: 1 - Math.abs(2 * t - 1), done: t === 1 };
  const p = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const { from, to } = tween;
  return {
    camera: { ...to, a: from.a + (to.a - from.a) * p, d: from.d + (to.d - from.d) * p,
      tx: from.tx + (to.tx - from.tx) * p, ty: from.ty + (to.ty - from.ty) * p },
    veil: 0,
    done: t === 1,
  };
}
/** Each room's index (without the shared entity map) and its own entities, as one string. */
export function roomPayloadsOf(scene: Scene): Record<string, string> {
  const byRoom: Record<string, SceneEntity[]> = {};
  for (const entity of Object.values(scene.entities)) (byRoom[entity.room] ??= []).push(entity);
  return Object.fromEntries(Object.entries(scene.rooms).map(([id, index]) =>
    [id, JSON.stringify({ index: { ...index, entities: {} }, entities: byRoom[id] ?? [] })]));
}
/** Replaces only the sent rooms; every room index shares one entity map, as before. */
export function mergeRoomPayloads(previous: Scene, rooms: Record<string, string>, revision: string): Scene {
  "worklet";
  const entities: Scene["entities"] = {};
  const sent = Object.keys(rooms);
  for (const key in previous.entities) if (!sent.includes(previous.entities[key].room)) entities[key] = previous.entities[key];
  const indexes: Record<string, Scene["rooms"][keyof Scene["rooms"]]> = { ...previous.rooms };
  for (const id of sent) {
    const payload = JSON.parse(rooms[id]) as { index: Scene["rooms"][keyof Scene["rooms"]]; entities: SceneEntity[] };
    for (const entity of payload.entities) entities[entity.id] = entity;
    indexes[id] = payload.index;
  }
  for (const id in indexes) indexes[id] = { ...indexes[id], revision: indexes[id].revision, entities };
  return { revision, entities, rooms: indexes as Scene["rooms"] };
}
function eventTime(): number {
  "worklet";
  return Date.now();
}
export const emptyDragSlot = (): DragSlot => {
  "worklet";
  return {
    generation: 0,
    epoch: 0,
    consumed: false,
    absoluteX: 0,
    absoluteY: 0,
    id: "",
    pointer: -1,
    ready: false,
    painted: false,
    readyFrame: 0,
    phase: "dragging",
    x: 0,
    y: 0,
    sourceX: 0,
    sourceY: 0,
    releaseX: 0,
    releaseY: 0,
    targetX: 0,
    targetY: 0,
    gripX: 0,
    gripY: 0,
    pointerX: 0,
    pointerY: 0,
    tilt: 0,
    lag: 0,
    lastMoveAt: 0,
    liftedAt: 0,
    edgeAt: 0,
    settleAt: 0,
    travelDelay: 0,
    pausedElapsed: 0,
    committed: false,
    revision: "",
    finished: false,
  };
};

/** One recognizer owns raw contacts. No React state writes occur on pointer moves. */
export function useInteraction({
  scene,
  building,
  viewport,
  initialCamera,
  reduced,
  designing,
  onCameraChange,
  onPickup,
  onCommit,
  onTap,
  onClear,
  onDestination,
  onFrameReport,
  onReleaseProbe,
  onTrace,
  viewportOffset,
  currentRoom,
  onRoomHover,
}: {
  scene: Scene;
  building: Building;
  viewport: Viewport;
  initialCamera: CameraMatrix;
  reduced: boolean;
  designing: boolean;
  onCameraChange: (overview: boolean, index: number) => void;
  onPickup: (pickup: Pickup) => void;
  onCommit: (slot: number, proposal: DropProposal, at: { x: number; y: number }, token: CaptureToken) => void;
  onTap: (id: EntityId | undefined, point: ScreenPoint, now: number) => void;
  onClear: (slot: number, id?: string, reason?: "capacity") => void;
  onDestination?: (slot: number, scene: Scene) => void;
  onFrameReport?: (times: number[]) => void;
  onReleaseProbe?: (probe: ReleaseProbe) => void;
  /** Lab-only local log. Omitted everywhere else, including every family build. */
  onTrace?: (event: TraceEvent) => void;
  viewportOffset?: SharedValue<{ x: number; y: number }>;
  /** The room the child is looking at; a held room-button hover moves there (HM-14). */
  currentRoom?: RoomId;
  onRoomHover?: (room: RoomId) => void;
}) {
  const epoch = useSharedValue(0),
    captureSequence = useSharedValue(0);
  const defaultOffset = useSharedValue({ x: 0, y: 0 });
  const offset = viewportOffset ?? defaultOffset;
  const camera = useSharedValue(initialCamera);
  const resolverScene = useMemo(
    () => ({
      ...scene,
      rooms: Object.fromEntries(
        Object.entries(scene.rooms).map(([id, index]) => [id, { ...index, entities: scene.entities }])
      ) as Scene["rooms"],
    }),
    [scene]
  );
  // Transfer strings, then materialize plain UI objects before a gesture.
  // Thousands of lazy shareable getters otherwise land on the first drag frame.
  // HM-13: one string per room, and only rooms whose contents changed are sent.
  const roomPayloads = useMemo(() => roomPayloadsOf(scene), [scene]);
  const sentRooms = useRef<Record<string, string>>({});
  const prepared = useSharedValue(resolverScene);
  const stagingContacts = useSharedValue<Record<string, { x: number; y: number }>>({});
  const externalSubjects = useSharedValue<Record<string, SceneEntity>>({});
  const hits = useMemo(() => prepareHits(scene), [scene]);
  const hitTable = useSharedValue(hits);
  const renderedRevision = useSharedValue(scene.revision);
  const expectedLayout = useMemo(() => Object.fromEntries(Object.values(scene.entities).map((e) => [e.id, layoutToken(e)])), [scene]);
  const layoutTokens = useSharedValue(expectedLayout);
  const laidOut = useSharedValue<Record<string, string>>({});
  const poseLayouts = useSharedValue<Record<string, string>>({});
  const overlayLayouts = useSharedValue<Record<string, { generation: number; bounds?: Bounds }>>({});
  const acknowledgePose = (index: number, token: string) => {
    poseLayouts.modify((current) => { "worklet";
      current[index] = token; current[`${index}:${token}`] = token; return current;
    });
  };
  const acknowledgeLayout = (id: string, token: string) => {
    laidOut.modify((current) => { "worklet"; current[id] = token; return current; });
  };
  const controller = useSharedValue<ControllerState>(idleController);
  const slots = useSharedValue<DragSlot[]>([emptyDragSlot(), emptyDragSlot()]);
  const frameTimes = useSharedValue<number[]>([]);
  const traceFrames = useSharedValue<number[]>([]);
  const catalogTimes = useSharedValue<number[]>([]);
  const probeRing = useSharedValue<ProbeFrame[]>([]);
  const probeCursor = useSharedValue(0);
  const probeLastAt = useSharedValue(0);
  const probePending = useSharedValue<ProbeRelease[]>([]);
  const frameCount = useSharedValue(0);
  const lastFrame = useSharedValue(0);
  const inertia = useSharedValue({ x: 0, y: 0, since: 0, lastMove: 0 });
  const revealPan = useSharedValue<{ from: CameraMatrix; to: CameraMatrix; since: number } | null>(null);
  // HM-12 / HR-02: explicit camera moves ease on the UI thread; a floor change dips through a veil.
  const cameraTween = useSharedValue<CameraTween | null>(null);
  // HM-14: window-space places a carried thing can be dropped on outside the room view.
  const dropZones = useSharedValue<DropZone[]>([]);
  const roomHover = useSharedValue<RoomHover | null>(null);
  const activeRoom = useSharedValue<string>(currentRoom ?? "");
  const veil = useSharedValue(0);
  const pinchMid = useSharedValue({ x: 0, y: 0 });
  const pinchDistance = useSharedValue(0);
  const suppressed = useSharedValue<number[]>([]);
  // Raw down/move/up events survive the JS commit interval, including a whole
  // fast grab/release. Replay before hiding the landing overlay, against the
  // acknowledged scene/identity. Never invalidate an in-flight transaction.
  const queuedInput = useSharedValue<ControllerEvent[]>([]);
  const fixtureNudges = useSharedValue<Record<string, number>>({});
  const hint = useSharedValue<{ id: string; at: number } | null>(null);
  const cameraGesture = useSharedValue(false);
  // HM-13: resting art reads these, never `slots`. They change only on meaningful edges.
  const restingFlags = useSharedValue<RestingFlags>(emptyRestingFlags());
  const restingMotion = useSharedValue<RestingMotion>(emptyRestingMotion());
  // The frame callback stops itself when nothing needs a frame; UI-thread input restarts it.
  const framesOn = useSharedValue(true);
  const frameId = useSharedValue(-1);
  const idleFrames = useSharedValue(0);
  const wakeFrames = () => {
    "worklet";
    idleFrames.set(0);
    if (framesOn.value) return;
    framesOn.set(true);
    if (onTrace) runOnJS(onTrace)({ type: "frames-active", at: eventTime() });
    const registry = (globalThis as { _frameCallbackRegistry?: { manageStateFrameCallback: (id: number, on: boolean) => void } })._frameCallbackRegistry;
    if (registry && frameId.value >= 0) registry.manageStateFrameCallback(frameId.value, true);
  };


  useLayoutEffect(() => {
    const changed: Record<string, string> = {};
    for (const id of Object.keys(roomPayloads)) if (sentRooms.current[id] !== roomPayloads[id]) changed[id] = roomPayloads[id];
    sentRooms.current = roomPayloads;
    const changedHits = Object.fromEntries(Object.keys(changed).map((id) => [id, hits[id]]));
    runOnUI((rooms: Record<string, string>, revision: string, roomHits: typeof hits) => {
      "worklet";
      prepared.set(mergeRoomPayloads(prepared.value, rooms, revision));
      hitTable.modify((table) => { "worklet"; for (const id in roomHits) table[id] = roomHits[id]; return table; });
    })(changed, scene.revision, changedHits);
    renderedRevision.set(scene.revision);
    layoutTokens.set(expectedLayout);
    const refreshed: number[] = [];
    slots.set((current) =>
      current.map((slot, index) => {
        if (!slot.id || !slot.committed || slot.revision === scene.revision) return slot;
        refreshed.push(index);
        const entity = scene.entities[slot.restId ?? slot.id];
        if (!entity) return { ...slot, consumed: true, revision: scene.revision };
        const origin = entity ? roomOrigin(roomIds.indexOf(entity.room), building) : { x: 0, y: 0 };
        const sameContact =
          Math.abs(origin.x + entity.contact.x - slot.targetX) < 0.01 &&
          Math.abs(origin.y + entity.contact.y - slot.targetY) < 0.01 &&
          entity.base === (slot.proposal?.base ?? slot.subject?.base);
        const restoredTray = entity?.attachment.kind === "staging";
        if (sameContact || restoredTray) return { ...slot, revision: scene.revision };
        // A later transaction may displace the landing or finish a held action.
        // Continue from the visible transform toward that authoritative resting state.
        return {
          ...slot,
          revision: scene.revision,
          releaseX: slot.x,
          releaseY: slot.y,
          targetX: origin.x + entity.contact.x,
          targetY: origin.y + entity.contact.y,
          travelDelay: slot.phase === "pending" ? slot.pausedElapsed : Math.max(0, eventTime() - slot.settleAt),
          finished: false,
          proposal: slot.proposal
            ? {
                ...slot.proposal,
                contact: entity.contact,
                room: entity.room,
                base: entity.base,
                facing: entity.facing,
                attachment: entity.attachment,
              }
            : undefined,
        };
      })
    );
    refreshed.forEach((index) => onDestination?.(index, scene));
  }, [scene, resolverScene, roomPayloads, hits, prepared, hitTable, renderedRevision, slots, building, onDestination, expectedLayout, layoutTokens]);

  useLayoutEffect(() => { activeRoom.set(currentRoom ?? ""); }, [currentRoom, activeRoom]);
  const movable = useSharedValue<Record<string, boolean>>({});
  useLayoutEffect(() => {
    movable.set(
      Object.fromEntries(
        Object.values(scene.entities).map((e) => [
          e.id,
          !e.item || designing || capabilityOf(e.item.item).moveInPlay === true,
        ])
      )
    );
  }, [scene, designing, movable]);
  const subjectFor = useCallback((id?: string) => {
    "worklet";
    const slot = slots.value.find((s) => s.id === id);
    return id
      ? (prepared.value.entities[slot?.restId ?? id] ??
          externalSubjects.value[id] ??
          (slot && !slot.consumed && !slot.committed ? slot.subject : undefined))
      : undefined;
  }, [prepared, slots, externalSubjects]);
  const originFor = useCallback((id?: string) => {
    "worklet";
    const entity = subjectFor(id);
    const p = entity ? roomOrigin(roomIds.indexOf(entity.room), building) : { x: 0, y: 0 };
    return housePoint(p.x, p.y);
  }, [subjectFor, building]);
  const proposalFor = useCallback((slot: DragSlot): DropProposal | undefined => {
    "worklet";
    const subject = subjectFor(slot.id);
    if (!subject) return undefined;
    const zone = slot.catalog ? undefined : zoneAt(dropZones.value, slot.absoluteX, slot.absoluteY);
    if (zone?.kind === "room")
      // A room button is a destination: the open floor in front of that room.
      return resolve(prepared.value.rooms[zone.room], subject, roomPoint(400, 480), { scale: camera.value.a, floorOnly: true, release: true });
    if (zone?.kind === "drawer")
      return resolve(prepared.value.rooms[subject.room], subject, subject.contact, { scale: camera.value.a, intent: "staging", release: true });
    const index = roomAtScreen(slot.pointerX, slot.pointerY, camera.value, building);
    if (index < 0) {
      // HM-15: the sand is not a place. A thing let go there drops onto the nearest open floor,
      // travelling there visibly. A beach shell let go on the sand goes back to its spot.
      const shore = shoreAtScreen(slot.pointerX, slot.pointerY, camera.value, building);
      if (shore >= 0) {
        if (subject.id.includes("/item/portion-") && subject.contact.y > 560) return undefined;
        const at = roomOrigin(shore, building);
        return resolve(prepared.value.rooms[roomIds[shore]], subject, roomPoint(slot.x - at.x, slot.y - at.y),
          { scale: camera.value.a, floorOnly: true, release: true });
      }
    }
    const destination = index < 0 ? subject.room : roomIds[index];
    const origin = roomOrigin(roomIds.indexOf(destination), building);
    // Gaps return visibly to the committed source instead of cancelling invisibly.
    const anchor = index < 0 ? subject.contact : roomPoint(slot.x - origin.x, slot.y - origin.y);
    const centre = subject.item && index >= 0 ? carriedCentre(subject, anchor.x, anchor.y, slot.gripX, slot.gripY, camera.value.a, reduced) : undefined;
    const reservations: Record<string, string> = {};
    for (let i = 0; i < 2; i++) {
      const other = slots.value[i];
      if (!other.id || other.id === slot.id) continue;
      if (other.proposal?.target) reservations[other.proposal.target] = other.id;
      for (const target of prepared.value.rooms[destination].targets) {
        let owner: string | undefined = target.owner;
        while (owner) {
          if (owner === other.id || owner === other.restId) {
            reservations[target.id] = other.id;
            break;
          }
          owner = prepared.value.entities[owner]?.parent;
        }
      }
    }
    const started = onTrace && slot.catalog ? eventTime() : undefined;
    const proposal = resolve(prepared.value.rooms[destination], subject, anchor, {
      scale: camera.value.a,
      aim: centre && roomPoint(centre.x, centre.y),
      contact: index >= 0 ? screenToRoom(screenPoint(slot.pointerX, slot.pointerY), camera.value, housePoint(origin.x, origin.y)) : undefined,
      avoidFurnitureOverlap: designing,
      catalog: slot.catalog,
      silhouette:
        index >= 0 && subject.character ? translatedBounds(slot.carryBounds ?? subject.bounds, anchor) : undefined,
      previous: slot.proposal,
      pending: slot.proposal?.pending,
      now: eventTime(),
      reservations,
    });
    if (started !== undefined) catalogTimes.modify(times => { "worklet"; times.push(eventTime() - started); return times; });
    return proposal;
  }, [subjectFor, slots, prepared, camera, building, designing, reduced, onTrace, catalogTimes]);
  const isCurrent = (index: number, token: CaptureToken) => {
    const slot = slots.get()[index];
    return (
      !!slot.id &&
      !slot.consumed &&
      slot.phase === "settling" &&
      slot.generation === token.generation &&
      epoch.get() === token.epoch
    );
  };
  const finish = (
    index: number,
    committed: boolean,
    proposal?: DropProposal,
    revision?: string,
    destination?: Scene,
    token?: CaptureToken,
    identity?: string
  ) => {
    if (token && !isCurrent(index, token)) return;
    const current = slots.get();
    const slot = current[index];
    if (!slot.id) return;
    const origin = proposal ? roomOrigin(roomIds.indexOf(proposal.room), building) : { x: 0, y: 0 };
    const restEntity = destination && destination.entities[identity ?? proposal?.id ?? slot.restId ?? slot.id];
    const retargeted = committed && proposal && !(slot.synthetic && proposal.kind === "staging") &&
      (Math.abs(origin.x + proposal.contact.x - slot.targetX) > .01 || Math.abs(origin.y + proposal.contact.y - slot.targetY) > .01);
    slots.set(
      current.map((s, i) =>
        i !== index
          ? s
          : {
              ...s,
              phase: "settling",
              releaseX: s.settleAt && committed && !retargeted ? s.releaseX : s.x,
              releaseY: s.settleAt && committed && !retargeted ? s.releaseY : s.y,
              targetX: committed && proposal ? s.synthetic && proposal.kind === "staging" ? s.targetX : origin.x + proposal.contact.x : s.sourceX,
              targetY: committed && proposal ? s.synthetic && proposal.kind === "staging" ? s.targetY : origin.y + proposal.contact.y : s.sourceY,
              proposal,
              consumed: s.catalog && !committed || committed && proposal?.kind === "mouth" && !restEntity,
              restId: restEntity?.id ?? (committed && proposal ? proposal.id : (s.restId ?? s.id)),
              subject: restEntity ?? s.subject,
              committed: true,
              revision: revision ?? renderedRevision.get(),
              settleAt: s.settleAt && committed && !retargeted ? s.settleAt : eventTime(),
              travelDelay: s.settleAt && committed && !retargeted ? s.travelDelay : 0,
              finished: committed && s.finished && !retargeted,
              landedAt: retargeted ? undefined : s.landedAt,
              revealFrame: undefined,
            }
      )
    );
  };
  const unready = useCallback((id: string) => {
    overlayLayouts.modify(layouts => { "worklet"; delete layouts[id]; return layouts; });
  }, [overlayLayouts]);
  const ready = (index: number, id: string, carryBounds?: Bounds, generation?: number) => {
    overlayLayouts.modify((layouts) => { "worklet"; layouts[id] = { generation: generation ?? slots.get().find(s => s.id === id)?.generation ?? 0, bounds: carryBounds }; return layouts; });
    slots.modify((current) => { "worklet";
      const slot = current[index];
      if (slot?.id === id) {
        if (!slot.ready) {
          slot.liftedAt = eventTime();
          slot.readyFrame = 0;
          if (slot.phase === "settling") slot.settleAt = slot.synthetic ? 0 : eventTime();
        }
        slot.ready = true; slot.carryBounds = carryBounds;
      }
      return current;
    });
    if (onTrace) {
      onTrace({ type: "ready", at: Date.now(), id, slot: index });
      requestAnimationFrame(() => onTrace({ type: "painted", at: Date.now(), id, slot: index }));
    }
  };

  const publish = () => {
    "worklet";
    // Set only on change, so an unchanged frame triggers no mapper.
    // Returning the previous object with forceUpdate=false wakes nothing.
    restingFlags.modify((previous) => {
      "worklet";
      const next = restingFlagsOf(slots.value, controller.value.pointers);
      return next.key === previous.key ? previous : next;
    }, false);
    restingMotion.modify((previous) => {
      "worklet";
      const next = restingMotionOf(slots.value, renderedRevision.value, camera.value.a, eventTime(), reduced, fixtureNudges.value, hint.value);
      return next.key === previous.key ? previous : next;
    }, false);
  };  const switchRoom = (room: RoomId) => {
    "worklet";
    if (activeRoom.value === room) return;
    const from = roomIds.indexOf(activeRoom.value as RoomId), to = roomIds.indexOf(room);
    const door = from >= 0 && Math.floor(from / building.columns) !== Math.floor(to / building.columns);
    activeRoom.set(room);
    const target = focusCamera(to, viewport, building);
    if (reduced) camera.set(target);
    else cameraTween.set({ from: camera.value, to: target, since: eventTime(), duration: door ? DOOR_MS : CAMERA_EASE_MS, door });
    if (onRoomHover) runOnJS(onRoomHover)(room);
  };
  const sendEvent = (event: ControllerEvent, replay = false) => {
    "worklet";
    if (!replay && event.type !== "settled" && (queuedInput.value.length ||
      slots.value.some((s) => s.id && s.commitRequested && !s.committed))) {
      queuedInput.set([...queuedInput.value, event]);
      return;
    }
    if (replay && event.type === "down" && event.entity) {
      const id = event.entity, slot = slots.value.find((s) => s.id === id || s.restId === id);
      if (slot) {
        const origin = originFor(slot.id);
        event = { ...event, entity: slot.id, contact: roomPoint(slot.x - origin.x, slot.y - origin.y) };
      }
    }
    if (replay && event.type === "up") {
      const pointer = event.pointer;
      const slot = slots.value.find((s) => s.id && s.pointer === pointer && s.phase !== "settling");
      const proposal = slot?.proposal;
      if (onReleaseProbe && slot?.phase === "dragging")
        probePending.set([...probePending.value, { at: event.now, id: slot.id,
          kind: proposal?.kind ?? "restore", target: proposal?.target }]);
      event = { ...event, proposal };
    }
    const capture =
      event.type !== "settled" ? controller.value.pointers.find((p) => p.pointer === event.pointer) : undefined;
    let state = controller.value;
    if (event.type === "up" && event.proposal && capture?.entity && event.proposal.id !== capture.entity) {
      const slot = slots.value.find((s) => s.id === capture.entity && s.restId === event.proposal!.id);
      if (slot) {
        const canonical = event.proposal.id;
        state = {
          ...state,
          pointers: state.pointers.map((p) => (p.pointer === event.pointer ? { ...p, entity: canonical } : p)),
          reservations: Object.fromEntries(
            Object.entries(state.reservations).map(([key, owner]) => [
              key,
              owner === capture.entity ? canonical : owner,
            ])
          ),
        };
      }
    }
    const next = transition(
      state,
      event,
      camera.value,
      originFor(capture?.entity ?? (event.type === "down" ? event.entity : undefined))
    );
    controller.set(next.state);
    for (const effect of next.effects) {
      // Anchored furniture answers a tap or a nudge. It never needs a carry overlay.
      if ((effect.type === "contact" || effect.type === "pickup") && movable.value[effect.entity] === false) continue;
      if (effect.type === "contact") {
        const index = slots.value.findIndex((s) => s.id === effect.entity && !s.consumed);
        if (index >= 0) {
          const settling = slots.value[index].settledId;
          if (settling)
            controller.set(
              transition(controller.value, { type: "settled", entity: settling }, camera.value, housePoint(0, 0)).state
            );
          captureSequence.set(captureSequence.value + 1);
          slots.set(
            slots.value.map((s, i) =>
              i === index
                ? {
                    ...s,
                    generation: captureSequence.value,
                    epoch: epoch.value,
                    pointer: event.type === "down" ? event.pointer : s.pointer,
                    phase: "pending",
                    pausedElapsed: s.settleAt ? eventTime() - s.settleAt : 0,
                    settleAt: 0,
                    finished: false,
                  }
                : s
            )
          );
        }
      }
      if ((effect.type === "contact" && !slots.value.some((s) => s.id === effect.entity)) || effect.type === "pickup") {
        const entity = subjectFor(effect.entity);
        if (!entity) continue;
        const pointer = next.state.pointers.find((p) => p.entity === effect.entity)!;
        const existing = slots.value.findIndex((s) => s.id === effect.entity);
        const index = existing >= 0 ? existing : slots.value.findIndex((s) => !s.id);
        if (index < 0) continue;
        const origin = originFor(effect.entity);
        const visible = existing >= 0 ? slots.value[existing] : undefined;
        const slot = {
          ...emptyDragSlot(),
          id: effect.entity,
          generation: visible?.generation ?? captureSequence.value + 1,
          epoch: epoch.value,
          absoluteX: pointer.point.x + offset.value.x,
          absoluteY: pointer.point.y + offset.value.y,
          restId: visible?.restId,
          subject: entity,
          carryBounds: visible?.carryBounds ?? overlayLayouts.value[effect.entity]?.bounds,
          ready: visible?.ready ?? (!!entity.body?.small && overlayLayouts.value[effect.entity] !== undefined),
          painted: visible?.painted ?? false,
          readyFrame: visible?.readyFrame ?? 0,
          catalog: visible?.catalog ?? !!externalSubjects.value[effect.entity],
          pointer: pointer.pointer,
          phase: effect.type === "contact" ? "pending" as const : "dragging" as const,
          x: visible?.x ?? entity.contact.x + origin.x,
          y: visible?.y ?? entity.contact.y + origin.y,
          sourceX:
            entity.attachment.kind === "staging"
              ? screenToRoom(pointer.start, camera.value, housePoint(0, 0)).x - pointer.grip.x
              : entity.contact.x + origin.x,
          sourceY:
            entity.attachment.kind === "staging"
              ? screenToRoom(pointer.start, camera.value, housePoint(0, 0)).y - pointer.grip.y
              : entity.contact.y + origin.y,
          gripX: pointer.grip.x,
          gripY: pointer.grip.y,
          pointerX: pointer.point.x,
          pointerY: pointer.point.y,
          liftedAt: effect.type === "pickup" && (visible?.ready || !!entity.body?.small && overlayLayouts.value[effect.entity] !== undefined) ? eventTime() : visible?.liftedAt ?? 0,
          edgeAt: 0,
        };
        captureSequence.set(Math.max(captureSequence.value, slot.generation));
        slots.set(slots.value.map((s, i) => (i === index ? slot : s)));
        if (existing < 0 || !visible?.ready)
          runOnJS(onPickup)({
            id: effect.entity,
            slot: index,
            scene: pickupScene(prepared.value, entity),
            grip: { x: pointer.grip.x, y: pointer.grip.y },
            generation: slot.generation,
            epoch: slot.epoch,
          });
      } else if (effect.type === "drag") {
        const index = slots.value.findIndex((s) => s.id === effect.entity);
        if (index < 0) continue;
        const slot = slots.value[index],
          origin = originFor(effect.entity);
        const pointer = next.state.pointers.find((p) => p.entity === effect.entity)!;
        const now = eventTime(),
          x = effect.anchor.x + origin.x,
          y = effect.anchor.y + origin.y;
        const dt = Math.max(1, now - (slot.lastMoveAt || now - 16));
        const vx = ((x - slot.x) * camera.value.a * 1000) / dt;
        const alpha = 1 - Math.exp(-dt / 50);
        const nextSlot = {
          ...slot,
          x,
          y,
          lastMoveAt: now,
          pointerX: pointer.point.x,
          pointerY: pointer.point.y,
          absoluteX: pointer.point.x + offset.value.x,
          absoluteY: pointer.point.y + offset.value.y,
          tilt: reduced ? 0 : slot.tilt + (Math.max(-6, Math.min(6, (vx / 500) * 6)) - slot.tilt) * alpha,
          lag: reduced ? 0 : slot.lag + (Math.max(-10, Math.min(10, (-vx / 500) * 10)) - slot.lag) * alpha,
          edgeAt: pointer.point.x < EDGE_BAND || pointer.point.x > viewport.width - EDGE_BAND ? slot.edgeAt || now : 0,
        };
        nextSlot.proposal = proposalFor(nextSlot);
        slots.set(slots.value.map((s, i) => (i === index ? nextSlot : s)));
      } else if (effect.type === "commit") {
        const index = slots.value.findIndex((s) => s.id === effect.entity || s.restId === effect.entity);
        const slot = slots.value[index];
        if (!slot) continue;
        const origin = roomOrigin(roomIds.indexOf(effect.proposal.room), building);
        slots.set(
          slots.value.map((s, i) =>
            i === index ? { ...s, phase: "settling", proposal: effect.proposal, settledId: effect.entity,
              releaseX: s.x, releaseY: s.y,
              targetX: origin.x + effect.proposal.contact.x, targetY: origin.y + effect.proposal.contact.y,
              x: reduced ? origin.x + effect.proposal.contact.x : s.x,
              y: reduced ? origin.y + effect.proposal.contact.y : s.y,
              settleAt: eventTime(), travelDelay: 0, finished: false, commitRequested: false } : s
          )
        );
      } else if (effect.type === "restore") {
        const pending = slots.value.findIndex((s) => s.id === effect.entity && s.phase === "pending" && !s.committed);
        if (pending >= 0) {
          const s = slots.value[pending];
          if (s.proposal) {
            slots.set(slots.value.map((slot, i) => i === pending ? { ...slot, phase: "settling",
              settleAt: s.synthetic && !s.pausedElapsed ? 0 : eventTime() - s.pausedElapsed, commitRequested: false } : slot));
            continue;
          }
          slots.set(slots.value.map((s, i) => i === pending ? { ...s, id: "", ready: false } : s));
          runOnJS(onClear)(pending, effect.entity);
          continue;
        }
        const index = slots.value.findIndex((s) => s.id === effect.entity);
        if (index >= 0) {
          const s = slots.value[index];
          slots.set(
            slots.value.map((slot, i) =>
              i === index
                ? {
                    ...slot,
                    phase: "settling",
                    releaseX: s.x,
                    releaseY: s.y,
                    targetX: s.sourceX,
                    targetY: s.sourceY,
                    settleAt: eventTime(),
                    travelDelay: 0,
                    committed: true,
                    consumed: !!s.catalog && !prepared.value.entities[s.restId ?? s.id],
                    revision: renderedRevision.value,
                  }
                : slot
            )
          );
        }
      } else if (effect.type === "tap") {
        const identity = slots.value.find((s) => s.id === effect.entity)?.restId ?? effect.entity;
        runOnJS(onTap)(identity, capture!.point, eventTime());
      }
      else if (effect.type === "pan") {
        cameraGesture.set(true);
        const now = eventTime(),
          dt = Math.max(1, now - (inertia.value.lastMove || now - 16));
        camera.set(
          boundCamera(
            { ...camera.value, tx: camera.value.tx + effect.dx, ty: camera.value.ty + effect.dy },
            viewport,
            building
          )
        );
        inertia.set({
          x: Math.max(-1200, Math.min(1200, (effect.dx * 1000) / dt)),
          y: Math.max(-1200, Math.min(1200, (effect.dy * 1000) / dt)),
          since: 0,
          lastMove: now,
        });
      } else if (effect.type === "pinch") {
        cameraGesture.set(true);
        const [a, b] = effect.pointers;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance.value > 0)
          camera.set(
            zoomCamera(
              {
                ...camera.value,
                tx: camera.value.tx + (a.x + b.x) / 2 - pinchMid.value.x,
                ty: camera.value.ty + (a.y + b.y) / 2 - pinchMid.value.y,
              },
              distance / pinchDistance.value,
              (a.x + b.x) / 2,
              (a.y + b.y) / 2,
              viewport,
              building
            )
          );
        pinchDistance.set(distance);
        pinchMid.set({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        controller.set({
          ...controller.value,
          pointers: controller.value.pointers.map((p) => (p.entity ? p : { ...p, phase: "camera" })),
        });
      }
    }
  };
  const send = (event: ControllerEvent, replay = false) => {
    "worklet";
    wakeFrames();
    sendEvent(event, replay);
    publish();
  };
  const capturedRelative = (id: string): boolean => {
    "worklet";
    for (const capture of controller.value.pointers) {
      if (!capture.entity) continue;
      let key: string | undefined = id;
      while (key) {
        if (key === capture.entity) return true;
        key = prepared.value.entities[key]?.parent;
      }
      key = capture.entity;
      while (key) {
        if (key === id) return true;
        key = prepared.value.entities[key]?.parent;
      }
    }
    return false;
  };
  const hit = (point: ScreenPoint): string | undefined => {
    "worklet";
    for (let i = 1; i >= 0; i--) {
      const s = slots.value[i];
      if (!s.id || s.consumed || s.phase !== "settling" || !s.subject || capturedRelative(s.restId ?? s.id)) continue;
      const c = camera.value;
      const pose = s.subject.character && s.proposal && s.finished
        ? anchorsFor(s.subject.character.slot, s.proposal.base, s.proposal.facing, s.subject.action)
        : undefined;
      const b = pose?.bounds ?? s.subject.bounds;
      const x = point.x / c.a - c.tx / c.a,
        y = point.y / c.a - c.ty / c.a;
      const shapes = pose?.shapes ?? s.subject.shapes;
      if (shapes ? onShapes(shapes, x - s.x, y - s.y) : x >= s.x + b.left && x <= s.x + b.left + b.width && y >= s.y + b.top && y <= s.y + b.top + b.height)
        return s.id;
    }
    let index = roomAtScreen(point.x, point.y, camera.value, building);
    if (index < 0) index = shoreAtScreen(point.x, point.y, camera.value, building);
    if (index < 0) return undefined;
    const origin = roomOrigin(index, building);
    const p = screenToRoom(point, camera.value, housePoint(origin.x, origin.y));
    const free = hitTable.value[roomIds[index]].filter((proxy) => {
      if (capturedRelative(proxy.id)) return false;
      for (const slot of slots.value) {
        if (!slot.id) continue;
        let id: string | undefined = proxy.id;
        while (id) {
          if (id === slot.id || id === slot.restId) return false;
          id = prepared.value.entities[id]?.parent;
        }
        id = slot.restId ?? slot.id;
        while (id) {
          if (id === proxy.id) return false;
          id = prepared.value.entities[id]?.parent;
        }
      }
      return true;
    });
    return pickEntity(free, p, camera.value.a, movable.value);
  };
  const resumePending = (pointer: number) => {
    "worklet";
    const pending = slots.value.findIndex((s) => s.id && s.pointer === pointer && s.phase === "pending" && !s.committed);
    if (pending >= 0) {
      const paused = slots.value[pending];
      if (paused.proposal) {
        slots.set(slots.value.map((s, i) => i === pending ? { ...s, phase: "settling",
          settleAt: s.synthetic && !s.pausedElapsed ? 0 : eventTime() - s.pausedElapsed } : s));
        return;
      }
      slots.set(slots.value.map((s, i) => i === pending ? { ...s, id: "", ready: false } : s));
      runOnJS(onClear)(pending, paused.id);
      return;
    }
    slots.set(
      slots.value.map((s) =>
        s.id && s.pointer === pointer && s.phase === "pending"
          ? {
              ...s,
              phase: "settling",
              releaseX: s.committed ? s.releaseX : s.x,
              releaseY: s.committed ? s.releaseY : s.y,
              targetX: s.committed ? s.targetX : s.sourceX,
              targetY: s.committed ? s.targetY : s.sourceY,
              proposal: s.committed ? s.proposal : undefined,
              committed: true,
              revision: renderedRevision.value,
              settleAt: eventTime() - (s.committed ? s.pausedElapsed : 0),
              travelDelay: s.committed ? s.travelDelay : 0,
            }
          : s
      )
    );
  };
  const gesture = Gesture.Manual()
    .onTouchesDown((event, manager) => {
      manager.activate();
      if (!controller.value.pointers.length) cameraGesture.set(false);
      inertia.set({ x: 0, y: 0, since: 0, lastMove: 0 });
      revealPan.set(null);
      // A carried thing keeps an explicit room move running; a new hand on the room takes over.
      if (!controller.value.pointers.some((p) => !!p.entity) && cameraTween.value) {
        camera.set(cameraTween.value.to);
        cameraTween.set(null);
        veil.set(0);
      }
      for (const touch of event.changedTouches) {
        if (controller.value.pointers.length >= 2) {
          suppressed.set([...suppressed.value, touch.id]);
          continue;
        }
        const point = screenPoint(touch.x, touch.y);
        let entity = hit(point);
        // Furniture that stays put is scenery to a two-finger pinch.
        if (controller.value.pointers.length && entity && movable.value[entity] === false) entity = undefined;
        const fixed = controller.value.pointers.find((p) => p.entity && movable.value[p.entity] === false);
        if (fixed) send({ type: "to-camera", pointer: fixed.pointer, point: fixed.point });
        if (onTrace) runOnJS(onTrace)({ type: "pick", at: eventTime(), pointer: touch.id, x: touch.x, y: touch.y, entity });
        if (entity && controller.value.pointers.some((p) => !p.entity)) {
          suppressed.set([...suppressed.value, touch.id]);
          continue;
        }
        const first = controller.value.pointers.find((p) => p.entity && p.phase === "pending");
        // A pinch centred on one actor is a no-op. Different actors remain two captures.
        if (first && subjectFor(first.entity)?.character && (!entity || entity === first.entity)) {
          send({ type: "cancel", pointer: first.pointer, now: eventTime() });
          suppressed.set([...suppressed.value, first.pointer, touch.id]);
          continue;
        }
        if (!entity && controller.value.pointers.some((p) => p.entity)) {
          suppressed.set([...suppressed.value, touch.id]);
          continue;
        }
        send({
          type: "down",
          pointer: touch.id,
          point,
          entity,
          contact: entity
            ? (() => {
                const slot = slots.value.find((s) => s.id === entity && s.phase === "settling");
                if (slot) {
                  const origin = originFor(entity);
                  return roomPoint(slot.x - origin.x, slot.y - origin.y);
                }
                return subjectFor(entity)?.contact;
              })()
            : undefined,
          now: eventTime(),
        });
        const bg = controller.value.pointers.filter((p) => !p.entity);
        if (bg.length === 2) {
          pinchMid.set({ x: (bg[0].point.x + bg[1].point.x) / 2, y: (bg[0].point.y + bg[1].point.y) / 2 });
          pinchDistance.set(Math.hypot(bg[0].point.x - bg[1].point.x, bg[0].point.y - bg[1].point.y));
        }
      }
    })
    .onTouchesMove((event) => {
      for (const touch of event.changedTouches) {
        if (suppressed.value.includes(touch.id)) continue;
        const capture = controller.value.pointers.find((p) => p.pointer === touch.id);
        if (capture?.entity && movable.value[capture.entity] === false) {
          // A wobble says "I stay here" and the same finger carries on panning the room.
          if (Math.hypot(touch.x - capture.start.x, touch.y - capture.start.y) > 6) {
            if (!reduced) fixtureNudges.set({ ...fixtureNudges.value, [capture.entity]: eventTime() });
            send({ type: "to-camera", pointer: touch.id, point: screenPoint(touch.x, touch.y) });
          }
          continue;
        }
        send({ type: "move", pointer: touch.id, point: screenPoint(touch.x, touch.y) });
      }
    })
    .onTouchesUp((event, manager) => {
      for (const touch of event.changedTouches) {
        if (!suppressed.value.includes(touch.id)) {
          const capture = controller.value.pointers.find((p) => p.pointer === touch.id);
          if (capture?.phase === "dragging")
            send({ type: "move", pointer: touch.id, point: screenPoint(touch.x, touch.y) });
          const slot = slots.value.find((s) => s.pointer === touch.id && s.id && s.phase === "dragging");
          const proposal = slot?.proposal;
          if (onTrace && capture?.phase === "dragging" && slot) {
            const origin = originFor(slot.id);
            runOnJS(onTrace)({ type: "release", at: eventTime(), id: slot.id, kind: proposal?.kind ?? "restore", target: proposal?.target,
              finger: { x: touch.x, y: touch.y }, anchor: { x: slot.x - origin.x, y: slot.y - origin.y }, contact: proposal?.contact, room: proposal?.room });
          }
          const dropZone = slot && !slot.catalog ? zoneAt(dropZones.value, slot.absoluteX, slot.absoluteY) : undefined;
          if (dropZone?.kind === "room" && proposal) switchRoom(dropZone.room);
          if (onReleaseProbe && capture?.phase === "dragging" && slot)
            probePending.set([...probePending.value, { at: eventTime(), id: slot.id,
              kind: proposal?.kind ?? "restore", target: proposal?.target }]);
          if (capture && !capture.entity && capture.phase === "pending")
            runOnJS(onTap)(undefined, screenPoint(touch.x, touch.y), eventTime());
          if (capture?.phase === "camera" && !capture.entity && pinchDistance.value === 0)
            inertia.set({ ...inertia.value, since: eventTime() });
          send({ type: "up", pointer: touch.id, now: eventTime(), proposal });
          resumePending(touch.id);
        }
        suppressed.set(suppressed.value.filter((id) => id !== touch.id));
      }
      if (event.numberOfTouches === 0) {
        pinchDistance.set(0);
        manager.end();
        const index = roomAtScreen(viewport.width / 2, viewport.height / 2, camera.value, building);
        const overview =
          camera.value.a <= Math.min(viewport.width / building.width, viewport.height / building.height) * 1.15;
        // A tap may navigate on JS. Do not overwrite that navigation with the old overview camera.
        if (cameraGesture.value) runOnJS(onCameraChange)(overview, index);
        cameraGesture.set(false);
      }
    })
    .onTouchesCancelled((event, manager) => {
      for (const touch of event.changedTouches) send({ type: "cancel", pointer: touch.id, now: eventTime() });
      suppressed.set([]);
      pinchDistance.set(0);
      manager.end();
    });

  const frameCallback = useCallback((frame: FrameInfo) => {
    "worklet";
    const dt = frame.timeSincePreviousFrame ?? 16.67;
    if (onReleaseProbe) {
      const now = eventTime();
      const delta = Math.max(dt, probeLastAt.value ? now - probeLastAt.value : dt);
      probeLastAt.set(now);
      probeRing.modify((ring) => { "worklet"; ring[probeCursor.value % 180] = { at: now, delta }; return ring; });
      probeCursor.set(probeCursor.value + 1);
      const due = probePending.value.filter((p) => now >= p.at + 520);
      for (const release of due) runOnJS(onReleaseProbe)({ ...releaseWindow(release, probeRing.value),
        gates: slots.value.map((s, index) => {
          const entity = prepared.value.entities[s.restId ?? s.id];
          const pose = entity && poseToken(entity.base, entity.facing, entity.action);
          return { id: s.id, phase: s.phase, committed: s.committed, finished: s.finished,
            revisionReady: s.revision === renderedRevision.value,
            layoutReady: !!entity && laidOut.value[entity.id] === layoutTokens.value[entity.id],
            poseReady: !!pose && poseLayouts.value[`${index}:${pose}`] === pose,
            pose, poseKeys: Object.keys(poseLayouts.value),
          };
        }),
      });
      if (due.length) probePending.set(probePending.value.filter((p) => now < p.at + 520));
    }
    const nudging = Object.values(fixtureNudges.value).some(at => lastFrame.value < at + 220) ||
      (!!hint.value && lastFrame.value < hint.value.at + 220);
    if (slots.value.some(s => !!s.id) || nudging) lastFrame.set(eventTime());
    if (queuedInput.value.length && !slots.value.some((s) => s.id && s.commitRequested &&
      (!s.committed || s.revision !== renderedRevision.value))) {
      const events = queuedInput.value;
      queuedInput.set([]);
      for (const event of events) {
        send(event, true);
        if (event.type === "up") resumePending(event.pointer);
      }
    }
    if (cameraTween.value) {
      const tween = cameraTween.value;
      const sample = cameraTweenSample(tween, eventTime());
      camera.set(sample.camera);
      veil.set(sample.veil);
      if (sample.done) cameraTween.set(null);
    }
    if (revealPan.value && !controller.value.pointers.length) {
      const { from, to, since } = revealPan.value;
      const t = reduced ? 1 : Math.min(1, (eventTime() - since) / 200);
      const p = t * t * (3 - 2 * t);
      camera.set({ ...to, tx: from.tx + (to.tx - from.tx) * p, ty: from.ty + (to.ty - from.ty) * p });
      if (t === 1) revealPan.set(null);
    }
    if (onTrace) {
      traceFrames.modify((times) => { "worklet"; times.push(dt); return times; });
      if (traceFrames.value.length >= 120 || (idleFrames.value >= 2 && traceFrames.value.length >= 12)) {
        const sorted = [...traceFrames.value].sort((a, b) => a - b), at = (q: number) => sorted[Math.floor(sorted.length * q)];
        runOnJS(onTrace)({ type: "frames", at: eventTime(), samples: sorted.length, p50: at(.5), p95: at(.95), p99: at(.99), max: sorted[sorted.length - 1] });
        traceFrames.set([]);
        if (catalogTimes.value.length) {
          const sorted = [...catalogTimes.value].sort((a, b) => a - b), at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
          runOnJS(onTrace)({ type: "catalog-resolve", at: eventTime(), samples: sorted.length, p50: at(.5), p95: at(.95), p99: at(.99), max: sorted[sorted.length - 1] });
          catalogTimes.set([]);
        }
      }
    }
    if (onFrameReport && frameCount.value < 3600) {
      frameTimes.modify((times) => { "worklet"; times.push(dt); return times; });
      frameCount.set(frameCount.value + 1);
    }
    if (frameCount.value === 3600 && onFrameReport) {
      frameCount.set(frameCount.value + 1);
      runOnJS(onFrameReport)(frameTimes.value);
    }
    if (inertia.value.since && !controller.value.pointers.length) {
      const v = inertia.value,
        elapsed = eventTime() - v.since;
      const x = panInertia(v.x, dt, elapsed, reduced),
        y = panInertia(v.y, dt, elapsed, reduced);
      const old = camera.value,
        next = boundCamera({ ...old, tx: old.tx + (x * dt) / 1000, ty: old.ty + (y * dt) / 1000 }, viewport, building);
      camera.set(next);
      inertia.set({ ...v, x: next.tx === old.tx ? 0 : x, y: next.ty === old.ty ? 0 : y, since: x || y ? v.since : 0 });
    }
    const edgeOwner = slots.value.find((s) => s.id && s.phase === "dragging" && s.edgeAt);

    if (edgeOwner) {
      const vx = edgeVelocity(edgeOwner.pointerX, viewport.width, eventTime() - edgeOwner.edgeAt);
      if (vx) {
        const before = camera.value;
        camera.set(boundCamera({ ...before, tx: before.tx + (vx * Math.min(32, dt)) / 1000 }, viewport, building));
      }
    }
    // Mutate the two fixed slots on the UI thread; no array/object copies per settle frame.
    if (slots.value[0].id || slots.value[1].id)
      slots.modify((current) => {
        "worklet";
        const now = eventTime();
        for (let i = 0; i < 2; i++) {
          const slot = current[i];
          if (!slot.id) continue;
          if (slot.ready && !slot.painted) {
            if (slot.readyFrame > 0) slot.painted = true;
            else slot.readyFrame = now;
          }
          if (
            slot.phase === "dragging" &&
            now - slot.lastMoveAt > 24 &&
            (Math.abs(slot.tilt) > 0.01 || Math.abs(slot.lag) > 0.01)
          ) {
            const factor = now - slot.lastMoveAt >= 160 ? 0 : Math.exp(-dt / 50);
            slot.tilt *= factor;
            slot.lag *= factor;
          }
          if (slot.phase === "dragging") {
            const pointerX = slot.absoluteX - offset.value.x;
            const pointerY = slot.absoluteY - offset.value.y;
            // CameraController only produces axis-aligned scale/translation matrices.
            const x = (pointerX - camera.value.tx) / camera.value.a - slot.gripX;
            const y = (pointerY - camera.value.ty) / camera.value.d - slot.gripY;
            if (
              Math.abs(slot.x - x) > 0.001 ||
              Math.abs(slot.y - y) > 0.001 ||
              slot.pointerX !== pointerX ||
              slot.pointerY !== pointerY
            ) {
              slot.x = x;
              slot.y = y;
              slot.pointerX = pointerX;
              slot.pointerY = pointerY;
              slot.proposal = proposalFor(slot);
            }
          }
          const earlyLayout = overlayLayouts.value[slot.id];
          if (!slot.ready && earlyLayout && (earlyLayout.generation === slot.generation || slot.subject?.body?.small)) {
            slot.ready = true; slot.liftedAt = now; slot.readyFrame = 0; slot.carryBounds = earlyLayout.bounds;
            if (slot.phase === "settling") slot.settleAt = slot.synthetic ? 0 : now;
          }
          if (slot.phase === "dragging" && slot.proposal?.pending && now - slot.proposal.pending.since >= 60)
            slot.proposal = proposalFor(slot);
          if (slot.phase === "settling" && slot.ready && slot.synthetic && !slot.settleAt) {
            slot.settleAt = now;
            slot.liftedAt = now;
          }
          if (slot.phase === "settling" && slot.settleAt && slot.ready) {
            const progress = settleProgress(now - slot.settleAt - slot.travelDelay, reduced, slot.duration);
            slot.x = slot.releaseX + (slot.targetX - slot.releaseX) * progress;
            slot.y = slot.releaseY + (slot.targetY - slot.releaseY) * progress;
            slot.tilt *= 1 - progress;
            slot.lag *= 1 - progress;
            slot.finished = progress === 1;
            if (slot.finished && slot.catalog && !slot.landedAt) slot.landedAt = now;
            // Motion and pose start at release on UI. Apply/save only after travel;
            // the pre-mounted target remains visible while JS/native acknowledge.
            if (slot.finished && !slot.committed && !slot.commitRequested && slot.proposal) {
              slot.commitRequested = true;
              runOnJS(onCommit)(i, slot.proposal, { x: slot.releaseX, y: slot.releaseY },
                { generation: slot.generation, epoch: slot.epoch });
            }
            const entity = prepared.value.entities[slot.restId ?? slot.id];
            const nativeReady = slot.consumed || (entity && (entity.attachment.kind === "staging" ||
              (laidOut.value[entity.id] === layoutTokens.value[entity.id] &&
                (!entity.character || poseLayouts.value[i] === layoutTokens.value[entity.id] ||
                  poseLayouts.value[`${i}:${poseToken(entity.base, entity.facing, entity.action)}`] === poseToken(entity.base, entity.facing, entity.action)))));
            if (nativeReady && (!slot.catalog || reduced || !!slot.landedAt && now - slot.landedAt >= 160) && canRevealResting(slot, renderedRevision.value)) {
              if (entity?.character && !slot.consumed && slot.proposal) {
                const origin = roomOrigin(roomIds.indexOf(entity.room), building);
                const bounds = translatedBounds(
                  entity.bounds,
                  roomPoint(origin.x + entity.contact.x, origin.y + entity.contact.y)
                );
                const next = includeBounds(camera.value, bounds, viewport, building);
                if (next.tx !== camera.value.tx || next.ty !== camera.value.ty)
                  revealPan.set({ from: camera.value, to: next, since: now });
              }
              // Native opacity publication and removal need separate presented ticks.
              // Reveal the acknowledged resting tree before retiring the carry tree.
              if (slot.synthetic && !slot.consumed && entity?.attachment.kind !== "staging") {
                slot.revealFrame = (slot.revealFrame ?? 0) + 1;
                if (slot.revealFrame < 3) continue;
              }
              let settled = transition(
                controller.value,
                { type: "settled", entity: slot.id },
                camera.value,
                housePoint(0, 0)
              ).state;
              if (slot.restId && slot.restId !== slot.id)
                settled = transition(
                  settled,
                  { type: "settled", entity: slot.restId },
                  camera.value,
                  housePoint(0, 0)
                ).state;
              if (slot.settledId && slot.settledId !== slot.id && slot.settledId !== slot.restId)
                settled = transition(
                  settled,
                  { type: "settled", entity: slot.settledId },
                  camera.value,
                  housePoint(0, 0)
                ).state;
              controller.set(settled);
              if (slot.catalog) externalSubjects.modify((subjects) => { "worklet"; delete subjects[slot.id]; return subjects; });
              const cleared = slot.id;
              slot.id = "";
              slot.ready = false;
              runOnJS(onClear)(i, cleared);
            }
          }
        }
        return current;
      });
    let hovering: RoomId | undefined;
    for (const slot of slots.value) {
      if (!slot.id || slot.phase !== "dragging" || slot.catalog) continue;
      const zone = zoneAt(dropZones.value, slot.absoluteX, slot.absoluteY);
      if (zone?.kind === "room") hovering = zone.room;
    }
    const before = roomHover.value;
    if (!hovering) { if (before) roomHover.set(null); }
    else {
      const now = eventTime();
      const since = before?.room === hovering ? before.since : now;
      const progress = Math.min(1, (now - since) / ROOM_HOVER_MS);
      const switched = before?.room === hovering && before.switched;
      if (progress >= 1 && !switched) switchRoom(hovering);
      if (!before || before.room !== hovering || before.progress !== progress || (progress >= 1 && !switched))
        roomHover.set({ room: hovering, since, progress, switched: switched || progress >= 1 });
    }
    publish();
    const busy = !!slots.value[0].id || !!slots.value[1].id || queuedInput.value.length > 0 || !!revealPan.value || !!cameraTween.value ||
      !!inertia.value.since || nudging || probePending.value.length > 0 || controller.value.pointers.some((p) => !!p.entity);
    if (busy) idleFrames.set(0);
    else {
      idleFrames.set(idleFrames.value + 1);
      if (idleFrames.value >= 3 && framesOn.value) {
        framesOn.set(false);
        if (onTrace) runOnJS(onTrace)({ type: "frames-idle", at: eventTime() });
        const registry = (globalThis as { _frameCallbackRegistry?: { manageStateFrameCallback: (id: number, on: boolean) => void } })._frameCallbackRegistry;
        if (registry && frameId.value >= 0) registry.manageStateFrameCallback(frameId.value, false);
      }
    }
  // send/resumePending read these shared channels. Keeping their render-local
  // identities out of dependencies preserves the native callback clock.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTrace, traceFrames, catalogTimes, onReleaseProbe, probeRing, probeCursor, probeLastAt, probePending, queuedInput, slots, prepared, renderedRevision, laidOut, layoutTokens,
    poseLayouts, overlayLayouts, fixtureNudges, externalSubjects, lastFrame, revealPan, controller, reduced, camera, onFrameReport, frameCount, frameTimes, inertia,
    viewport, building, offset, proposalFor, onCommit, onClear]);
  const frames = useFrameCallback(frameCallback) as ReturnType<typeof useFrameCallback> | undefined;
  // A new callback registers active (in the hook's own effect, which runs first); tell the
  // UI side its id so it can stop and restart it.
  useEffect(() => {
    const id = frames?.callbackId ?? -1;
    runOnUI(() => {
      "worklet";
      frameId.set(id);
      framesOn.set(true);
      idleFrames.set(0);
    })();
  }, [frameCallback, frames, frameId, framesOn, idleFrames]);
  const cancelAll = () => {
    revealPan.set(null);
    epoch.set(epoch.get() + 1);
    controller.set(idleController);
    inertia.set({ x: 0, y: 0, since: 0, lastMove: 0 });
    queuedInput.set([]);
    externalSubjects.set({});
    slots.set([emptyDragSlot(), emptyDragSlot()]);
    restingFlags.set(emptyRestingFlags());
    restingMotion.set(emptyRestingMotion());
    onClear(0);
    onClear(1);
  };
  const externalDown = (pointer: number, id: string, point: ScreenPoint, subject?: SceneEntity) => {
    "worklet";
    const begin = () => {
      "worklet";
    if (subject) externalSubjects.set({ ...externalSubjects.value, [id]: subject });
    send({
      type: "down",
      pointer,
      entity: id,
      point,
      contact: screenToRoom(point, camera.value, originFor(id)),
      now: eventTime(),
    });
    };
    if (globalThis._WORKLET) begin(); else runOnUI(begin)();
  };
  const externalMove = (pointer: number, point: ScreenPoint) => {
    "worklet";
    send({ type: "move", pointer, point });
  };
  const externalUp = (pointer: number, cancel: boolean) => {
    "worklet";
    const slot = slots.value.find((s) => s.id && s.pointer === pointer && s.phase !== "settling");
    if (slot?.catalog && (cancel || !slot.proposal || slot.proposal.kind === "staging")) {
      controller.set(transition(controller.value, { type: "cancel", pointer, now: eventTime() }, camera.value, originFor(slot.id)).state);
      externalSubjects.modify((subjects) => { "worklet"; delete subjects[slot.id]; return subjects; });
      const index = slots.value.indexOf(slot);
      slots.set(slots.value.map((s, i) => i === index ? emptyDragSlot() : s));
      runOnJS(onClear)(index, slot.id, !cancel ? slot.proposal?.refusal : undefined);
      return;
    }
    if (!cancel && slot?.proposal && onTrace) runOnJS(onTrace)({ type: "release", at: eventTime(), id: slot.id,
      kind: slot.proposal.kind, target: slot.proposal.target, finger: { x: slot.pointerX, y: slot.pointerY },
      anchor: { x: slot.x, y: slot.y }, contact: slot.proposal.contact, room: slot.proposal.room });
    send({
      type: cancel ? "cancel" : "up",
      pointer,
      now: eventTime(),
      proposal: slot?.proposal,
    });
  };
  const externalDrop = (pointer: number, point: ScreenPoint, cancel: boolean) => {
    runOnUI(() => {
      "worklet";
      externalMove(pointer, point);
      externalUp(pointer, cancel);
    })();
  };
  /** Non-drag moves own a normal slot and the same commit/re-grab gates. */
  const animateProposal = (proposal: DropProposal, subjectOverride?: SceneEntity, start?: { x: number; y: number }, onAccepted?: (accepted: boolean) => void) => {
    const subject = subjectOverride ?? subjectFor(proposal.id);
    const current = slots.get();
    if (!subject || current.some(s => s.id === subject.id || s.restId === subject.id)) return false;
    const index = current.findIndex(s => !s.id);
    if (index < 0) return false;
    const origin = roomOrigin(roomIds.indexOf(subject.room), building);
    const dest = roomOrigin(roomIds.indexOf(proposal.room), building);
    const staged = subject.attachment.kind === "staging" ? stagingContacts.get()[subject.id] : undefined;
    if (subject.attachment.kind === "staging" && !start && !staged) return false;
    const from = start ?? (staged ? screenToRoom(screenPoint(staged.x - offset.get().x, staged.y - offset.get().y), camera.get(), housePoint(0, 0)) : undefined) ?? { x: origin.x + subject.contact.x, y: origin.y + subject.contact.y };
    const end = proposal.kind === "staging"
      ? screenToRoom(screenPoint(112, viewport.height - 48), camera.get(), housePoint(0, 0))
      : { x: dest.x + proposal.contact.x, y: dest.y + proposal.contact.y };
    const requestedEpoch = epoch.get();
    // JS SharedValue writes are asynchronous on native. Allocate, publish, then
    // notify JS in one UI transaction so pickup cannot read an empty old slot.
    runOnUI(() => {
      "worklet";
      wakeFrames();
      if (epoch.value !== requestedEpoch) { if (onAccepted) runOnJS(onAccepted)(false); return; }
      const current = slots.value;
      const index = current.findIndex(s => !s.id);
      if (index < 0 || current.some(s => s.id === subject.id || s.restId === subject.id)) {
        if (onAccepted) runOnJS(onAccepted)(false); return;
      }
      const generation = captureSequence.value + 1;
      captureSequence.set(generation);
      const warm = !subjectOverride && overlayLayouts.value[subject.id] !== undefined && (!!subject.body?.small || !!subject.character && index === 0);
      const now = eventTime();
      const slot: DragSlot = { ...emptyDragSlot(), id: subject.id, subject, pointer: -1000 - index,
        generation, epoch: epoch.value, phase: "settling", synthetic: true, catalog: !!subjectOverride,
        carryBounds: warm ? overlayLayouts.value[subject.id]?.bounds : undefined,
        ready: warm, liftedAt: warm ? now : 0,
        sourceX: from.x, sourceY: from.y, releaseX: from.x, releaseY: from.y, x: from.x, y: from.y,
        targetX: end.x, targetY: end.y,
        proposal, settleAt: 0, duration: Math.min(400, Math.max(240,
          Math.hypot(end.x - from.x, end.y - from.y) * camera.value.a * 1.2)),
      };
      slots.set(current.map((s, i) => i === index ? slot : s));
      if (onAccepted) runOnJS(onAccepted)(true);
      runOnJS(onPickup)({ id: subject.id, slot: index,
        scene: pickupScene(prepared.value, subject),
        generation, epoch: slot.epoch, grip: { x: 0, y: 0 } });
      if (reduced) {
        slots.modify(current => { "worklet";
          current[index] = { ...current[index], ready: warm, painted: false, finished: true,
            x: slot.targetX, y: slot.targetY, commitRequested: true };
          return current;
        });
        runOnJS(onCommit)(index, proposal, from, { generation, epoch: slot.epoch });
      }
    })();
    return true;
  };
  /** HM-12: ease to `to` in 180 ms, or dip through the veil for another floor. Reduced Motion jumps. */
  const animateCamera = (to: CameraMatrix, door = false) => {
    runOnUI(() => {
      "worklet";
      revealPan.set(null);
      inertia.set({ x: 0, y: 0, since: 0, lastMove: 0 });
      if (reduced) {
        cameraTween.set(null);
        veil.set(0);
        camera.set(to);
        return;
      }
      cameraTween.set({ from: camera.value, to, since: eventTime(), duration: door ? DOOR_MS : CAMERA_EASE_MS, door });
      wakeFrames();
    })();
  };
  /** HR-02: one quiet wiggle on `id`. The frame callback runs only for its 180 ms. */
  const showHint = (id: string) => {
    runOnUI(() => {
      "worklet";
      if (controller.value.pointers.length || slots.value.some((s) => !!s.id)) return;
      hint.set({ id, at: eventTime() });
      wakeFrames();
    })();
  };
  const resetFrames = () => {
    frameTimes.set([]);
    frameCount.set(0);
  };
  return {
    isCurrent,
    animateProposal,
    stagingContacts,
    externalDrop,
    externalDown,
    externalMove,
    externalUp,
    resetFrames,
    gesture,
    camera,
    controller,
    slots,
    ready,
    unready,
    finish,
    cancelAll,
    frameTimes,
    renderedRevision,
    acknowledgeLayout,
    acknowledgePose,
    poseLayouts,
    fixtureNudges,
    restingFlags,
    restingMotion,
    showHint,
    animateCamera,
    veil,
    dropZones,
    roomHover,
    clock: lastFrame,
  };
}
export type Interaction = ReturnType<typeof useInteraction>;
