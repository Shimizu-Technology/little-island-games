import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../components/motion";
import { useStore } from "../state/Store";
import { useSounds } from "../components/Audio";
import type { BadgeId } from "../badges/engine";
import { buildingLayout, roomOrigin } from "./camera";
import { roomIds, type RoomId } from "./catalogMore";
import { capabilityOf } from "./world";
import { instance, owns, MAX_INSTANCES, type HomeAction, type HomeStateV2, type Ownership } from "./model";
import { ItemArt } from "./art/Items";
import { MoreItemArt } from "./art/More";
import { moreCatalog } from "./catalogMore";
import { type ItemId } from "./catalog";
import { useHomeStore } from "./useHomeStore";
import { buildScene } from "./scene/graph";
import { resolve, type DropProposal } from "./scene/proposal";
import { housePoint, roomPoint, screenPoint, type ScreenPoint, type SceneEntity } from "./scene/types";
import { screenToRoom } from "./scene/camera";
import { SceneView } from "./runtime/SceneView";
import { HomeChrome, Tool } from "./runtime/HomeChrome";
import { DesignTools, type CatalogGhost } from "./runtime/DesignTools";
import { StagingTray } from "./runtime/StagingTray";
import { Destinations } from "./runtime/Destinations";
import { DebugOverlay } from "./runtime/DebugOverlay";
import { type CharacterRender } from "./runtime/EntityArt";
import { boundCamera, fitCamera, focusCamera, roomAtScreen, zoomCamera } from "./runtime/CameraController";
import { useInteraction, type Interaction, type Pickup } from "./runtime/useInteraction";
import { isPortion, withPortions } from "./runtime/portions";

export type HomeScreenProps = Ownership & {
  badges?: BadgeId[];
  initialItem?: string;
  renderCharacter?: CharacterRender;
  initialState?: unknown;
  persist?: (state: HomeStateV2) => boolean;
  saveStatus?: ReactNode;
  lab?: boolean;
};
export function HomeScreen({
  initialState,
  initialItem,
  persist,
  saveStatus,
  renderCharacter,
  lab = false,
  ...ownership
}: HomeScreenProps) {
  const window = useWindowDimensions(),
    inset = useSafeAreaInsets(),
    reduced = useReducedMotion();
  const app = useStore(),
    sound = useSounds(app.save.settings.sound);
  const store = useHomeStore(ownership, initialState, persist);
  const [designing, setDesigning] = useState(!!initialItem),
    [selected, setSelected] = useState<string>();
  const [placing, setPlacing] = useState<ItemId | undefined>(initialItem);
  const [overview, setOverview] = useState(false),
    [room, setRoom] = useState(store.state.current);
  const [pickups, setPickups] = useState<(Pickup | undefined)[]>([undefined, undefined]);
  const [debug, setDebug] = useState(lab),
    [stress, setStress] = useState(false);
  const [reactions, setReactions] = useState<Record<string, "eat" | "drink">>({});
  const reactionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  React.useEffect(() => () => Object.values(reactionTimers.current).forEach(clearTimeout), []);
  const [catalogItem, setCatalogItem] = useState<ItemId>();
  const [headerHeight, setHeaderHeight] = useState(64 + inset.top);
  const [frameReport, setFrameReport] = useState<number[]>();
  const canvas = useRef<View>(null),
    canvasOrigin = useRef({ x: 0, y: 64 + inset.top });
  const runtime = useRef<Interaction | null>(null),
    sequence = useRef(0);
  const vertical = designing && window.width > window.height;
  const viewport = useMemo(
    () => ({
      width: window.width - (vertical ? 220 : 0),
      height: Math.max(180, window.height - inset.bottom - headerHeight - (designing && !vertical ? 174 : 0)),
    }),
    [window.width, window.height, vertical, designing, inset, headerHeight]
  );
  const building = useMemo(
    () => buildingLayout(roomIds.length, window.width / window.height > 1.8),
    [window.width, window.height]
  );
  const baseScene = useMemo(() => buildScene(store.state), [store.state.rooms]); // Navigation is outside the scene revision.
  const scene = useMemo(() => withPortions(baseScene), [baseScene]);
  const live = useRef({ store, scene, selected, placing, room });
  useLayoutEffect(() => {
    live.current = { store, scene, selected, placing, room };
  });
  const ghost = useSharedValue<CatalogGhost>({ active: false, x: 0, y: 0 });
  const viewportOffset = useSharedValue({ x: 0, y: 64 + inset.top });
  const measure = useCallback(
    () =>
      canvas.current?.measureInWindow((x, y) => {
        canvasOrigin.current = { x, y };
        viewportOffset.set({ x, y });
      }),
    [viewportOffset]
  );
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure, viewport]);

  const commitAt = useCallback(
    (id: string, destination: RoomId, anchor: { x: number; y: number }, proposal?: DropProposal) => {
      const current = live.current,
        entity = current.scene.entities[id];
      if (!entity) return undefined;
      let next = proposal && !isPortion(id) ? current.store.commitProposal(proposal) : undefined;
      if (!next && proposal && !isPortion(id) && proposal.revision === buildScene(current.store.getState()).revision)
        return undefined;
      if (!next) {
        const latest = current.store.getState();
        const fresh = withPortions(buildScene(latest));
        const candidate = fresh.entities[id];
        if (!candidate) return undefined;
        if (isPortion(id)) {
          const source = candidate.item!;
          const item = { ...source, id: `food-${Date.now().toString(36)}-${++sequence.current}` };
          if (latest.rooms[destination].instances.length >= MAX_INSTANCES) return undefined;
          const seed: HomeStateV2 = {
            ...latest,
            rooms: {
              ...latest.rooms,
              [destination]: {
                ...latest.rooms[destination],
                instances: [...latest.rooms[destination].instances, item],
              },
            },
          };
          const prepared = buildScene(seed),
            subject = prepared.entities[`${destination}/item/${item.id}`];
          if (!subject) return undefined;
          const resolved = resolve(prepared.rooms[destination], subject, roomPoint(anchor.x, anchor.y), {
            scale: runtime.current!.camera.get().a,
            release: true,
          });
          next = current.store.commitProposal(resolved, seed);
          return next ? { state: next, proposal: resolved } : undefined;
        }
        const resolved = resolve(fresh.rooms[destination], candidate, roomPoint(anchor.x, anchor.y), {
          scale: runtime.current!.camera.get().a,
          release: true,
        });
        next = current.store.commitProposal(resolved);
        return next ? { state: next, proposal: resolved } : undefined;
      }
      return { state: next, proposal: proposal! };
    },
    []
  );
  const showReaction = (proposal: DropProposal) => {
    if (proposal.kind !== "mouth") return;
    const target = live.current.scene.rooms[proposal.room].targets.find((t) => t.id === proposal.target);
    if (!target) return;
    const action = proposal.consume === "drink" ? "drink" : "eat";
    clearTimeout(reactionTimers.current[target.owner]);
    setReactions((current) => ({ ...current, [target.owner]: action }));
    reactionTimers.current[target.owner] = setTimeout(
      () =>
        setReactions((current) => {
          const next = { ...current };
          delete next[target.owner];
          return next;
        }),
      750
    );
  };
  const onCommit = useCallback(
    (index: number, proposal: DropProposal, at: { x: number; y: number }) => {
      const origin = roomOrigin(roomIds.indexOf(proposal.room), building);
      const result = commitAt(proposal.id, proposal.room, { x: at.x - origin.x, y: at.y - origin.y }, proposal);
      if (result) {
        showReaction(result.proposal);
        const destination = buildScene(result.state);
        setPickups((current) => current.map((p, i) => (i === index && p ? { ...p, destination } : p)));
        runtime.current!.finish(index, true, result.proposal, destination.revision, destination);
        setRoom(result.proposal.room);
        sound("tap");
      } else runtime.current!.finish(index, false);
    },
    [building, commitAt, sound]
  );
  const onPickup = useCallback((pickup: Pickup) => {
    setPickups((current) => current.map((p, i) => (i === pickup.slot ? pickup : p)));
    setSelected(undefined);
  }, []);
  const onClear = useCallback(
    (index: number) => setPickups((current) => current.map((p, i) => (i === index ? undefined : p))),
    []
  );
  const dispatch = (action: HomeAction) => store.dispatch({ ...action, roomId: room });
  const moveTo = (id: string, target: SceneEntity | undefined, point: ScreenPoint) => {
    const c = runtime.current!.camera.get();
    const index = target ? roomIds.indexOf(target.room) : roomAtScreen(point.x, point.y, c, building);
    if (index < 0) return;
    const dest = roomIds[index],
      origin = roomOrigin(index, building);
    const anchor = screenToRoom(point, c, housePoint(origin.x, origin.y));
    const subject = live.current.scene.entities[id];
    if (!subject) return;
    const targetProposal = resolve(live.current.scene.rooms[dest], subject, roomPoint(anchor.x, anchor.y), {
      scale: c.a,
      release: true,
    });
    const result = commitAt(id, dest, anchor, targetProposal);
    if (result) setSelected(undefined);
  };
  const choose = useCallback((id: string) => setSelected(id), []);
  const onTap = (id: string | undefined, point: ScreenPoint) => {
    const current = live.current;
    const entity = id ? current.scene.entities[id] : undefined;
    if (current.placing) {
      insertAt(current.placing, point.x, point.y);
      return;
    }
    if (current.selected && current.selected !== id) {
      moveTo(current.selected, entity, point);
      return;
    }
    if (entity?.item && !isPortion(entity.id) && capabilityOf(entity.item.item).toggle)
      current.store.dispatch({ type: "toggle", id: entity.item.id, roomId: entity.room });
    if (id) {
      setSelected(id);
      if (entity) {
        setRoom(entity.room);
        current.store.dispatch({ type: "room", room: entity.room });
      }
    } else {
      const index = roomAtScreen(point.x, point.y, runtime.current!.camera.get(), building);
      if (index >= 0) {
        setRoom(roomIds[index]);
        if (overview) goRoom(roomIds[index]);
      }
    }
  };
  const interaction = useInteraction({
    scene,
    building,
    viewport,
    initialCamera: focusCamera(roomIds.indexOf(room), viewport, building),
    reduced,
    designing,
    onCameraChange: (all, index) => {
      setOverview(all);
      if (index >= 0) setRoom(roomIds[index]);
    },
    onPickup,
    onCommit,
    onTap,
    onClear,
    onFrameReport: lab ? setFrameReport : undefined,
  });
  useLayoutEffect(() => {
    runtime.current = interaction;
  });
  React.useEffect(() => {
    if (!lab) return;
    const host = globalThis as unknown as Record<string, unknown>;
    const inspector = {
      read: () => ({
        world: live.current.store.getState(),
        camera: interaction.camera.get(),
        pointers: interaction.controller.get().pointers,
        slots: interaction.slots.get().map((s) => ({
          id: s.id,
          phase: s.phase,
          x: s.x,
          y: s.y,
          ready: s.ready,
          committed: s.committed,
          proposal: s.proposal && {
            kind: s.proposal.kind,
            target: s.proposal.target,
            contact: s.proposal.contact,
            room: s.proposal.room,
          },
        })),
      }),
      targets: () =>
        Object.values(live.current.scene.rooms).flatMap((r) =>
          r.targets.map((t) => ({ id: t.id, kind: t.kind, owner: t.owner, contact: t.contact, room: r.room }))
        ),
      timings: () => interaction.frameTimes.get().slice(),
    };
    host.__littleIslandLab = inspector;
    return () => {
      if (host.__littleIslandLab === inspector) delete host.__littleIslandLab;
    };
    // Read-only, opt-in local inspection. It exposes no action or save bypass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lab]);
  const previousView = useRef({ viewport, building });
  useLayoutEffect(() => {
    const old = previousView.current;
    previousView.current = { viewport, building };
    if (old.viewport === viewport && old.building === building) return;
    const before = interaction.camera.get();
    const oldOrigin = roomOrigin(roomIds.indexOf(room), old.building),
      nextOrigin = roomOrigin(roomIds.indexOf(room), building);
    const center = screenToRoom(
      screenPoint(old.viewport.width / 2, old.viewport.height / 2),
      before,
      housePoint(oldOrigin.x, oldOrigin.y)
    );
    const scale = (before.a * viewport.height) / old.viewport.height;
    interaction.camera.set(
      overview
        ? fitCamera(viewport, building)
        : boundCamera(
            {
              a: scale,
              b: 0,
              c: 0,
              d: scale,
              tx: viewport.width / 2 - (nextOrigin.x + center.x) * scale,
              ty: viewport.height / 2 - (nextOrigin.y + center.y) * scale,
            },
            viewport,
            building
          )
    );
    // Refit only on viewport changes. Ordinary edits and drops never move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, building]);
  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") interaction.cancelAll();
    });
    return () => {
      sub.remove();
      interaction.cancelAll();
    };
    // Stable shared handles; never re-register cancellation on a settled edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const goRoom = (id: RoomId) => {
    interaction.cancelAll();
    setRoom(id);
    setOverview(false);
    store.dispatch({ type: "room", room: id });
    interaction.camera.set(focusCamera(roomIds.indexOf(id), viewport, building));
  };
  const find = () => {
    const hero = scene.entities["character/0"];
    if (!hero) return;
    setRoom(hero.room);
    setOverview(false);
    store.dispatch({ type: "room", room: hero.room });
    interaction.camera.set(focusCamera(roomIds.indexOf(hero.room), viewport, building, hero.contact));
    setSelected(hero.id);
  };
  const moveAccessible = useCallback(
    (id: string, action: string) => {
      const { scene, store } = live.current;
      const entity = scene.entities[id];
      if (!entity) return;
      if (action === "store") {
        const proposal = resolve(scene.rooms[entity.room], entity, entity.contact, {
          scale: runtime.current!.camera.get().a,
          target: "staging",
          release: true,
        });
        store.commitProposal(proposal);
        return;
      }
      const delta = (
        { left: [-37.5, 0], right: [37.5, 0], back: [0, -14.4], forward: [0, 14.4] } as Record<string, number[]>
      )[action];
      if (delta) commitAt(id, entity.room, { x: entity.contact.x + delta[0], y: entity.contact.y + delta[1] });
    },
    [commitAt]
  );
  function insertAt(item: ItemId, x: number, y: number) {
    if (!owns(item, ownership)) {
      store.setMessage("This showpiece is in the Locker.");
      return;
    }
    const c = runtime.current!.camera.get(),
      index = roomAtScreen(x, y, c, building);
    if (index < 0) return;
    const dest = roomIds[index],
      origin = roomOrigin(index, building),
      at = screenToRoom(screenPoint(x, y), c, housePoint(origin.x, origin.y));
    const current = live.current.store.getState();
    if (current.rooms[dest].instances.length >= MAX_INSTANCES) {
      store.setMessage("Put something away to make room.");
      return;
    }
    const created = instance(`home-${Date.now().toString(36)}-${++sequence.current}`, item, 0, 0);
    const seed: HomeStateV2 = {
      ...current,
      rooms: {
        ...current.rooms,
        [dest]: { ...current.rooms[dest], instances: [...current.rooms[dest].instances, created] },
      },
    };
    const prepared = buildScene(seed),
      subject = prepared.entities[`${dest}/item/${created.id}`];
    if (!subject) return;
    const proposal = resolve(prepared.rooms[dest], subject, at, { scale: c.a, release: true });
    store.commitProposal(proposal, seed);
    setPlacing(undefined);
  }
  const dropCatalog = (item: ItemId, x: number, y: number) =>
    insertAt(item, x - canvasOrigin.current.x, y - canvasOrigin.current.y);
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghost.value.active ? 1 : 0,
    transform: [{ translateX: ghost.value.x - 35 }, { translateY: ghost.value.y - 70 }],
  }));
  const target = selected ? scene.entities[selected]?.item : undefined;
  const staged = Object.values(baseScene.entities).filter((e) => e.attachment.kind === "staging");
  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8E9", paddingBottom: inset.bottom }}>
      <HomeChrome
        room={room}
        overview={overview}
        designing={designing}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        top={inset.top}
        headerHeight={headerHeight}
        onHeaderLayout={setHeaderHeight}
        onBack={() => router.back()}
        onUndo={() => {
          interaction.cancelAll();
          store.dispatch({ type: "undo" });
        }}
        onRedo={() => store.dispatch({ type: "redo" })}
        onFind={find}
        onFriends={() => {
          interaction.cancelAll();
          dispatch({ type: "find-friends" });
        }}
        onOverview={() => {
          const next = !overview;
          setOverview(next);
          interaction.camera.set(
            next ? fitCamera(viewport, building) : focusCamera(roomIds.indexOf(room), viewport, building)
          );
        }}
        onDesign={() => {
          setDesigning(!designing);
          setPlacing(undefined);
        }}
        onRoom={goRoom}
        onZoom={(ratio) => {
          interaction.camera.set(
            zoomCamera(interaction.camera.get(), ratio, viewport.width / 2, viewport.height / 2, viewport, building)
          );
          setOverview(false);
        }}
        saveStatus={saveStatus}
      />
      <View style={{ flex: 1, flexDirection: vertical ? "row" : "column" }}>
        <View ref={canvas} onLayout={measure} style={{ width: viewport.width, height: viewport.height }}>
          <SceneView
            state={store.state}
            scene={scene}
            building={building}
            viewport={viewport}
            interaction={interaction}
            pickups={pickups}
            reduced={reduced}
            renderCharacter={renderCharacter}
            selected={selected}
            reactions={reactions}
            onSelect={choose}
            onMove={moveAccessible}
            stress={stress}
          />
          {debug && (
            <DebugOverlay
              interaction={interaction}
              width={viewport.width}
              height={viewport.height}
              stress={stress}
              onStress={() => {
                interaction.resetFrames();
                setFrameReport(undefined);
                setStress(!stress);
              }}
            />
          )}
          {lab && (
            <View style={{ position: "absolute", bottom: 2, right: 8, flexDirection: "row", gap: 6 }}>
              <Tool label="Toggle debug" symbol="⌘" selected={debug} onPress={() => setDebug(!debug)} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export frame timings"
                onPress={() => {
                  setFrameReport(interaction.frameTimes.get());
                }}
              >
                <Text style={{ backgroundColor: "#FFF8E9", padding: 12 }}>Frames</Text>
              </Pressable>
            </View>
          )}
          {placing && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 16,
                alignSelf: "center",
                padding: 12,
                borderRadius: 18,
                backgroundColor: "#FFF8E9",
              }}
            >
              <Text>Choose a place for {placing.replaceAll("-", " ")}.</Text>
            </View>
          )}
        </View>
        {designing && (
          <DesignTools
            state={store.state}
            ownership={ownership}
            target={target}
            vertical={vertical}
            ghost={ghost}
            onChoose={(id) => {
              if (owns(id, ownership)) setPlacing(id);
            }}
            onDrop={dropCatalog}
            onDragItem={setCatalogItem}
            dispatch={dispatch}
            onClose={() => setDesigning(false)}
          />
        )}
      </View>
      <Destinations
        scene={scene}
        selected={selected}
        scale={1}
        onSelect={setSelected}
        bottom={inset.bottom + (designing && !vertical ? 180 : staged.length ? 100 : 10)}
        onChoose={(proposal) => {
          const result = commitAt(proposal.id, proposal.room, proposal.contact, proposal);
          if (result) {
            showReaction(result.proposal);
            setSelected(undefined);
            setRoom(result.proposal.room);
          }
        }}
      />
      <StagingTray
        entities={staged}
        bottom={inset.bottom + 8}
        offset={viewportOffset}
        interaction={interaction}
        reduced={reduced}
        renderCharacter={renderCharacter}
        onSelect={setSelected}
      />
      <Text accessibilityLiveRegion="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
        {store.message}
      </Text>
      {lab && frameReport && (
        <Text testID="frame-report" style={{ position: "absolute", left: 75, bottom: 2, fontSize: 10 }}>
          {JSON.stringify({
            samples: frameReport.length,
            p95: frameReport.slice().sort((a, b) => a - b)[Math.floor(frameReport.length * 0.95)],
            max: Math.max(...frameReport),
          })}
        </Text>
      )}
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: 0, top: 0, width: 70, height: 70 }, ghostStyle]}
      >
        {catalogItem &&
          (moreCatalog[catalogItem] ? (
            <MoreItemArt id={catalogItem} size={70} reduced={reduced} />
          ) : (
            <ItemArt item={catalogItem} size={70} reduced={reduced} />
          ))}
      </Animated.View>
    </View>
  );
}
