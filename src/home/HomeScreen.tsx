import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useReducedMotion } from '../components/motion';
import { useStore } from '../state/Store';
import { useSounds } from '../components/Audio';
import type { BadgeId } from '../badges/engine';
import { buildingLayout, roomOrigin } from './camera';
import { roomIds, type RoomId } from './catalogMore';
import { capabilityOf } from './world';
import { instance, owns, MAX_INSTANCES, type HomeAction, type HomeStateV2, type Ownership } from './model';
import { ItemArt } from './art/Items';
import { MoreItemArt } from './art/More';
import { moreCatalog } from './catalogMore';
import { type ItemId } from './catalog';
import { useHomeStore } from './useHomeStore';
import { buildScene } from './scene/graph';
import { resolve, type DropProposal } from './scene/proposal';
import { housePoint, roomPoint, screenPoint, type ScreenPoint, type SceneEntity } from './scene/types';
import { screenToRoom } from './scene/camera';
import { SceneView } from './runtime/SceneView';
import { HomeChrome, Tool } from './runtime/HomeChrome';
import { DesignTools, type CatalogGhost } from './runtime/DesignTools';
import { Destinations } from './runtime/Destinations';
import { DebugOverlay } from './runtime/DebugOverlay';
import { EntityArt, type CharacterRender } from './runtime/EntityArt';
import { fitCamera, focusCamera, roomAtScreen, zoomCamera } from './runtime/CameraController';
import { useInteraction, type Interaction, type Pickup } from './runtime/useInteraction';
import { isPortion, withPortions } from './runtime/portions';

export type HomeScreenProps = Ownership & {
  badges?: BadgeId[]; initialItem?: string; renderCharacter?: CharacterRender;
  initialState?: unknown; persist?: (state: HomeStateV2) => boolean; saveStatus?: ReactNode; lab?: boolean;
};
export function HomeScreen({ initialState, initialItem, persist, saveStatus, renderCharacter, lab = false, ...ownership }: HomeScreenProps) {
  const window = useWindowDimensions(), inset = useSafeAreaInsets(), reduced = useReducedMotion();
  const app = useStore(), sound = useSounds(app.save.settings.sound);
  const store = useHomeStore(ownership, initialState, persist);
  const [designing, setDesigning] = useState(!!initialItem), [selected, setSelected] = useState<string>();
  const [placing, setPlacing] = useState<ItemId | undefined>(initialItem);
  const [overview, setOverview] = useState(false), [room, setRoom] = useState(store.state.current);
  const [pickups, setPickups] = useState<(Pickup | undefined)[]>([undefined, undefined]);
  const [debug, setDebug] = useState(lab), [stress, setStress] = useState(false);
  const [catalogItem, setCatalogItem] = useState<ItemId>();
  const [headerHeight, setHeaderHeight] = useState(64 + inset.top);
  const [frameReport, setFrameReport] = useState<number[]>();
  const canvas = useRef<View>(null), canvasOrigin = useRef({ x: 0, y: 64 + inset.top });
  const runtime = useRef<Interaction | null>(null), sequence = useRef(0);
  const vertical = designing && window.width > window.height;
  const viewport = useMemo(() => ({ width: window.width - (vertical ? 220 : 0), height: Math.max(180, window.height - inset.bottom - headerHeight - (designing && !vertical ? 174 : 0)) }), [window.width, window.height, vertical, designing, inset, headerHeight]);
  const building = useMemo(() => buildingLayout(roomIds.length, window.width / window.height > 1.8), [window.width, window.height]);
  const baseScene = useMemo(() => buildScene(store.state), [store.state.rooms]); // Navigation is outside the scene revision.
  const scene = useMemo(() => withPortions(baseScene), [baseScene]);
  const live = useRef({ store, scene, selected, placing, room });
  useLayoutEffect(() => { live.current = { store, scene, selected, placing, room }; });
  const ghost = useSharedValue<CatalogGhost>({ active: false, x: 0, y: 0 });
  const measure = useCallback(() => canvas.current?.measureInWindow((x, y) => { canvasOrigin.current = { x, y }; }), []);
  useLayoutEffect(() => { const frame = requestAnimationFrame(measure); return () => cancelAnimationFrame(frame); }, [measure, viewport]);

  const commitAt = useCallback((id: string, destination: RoomId, anchor: { x: number; y: number }, proposal?: DropProposal) => {
    const current = live.current, entity = current.scene.entities[id];
    if (!entity) return undefined;
    let next = proposal && !isPortion(id) ? current.store.commitProposal(proposal) : undefined;
    if (!next && proposal && !isPortion(id) && proposal.revision === buildScene(current.store.getState()).revision) return undefined;
    if (!next) {
      const latest = current.store.getState();
      const fresh = withPortions(buildScene(latest));
      const candidate = fresh.entities[id];
      if (!candidate) return undefined;
      if (isPortion(id)) {
        const source = candidate.item!;
        const item = { ...source, id: `food-${Date.now().toString(36)}-${++sequence.current}` };
        if (latest.rooms[destination].instances.length >= MAX_INSTANCES) return undefined;
        const seed: HomeStateV2 = { ...latest, rooms: { ...latest.rooms, [destination]: { ...latest.rooms[destination], instances: [...latest.rooms[destination].instances, item] } } };
        const prepared = buildScene(seed), subject = prepared.entities[`${destination}/item/${item.id}`];
        if (!subject) return undefined;
        const resolved = resolve(prepared.rooms[destination], subject, roomPoint(anchor.x, anchor.y), { scale: runtime.current!.camera.get().a, release: true });
        next = current.store.commitProposal(resolved, seed);
        return next ? { state: next, proposal: resolved } : undefined;
      }
      const resolved = resolve(fresh.rooms[destination], candidate, roomPoint(anchor.x, anchor.y), { scale: runtime.current!.camera.get().a, release: true });
      next = current.store.commitProposal(resolved);
      return next ? { state: next, proposal: resolved } : undefined;
    }
    return { state: next, proposal: proposal! };
  }, []);
  const onCommit = useCallback((index: number, proposal: DropProposal, at: { x: number; y: number }) => {
    const origin = roomOrigin(roomIds.indexOf(proposal.room), building);
    const result = commitAt(proposal.id, proposal.room, { x: at.x - origin.x, y: at.y - origin.y }, proposal);
    if (result) { const destination = buildScene(result.state); setPickups(current => current.map((p, i) => i === index && p ? { ...p, destination } : p)); runtime.current!.finish(index, true, result.proposal, destination.revision, destination); setRoom(result.proposal.room); sound('tap'); }
    else runtime.current!.finish(index, false);
  }, [building, commitAt, sound]);
  const onPickup = useCallback((pickup: Pickup) => { setPickups(current => current.map((p, i) => i === pickup.slot ? pickup : p)); setSelected(undefined); }, []);
  const onClear = useCallback((index: number) => setPickups(current => current.map((p, i) => i === index ? undefined : p)), []);
  const dispatch = (action: HomeAction) => store.dispatch({ ...action, roomId: room });
  const moveTo = (id: string, target: SceneEntity | undefined, point: ScreenPoint) => {
    const c = runtime.current!.camera.get();
    const index = target ? roomIds.indexOf(target.room) : roomAtScreen(point.x, point.y, c, building);
    if (index < 0) return;
    const dest = roomIds[index], origin = roomOrigin(index, building);
    const anchor = screenToRoom(point, c, housePoint(origin.x, origin.y));
    const subject = live.current.scene.entities[id];
    if (!subject) return;
    const targetProposal = resolve(live.current.scene.rooms[dest], subject, roomPoint(anchor.x, anchor.y), { scale: c.a, release: true });
    const result = commitAt(id, dest, anchor, targetProposal);
    if (result) setSelected(undefined);
  };
  const choose = (id: string) => setSelected(id);
  const onTap = (id: string | undefined, point: ScreenPoint) => {
    const current = live.current;
    const entity = id ? current.scene.entities[id] : undefined;
    if (current.placing) { insertAt(current.placing, point.x, point.y); return; }
    if (current.selected && current.selected !== id) { moveTo(current.selected, entity, point); return; }
    if (entity?.item && !isPortion(entity.id) && capabilityOf(entity.item.item).toggle) current.store.dispatch({ type: 'toggle', id: entity.item.id, roomId: entity.room });
    if (id) setSelected(id);
    else { const index = roomAtScreen(point.x, point.y, runtime.current!.camera.get(), building); if (index >= 0) { setRoom(roomIds[index]); if (overview) goRoom(roomIds[index]); } }
  };
  const interaction = useInteraction({ scene, building, viewport, initialCamera: focusCamera(roomIds.indexOf(room), viewport, building), reduced, designing, onCameraChange: (all, index) => { setOverview(all); if (index >= 0) setRoom(roomIds[index]); }, onPickup, onCommit, onTap, onClear, onFrameReport: lab ? setFrameReport : undefined });
  useLayoutEffect(() => { runtime.current = interaction; });
  useLayoutEffect(() => {
    interaction.camera.set(overview ? fitCamera(viewport, building) : focusCamera(roomIds.indexOf(room), viewport, building));
    // Refit only on viewport changes. Ordinary edits and drops never move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, building]);
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') interaction.cancelAll(); });
    return () => { sub.remove(); interaction.cancelAll(); };
    // Stable shared handles; never re-register cancellation on a settled edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const goRoom = (id: RoomId) => { interaction.cancelAll(); setRoom(id); setOverview(false); store.dispatch({ type: 'room', room: id }); interaction.camera.set(focusCamera(roomIds.indexOf(id), viewport, building)); };
  const find = () => {
    const hero = scene.entities['character/0'];
    if (!hero) return;
    setRoom(hero.room); setOverview(false); store.dispatch({ type: 'room', room: hero.room });
    interaction.camera.set(focusCamera(roomIds.indexOf(hero.room), viewport, building, hero.contact));
    setSelected(hero.id);
  };
  const moveAccessible = (id: string, action: string) => {
    const entity = scene.entities[id]; if (!entity) return;
    if (action === 'store') { const proposal = resolve(scene.rooms[entity.room], entity, entity.contact, { scale: interaction.camera.get().a, target: 'staging', release: true }); store.commitProposal(proposal); return; }
    const delta = ({ left: [-37.5, 0], right: [37.5, 0], back: [0, -14.4], forward: [0, 14.4] } as Record<string, number[]>)[action];
    if (delta) commitAt(id, entity.room, { x: entity.contact.x + delta[0], y: entity.contact.y + delta[1] });
  };
  function insertAt(item: ItemId, x: number, y: number) {
    if (!owns(item, ownership)) { store.setMessage('This showpiece is in the Locker.'); return; }
    const c = runtime.current!.camera.get(), index = roomAtScreen(x, y, c, building);
    if (index < 0) return;
    const dest = roomIds[index], origin = roomOrigin(index, building), at = screenToRoom(screenPoint(x, y), c, housePoint(origin.x, origin.y));
    const current = live.current.store.getState();
    if (current.rooms[dest].instances.length >= MAX_INSTANCES) { store.setMessage('Put something away to make room.'); return; }
    const created = instance(`home-${Date.now().toString(36)}-${++sequence.current}`, item, 0, 0);
    const seed: HomeStateV2 = { ...current, rooms: { ...current.rooms, [dest]: { ...current.rooms[dest], instances: [...current.rooms[dest].instances, created] } } };
    const prepared = buildScene(seed), subject = prepared.entities[`${dest}/item/${created.id}`];
    if (!subject) return;
    const proposal = resolve(prepared.rooms[dest], subject, at, { scale: c.a, release: true });
    store.commitProposal(proposal, seed);
    setPlacing(undefined);
  }
  const dropCatalog = (item: ItemId, x: number, y: number) => insertAt(item, x - canvasOrigin.current.x, y - canvasOrigin.current.y);
  const ghostStyle = useAnimatedStyle(() => ({ opacity: ghost.value.active ? 1 : 0, transform: [{ translateX: ghost.value.x - 35 }, { translateY: ghost.value.y - 70 }] }));
  const target = selected ? scene.entities[selected]?.item : undefined;
  const staged = Object.values(baseScene.entities).filter(e => e.attachment.kind === 'staging');
  return <View style={{ flex: 1, backgroundColor: '#FFF8E9', paddingBottom: inset.bottom }}>
    <HomeChrome room={room} overview={overview} designing={designing} canUndo={store.canUndo} canRedo={store.canRedo} top={inset.top} headerHeight={headerHeight} onHeaderLayout={setHeaderHeight} onBack={() => router.back()} onUndo={() => { interaction.cancelAll(); store.dispatch({ type: 'undo' }); }} onRedo={() => store.dispatch({ type: 'redo' })} onFind={find} onFriends={() => dispatch({ type: 'find-friends' })} onOverview={() => { const next = !overview; setOverview(next); interaction.camera.set(next ? fitCamera(viewport, building) : focusCamera(roomIds.indexOf(room), viewport, building)); }} onDesign={() => { setDesigning(!designing); setPlacing(undefined); }} onRoom={goRoom} onZoom={ratio => { interaction.camera.set(zoomCamera(interaction.camera.get(), ratio, viewport.width / 2, viewport.height / 2, viewport, building)); setOverview(false); }} saveStatus={saveStatus} />
    <View style={{ flex: 1, flexDirection: vertical ? 'row' : 'column' }}>
      <View ref={canvas} onLayout={measure} style={{ width: viewport.width, height: viewport.height }}>
        <SceneView state={store.state} scene={scene} building={building} viewport={viewport} interaction={interaction} pickups={pickups} reduced={reduced} renderCharacter={renderCharacter} selected={selected} onSelect={choose} onMove={moveAccessible} stress={stress} />
        {debug && <DebugOverlay interaction={interaction} width={viewport.width} height={viewport.height} stress={stress} onStress={() => setStress(!stress)} />}
        {lab && <View style={{ position: 'absolute', bottom: 2, right: 8, flexDirection: 'row', gap: 6 }}><Tool label="Toggle debug" symbol="⌘" selected={debug} onPress={() => setDebug(!debug)} /><Pressable accessibilityRole="button" accessibilityLabel="Export frame timings" onPress={() => { setFrameReport(interaction.frameTimes.get()); }}><Text style={{ backgroundColor: '#FFF8E9', padding: 12 }}>Frames</Text></Pressable></View>}
        {placing && <View pointerEvents="none" style={{ position: 'absolute', bottom: 16, alignSelf: 'center', padding: 12, borderRadius: 18, backgroundColor: '#FFF8E9' }}><Text>Choose a place for {placing.replaceAll('-', ' ')}.</Text></View>}
      </View>
      {designing && <DesignTools state={store.state} ownership={ownership} target={target} vertical={vertical} ghost={ghost} onChoose={id => { if (owns(id, ownership)) setPlacing(id); }} onDrop={dropCatalog} onDragItem={setCatalogItem} dispatch={dispatch} onClose={() => setDesigning(false)} />}
    </View>
    <Destinations scene={scene} selected={selected} scale={1} bottom={inset.bottom + (designing && !vertical ? 180 : 10)} onChoose={proposal => {
      const result = commitAt(proposal.id, proposal.room, proposal.contact, proposal);
      if (result) { setSelected(undefined); setRoom(result.proposal.room); }
    }} />
    {!!staged.length && <ScrollView horizontal testID="staging-tray" style={{ position: 'absolute', bottom: 8 + inset.bottom, left: 72, right: 72, maxHeight: 88, borderRadius: 16, backgroundColor: '#FFF8E9' }} contentContainerStyle={{ gap: 10, padding: 8 }}>{staged.map(entity => <Pressable key={entity.id} accessibilityRole="button" accessibilityLabel={`Move ${entity.item?.item ?? 'friend'} from tray`} onPress={() => setSelected(entity.id)} style={{ width: 64, height: 64, overflow: 'hidden' }}><View style={{ transform: [{ scale: .3 }], transformOrigin: 'left top' }}><EntityArt entity={entity} reduced={reduced} renderCharacter={renderCharacter} /></View></Pressable>)}</ScrollView>}
    <Text accessibilityLiveRegion="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>{store.message}</Text>
    {lab && frameReport && <Text testID="frame-report" style={{ position: 'absolute', left: 75, bottom: 2, fontSize: 10 }}>{JSON.stringify({ samples: frameReport.length, p95: frameReport.slice().sort((a, b) => a - b)[Math.floor(frameReport.length * .95)], max: Math.max(...frameReport) })}</Text>}
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 70, height: 70 }, ghostStyle]}>{catalogItem && (moreCatalog[catalogItem] ? <MoreItemArt id={catalogItem} size={70} reduced={reduced} /> : <ItemArt item={catalogItem} size={70} reduced={reduced} />)}</Animated.View>
  </View>;
}
