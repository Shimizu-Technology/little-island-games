import { useLayoutEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { roomIds } from '../catalogMore';
import { roomOrigin, type Building } from '../camera';
import { transition, idleController, type ControllerState, type ControllerEvent } from '../scene/controller';
import { screenToRoom, type CameraMatrix } from '../scene/camera';
import { resolve, type DropProposal } from '../scene/proposal';
import { housePoint, roomPoint, screenPoint, type Scene, type EntityId, type ScreenPoint, type SceneEntity } from '../scene/types';
import { capabilityOf } from '../world';
import { boundCamera, edgeVelocity, roomAtScreen, zoomCamera, type Viewport } from './CameraController';
import { settleProgress, canRevealResting } from './settle';

export type DragSlot = {
  id: EntityId; restId?: EntityId; subject?: SceneEntity; pointer: number; ready: boolean; phase: 'dragging' | 'settling';
  x: number; y: number; sourceX: number; sourceY: number;
  releaseX: number; releaseY: number; targetX: number; targetY: number;
  gripX: number; gripY: number; pointerX: number; pointerY: number;
  tilt: number; lag: number; liftedAt: number; edgeAt: number; settleAt: number;
  committed: boolean; revision: string; finished: boolean; proposal?: DropProposal;
};
export type Pickup = { id: EntityId; slot: number; scene: Scene; destination?: Scene };
function eventTime(): number { 'worklet'; return Date.now(); }
const emptySlot = (): DragSlot => { 'worklet'; return ({ id: '', pointer: -1, ready: false, phase: 'dragging', x: 0, y: 0, sourceX: 0, sourceY: 0, releaseX: 0, releaseY: 0, targetX: 0, targetY: 0, gripX: 0, gripY: 0, pointerX: 0, pointerY: 0, tilt: 0, lag: 0, liftedAt: 0, edgeAt: 0, settleAt: 0, committed: false, revision: '', finished: false }); };

/** One recognizer owns raw contacts. No React state writes occur on pointer moves. */
export function useInteraction({ scene, building, viewport, initialCamera, reduced, designing, onCameraChange, onPickup, onCommit, onTap, onClear, onFrameReport }: {
  scene: Scene; building: Building; viewport: Viewport; initialCamera: CameraMatrix; reduced: boolean; designing: boolean; onCameraChange: (overview: boolean, index: number) => void;
  onPickup: (pickup: Pickup) => void;
  onCommit: (slot: number, proposal: DropProposal, at: { x: number; y: number }) => void;
  onTap: (id: EntityId | undefined, point: ScreenPoint) => void;
  onClear: (slot: number) => void;
  onFrameReport?: (times: number[]) => void;
}) {
  const camera = useSharedValue(initialCamera);
  const prepared = useSharedValue(scene);
  const renderedRevision = useSharedValue(scene.revision);
  const controller = useSharedValue<ControllerState>(idleController);
  const slots = useSharedValue<DragSlot[]>([emptySlot(), emptySlot()]);
  const frameTimes = useSharedValue<number[]>([]);
  const frameCount = useSharedValue(0);
  const lastFrame = useSharedValue(0);
  const pinchDistance = useSharedValue(0);
  const suppressed = useSharedValue<number[]>([]);
  useLayoutEffect(() => { prepared.set(scene); renderedRevision.set(scene.revision); }, [scene, prepared, renderedRevision]);

  const movable = useSharedValue<Record<string, boolean>>({});
  useLayoutEffect(() => { movable.set(Object.fromEntries(Object.values(scene.entities).map(e => [e.id, !e.item || designing || capabilityOf(e.item.item).moveInPlay === true]))); }, [scene, designing, movable]);
  const subjectFor = (id?: string) => {
    'worklet';
    const slot = slots.value.find(s => s.id === id);
    return id ? prepared.value.entities[slot?.restId ?? id] ?? slot?.subject : undefined;
  };
  const originFor = (id?: string) => {
    'worklet';
    const entity = subjectFor(id);
    const p = entity ? roomOrigin(roomIds.indexOf(entity.room), building) : { x: 0, y: 0 };
    return housePoint(p.x, p.y);
  };
  const proposalFor = (slot: DragSlot, release = false): DropProposal | undefined => {
    'worklet';
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
      if (other.id && other.id !== slot.id && other.proposal?.target) reservations[other.proposal.target] = other.id;
    }
    return resolve(prepared.value.rooms[destination], subject, anchor, { scale: camera.value.a, previous: slot.proposal, now: eventTime(), release, reservations });
  };
  const finish = (index: number, committed: boolean, proposal?: DropProposal, revision?: string, destination?: Scene) => {
    const current = slots.get();
    const slot = current[index];
    if (!slot.id) return;
    const origin = proposal ? roomOrigin(roomIds.indexOf(proposal.room), building) : { x: 0, y: 0 };
    const restEntity = destination && Object.values(destination.entities).find(e => slot.subject?.character ? e.character?.slot === slot.subject.character.slot : e.item?.id === slot.subject?.item?.id);
    slots.set(current.map((s, i) => i !== index ? s : {
      ...s, phase: 'settling', releaseX: s.x, releaseY: s.y,
      targetX: committed && proposal ? origin.x + proposal.contact.x : s.sourceX,
      targetY: committed && proposal ? origin.y + proposal.contact.y : s.sourceY,
      proposal, restId: restEntity?.id ?? s.id, subject: restEntity ?? s.subject, committed: true, revision: revision ?? renderedRevision.get(), settleAt: eventTime(), finished: false,
    }));
  };
  const ready = (index: number, id: string) => {
    slots.set(current => current.map((s, i) => i === index && s.id === id ? { ...s, ready: true } : s));
  };

  const send = (event: ControllerEvent) => {
    'worklet';
    const capture = event.type !== 'settled' ? controller.value.pointers.find(p => p.pointer === event.pointer) : undefined;
    const next = transition(controller.value, event, camera.value, originFor(capture?.entity ?? (event.type === 'down' ? event.entity : undefined)));
    controller.set(next.state);
    for (const effect of next.effects) {
      if (effect.type === 'pickup') {
        const entity = subjectFor(effect.entity);
        if (!entity) continue;
        const pointer = next.state.pointers.find(p => p.entity === effect.entity)!;
        const existing = slots.value.findIndex(s => s.id === effect.entity);
        const index = existing >= 0 ? existing : slots.value.findIndex(s => !s.id);
        if (index < 0) continue;
        const origin = originFor(effect.entity);
        const visible = existing >= 0 ? slots.value[existing] : undefined;
        const slot = { ...emptySlot(), id: effect.entity, restId: visible?.restId, subject: entity, ready: visible?.ready ?? false, pointer: pointer.pointer,
          x: visible?.x ?? entity.contact.x + origin.x, y: visible?.y ?? entity.contact.y + origin.y,
          sourceX: entity.contact.x + origin.x, sourceY: entity.contact.y + origin.y,
          gripX: pointer.grip.x, gripY: pointer.grip.y, pointerX: pointer.point.x, pointerY: pointer.point.y,
          liftedAt: eventTime(), edgeAt: 0 };
        slots.set(slots.value.map((s, i) => i === index ? slot : s));
        if (existing < 0) runOnJS(onPickup)({ id: effect.entity, slot: index, scene: prepared.value });
      } else if (effect.type === 'drag') {
        const index = slots.value.findIndex(s => s.id === effect.entity);
        if (index < 0) continue;
        const slot = slots.value[index], origin = originFor(effect.entity);
        const pointer = next.state.pointers.find(p => p.entity === effect.entity)!;
        const now = eventTime(), x = effect.anchor.x + origin.x, y = effect.anchor.y + origin.y;
        const dt = Math.max(1, now - (lastFrame.value || now - 16));
        const vx = (x - slot.x) * camera.value.a * 1000 / dt;
        const alpha = 1 - Math.exp(-dt / 50);
        const nextSlot = { ...slot, x, y, pointerX: pointer.point.x, pointerY: pointer.point.y,
          tilt: reduced ? 0 : slot.tilt + (Math.max(-6, Math.min(6, vx / 500 * 6)) - slot.tilt) * alpha,
          lag: reduced ? 0 : Math.max(-10, Math.min(10, -vx / 500 * 10)),
          edgeAt: pointer.point.x < 48 || pointer.point.x > viewport.width - 48 ? slot.edgeAt || now : 0 };
        nextSlot.proposal = proposalFor(nextSlot);
        slots.set(slots.value.map((s, i) => i === index ? nextSlot : s));
      } else if (effect.type === 'commit') {
        const index = slots.value.findIndex(s => s.id === effect.entity);
        const slot = slots.value[index];
        if (!slot) continue;
        slots.set(slots.value.map((s, i) => i === index ? { ...s, phase: 'settling', proposal: effect.proposal } : s));
        runOnJS(onCommit)(index, effect.proposal, { x: slot.x, y: slot.y });
      } else if (effect.type === 'restore') {
        const index = slots.value.findIndex(s => s.id === effect.entity);
        if (index >= 0) {
          const s = slots.value[index];
          slots.set(slots.value.map((slot, i) => i === index ? { ...slot, phase: 'settling', releaseX: s.x, releaseY: s.y, targetX: s.sourceX, targetY: s.sourceY, settleAt: eventTime(), committed: true, revision: renderedRevision.value } : slot));
        }
      } else if (effect.type === 'tap') runOnJS(onTap)(effect.entity, capture!.point);
      else if (effect.type === 'pan') camera.set(boundCamera({ ...camera.value, tx: camera.value.tx + effect.dx, ty: camera.value.ty + effect.dy }, viewport, building));
      else if (effect.type === 'pinch') {
        const [a, b] = effect.pointers;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance.value > 0) camera.set(zoomCamera(camera.value, distance / pinchDistance.value, (a.x + b.x) / 2, (a.y + b.y) / 2, viewport, building));
        pinchDistance.set(distance);
      }
    }
  };
  const hit = (point: ScreenPoint): string | undefined => {
    'worklet';
    for (let i = 1; i >= 0; i--) {
      const s = slots.value[i];
      if (!s.id || s.phase !== 'settling' || !s.subject) continue;
      const c = camera.value, b = s.subject.bounds, e = s.subject.contact;
      const x = point.x / c.a - c.tx / c.a, y = point.y / c.a - c.ty / c.a;
      if (x >= s.x + b.left - e.x && x <= s.x + b.left - e.x + b.width && y >= s.y + b.top - e.y && y <= s.y + b.top - e.y + b.height) return s.id;
    }
    const index = roomAtScreen(point.x, point.y, camera.value, building);
    if (index < 0) return undefined;
    const origin = roomOrigin(index, building);
    const p = screenToRoom(point, camera.value, housePoint(origin.x, origin.y));
    const proxies = prepared.value.rooms[roomIds[index]].hitProxies;
    let winner: string | undefined, best = -Infinity;
    for (const proxy of proxies) {
      const b = proxy.bounds;
      if (p.x < b.left || p.x > b.left + b.width || p.y < b.top || p.y > b.top + b.height) continue;
      const entity = prepared.value.entities[proxy.id];
      // Visible held props precede their owners; ground decorations stay behind.
      const rank = proxy.depth + (entity?.attachment.kind === 'hand' ? 10000 : 0);
      if (rank > best || rank === best && proxy.id < (winner ?? '~')) { winner = proxy.id; best = rank; }
    }
    return winner;
  };
  const gesture = Gesture.Manual()
    .onTouchesDown((event, manager) => {
      manager.activate();
      for (const touch of event.changedTouches) {
        const point = screenPoint(touch.x, touch.y), entity = hit(point);
        if (entity && controller.value.pointers.some(p => !p.entity)) { suppressed.set([...suppressed.value, touch.id]); continue; }
        const first = controller.value.pointers.find(p => p.entity && p.phase === 'pending');
        // A pinch centred on one actor is a no-op. Different actors remain two captures.
        if (first && (!entity || entity === first.entity)) {
          send({ type: 'cancel', pointer: first.pointer, now: eventTime() });
          suppressed.set([...suppressed.value, first.pointer, touch.id]);
          continue;
        }
        if (!entity && controller.value.pointers.some(p => p.entity)) { suppressed.set([...suppressed.value, touch.id]); continue; }
        send({ type: 'down', pointer: touch.id, point, entity, contact: entity ? (() => {
          const slot = slots.value.find(s => s.id === entity && s.phase === 'settling');
          if (slot) { const origin = originFor(entity); return roomPoint(slot.x - origin.x, slot.y - origin.y); }
          return subjectFor(entity)?.contact;
        })() : undefined, now: eventTime() });
        const bg = controller.value.pointers.filter(p => !p.entity);
        if (bg.length === 2) pinchDistance.set(Math.hypot(bg[0].point.x - bg[1].point.x, bg[0].point.y - bg[1].point.y));
      }
    })
    .onTouchesMove(event => {
      for (const touch of event.changedTouches) {
        if (suppressed.value.includes(touch.id)) continue;
        const capture = controller.value.pointers.find(p => p.pointer === touch.id);
        if (capture?.entity && movable.value[capture.entity] === false) continue;
        send({ type: 'move', pointer: touch.id, point: screenPoint(touch.x, touch.y) });
      }
    })
    .onTouchesUp((event, manager) => {
      for (const touch of event.changedTouches) {
        if (!suppressed.value.includes(touch.id)) {
          const capture = controller.value.pointers.find(p => p.pointer === touch.id);
          if (capture?.phase === 'dragging') send({ type: 'move', pointer: touch.id, point: screenPoint(touch.x, touch.y) });
          const slot = slots.value.find(s => s.pointer === touch.id && s.id);
          const proposal = slot ? proposalFor(slot, true) : undefined;
          if (capture && !capture.entity && capture.phase === 'pending') runOnJS(onTap)(undefined, screenPoint(touch.x, touch.y));
          send({ type: 'up', pointer: touch.id, now: eventTime(), proposal });
        }
        suppressed.set(suppressed.value.filter(id => id !== touch.id));
      }
      if (event.numberOfTouches === 0) {
        pinchDistance.set(0); manager.end();
        const index = roomAtScreen(viewport.width / 2, viewport.height / 2, camera.value, building);
        const overview = camera.value.a <= Math.min(viewport.width / building.width, viewport.height / building.height) * 1.15;
        runOnJS(onCameraChange)(overview, index);
      }
    })
    .onTouchesCancelled((event, manager) => {
      for (const touch of event.changedTouches) send({ type: 'cancel', pointer: touch.id, now: eventTime() });
      suppressed.set([]); pinchDistance.set(0); manager.end();
    });

  useFrameCallback(frame => {
    const dt = frame.timeSincePreviousFrame ?? 16.67;
    lastFrame.set(eventTime());
    if (frameCount.value < 3600) { frameTimes.value.push(dt); frameCount.value++; }
    if (frameCount.value === 3600 && onFrameReport) { frameCount.value++; runOnJS(onFrameReport)(frameTimes.value); }
    let moved = false;
    for (let i = 0; i < 2; i++) {
      let slot = slots.value[i];
      if (!slot.id) continue;
      if (slot.phase === 'dragging' && slot.edgeAt) {
        const vx = edgeVelocity(slot.pointerX, viewport.width, eventTime() - slot.edgeAt);
        if (vx) { camera.set(boundCamera({ ...camera.value, tx: camera.value.tx + vx * Math.min(32, dt) / 1000 }, viewport, building)); moved = true; }
      }
      if (moved && slot.phase === 'dragging') {
        const p = screenToRoom(screenPoint(slot.pointerX, slot.pointerY), camera.value, housePoint(0, 0));
        slot = { ...slot, x: p.x - slot.gripX, y: p.y - slot.gripY };
        slot.proposal = proposalFor(slot);
        slots.set(slots.value.map((s, index) => index === i ? slot : s));
      }
      if (slot.phase === 'settling' && slot.settleAt) {
        const elapsed = eventTime() - slot.settleAt, progress = settleProgress(elapsed, reduced);
        const next = { ...slot, x: slot.releaseX + (slot.targetX - slot.releaseX) * progress, y: slot.releaseY + (slot.targetY - slot.releaseY) * progress, tilt: slot.tilt * (1 - progress), lag: slot.lag * (1 - progress), finished: progress === 1 };
        if (canRevealResting(next, renderedRevision.value)) {
          slots.set(slots.value.map((s, index) => index === i ? { ...s, id: '', ready: false } : s));
          controller.set(transition(controller.value, { type: 'settled', entity: slot.id }, camera.value, housePoint(0, 0)).state);
          runOnJS(onClear)(i);
        } else slots.set(slots.value.map((s, index) => index === i ? next : s));
      }
    }
  });
  const cancelAll = () => {
    controller.set(idleController);
    slots.set([emptySlot(), emptySlot()]);
    onClear(0); onClear(1);
  };
  return { gesture, camera, controller, slots, ready, finish, cancelAll, frameTimes, renderedRevision, clock: lastFrame };
}
export type Interaction = ReturnType<typeof useInteraction>;
