import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as ReactNative from "react-native";
import { AccessibilityInfo, Platform, AppState, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useReducedMotion } from "../components/motion";
import { useDelight } from "./runtime/useDelight";
import { pieceAt } from "./runtime/SetPieces";
import { useStore } from "../state/Store";
import type { BadgeId } from "../badges/engine";
import type { IslanderLook } from "../islander/look";
import { lockedReason, lookWithStyle, styleCatalog, type StyleItem } from "../personalization/catalog";
import { HomeClosetSheet, closetSheetHeightRatio } from "./HomeClosetSheet";
import { HomeBadgesSheet } from "./HomeBadgesSheet";
import { buildingLayout, roomOrigin, type Building } from "./camera";
import { roomIds, type RoomId } from "./catalogMore";
import { capabilityOf } from "./world";
import { catalogCommit, clearCatalogSeed } from "./runtime/catalogCapture";
import {
  instance,
  owns,
  placedInstances,
  MAX_INSTANCES,
  type HomeAction,
  type HomeStateV2,
  type Ownership,
} from "./model";
import { ItemArt } from "./art/Items";
import { MoreItemArt } from "./art/More";
import { moreCatalog } from "./catalogMore";
import { itemIds, itemSpec, type ItemId } from "./catalog";
import { useHomeStore, RESTORE_NOTE, RESTORE_QUESTION, UNDO_NOTES, type RestoreCost } from "./useHomeStore";
import { UndoGonePicture, UndoNote } from "./runtime/UndoNote";
import { buildScene, createSceneBuilder } from "./scene/graph";
import { resolve, type DropProposal } from "./scene/proposal";
import { housePoint, roomPoint, screenPoint, type ScreenPoint, type SceneEntity, type Scene } from "./scene/types";
import { screenToRoom, type CameraMatrix } from "./scene/camera";
import { SceneView } from "./runtime/SceneView";
import { HomeChrome, Tool, navigationHeightFor, largeNavigationHeight } from "./runtime/HomeChrome";
import { FriendDrawer } from "./runtime/FriendDrawer";
import { storageCapacity, storageOpen, STORAGE_FULL_MESSAGE } from './storage';
import { StorageTray, StorageFullNote } from './runtime/StorageTray';
import { HomePanels } from "./runtime/HomePanels";
import { DesignTools, portraitDrawerHeightFor, type CatalogGhost } from "./runtime/DesignTools";
import { StagingTray } from "./runtime/StagingTray";
import { Destinations } from "./runtime/Destinations";
import { DebugOverlay } from "./runtime/DebugOverlay";
import { CapacityCue, CAPACITY_CUE_MS, CAPACITY_MESSAGE } from "./runtime/CapacityCue";
import { MEAL_MS, type Meal } from "./runtime/meal";
import { type CharacterRender } from "./runtime/EntityArt";
import { boundCamera, fitCamera, focusCamera, roomScale, roomAtScreen, zoomCamera, type Viewport } from "./runtime/CameraController";
import { useInteraction, type Interaction, type Pickup, type CaptureToken } from "./runtime/useInteraction";
import { groupIds, restingVisible } from "./runtime/group";
import { anchorsFor, species } from "./scene/species";
import { useIdleCharacters } from "./runtime/useIdleCharacters";
import { isPortion, withPortions } from "./runtime/portions";
import { freshHints, nextHintAt, takeHint, touchedHints, type HintState } from "./runtime/quietHints";
import { useHomeVisible } from "./runtime/visibility";
import type { ReleaseProbe } from "./runtime/frameProbe";
import { writeProbe } from "./runtime/probeReceipt";
import type { HomeTrace } from "./runtime/trace";
import { theme } from "../ui/theme";

/** Metro folds this branch away, so a build without the lab flag carries none of this code. */
const labKit: { trace: typeof import("./runtime/trace"); overlay: typeof import("./runtime/HullOverlay") } | undefined =
  __DEV__ || process.env.EXPO_PUBLIC_HOME_LAB === "1"
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- Metro folds dev/lab require away.
      { trace: require("./runtime/trace"), overlay: require("./runtime/HullOverlay") }
    : undefined;

/** Available vertical viewport height above the undimmed Closet sheet (shared across cold links & dock opens). */
export function closetAboveSheetHeight(windowHeight: number, headerHeight: number): number {
  const sheetHeight = Math.floor(windowHeight * closetSheetHeightRatio(windowHeight));
  return Math.max(120, windowHeight - sheetHeight - headerHeight);
}

/**
 * Shared above-sheet camera framing helper for both cold `/locker` landings and in-room dock Closet opens.
 * Switches to the Islander's room and keeps the Islander's full head-to-feet bounds above the sheet.
 */
export function closetCameraFor(
  hero: SceneEntity | undefined,
  fallbackRoom: RoomId,
  viewport: Viewport,
  windowHeight: number,
  headerHeight: number,
  building: Building
): { room: RoomId; camera: CameraMatrix } {
  const room = hero?.room ?? fallbackRoom;
  const index = Math.max(0, roomIds.indexOf(room));
  const visibleHeight = closetAboveSheetHeight(windowHeight, headerHeight);
  const aboveSheet: Viewport = { width: viewport.width, height: visibleHeight };
  const origin = roomOrigin(index, building);
  const at = hero
    ? {
        x: hero.contact.x,
        y: hero.bounds.top + hero.bounds.height * 0.52,
      }
    : { x: 400, y: 400 };
  const baseScale = roomScale(aboveSheet);
  const heroHeight = hero ? Math.max(120, hero.bounds.height) : 160;
  const maxHeroScale = (visibleHeight * 0.78) / heroHeight;
  const scale = Math.max(fitCamera(aboveSheet, building).a, Math.min(baseScale, maxHeroScale));
  const raw: CameraMatrix = {
    a: scale,
    b: 0,
    c: 0,
    d: scale,
    tx: aboveSheet.width / 2 - (origin.x + at.x) * scale,
    ty: visibleHeight / 2 - (origin.y + at.y) * scale,
  };
  const bounded = boundCamera(raw, aboveSheet, building);
  if (hero) {
    const heroTop = (origin.y + hero.bounds.top) * bounded.d + bounded.ty;
    const heroBottom = (origin.y + hero.bounds.top + hero.bounds.height) * bounded.d + bounded.ty;
    let dy = 0;
    if (heroBottom > visibleHeight - 8) dy = visibleHeight - 8 - heroBottom;
    if (heroTop + dy < 8) dy = 8 - heroTop;
    return { room, camera: dy ? { ...bounded, ty: bounded.ty + dy } : bounded };
  }
  return { room, camera: bounded };
}

function heroRoomInState(state: HomeStateV2): RoomId {
  return roomIds.find((id) => state.rooms[id].characters.some((c) => c.slot === 0)) ?? state.current;
}

export const REDO_VISIBLE_MS = 10000;
export type HomeSheet = "closet" | "badges";
export type HomeClosetConfig = {
  look: IslanderLook;
  earned: readonly string[];
  unseen: readonly string[];
  onWear: (look: IslanderLook) => boolean;
  onSeen?: (id: string) => boolean | void;
  renderCharacter?: (look: IslanderLook) => CharacterRender;
};
export type HomeScreenProps = Ownership & {
  badges?: BadgeId[];
  milestones?: readonly string[];
  initialItem?: string;
  initialSheet?: HomeSheet;
  initialClosetItem?: StyleItem;
  initialBadge?: BadgeId;
  onConsumeIntent?: () => void;
  closet?: HomeClosetConfig;
  renderCharacter?: CharacterRender;
  initialState?: unknown;
  persist?: (state: HomeStateV2) => boolean;
  saveStatus?: ReactNode;
  lab?: boolean;
};
export function HomeScreen({
  initialState,
  initialItem,
  initialSheet,
  initialClosetItem,
  initialBadge,
  onConsumeIntent,
  milestones = [],
  closet,
  persist,
  saveStatus,
  renderCharacter,
  lab = false,
  ...ownership
}: HomeScreenProps) {
  const window = useWindowDimensions(),
    inset = useSafeAreaInsets(),
    reduced = useReducedMotion(),
    visible = useHomeVisible();
  const app = useStore();
  // HD-04: Home's sounds and haptics follow the sound switch (and the effects switch) together.
  const soundOn = app.save.settings.sound && app.save.settings.effects !== false;
  const store = useHomeStore(ownership, initialState, persist);
  const [designing, setDesigning] = useState(!!initialItem),
    [selected, setSelected] = useState<string>();
  const [placing, setPlacing] = useState<ItemId | undefined>(
    initialItem && itemIds.includes(initialItem) ? initialItem : undefined
  );
  const [overview, setOverview] = useState(false),
    [room, setRoom] = useState<RoomId>(() =>
      initialSheet === "closet" ? heroRoomInState(store.state) : store.state.current
    );
  const [more, setMore] = useState(false),
    [friends, setFriends] = useState(false);
  const [tidyConfirm, setTidyConfirm] = useState(false);
  const [tidyCost, setTidyCost] = useState<RestoreCost | undefined>(undefined);
  const [activeSheet, setActiveSheet] = useState<HomeSheet | null>(initialSheet ?? null);
  const [closetInitialItem, setClosetInitialItem] = useState<StyleItem | undefined>(
    initialSheet === "closet" ? initialClosetItem : undefined
  );
  const [badgeInitial, setBadgeInitial] = useState<BadgeId | undefined>(
    initialSheet === "badges" ? initialBadge : undefined
  );
  const [previewLook, setPreviewLook] = useState<IslanderLook | undefined>(() =>
    initialSheet === "closet" && initialClosetItem && closet && !lockedReason(initialClosetItem, closet.earned)
      ? lookWithStyle(closet.look, initialClosetItem)
      : undefined
  );
  const closetButtonRef = useRef<View | null>(null);
  const markedInitialItem = useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (
      activeSheet === "closet" &&
      closetInitialItem &&
      closet?.onSeen &&
      closet.unseen.includes(closetInitialItem.id) &&
      markedInitialItem.current !== closetInitialItem.id
    ) {
      // P2-5: Keep acknowledgement pending if Store refuses the write so a retry/tap can complete it.
      const accepted = closet.onSeen(closetInitialItem.id);
      if (accepted !== false) {
        markedInitialItem.current = closetInitialItem.id;
      }
    }
  }, [activeSheet, closetInitialItem, closet]);
  const effectiveLook = previewLook ?? closet?.look;
  const characterRenderer = useMemo<CharacterRender | undefined>(
    () =>
      renderCharacter ??
      (effectiveLook && closet?.renderCharacter ? closet.renderCharacter(effectiveLook) : undefined),
    [renderCharacter, effectiveLook, closet]
  );
  const hasNewCloset = useMemo(
    () => !!closet?.unseen.some((id) => styleCatalog.some((item) => item.id === id)),
    [closet?.unseen]
  );
  const lastTap = useRef({ x: 0, y: 0, at: 0 });
  const [pickups, setPickups] = useState<(Pickup | undefined)[]>([undefined, undefined]);
  const [debug, setDebug] = useState(lab),
    [stress, setStress] = useState(false);
  const [reactions, setReactions] = useState<Record<string, "eat" | "drink">>({});
  const [meals, setMeals] = useState<Record<string, Meal>>({});
  const [mealReady,setMealReady]=useState<Record<string,number>>({});
  const mealSerial = useRef(0);
  const mealFinishers = useRef<Record<string, { key: number; finish: () => void; presented: boolean }>>({});
  const entityNodes = useRef<Record<string, View>>({});
  const [focusId, restoreFocus] = useState<string>();
  const onNode = useCallback((id: string, node: View | null) => {
    if (node) entityNodes.current[id] = node;
    else delete entityNodes.current[id];
  }, []);
  const reactionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  React.useEffect(() => () => {
    Object.values(reactionTimers.current).forEach(clearTimeout);
    mealFinishers.current = {};
  }, []);
  const clearMealArt = useCallback(() => {
    Object.values(reactionTimers.current).forEach(clearTimeout);
    reactionTimers.current = {};
    mealFinishers.current = {};
    setMeals({});
    setMealReady({});
    setReactions({});
  }, []);
  const [catalogItem, setCatalogItem] = useState<ItemId>();
  // HM-18: Redo shows in Play for 10 s after an Undo; a full room shows a picture, not just words.
  const [redoWindow, setRedoWindow] = useState(false);
  const redoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [storageId, setStorageId] = useState<string>();
  const [storageInspect, setStorageInspect] = useState<string>();
  const [storageFullName, setStorageFullName] = useState<string>();
  const [storageNoteGone, setStorageNoteGone] = useState(0);
  const [capacityGone, setCapacityGone] = useState(0);
  React.useEffect(() => () => clearTimeout(redoTimer.current), []);
  const catalogSeeds = useRef<Record<string, { seed: HomeStateV2 }>>({});
  const [headerHeight, setHeaderHeight] = useState(64 + inset.top);
  // HR-03: the grown-ups' larger-target mode, saved with this child's home.
  const large = !!store.access?.largeTargets;
  const navigationHeight = navigationHeightFor(large, window.width);
  const [frameReport, setFrameReport] = useState<number[]>();
  const [releaseProbes, setReleaseProbes] = useState<ReleaseProbe[]>([]);
  const [probeMax, setProbeMax] = useState(0);
  const [trace] = useState<HomeTrace | undefined>(() => (lab && labKit ? labKit.trace.createHomeTrace() : undefined));
  const onTrace = useCallback((event: Parameters<HomeTrace["record"]>[0]) => trace?.record(event), [trace]);
  const [hulls, setHulls] = useState(lab);
  const onReleaseProbe = useCallback((probe: ReleaseProbe) => {
    writeProbe(probe);
    setProbeMax((maximum) => Math.max(maximum, probe.maxDelta));
    setReleaseProbes((history) => [...history.slice(-4), probe]);
  }, []);
  const canvas = useRef<View>(null),
    canvasOrigin = useRef({ x: 0, y: 64 + inset.top });
  const runtime = useRef<Interaction | null>(null),
    sequence = useRef(0);
  const vertical = designing && window.width > window.height;
  const viewport = useMemo(
    () => ({
      width: window.width - (vertical ? 220 : 0),
      height: Math.max(
        180,
        window.height -
          inset.bottom -
          headerHeight -
          navigationHeight -
          (designing && !vertical ? portraitDrawerHeightFor(large) : 0)
      ),
    }),
    [window.width, window.height, vertical, designing, inset, headerHeight, navigationHeight, large]
  );
  const building = useMemo(
    () => buildingLayout(roomIds.length, window.width / window.height > 1.8),
    [window.width, window.height]
  );
  const buildRuntimeScene = useMemo(() => createSceneBuilder(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Navigation is outside the scene revision.
  const baseScene = useMemo(() => buildRuntimeScene(store.state), [store.state.rooms, buildRuntimeScene]);
  // HC-02: ground-floor rooms have a beach whose shells can be picked up.
  const shoreRooms = useMemo(() => roomIds.slice(0, building.columns), [building.columns]);
  const scene = useMemo(() => withPortions(baseScene, shoreRooms), [baseScene, shoreRooms]);
  const { sleeping, wake } = useIdleCharacters(scene, pickups);
  useLayoutEffect(() => {
    if (!focusId) return;
    const frame = requestAnimationFrame(() => {
      const node = entityNodes.current[focusId];
      if (node) {
        if (Platform.OS === "web") node.focus();
        else AccessibilityInfo.sendAccessibilityEvent(node, "focus");
      }
      restoreFocus(undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [scene.revision, focusId]);
  // Each refusal is a new message serial, so a second refusal shows the picture again.
  const capacityShown = store.message === CAPACITY_MESSAGE && !!store.messageSerial && capacityGone !== store.messageSerial;
  React.useEffect(() => {
    if (store.message !== CAPACITY_MESSAGE || !store.messageSerial) return;
    const serial = store.messageSerial;
    const timer = setTimeout(() => setCapacityGone(serial), CAPACITY_CUE_MS);
    return () => clearTimeout(timer);
  }, [store.message, store.messageSerial]);
  // F3: an undo note stays until the next message or a tap; reading is never timed.
  const [noteGone, setNoteGone] = useState<number>();
  const undoNote = UNDO_NOTES.includes(store.message) && noteGone !== store.messageSerial;
  const live = useRef({ store, scene, selected, placing, room, designing, meals, activeSheet });
  useLayoutEffect(() => {
    live.current = { store, scene, selected, placing, room, designing, meals, activeSheet };
  });
  // H4: reactions, effects, sounds and cooking.
  const delight = useDelight({
    soundOn,
    reduced,
    cue: (id, kind, dir) => runtime.current?.showCue?.(id, kind, dir),
    clearCue: (id) => runtime.current?.clearCue?.(id),
    getScene: () => live.current.scene,
    cook: (id, roomId) => live.current.store.dispatch({ type: "cook", id, roomId }),
    isHeld: (id) => (runtime.current?.slots.get() ?? []).some((s) => !!s?.id && s.phase !== "settling" && (s.id === id || s.restId === id)),
  });
  const { watchCooking, pickedUp: delightPickup, landed: delightLanded, ate: delightAte } = delight;
  React.useEffect(() => watchCooking(scene), [scene, watchCooking]);
  const recordLayoutRef = useRef<(() => void) | undefined>(undefined);
  const ghost = useSharedValue<CatalogGhost>({ active: false, x: 0, y: 0 });
  const viewportOffset = useSharedValue({ x: 0, y: 64 + inset.top });
  const measure = useCallback(
    () =>
      canvas.current?.measureInWindow((x, y) => {
        canvasOrigin.current = { x, y };
        viewportOffset.set({ x, y });
        recordLayoutRef.current?.();
      }),
    [viewportOffset]
  );
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure, viewport]);

  // A refusal changes presentation only: the real contents remain available for recovery.
  const showStorageFull = useCallback((targetId?: string) => {
    const current = live.current;
    const target = Object.values(current.scene.rooms).flatMap(index => index.targets).find(t => t.id === targetId);
    const owner = target && current.scene.entities[target.owner];
    setStorageFullName(owner?.item ? itemSpec(owner.item.item).name : undefined);
    if (target) {
      setStorageId(target.owner);
      setStorageInspect(target.owner);
      setSelected(undefined);
    }
    current.store.setMessage(STORAGE_FULL_MESSAGE);
  }, []);
  const commitAt = useCallback(
    (
      id: string,
      destination: RoomId,
      anchor: { x: number; y: number },
      proposal?: DropProposal,
      stillCurrent?: () => boolean
    ) => {
      const current = live.current;
      const catalog = catalogSeeds.current[id];
      if (catalog) {
        const pending = catalogCommit(current.store.getState(), catalog, id, proposal);
        if (!pending) {
          if (proposal && placedInstances(current.store.getState().rooms[proposal.room]).length >= MAX_INSTANCES)
            current.store.setMessage(CAPACITY_MESSAGE);
          return undefined;
        }
        const next = current.store.commitProposal(pending.proposal, pending.seed, stillCurrent);
        return next ? { state: next, proposal: pending.proposal, identities: current.store.getCommittedIdentities() } : undefined;
      }
      const entity = current.scene.entities[id];
      if (!entity || (!current.designing && entity.item && !capabilityOf(entity.item.item).moveInPlay)) return undefined;
      let next =
        proposal && !isPortion(id) ? current.store.commitProposal(proposal, undefined, stillCurrent) : undefined;
      if (!next && proposal && !isPortion(id) && proposal.revision === buildScene(current.store.getState()).revision)
        return undefined;
      if (!next) {
        const latest = current.store.getState();
        const fresh = withPortions(buildScene(latest), shoreRooms);
        const candidate = fresh.entities[id];
        if (!candidate) return undefined;
        if (isPortion(id)) {
          const source = candidate.item!;
          const item = { ...source, id: `food-${Date.now().toString(36)}-${++sequence.current}` };
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
          if (!proposal || proposal.kind === "staging") {
            current.store.setMessage(proposal?.refusal === "capacity" || placedInstances(latest.rooms[destination]).length >= MAX_INSTANCES
              ? CAPACITY_MESSAGE : "Choose a free hand or place.");
            return undefined;
          }
          // Materialize the preview, never resolve the raw release anchor again.
          // Concurrent drags may keep an unchanged destination; a moved/occupied target fails closed.
          if (proposal.target) {
            const target = fresh.rooms[destination].targets.find(t => t.id === proposal.target);
            const contact = target && (proposal.kind === "hand" || (proposal.kind === "mouth" && proposal.consume === "drink")
              ? target.projectedContact ?? target.contact : target.contact);
            if (target?.kind === "container" && target.closed) showStorageFull(target.id);
            if (!target || target.closed || target.occupied ||
              contact!.x !== proposal.contact.x || contact!.y !== proposal.contact.y ||
              JSON.stringify(target.attachment) !== JSON.stringify(proposal.attachment)) return undefined;
          }
          if (proposal.revision !== fresh.revision && (!proposal.target || proposal.moves.length !== 1)) return undefined;
          const materializedId = `${destination}/item/${item.id}`;
          const resolved: DropProposal = {
            ...proposal,
            id: materializedId,
            item,
            revision: buildScene(seed).revision,
            moves: proposal.moves.map(move => move.id === id ? { ...move, id: materializedId } : move),
          };
          next = current.store.commitProposal(resolved, seed, stillCurrent);
          return next
            ? { state: next, proposal: resolved, identities: current.store.getCommittedIdentities() }
            : undefined;
        }
        const resolved = resolve(
          { ...fresh.rooms[destination], entities: fresh.entities },
          candidate,
          proposal?.contact ?? roomPoint(anchor.x, anchor.y),
          {
            scale: runtime.current!.camera.get().a,
            avoidFurnitureOverlap: current.designing,
            release: true,
            target: proposal?.target,
          }
        );
        if (resolved.refusal === "storage-capacity") { showStorageFull(resolved.target); return undefined; }
        // A concurrent edit can invalidate a drop, but must never silently move it
        // somewhere the child did not preview. Rebase only the same destination.
        if (proposal && (resolved.kind !== proposal.kind || resolved.target !== proposal.target ||
          resolved.contact.x !== proposal.contact.x || resolved.contact.y !== proposal.contact.y ||
          resolved.base !== proposal.base || JSON.stringify(resolved.attachment) !== JSON.stringify(proposal.attachment)))
          return undefined;
        next = current.store.commitProposal(resolved, undefined, stillCurrent);
        return next
          ? { state: next, proposal: resolved, identities: current.store.getCommittedIdentities() }
          : undefined;
      }
      return { state: next, proposal: proposal!, identities: current.store.getCommittedIdentities() };
    },
    [shoreRooms, showStorageFull]
  );
  const showReaction = (proposal: DropProposal, food?: Meal["food"], offered = false, source = proposal.id, capture?:Meal["capture"]) => {
    if (proposal.kind !== "mouth") return;
    const target = live.current.scene.rooms[proposal.room].targets.find((t) => t.id === proposal.target);
    if (!target) return;
    wake(target.owner);
    const action = proposal.consume === "drink" ? "drink" : "eat";
    const previousMeal=live.current.meals[target.owner];
    if(previousMeal?.source && previousMeal.capture)runtime.current?.completeMealHandoff(previousMeal.source,previousMeal.capture);
    clearTimeout(reactionTimers.current[target.owner]);
    setReactions((current) => ({ ...current, [target.owner]: action }));
    const key = ++mealSerial.current;
    setMealReady(current=>{const next={...current};delete next[target.owner];return next;});
    const drag = runtime.current?.slots.get().find(s => s.id === source);
    const recipient = live.current.scene.entities[target.owner];
    const heldWidth = recipient?.character ? 24 * species[recipient.character.slot].unit * (action === 'drink' && recipient.character.slot === 1 ? 1.25 : 1) : 24;
    const releaseScale = drag?.subject ? drag.subject.bounds.width * 1.08 / heldWidth : 1;
    if (food) setMeals(current => ({ ...current, [target.owner]: { key, source, capture, offered, releaseScale, food: { ...food }, action } }));
    const eater = live.current.scene.entities[target.owner];
    if (eater?.character) delightAte(eater, action);
    const finish = () => {
      if (mealFinishers.current[target.owner]?.key !== key) return;
      delete mealFinishers.current[target.owner];
      delete reactionTimers.current[target.owner];
      const presentedMeal=live.current.meals[target.owner];
      if(presentedMeal?.source && presentedMeal.capture)runtime.current?.completeMealHandoff(presentedMeal.source,presentedMeal.capture);
      setMeals(current => { const next = { ...current }; delete next[target.owner]; return next; });
      const owner = live.current.scene.entities[target.owner];
      if (owner?.character)
        live.current.store.dispatch({ type: "finish-action", slot: owner.character.slot, roomId: owner.room });
      setReactions((current) => {
        const next = { ...current };
        delete next[target.owner];
        return next;
      });
    };
    mealFinishers.current[target.owner] = { key, finish, presented: false };
    // Only an action without presentation uses a timer. Visible art completes from playback.
    if (!food) reactionTimers.current[target.owner] = setTimeout(finish, MEAL_MS);
  };
  const onMealPresented = useCallback((id: string, key: number) => {
    const entry = mealFinishers.current[id];
    if (!entry || entry.key !== key || entry.presented || live.current.meals[id]?.key !== key) return;
    entry.presented = true;
    setMealReady(current=>({...current,[id]:key}));
    clearTimeout(reactionTimers.current[id]);
    delete reactionTimers.current[id];
  }, []);
  const onMealFinished = useCallback((id: string, key: number) => {
    const entry = mealFinishers.current[id];
    if (entry?.key === key && entry.presented) entry.finish();
  }, []);
  React.useEffect(() => {
    // A restored or interrupted action completes without changing its supported base.
    for (const entity of Object.values(scene.entities)) {
      if (!entity.character || !["eat", "drink"].includes(entity.action ?? "") || meals[entity.id] || reactionTimers.current[entity.id])
        continue;
      reactionTimers.current[entity.id] = setTimeout(() => {
        delete reactionTimers.current[entity.id];
        const latest = live.current.scene.entities[entity.id];
        if (latest?.character)
          live.current.store.dispatch({ type: "finish-action", slot: latest.character.slot, roomId: latest.room });
      }, 750);
    }
  }, [scene, meals]);

  const onCommit = useCallback(
    (index: number, proposal: DropProposal, at: { x: number; y: number }, token: CaptureToken) => {
      const stillCurrent = () => runtime.current!.isCurrent(index, token);
      if (!stillCurrent()) return;
      if (proposal.refusal === "storage-capacity") { showStorageFull(proposal.target); runtime.current!.finish(index, false, undefined, undefined, undefined, token); return; }
      const origin = roomOrigin(roomIds.indexOf(proposal.room), building);
      // Catalog seeds and detached portions may exist only in the captured slot.
      const mealFood = live.current.scene.entities[proposal.id]?.item ??
        runtime.current?.slots.get()[index]?.subject?.item ?? proposal.item;
      const result = commitAt(
        proposal.id,
        proposal.room,
        { x: at.x - origin.x, y: at.y - origin.y },
        proposal,
        stillCurrent
      );
      if (result) {
        if (result.proposal.attachment.kind === "container") setStorageId(result.proposal.attachment.parent);
        if (labKit && trace)
          trace.record({ type: "commit", at: Date.now(), id: proposal.id, kind: result.proposal.kind, target: result.proposal.target, transaction: labKit.trace.transactionId(JSON.stringify(result.state)) });
        showReaction(result.proposal, mealFood, true, proposal.id, token);
        const before = live.current.scene;
        const destination = buildRuntimeScene(result.state);
        // A mouth release keeps the original carry drawing in place until the
        // meal takes over. Only a landing needs the destination drawing.
        if (result.proposal.kind !== "mouth") {
          setPickups((current) =>
            current.map((p, i) =>
              i === index && p
                ? { ...p, destination, identities: result.identities, committedId: result.identities[result.proposal.id] }
                : p
            )
          );
        }
        runtime.current!.finish(
          index,
          true,
          result.proposal,
          destination.revision,
          destination,
          token,
          result.identities[result.proposal.id],
          result.proposal.kind === "mouth" && !!mealFood
        );
        setRoom(result.proposal.room);
        if (runtime.current!.slots.get()[index]?.synthetic) {
          const owner = live.current.scene.rooms[result.proposal.room].targets.find(t => t.id === result.proposal.target)?.owner;
          restoreFocus(result.proposal.kind === "mouth" ? owner : result.identities[result.proposal.id]);
        }
        delightLanded(result.proposal, before.entities[proposal.id], before, destination, result.identities[result.proposal.id]);
        // Rule 49: food dropped into a hot pan starts sizzling with the commit, not a render later.
        watchCooking(destination);
      } else runtime.current!.finish(index, false, undefined, undefined, undefined, token);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showReaction reads refs; the delight callbacks are stable.
    [building, commitAt, delightLanded, delightAte, watchCooking, buildRuntimeScene, trace, showStorageFull]
  );
  const onPickup = useCallback(
    (pickup: Pickup) => {
      const current = runtime.current!.slots.get()[pickup.slot];
      if (current.id !== pickup.id || current.generation !== pickup.generation || current.epoch !== pickup.epoch)
        return;
      const captured = pickup.scene.entities[pickup.id];
      // A committed drink remains a recoverable hand object. Regrabbing it ends
      // its owner's transient sip art, just as regrabbing the friend does.
      const owner = captured?.attachment.kind === "hand" ? captured.attachment.character : undefined;
      for (const id of new Set([...groupIds(pickup.scene, pickup.id), ...(owner ? [owner] : [])])) {
        if (pickup.scene.entities[id]?.character) {
          wake(id);
          clearTimeout(reactionTimers.current[id]);
          delete reactionTimers.current[id];
          delete mealFinishers.current[id];
          const interrupted=live.current.meals[id];
          if(interrupted?.source && interrupted.capture)runtime.current?.completeMealHandoff(interrupted.source,interrupted.capture);
          setMeals(current => { const next = { ...current }; delete next[id]; return next; });
          setReactions(current => { const next = { ...current }; delete next[id]; return next; });
        }
      }
      setStorageId(undefined);
      delightPickup(pickup.scene.entities[pickup.id]);
      watchCooking(live.current.scene);
      setPickups((current) => current.map((p, i) => (i === pickup.slot ? pickup : p)));
      setSelected(undefined);
    },
    [wake, delightPickup, watchCooking]
  );
  const onClear = useCallback(
    (index: number, id?: string, reason?: "capacity" | "storage-capacity") => {
      if (reason === "storage-capacity") showStorageFull();
      if (reason === "capacity") live.current.store.setMessage(CAPACITY_MESSAGE);
      if (id) clearCatalogSeed(catalogSeeds.current, id);
      // A cancelled carry puts food back in a hot pan: it starts cooking again.
      watchCooking(live.current.scene);
      // A UI-thread re-grab can outrun this queued clear callback.
      if (runtime.current?.slots.get()[index].id) return;
      setPickups((current) => {
        const pickup = current[index];
        clearCatalogSeed(catalogSeeds.current, pickup?.id);
        return current.map((p, i) => (i === index ? undefined : p));
      });
    },
    [watchCooking, showStorageFull]
  );
  const onDestination = useCallback(
    (index: number, destination: Scene) =>
      setPickups((current) => current.map((p, i) => (i === index && p ? { ...p, destination } : p))),
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
    if (!subject || (!designing && subject.item && !capabilityOf(subject.item.item).moveInPlay)) return;
    const targetProposal = resolve(
      { ...live.current.scene.rooms[dest], entities: live.current.scene.entities },
      subject,
      roomPoint(anchor.x, anchor.y),
      {
        scale: c.a,
        avoidFurnitureOverlap: designing,
        release: true,
      }
    );
    if (runtime.current!.animateProposal(targetProposal)) setSelected(undefined);
  };
  const sheetHistoryPushed = useRef(false);
  const suppressNextPop = useRef(false);
  const popWebSheetHistory = useCallback(() => {
    if (Platform.OS !== "web" || !sheetHistoryPushed.current) return;
    sheetHistoryPushed.current = false;
    const host = globalThis as { window?: { history?: { back?: () => void } } };
    if (typeof host.window?.history?.back === "function") {
      suppressNextPop.current = true;
      host.window.history.back();
    }
  }, []);
  const clearClosetDraft = useCallback(
    (fromPopState = false) => {
      markedInitialItem.current = undefined;
      setPreviewLook(undefined);
      setClosetInitialItem(undefined);
      setActiveSheet(null);
      onConsumeIntent?.();
      if (!fromPopState) popWebSheetHistory();
    },
    [onConsumeIntent, popWebSheetHistory]
  );
  const floorOf = useCallback((id: RoomId) => Math.floor(roomIds.indexOf(id) / building.columns), [building.columns]);
  const goRoom = useCallback((id: RoomId) => {
    const interaction = runtime.current!;
    interaction.cancelAll();
    // P1-3: Switching rooms cancels any open Closet try-on draft so it never stays active offscreen.
    if (live.current.activeSheet === "closet") clearClosetDraft();
    setSelected(undefined);
    setMore(false);
    setFriends(false);
    setRoom(id);
    setOverview(false);
    live.current.store.dispatch({ type: "room", room: id });
    // HR-02: another floor is a door, not a jump; the same floor eases across.
    interaction.animateCamera(focusCamera(roomIds.indexOf(id), viewport, building),
      !overview && floorOf(id) !== floorOf(room));
  }, [building, clearClosetDraft, floorOf, overview, room, viewport]);
  const choose = useCallback((id: string) => {
    const entity = live.current.scene.entities[id];
    if (!designing && entity?.item && storageCapacity(entity.item.item) && !capabilityOf(entity.item.item).moveInPlay && !overview) {
      live.current.store.dispatch({ type: "toggle", id: entity.item.id, roomId: entity.room });
      setStorageId(storageOpen(entity.item) ? undefined : id);
      setSelected(undefined);
      return;
    }
    if (!designing && entity?.item && !capabilityOf(entity.item.item).moveInPlay) return;
    if (overview && entity) goRoom(entity.room);
    else { setStorageId(undefined); setStorageInspect(undefined); setSelected(id); }
  }, [designing, goRoom, overview]);
  const openCloset = useCallback(
    (item?: StyleItem) => {
      runtime.current?.cancelAll();
      setDesigning(false);
      setPlacing(undefined);
      setSelected(undefined);
      setMore(false);
      setFriends(false);
      setOverview(false);
      setClosetInitialItem(item);
      setBadgeInitial(undefined);
      setPreviewLook(
        item && closet && !lockedReason(item, closet.earned) ? lookWithStyle(closet.look, item) : undefined
      );
      setActiveSheet("closet");
      const hero = live.current.scene.entities["character/0"];
      const framed = closetCameraFor(hero, live.current.room, viewport, window.height, headerHeight, building);
      if (framed.room !== live.current.room) setRoom(framed.room);
      runtime.current?.animateCamera(framed.camera, false);
    },
    [building, closet, headerHeight, viewport, window.height]
  );
  const closeCloset = useCallback(
    (fromPopState = false) => {
      clearClosetDraft(fromPopState);
      runtime.current?.animateCamera(
        focusCamera(roomIds.indexOf(live.current.room), viewport, building),
        false
      );
    },
    [building, clearClosetDraft, viewport]
  );
  const openBadges = useCallback((badge?: BadgeId) => {
    runtime.current?.cancelAll();
    setDesigning(false);
    setPlacing(undefined);
    setSelected(undefined);
    setMore(false);
    setFriends(false);
    setPreviewLook(undefined);
    setClosetInitialItem(undefined);
    setBadgeInitial(badge);
    setActiveSheet("badges");
  }, []);
  const closeBadges = useCallback(
    (fromPopState = false) => {
      setBadgeInitial(undefined);
      setActiveSheet(null);
      onConsumeIntent?.();
      if (!fromPopState) popWebSheetHistory();
    },
    [onConsumeIntent, popWebSheetHistory]
  );
  const goToMap = useCallback(() => {
    const r = router as typeof router & { dismissTo?: (href: string) => void };
    if (typeof r.dismissTo === "function") r.dismissTo("/");
    else router.replace?.("/");
  }, []);
  const handleBack = useCallback(() => {
    // P1-1: First Back closes an open Closet/Badges sheet; second Back reaches `/` (Map).
    if (activeSheet === "closet") {
      closeCloset();
      return;
    }
    if (activeSheet === "badges") {
      closeBadges();
      return;
    }
    goToMap();
  }, [activeSheet, closeCloset, closeBadges, goToMap]);
  // P1-1: Android hardware Back closes an open Closet/Badges sheet first.
  React.useEffect(() => {
    if (!activeSheet) return;
    const bh = (
      ReactNative as unknown as {
        BackHandler?: {
          addEventListener?: (event: string, handler: () => boolean) => { remove: () => void };
        };
      }
    ).BackHandler;
    if (!bh?.addEventListener) return;
    const sub = bh.addEventListener("hardwareBackPress", () => {
      if (activeSheet === "closet") closeCloset();
      else if (activeSheet === "badges") closeBadges();
      return true;
    });
    return () => sub.remove();
  }, [activeSheet, closeCloset, closeBadges]);
  // P1-1: Lightweight Web history sentinel so first browser Back dismisses an open sheet to Home.
  React.useEffect(() => {
    if (Platform.OS !== "web") return;
    const host = globalThis as {
      window?: {
        history?: { state?: unknown; pushState?: (data: unknown, unused: string, url?: string) => void };
        location?: { href?: string };
      };
    };
    const win = host.window;
    if (!win || !activeSheet || sheetHistoryPushed.current || typeof win.history?.pushState !== "function") return;
    sheetHistoryPushed.current = true;
    const currentState = win.history.state && typeof win.history.state === "object" ? win.history.state : {};
    win.history.pushState({ ...(currentState as Record<string, unknown>), __homeSheet: activeSheet }, "", win.location?.href ?? "");
  }, [activeSheet]);
  React.useEffect(() => {
    if (Platform.OS !== "web") return;
    const host = globalThis as {
      window?: {
        addEventListener?: (type: string, listener: (event: PopStateEvent) => void, capture?: boolean) => void;
        removeEventListener?: (type: string, listener: (event: PopStateEvent) => void, capture?: boolean) => void;
      };
    };
    const win = host.window;
    if (!win?.addEventListener) return;
    const onPopState = (event: PopStateEvent) => {
      if (suppressNextPop.current) {
        suppressNextPop.current = false;
        event.stopImmediatePropagation?.();
        return;
      }
      if (sheetHistoryPushed.current && live.current.activeSheet) {
        sheetHistoryPushed.current = false;
        event.stopImmediatePropagation?.();
        if (live.current.activeSheet === "closet") closeCloset(true);
        else if (live.current.activeSheet === "badges") closeBadges(true);
      }
    };
    win.addEventListener("popstate", onPopState, true);
    return () => {
      win.removeEventListener?.("popstate", onPopState, true);
      sheetHistoryPushed.current = false;
      suppressNextPop.current = false;
    };
  }, [closeCloset, closeBadges]);
  const onTap = (id: string | undefined, point: ScreenPoint, now: number) => {
    const current = live.current;
    // Overview room taps always navigate, even over an object or with a previous selection.
    if (overview) {
      const index = roomAtScreen(point.x, point.y, runtime.current!.camera.get(), building);
      if (index >= 0) goRoom(roomIds[index]);
      return;
    }
    if (!id && !current.selected && !current.placing) {
      const origin = roomOrigin(roomIds.indexOf("home"), building);
      const local = screenToRoom(point, runtime.current!.camera.get(), housePoint(origin.x, origin.y));
      if (local.x >= 524 && local.x <= 702 && local.y >= 26 && local.y <= 198) {
        openBadges();
        return;
      }
      // HC-01: a painted jar, pan, book, plant or lantern answers the touch.
      const camera = runtime.current!.camera.get(), index = roomAtScreen(point.x, point.y, camera, building);
      if (index >= 0) {
        const at = roomOrigin(index, building), there = screenToRoom(point, camera, housePoint(at.x, at.y));
        const piece = pieceAt(roomIds[index], there.x, there.y);
        if (piece) {
          delight.touchedPiece(roomIds[index], piece);
          return;
        }
      }
    }
    const entity = id ? current.scene.entities[id] : undefined;
    if (!id && !current.selected && !current.placing) {
      const prior = lastTap.current;
      lastTap.current = { ...point, at: now };
      if (now - prior.at < 300 && Math.hypot(point.x - prior.x, point.y - prior.y) < 28) {
        const c = runtime.current!.camera.get();
        const scale = c.a > roomScale(viewport) * 1.2 ? roomScale(viewport) : (viewport.height / 620) * 1.4;
        interaction.animateCamera(zoomCamera(c, scale / c.a, point.x, point.y, viewport, building));
        lastTap.current.at = 0;
        return;
      }
    }
    if (current.placing) {
      insertAt(current.placing, point.x, point.y);
      return;
    }
    if (current.selected && current.selected !== id) {
      moveTo(current.selected, entity, point);
      return;
    }
    if (designing && entity?.item && storageCapacity(entity.item.item)) {
      setStorageId(undefined);
      setStorageInspect(undefined);
      setSelected(id);
      return;
    }
    if (entity?.item && !isPortion(entity.id) && capabilityOf(entity.item.item).toggle) {
      current.store.dispatch({ type: "toggle", id: entity.item.id, roomId: entity.room });
      if (storageCapacity(entity.item.item)) setStorageId(storageOpen(entity.item) ? undefined : entity.id);
    }
    if (entity) delight.tapped(entity, sleeping);
    if (id) {
      setSelected(!designing && entity?.item && !capabilityOf(entity.item.item).moveInPlay ? undefined : id);
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
  const initialCamera =
    initialSheet === "closet"
      ? closetCameraFor(scene.entities["character/0"], room, viewport, window.height, headerHeight, building).camera
      : focusCamera(roomIds.indexOf(room), viewport, building);
  const interaction = useInteraction({
    scene,
    building,
    viewport,
    initialCamera,
    reduced,
    designing,
    onCameraChange: (all, index) => {
      setOverview(all);
      if (index >= 0) setRoom(roomIds[index]);
      // P1-3: Swiping or panning to another room / overview cancels an active Closet try-on draft.
      if (live.current.activeSheet === "closet") {
        const heroRoom = live.current.scene.entities["character/0"]?.room ?? live.current.room;
        if (all || (index >= 0 && roomIds[index] !== heroRoom)) {
          clearClosetDraft();
        }
      }
    },
    onPickup,
    onCommit,
    onTap,
    onClear,
    onDestination,
    onFrameReport: lab ? setFrameReport : undefined,
    onReleaseProbe: lab ? onReleaseProbe : undefined,
    onTrace: lab && labKit ? onTrace : undefined,
    viewportOffset,
    currentRoom: room,
    // HM-14: a carried thing held on a room button takes the child there, still carried.
    onRoomHover: (next) => {
      if (live.current.activeSheet === "closet") {
        const heroRoom = live.current.scene.entities["character/0"]?.room ?? live.current.room;
        if (next !== heroRoom) clearClosetDraft();
      }
      setOverview(false);
      setRoom(next);
      live.current.store.dispatch({ type: "room", room: next });
    },
  });
  const zoneRects = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const publishZones = useCallback(() => runtime.current?.dropZones.set(Object.entries(zoneRects.current).map(([id, r]) =>
    id === "drawer" ? { kind: "drawer" as const, ...r } : { kind: "room" as const, room: id as RoomId, ...r })), []);
  const onRoomRect = useCallback((id: RoomId, rect: { x: number; y: number; width: number; height: number } | null) => {
    if (rect) zoneRects.current[id] = rect;
    else delete zoneRects.current[id];
    publishZones();
  }, [publishZones]);
  // HR-01: the Friends button is where a carried friend goes to wait.
  const onDrawerRect = useCallback((rect: { x: number; y: number; width: number; height: number }) => {
    zoneRects.current.drawer = rect;
    publishZones();
  }, [publishZones]);
  useLayoutEffect(() => {
    runtime.current = interaction;
  });
  // Reference frame for planning and checking recorded gestures: after each settled edit and each measure.
  const recordLayout = useCallback(() => {
    const camera = runtime.current?.camera.get();
    if (!trace || !camera) return;
    const { scene } = live.current;
    trace.record({ type: "layout", at: Date.now(), camera: { a: camera.a, tx: camera.tx, ty: camera.ty }, offset: canvasOrigin.current,
      entities: Object.values(scene.entities).filter((e) => restingVisible(e, scene)).map((e) => ({
        id: e.id, room: e.room, x: e.contact.x, y: e.contact.y, visual: e.visual,
        head: e.character ? anchorsFor(e.character.slot, e.base, e.facing, e.action).head : undefined })) });
  }, [trace]);
  React.useEffect(recordLayout, [recordLayout, scene]);
  useLayoutEffect(() => { recordLayoutRef.current = recordLayout; });
  React.useEffect(() => () => trace?.dispose(), [trace]);
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
          gripX: s.gripX,
          gripY: s.gripY,
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
      entities: () =>
        Object.values(live.current.scene.entities).map((e) => ({
          id: e.id,
          room: e.room,
          contact: e.contact,
          bounds: e.bounds,
          base: e.base,
          parent: e.parent,
          children: e.children,
        })),
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
    // P1-3: Keep above-sheet Islander framing intact when headerHeight/viewport settles while Closet is open.
    if (activeSheet === "closet") {
      const hero = live.current.scene.entities["character/0"];
      const framed = closetCameraFor(hero, room, viewport, window.height, headerHeight, building);
      interaction.camera.set(framed.camera);
      return;
    }
    const before = interaction.camera.get();
    const oldOrigin = roomOrigin(roomIds.indexOf(room), old.building),
      nextOrigin = roomOrigin(roomIds.indexOf(room), building);
    const center = screenToRoom(
      screenPoint(old.viewport.width / 2, old.viewport.height / 2),
      before,
      housePoint(oldOrigin.x, oldOrigin.y)
    );
    const scale = (before.a * roomScale(viewport)) / roomScale(old.viewport);
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
  }, [viewport, building, activeSheet, window.height, headerHeight]);
  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") { interaction.cancelAll(); clearMealArt(); }
    });
    return () => {
      sub.remove();
      interaction.cancelAll();
    };
    // Stable shared handles; never re-register cancellation on a settled edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // HR-02 (rule 52): after 6 s without a touch, one thing you can use gives one small wiggle.
  // A JS timer, not a frame loop: nothing runs while waiting. Any touch starts the quiet over.
  const hints = useRef<HintState>(freshHints(0));
  // R3: hidden or backgrounded, nothing waits; coming back starts a fresh quiet spell.
  React.useEffect(() => { if (visible) hints.current = freshHints(Date.now()); }, [visible]);
  const quiet = visible && !designing && !overview && !selected && !placing && !more && !friends && !activeSheet;
  // Refs only: a hint or a touch never re-renders the screen, so the wiggle itself never stalls a frame.
  const rearm = useRef<() => void>(() => {});
  React.useEffect(() => {
    if (!quiet || reduced) { rearm.current = () => {}; return; }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      clearTimeout(timer);
      timer = undefined;
      const due = nextHintAt(hints.current);
      if (due === undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        // A touch since this was armed moved the quiet start later: wait again.
        const again = nextHintAt(hints.current);
        if (again === undefined || again > Date.now() + 16) { arm(); return; }
        const { scene } = live.current;
        // Only small things wiggle (a whole cabinet tilting looks broken): a small thing you can
        // switch, such as a lamp, then food, then beach shells.
        const rank = (e: SceneEntity) => (e.item && capabilityOf(e.item.item).toggle ? 0 : e.id.includes("/item/portion-shore-") ? 2 : 1);
        const candidates = Object.values(scene.rooms[room].entities)
          .filter((e) => restingVisible(e, scene) && e.item && !!e.body?.small && (isPortion(e.id) || capabilityOf(e.item.item).toggle))
          .sort((a, b) => rank(a) - rank(b) || a.contact.x - b.contact.x)
          .map((e) => e.id);
        // R2: nothing here to hint at. Stop until a touch, a room change or a return to Home.
        if (!candidates.length) return;
        const next = takeHint(hints.current, Date.now(), candidates, reduced);
        hints.current = next.state;
        if (next.id) runtime.current?.showHint(next.id);
        arm();
      }, Math.max(0, due - Date.now()));
    };
    rearm.current = () => { if (timer === undefined) arm(); };
    arm();
    return () => { clearTimeout(timer); rearm.current = () => {}; };
  }, [quiet, reduced, room]);
  const touched = () => {
    hints.current = touchedHints(hints.current, Date.now());
    rearm.current();
  };
  /** Bring a friend here. One who is elsewhere or waiting comes out of the drawer cell, visibly. */
  const bring = (id: string, slot: number, from?: { x: number; y: number }) => {
    const subject = live.current.scene.entities[id];
    if (subject) {
      const nearby = subject.room === room && subject.attachment.kind !== "staging";
      const c = interaction.camera.get();
      const start = !nearby && from
        ? screenToRoom(screenPoint(from.x - canvasOrigin.current.x, from.y - canvasOrigin.current.y), c, housePoint(0, 0)) : undefined;
      runtime.current!.animateProposal(resolve({ ...scene.rooms[room], entities: scene.entities }, subject,
        roomPoint(350 + slot * 90, 490), { scale: c.a, release: true }), undefined, start);
    }
    setFriends(false);
  };
  const find = () => {
    const hero = scene.entities["character/0"];
    if (!hero) return;
    setRoom(hero.room);
    setOverview(false);
    store.dispatch({ type: "room", room: hero.room });
    interaction.animateCamera(focusCamera(roomIds.indexOf(hero.room), viewport, building, hero.contact),
      !overview && floorOf(hero.room) !== floorOf(room));
    setSelected(undefined);
    setMore(false);
    setFriends(false);
    restoreFocus(hero.id);
  };
  const moveAccessible = useCallback(
    (id: string, action: string) => {
      const { scene } = live.current;
      const entity = scene.entities[id];
      if (!entity) return;
      if (action === "open" && entity.item && storageCapacity(entity.item.item)) {
        live.current.store.dispatch({ type: "toggle", id: entity.item.id, roomId: entity.room });
        setStorageId(storageOpen(entity.item) ? undefined : id);
        setStorageInspect(undefined);
        setSelected(undefined);
        return;
      }
      if (!live.current.designing && entity.item && !capabilityOf(entity.item.item).moveInPlay) return;
      if (action === "store") {
        const proposal = resolve({ ...scene.rooms[entity.room], entities: scene.entities }, entity, entity.contact, {
          scale: runtime.current!.camera.get().a,
          intent: "staging",
          release: true,
        });
        runtime.current!.animateProposal(proposal);
        return;
      }
      const delta = (
        { left: [-37.5, 0], right: [37.5, 0], back: [0, -14.4], forward: [0, 14.4] } as Record<string, number[]>
      )[action];
      if (delta) {
        const proposal = resolve({ ...scene.rooms[entity.room], entities: scene.entities }, entity,
          roomPoint(entity.contact.x + delta[0], entity.contact.y + delta[1]), {
            scale: runtime.current!.camera.get().a, avoidFurnitureOverlap: live.current.designing, release: true });
        runtime.current!.animateProposal(proposal);
      }
    },
    []
  );
  function catalogSubject(item: ItemId, x: number, y: number, destination?: RoomId) {
    if (!owns(item, ownership)) { store.setMessage("This showpiece is in the Locker."); return; }
    const current = live.current.store.getState(), dest = destination ?? live.current.room;
    if (destination && placedInstances(current.rooms[dest]).length >= MAX_INSTANCES) {
      store.setMessage(CAPACITY_MESSAGE); return;
    }
    const created = instance(`home-${Date.now().toString(36)}-${++sequence.current}`, item, 0, 0);
    const seed = { ...current, rooms: { ...current.rooms,
      [dest]: { ...current.rooms[dest], instances: [...current.rooms[dest].instances, created] } } };
    const prepared = buildScene(seed), id = `${dest}/item/${created.id}`;
    const origin = roomOrigin(roomIds.indexOf(dest), building);
    const contact = screenToRoom(screenPoint(x, y), runtime.current!.camera.get(), housePoint(origin.x, origin.y));
    const subject = { ...prepared.entities[id], contact };
    catalogSeeds.current[id] = { seed };
    return subject;
  }
  function insertAt(item: ItemId, x: number, y: number) {
    const c = runtime.current!.camera.get(), index = roomAtScreen(x, y, c, building);
    if (index < 0) return;
    const subject = catalogSubject(item, x, viewport.height + 40, roomIds[index]);
    if (!subject) return;
    const dest = roomIds[index], origin = roomOrigin(index, building);
    const at = screenToRoom(screenPoint(x, y), c, housePoint(origin.x, origin.y));
    const proposal = resolve({ ...live.current.scene.rooms[dest], entities: live.current.scene.entities }, subject, at,
      { scale: c.a, release: true, avoidFurnitureOverlap: true, catalog: true });
    if (proposal.kind === "staging") {
      delete catalogSeeds.current[subject.id]; store.setMessage("Try another place or put something away."); return;
    }
    if (!runtime.current!.animateProposal(proposal, subject, undefined, accepted => {
      if (accepted) setPlacing(undefined);
      else delete catalogSeeds.current[subject.id];
    })) delete catalogSeeds.current[subject.id];
  }
  const beginCatalog = (item: ItemId, x: number, y: number) => {
    setCatalogItem(item);
    const subject = catalogSubject(item, x - canvasOrigin.current.x, y - canvasOrigin.current.y);
    if (subject) runtime.current!.externalDown(-500, subject.id,
      screenPoint(x - canvasOrigin.current.x, y - canvasOrigin.current.y), subject);
  };
  const dropCatalog = (_item: ItemId, x: number, y: number, cancel = false) => {
    runtime.current!.externalDrop(-500, screenPoint(x - canvasOrigin.current.x, y - canvasOrigin.current.y), cancel || roomAtScreen(x - canvasOrigin.current.x, y - canvasOrigin.current.y,
      runtime.current!.camera.get(), building) < 0);
  };
  const { slots: catalogSlots, veil } = interaction;
  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghost.value.active && !catalogSlots.value.some(s => s.pointer === -500 && s.ready && s.painted) ? 1 : 0,
    transform: [{ translateX: ghost.value.x - 35 }, { translateY: ghost.value.y - 70 }],
  }));
  const target = selected ? scene.entities[selected]?.item : undefined;
  // Friends who are put away wait in the friends drawer, not in the basket (HR-01).
  const staged = Object.values(baseScene.entities).filter((e) => e.attachment.kind === "staging" && !e.character);
  return (
    <View style={{ flex: 1, backgroundColor: "#FFF8E9", paddingBottom: inset.bottom }} onTouchStart={touched}>
      <HomeChrome
        room={room}
        overview={overview}
        designing={designing}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        top={inset.top}
        bottom={inset.bottom}
        onMore={() => {
          setMore(!more);
          setFriends(false);
          setSelected(undefined);
        }}
        onHeaderLayout={setHeaderHeight}
        onBack={handleBack}
        onUndo={() => {
          interaction.cancelAll();
          clearMealArt();
          store.dispatch({ type: "undo" });
          setRedoWindow(true);
          clearTimeout(redoTimer.current);
          redoTimer.current = setTimeout(() => setRedoWindow(false), REDO_VISIBLE_MS);
        }}
        showRedo={redoWindow && store.canRedo}
        onRedo={() => {
          interaction.cancelAll();
          clearMealArt();
          store.dispatch({ type: "redo" });
        }}
        onFind={find}
        onFriends={() => {
          // Opening or closing the drawer never moves the camera (rule 47).
          interaction.cancelAll();
          setSelected(undefined);
          setMore(false);
          setFriends(!friends);
        }}
        onOverview={() => {
          interaction.cancelAll();
          if (activeSheet === "closet") clearClosetDraft();
          setSelected(undefined);
          setMore(false);
          setFriends(false);
          const next = !overview;
          setOverview(next);
          interaction.animateCamera(
            next ? fitCamera(viewport, building) : focusCamera(roomIds.indexOf(room), viewport, building)
          );
        }}
        onDesign={() => {
          if (activeSheet === "closet") closeCloset();
          else if (activeSheet === "badges") closeBadges();
          if (designing) onConsumeIntent?.();
          setDesigning(!designing);
          setPlacing(undefined);
        }}
        onCloset={() => (activeSheet === "closet" ? closeCloset() : openCloset())}
        onBadges={() => (activeSheet === "badges" ? closeBadges() : openBadges())}
        closetOpen={activeSheet === "closet"}
        badgesOpen={activeSheet === "badges"}
        hasNewCloset={hasNewCloset}
        closetButtonRef={closetButtonRef}
        onRoom={goRoom}
        roomHover={interaction.roomHover}
        onRoomRect={onRoomRect}
        friendsOpen={friends}
        drawerHover={interaction.drawerHover}
        onDrawerRect={onDrawerRect}
        large={large}
        width={window.width}
      />
      {/* Above the bars (zIndex 30) so carried art is never hidden under them; box-none keeps the bars touchable. */}
      <View pointerEvents="box-none" style={{ flex: 1, flexDirection: vertical ? "row" : "column", zIndex: 31 }}>
        <View ref={canvas} onLayout={measure} style={{ width: viewport.width, height: viewport.height }}>
          <SceneView
            state={{ ...store.state, current: room }}
            badges={ownership.badges}
            onBadges={() => openBadges()}
            scene={scene}
            building={building}
            viewport={viewport}
            interaction={interaction}
            pickups={pickups}
            reduced={reduced}
            renderCharacter={characterRenderer}
            liveRoom={overview || !visible ? undefined : room}
            debugLayer={lab && labKit && hulls ? <labKit.overlay.HullOverlay scene={scene} building={building} scale={roomScale(viewport)} /> : undefined}
            selected={selected}
            reactions={reactions}
            meals={meals}
            mealReady={mealReady}
            onMealPresented={onMealPresented}
            onMealFinished={onMealFinished}
            sleeping={sleeping}
            moods={delight.moods}
            effects={delight.effects}
            poke={delight.poke}
            onNode={onNode}
            designing={designing}
            onSelect={choose}
            onMove={moveAccessible}
            stress={stress}
          />
          <Animated.View testID="room-door-veil" pointerEvents="none"
            style={[{ position: "absolute", left: 0, top: 0, width: viewport.width, height: viewport.height, backgroundColor: "#FFF8E9" }, veilStyle]} />
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
          {lab && debug && <View pointerEvents="none" accessible accessibilityLabel="Release frame probe"
            style={{ position: "absolute", left: 8, bottom: 60, backgroundColor: "#FFF8E9", padding: 8, borderRadius: 8, maxWidth: "96%" }}>
            <Text style={{ fontSize: 12, color: "#284F4B" }}>Release ±500ms · max {probeMax.toFixed(1)}ms</Text>
            {releaseProbes.map((probe) => <Text key={probe.at} style={{ fontSize: 11, color: "#284F4B" }}>
              {new Date(probe.at).toLocaleTimeString()} {probe.target?.split("/").slice(-3).join("/") ?? probe.kind} · {probe.maxDelta.toFixed(1)}ms ({probe.frames.length} samples)
            </Text>)}
            {!releaseProbes.length && <Text style={{ fontSize: 11 }}>Last 5 release windows appear here.</Text>}
          </View>}
          {lab && (
            <View style={{ position: "absolute", bottom: 2, right: 8, flexDirection: "row", gap: 6 }}>
              <Tool label="Toggle hit shapes" symbol="◍" selected={hulls} onPress={() => setHulls(!hulls)} />
              <Tool label="Toggle debug" symbol="⌘" selected={debug} onPress={() => setDebug(!debug)} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Export frame timings"
                onPress={() => {
                  setFrameReport(interaction.frameTimes.get());
                }}
              >
                <Text maxFontSizeMultiplier={1.2} style={{ backgroundColor: "#FFF8E9", padding: 12 }}>Frames</Text>
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
            initialItem={initialItem}
            ownership={ownership}
            target={target}
            vertical={vertical}
            ghost={ghost}
            onChoose={(id) => {
              if (owns(id, ownership)) setPlacing(id);
            }}
            onDrop={dropCatalog}
            onDragItem={beginCatalog}
            interaction={interaction}
            offset={viewportOffset}
            dispatch={dispatch}
            onClose={() => {
              setDesigning(false);
              onConsumeIntent?.();
            }}
            large={large}
            restoreCost={() => store.restoreCost(room)}
            onRestoreAnyway={() => store.dispatch({ type: "reset", roomId: room } as HomeAction, { anyway: true })}
          />
        )}
      </View>
      {!overview && !more && !friends && !activeSheet && (
        <Destinations
          scene={scene}
          selected={selected === storageId ? undefined : selected}
          designing={designing}
          scale={1}
          camera={interaction.camera}
          building={building}
          canvasTop={headerHeight}
          windowHeight={window.height}
          renderCharacter={characterRenderer}
          large={large}
          onSelect={setSelected}
          bottom={
            inset.bottom +
            navigationHeight +
            (designing && !vertical ? portraitDrawerHeightFor(large) + 6 : staged.length ? 100 : 10)
          }
          onChoose={(proposal) => {
            if (runtime.current!.animateProposal(proposal)) { setSelected(undefined); setRoom(proposal.room); }

          }}
        />
      )}
      {!overview && !more && !friends && !activeSheet && storageId && (!selected || selected === storageId) && scene.entities[storageId]?.room === room && (
        <StorageTray entity={scene.entities[storageId]} scene={scene} large={large} inspect={storageInspect === storageId && store.message === STORAGE_FULL_MESSAGE} bottom={inset.bottom + navigationHeight + (designing && !vertical ? portraitDrawerHeightFor(large) + 6 : staged.length ? 100 : 8)}
          onClose={() => { const e = scene.entities[storageId]; if (e?.item && storageOpen(e.item)) store.dispatch({ type: "toggle", id: e.item.id, roomId: e.room }); setStorageId(undefined); setStorageInspect(undefined); }}
          onTake={id => {
            const e = scene.entities[id], owner = scene.entities[storageId];
            if (!e || !owner) return;
            const p = resolve({ ...scene.rooms[e.room], entities: scene.entities }, e, roomPoint(owner.contact.x, Math.min(535, owner.contact.y + 70)), { scale: 1, floorOnly: true, release: true });
            if (interaction.animateProposal(p)) setStorageId(undefined);
          }}/>
      )}
      <StagingTray
        entities={staged}
        onNode={onNode}
        bottom={inset.bottom + navigationHeight + 8}
        offset={viewportOffset}
        interaction={interaction}
        reduced={reduced}
        renderCharacter={characterRenderer}
        onSelect={setSelected}
      />
      <HomePanels
        more={more}
        friends={friends}
        bottom={inset.bottom + navigationHeight}
        scene={scene}
        renderCharacter={characterRenderer}
        onClose={() => {
          setMore(false);
          setFriends(false);
        }}
        onFriends={() => {
          setMore(false);
          setFriends(true);
        }}
        overview={overview}
        onOverview={() => {
          interaction.cancelAll();
          if (activeSheet === "closet") clearClosetDraft();
          setSelected(undefined);
          setMore(false);
          setFriends(false);
          const next = !overview;
          setOverview(next);
          interaction.animateCamera(
            next ? fitCamera(viewport, building) : focusCamera(roomIds.indexOf(room), viewport, building)
          );
        }}
        onFind={find}
        onTidyUp={() => {
          setTidyCost(store.restoreCost(room));
          setTidyConfirm(true);
        }}
        onZoom={(ratio) => {
          interaction.cancelAll();
          interaction.animateCamera(
            zoomCamera(interaction.camera.get(), ratio, viewport.width / 2, viewport.height / 2, viewport, building)
          );
          if (ratio > 1) setOverview(false);
        }}
        onBring={bring}
        large={large}
        onLarge={(on) => store.setAccess(on ? { largeTargets: true } : undefined)}
      />
      <FriendDrawer
        open={friends && !overview && !more && !activeSheet}
        scene={scene}
        here={room}
        bottom={inset.bottom + navigationHeight + 8}
        top={large && navigationHeight > largeNavigationHeight ? headerHeight + 8 : undefined}
        interaction={interaction}
        offset={viewportOffset}
        reduced={reduced}
        large={large}
        renderCharacter={characterRenderer}
        onBring={bring}
        onClose={() => setFriends(false)}
        onCarry={(carrying) => { if (!carrying) setFriends(false); }}
      />
      {closet && (
        <HomeClosetSheet
          visible={activeSheet === "closet"}
          onClose={() => closeCloset()}
          look={effectiveLook ?? closet.look}
          equipped={closet.look}
          earned={closet.earned}
          unseen={closet.unseen}
          initialItem={closetInitialItem}
          saving={app.saving}
          saveError={app.error}
          returnFocusRef={closetButtonRef}
          onTryOn={(nextLook) => setPreviewLook(nextLook)}
          onWear={(nextLook) => {
            const saved = closet.onWear(nextLook);
            if (saved) setPreviewLook(undefined);
            return saved;
          }}
          onSeen={closet.onSeen}
        />
      )}
      <HomeBadgesSheet
        visible={activeSheet === "badges"}
        onClose={() => closeBadges()}
        badges={ownership.badges ?? []}
        milestones={milestones}
        initialBadge={badgeInitial}
      />
      {tidyConfirm && (
        <View
          testID="home-tidy-confirm"
          accessibilityViewIsModal
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 90,
            elevation: 90,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.scrim,
            padding: 20,
          }}
        >
          {tidyCost === "no-undo" || tidyCost === "drops-older" ? (
            <View
              testID="restore-anyway"
              style={{
                backgroundColor: theme.colors.bg,
                padding: 24,
                borderRadius: 24,
                maxWidth: 340,
                gap: 14,
                alignItems: "center",
              }}
            >
              <UndoGonePicture size={112} />
              <Text
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
                maxFontSizeMultiplier={1.6}
                style={{ color: theme.colors.ink, fontSize: 17, fontWeight: "600", textAlign: "center" }}
              >
                {RESTORE_QUESTION[tidyCost]}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  store.dispatch({ type: "reset", roomId: room } as HomeAction, { anyway: true });
                  setTidyConfirm(false);
                }}
                style={{
                  padding: 12,
                  minHeight: large ? 64 : 48,
                  justifyContent: "center",
                  alignSelf: "stretch",
                  alignItems: "center",
                  backgroundColor: "#F1E6CF",
                  borderRadius: 14,
                }}
              >
                <Text>Make it new</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTidyConfirm(false)}
                style={{
                  padding: 12,
                  minHeight: large ? 64 : 48,
                  justifyContent: "center",
                  alignSelf: "stretch",
                  alignItems: "center",
                  backgroundColor: "#CFE3D6",
                  borderRadius: 14,
                }}
              >
                <Text style={{ fontWeight: "600" }}>Keep my room</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ backgroundColor: theme.colors.bg, padding: 24, borderRadius: 24, maxWidth: 340, gap: 14 }}>
              <Text style={{ color: theme.colors.ink, fontSize: 17, fontWeight: "600" }}>
                Tidy up this room? Undo can bring it back.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  dispatch({ type: "reset" });
                  setTidyConfirm(false);
                }}
                style={{
                  padding: 12,
                  minHeight: large ? 64 : 48,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: theme.colors.coral,
                  borderRadius: theme.radius.full,
                }}
              >
                <Text style={{ color: theme.colors.ink, fontWeight: "700" }}>Tidy up</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setTidyConfirm(false)}
                style={{
                  padding: 12,
                  minHeight: large ? 64 : 48,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: theme.colors.lagoonSoft,
                  borderRadius: theme.radius.full,
                }}
              >
                <Text style={{ color: theme.colors.ink, fontWeight: "700" }}>Keep playing</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
      {/* P1-5: Render SaveStatus above scene (31) and undimmed sheets (50) so Retry is always touch-reachable. */}
      {saveStatus && (
        <View
          testID="home-save-status"
          pointerEvents="box-none"
          style={{
            position: "absolute",
            right: 8,
            maxWidth: Math.min(380, window.width - 16),
            ...(activeSheet ? { top: headerHeight + 8 } : { bottom: inset.bottom + navigationHeight + 8 }),
            zIndex: 100,
            elevation: 100,
          }}
        >
          {saveStatus}
        </View>
      )}
      {/* Undo notes are spoken by the visible note only, and stay out of here once it's dismissed too (R3-F2). */}
      <Text accessibilityLiveRegion="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
        {UNDO_NOTES.includes(store.message) || store.message === STORAGE_FULL_MESSAGE ? "" : store.message}
      </Text>
      {store.message === STORAGE_FULL_MESSAGE && storageNoteGone !== store.messageSerial && <StorageFullNote name={storageFullName} top={headerHeight + 10} onDismiss={() => setStorageNoteGone(store.messageSerial)}/>}
      {capacityShown && <CapacityCue bottom={inset.bottom + navigationHeight + 14} />}
      {undoNote && <UndoNote message={store.message} restored={Object.values(RESTORE_NOTE).includes(store.message)}
        top={headerHeight + 10}
        onDismiss={() => setNoteGone(store.messageSerial)} />}
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
