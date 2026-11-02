import { useLayoutEffect, useMemo } from "react";
import { Gesture } from "react-native-gesture-handler";
import { runOnJS, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import { roomIds } from "../catalogMore";
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
  panInertia,
  includeBounds,
  roomAtScreen,
  zoomCamera,
  type Viewport,
} from "./CameraController";
import { translatedBounds } from "../scene/spatial";
import { prepareHits, pickEntity } from "./pick";
import { layoutToken } from "./layout";
import { settleProgress, canRevealResting } from "./settle";
import { releaseWindow, type ProbeFrame, type ProbeRelease, type ReleaseProbe } from "./frameProbe";
import { poseToken } from "./poseBank";

export type CaptureToken = { generation: number; epoch: number };
export type DragSlot = CaptureToken & {
  id: EntityId;
  restId?: EntityId;
  settledId?: EntityId;
  subject?: SceneEntity;
  carryBounds?: Bounds;
  pointer: number;
  ready: boolean;
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
  proposal?: DropProposal;
};
export type Pickup = CaptureToken & {
  id: EntityId;
  slot: number;
  scene: Scene;
  grip?: { x: number; y: number };
  destination?: Scene;
  identities?: Record<string, string>;
  committedId?: string;
};
function eventTime(): number {
  "worklet";
  return Date.now();
}
const emptySlot = (): DragSlot => {
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
  viewportOffset,
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
  onClear: (slot: number) => void;
  onDestination?: (slot: number, scene: Scene) => void;
  onFrameReport?: (times: number[]) => void;
  onReleaseProbe?: (probe: ReleaseProbe) => void;
  viewportOffset?: SharedValue<{ x: number; y: number }>;
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
  const prepared = useSharedValue(resolverScene);
  const hits = useMemo(() => prepareHits(scene), [scene]);
  const hitTable = useSharedValue(hits);
  const renderedRevision = useSharedValue(scene.revision);
  const expectedLayout = useMemo(() => Object.fromEntries(Object.values(scene.entities).map((e) => [e.id, layoutToken(e)])), [scene]);
  const layoutTokens = useSharedValue(expectedLayout);
  const laidOut = useSharedValue<Record<string, string>>({});
  const poseLayouts = useSharedValue<Record<string, string>>({});
  const acknowledgePose = (index: number, token: string) => {
    poseLayouts.set((current) => ({ ...current, [index]: token, [`${index}:${token}`]: token }));
  };
  const acknowledgeLayout = (id: string, token: string) => {
    laidOut.set((current) => ({ ...current, [id]: token }));
  };
  const controller = useSharedValue<ControllerState>(idleController);
  const slots = useSharedValue<DragSlot[]>([emptySlot(), emptySlot()]);
  const frameTimes = useSharedValue<number[]>([]);
  const probeRing = useSharedValue<ProbeFrame[]>([]);
  const probeCursor = useSharedValue(0);
  const probePending = useSharedValue<ProbeRelease[]>([]);
  const frameCount = useSharedValue(0);
  const lastFrame = useSharedValue(0);
  const inertia = useSharedValue({ x: 0, y: 0, since: 0, lastMove: 0 });
  const revealPan = useSharedValue<{ from: CameraMatrix; to: CameraMatrix; since: number } | null>(null);
  const pinchMid = useSharedValue({ x: 0, y: 0 });
  const pinchDistance = useSharedValue(0);
  const suppressed = useSharedValue<number[]>([]);
  const fixtureNudges = useSharedValue<Record<string, number>>({});
  const cameraGesture = useSharedValue(false);
  useLayoutEffect(() => {
    prepared.set(resolverScene);
    hitTable.set(hits);
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
        const restoredTray = !slot.proposal && entity?.attachment.kind === "staging";
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
  }, [scene, resolverScene, hits, prepared, hitTable, renderedRevision, slots, building, onDestination, expectedLayout, layoutTokens]);

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
  const subjectFor = (id?: string) => {
    "worklet";
    const slot = slots.value.find((s) => s.id === id);
    return id
      ? (prepared.value.entities[slot?.restId ?? id] ??
          (slot && !slot.consumed && !slot.committed ? slot.subject : undefined))
      : undefined;
  };
  const originFor = (id?: string) => {
    "worklet";
    const entity = subjectFor(id);
    const p = entity ? roomOrigin(roomIds.indexOf(entity.room), building) : { x: 0, y: 0 };
    return housePoint(p.x, p.y);
  };
  const proposalFor = (slot: DragSlot, release = false): DropProposal | undefined => {
    "worklet";
    const subject = subjectFor(slot.id);
    if (!subject) return undefined;
    const index = roomAtScreen(slot.pointerX, slot.pointerY, camera.value, building);
    const destination = index < 0 ? subject.room : roomIds[index];
    const origin = roomOrigin(roomIds.indexOf(destination), building);
    // Gaps return visibly to the committed source instead of cancelling invisibly.
    const anchor = index < 0 ? subject.contact : roomPoint(slot.x - origin.x, slot.y - origin.y);
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
    return resolve(prepared.value.rooms[destination], subject, anchor, {
      scale: camera.value.a,
      avoidFurnitureOverlap: designing,
      silhouette:
        index >= 0 && subject.character ? translatedBounds(slot.carryBounds ?? subject.bounds, anchor) : undefined,
      previous: slot.proposal,
      pending: slot.proposal?.pending,
      now: eventTime(),
      release,
      reservations,
    });
  };
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
    slots.set(
      current.map((s, i) =>
        i !== index
          ? s
          : {
              ...s,
              phase: "settling",
              releaseX: s.settleAt && committed ? s.releaseX : s.x,
              releaseY: s.settleAt && committed ? s.releaseY : s.y,
              targetX: committed && proposal ? origin.x + proposal.contact.x : s.sourceX,
              targetY: committed && proposal ? origin.y + proposal.contact.y : s.sourceY,
              proposal,
              consumed: committed && proposal?.kind === "mouth" && !restEntity,
              restId: restEntity?.id ?? (committed && proposal ? proposal.id : (s.restId ?? s.id)),
              subject: restEntity ?? s.subject,
              committed: true,
              revision: revision ?? renderedRevision.get(),
              settleAt: s.settleAt && committed ? s.settleAt : eventTime(),
              travelDelay: s.settleAt && committed ? s.travelDelay : 0,
              finished: committed && s.finished,
            }
      )
    );
  };
  const ready = (index: number, id: string, carryBounds?: Bounds) => {
    slots.set((current) =>
      current.map((s, i) => (i === index && s.id === id ? { ...s, ready: true, carryBounds } : s))
    );
  };

  const send = (event: ControllerEvent) => {
    "worklet";
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
          ...emptySlot(),
          id: effect.entity,
          generation: visible?.generation ?? captureSequence.value + 1,
          epoch: epoch.value,
          absoluteX: pointer.point.x + offset.value.x,
          absoluteY: pointer.point.y + offset.value.y,
          restId: visible?.restId,
          subject: entity,
          ready: visible?.ready ?? false,
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
          liftedAt: eventTime(),
          edgeAt: 0,
        };
        captureSequence.set(Math.max(captureSequence.value, slot.generation));
        slots.set(slots.value.map((s, i) => (i === index ? slot : s)));
        if (existing < 0 || !visible?.ready)
          runOnJS(onPickup)({
            id: effect.entity,
            slot: index,
            scene: prepared.value.entities[effect.entity]
              ? prepared.value
              : { ...prepared.value, entities: { ...prepared.value.entities, [effect.entity]: entity } },
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
          lag: reduced ? 0 : Math.max(-10, Math.min(10, (-vx / 500) * 10)),
          edgeAt: pointer.point.x < 48 || pointer.point.x > viewport.width - 48 ? slot.edgeAt || now : 0,
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
              settleAt: eventTime(), travelDelay: 0, finished: false, commitRequested: false } : s
          )
        );
      } else if (effect.type === "restore") {
        const pending = slots.value.findIndex((s) => s.id === effect.entity && s.phase === "pending" && !s.committed);
        if (pending >= 0) {
          const s = slots.value[pending];
          if (s.pausedElapsed > 0 && s.proposal) {
            slots.set(slots.value.map((slot, i) => i === pending ? { ...slot, phase: "settling",
              settleAt: eventTime() - s.pausedElapsed, commitRequested: false } : slot));
            continue;
          }
          slots.set(slots.value.map((s, i) => i === pending ? { ...s, id: "", ready: false } : s));
          runOnJS(onClear)(pending);
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
                    revision: renderedRevision.value,
                  }
                : slot
            )
          );
        }
      } else if (effect.type === "tap") runOnJS(onTap)(effect.entity, capture!.point, eventTime());
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
      const c = camera.value,
        b = s.subject.bounds;
      const x = point.x / c.a - c.tx / c.a,
        y = point.y / c.a - c.ty / c.a;
      if (x >= s.x + b.left && x <= s.x + b.left + b.width && y >= s.y + b.top && y <= s.y + b.top + b.height)
        return s.id;
    }
    const index = roomAtScreen(point.x, point.y, camera.value, building);
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
    return pickEntity(free, p, camera.value.a);
  };
  const resumePending = (pointer: number) => {
    "worklet";
    const pending = slots.value.findIndex((s) => s.id && s.pointer === pointer && s.phase === "pending" && !s.committed);
    if (pending >= 0) {
      slots.set(slots.value.map((s, i) => i === pending ? { ...s, id: "", ready: false } : s));
      runOnJS(onClear)(pending);
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
      for (const touch of event.changedTouches) {
        if (controller.value.pointers.length >= 2) {
          suppressed.set([...suppressed.value, touch.id]);
          continue;
        }
        const point = screenPoint(touch.x, touch.y),
          entity = hit(point);
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
          if (Math.hypot(touch.x - capture.start.x, touch.y - capture.start.y) > 6) {
            if (!reduced) fixtureNudges.set({ ...fixtureNudges.value, [capture.entity]: eventTime() });
            send({ type: "cancel", pointer: touch.id, now: eventTime() });
            suppressed.set([...suppressed.value, touch.id]);
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
          const slot = slots.value.find((s) => s.pointer === touch.id && s.id);
          const proposal = slot ? proposalFor(slot, true) : undefined;
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

  useFrameCallback((frame) => {
    const dt = frame.timeSincePreviousFrame ?? 16.67;
    if (onReleaseProbe) {
      const now = eventTime();
      probeRing.modify((ring) => { "worklet"; ring[probeCursor.value % 180] = { at: now, delta: dt }; return ring; });
      probeCursor.value++;
      const due = probePending.value.filter((p) => now >= p.at + 520);
      for (const release of due) runOnJS(onReleaseProbe)(releaseWindow(release, probeRing.value));
      if (due.length) probePending.set(probePending.value.filter((p) => now < p.at + 520));
    }
    lastFrame.set(eventTime());
    if (revealPan.value && !controller.value.pointers.length) {
      const { from, to, since } = revealPan.value;
      const t = reduced ? 1 : Math.min(1, (eventTime() - since) / 200);
      const p = t * t * (3 - 2 * t);
      camera.set({ ...to, tx: from.tx + (to.tx - from.tx) * p, ty: from.ty + (to.ty - from.ty) * p });
      if (t === 1) revealPan.set(null);
    }
    if (onFrameReport && frameCount.value < 3600) {
      frameTimes.value.push(dt);
      frameCount.value++;
    }
    if (frameCount.value === 3600 && onFrameReport) {
      frameCount.value++;
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
          if (slot.phase === "dragging" && slot.proposal?.pending && now - slot.proposal.pending.since >= 60)
            slot.proposal = proposalFor(slot);
          if (slot.phase === "settling" && slot.settleAt) {
            const progress = settleProgress(now - slot.settleAt - slot.travelDelay, reduced);
            slot.x = slot.releaseX + (slot.targetX - slot.releaseX) * progress;
            slot.y = slot.releaseY + (slot.targetY - slot.releaseY) * progress;
            slot.tilt *= 1 - progress;
            slot.lag *= 1 - progress;
            slot.finished = progress === 1;
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
            if (nativeReady && canRevealResting(slot, renderedRevision.value)) {
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
              slot.id = "";
              slot.ready = false;
              runOnJS(onClear)(i);
            }
          }
        }
        return current;
      });
  });
  const cancelAll = () => {
    revealPan.set(null);
    epoch.set(epoch.get() + 1);
    controller.set(idleController);
    inertia.set({ x: 0, y: 0, since: 0, lastMove: 0 });
    slots.set([emptySlot(), emptySlot()]);
    onClear(0);
    onClear(1);
  };
  const externalDown = (pointer: number, id: string, point: ScreenPoint) => {
    "worklet";
    send({
      type: "down",
      pointer,
      entity: id,
      point,
      contact: screenToRoom(point, camera.value, originFor(id)),
      now: eventTime(),
    });
  };
  const externalMove = (pointer: number, point: ScreenPoint) => {
    "worklet";
    send({ type: "move", pointer, point });
  };
  const externalUp = (pointer: number, cancel: boolean) => {
    "worklet";
    const slot = slots.value.find((s) => s.id && s.pointer === pointer);
    send({
      type: cancel ? "cancel" : "up",
      pointer,
      now: eventTime(),
      proposal: slot ? proposalFor(slot, true) : undefined,
    });
  };
  const resetFrames = () => {
    frameTimes.set([]);
    frameCount.set(0);
  };
  return {
    isCurrent,
    externalDown,
    externalMove,
    externalUp,
    resetFrames,
    gesture,
    camera,
    controller,
    slots,
    ready,
    finish,
    cancelAll,
    frameTimes,
    renderedRevision,
    acknowledgeLayout,
    acknowledgePose,
    poseLayouts,
    fixtureNudges,
    clock: lastFrame,
  };
}
export type Interaction = ReturnType<typeof useInteraction>;
