import { badgeRule, type BadgeId } from '../badges/engine';
import { useSheetPresence } from "../components/sheetPresence";
import { themeRewards } from './catalog';
import { personFor } from '../personalization/model';
import React, { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  Modal,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { useSharedValue } from "react-native-reanimated";
import { ArcadeArt, ReefFish, stickerNames } from "../arcade/Art";
import { stickerIds } from "../arcade/progress";
import { useReducedMotion } from "../components/motion";
import { useSounds } from "../components/Audio";
import { useStore } from "../state/Store";
import { SeatFront } from "./SeatFront";
import { MoreItemArt, RoomShellArt } from "./art/More";
import { moreCatalog, roomIds, roomNames, tintIds, tintPalette } from "./catalogMore";
import { ItemArt } from "./art/Items";
import { RoomArt, SkyArt, ShoreArt, floorColors, wallColors } from "./art/Room";
import { floorThemes, furnitureIds, decorSpec, itemSpec, isSeat, wallThemes, type ItemId } from "./catalog";
import {
  anchors,
  currentRoom,
  MAX_INSTANCES,
  dimensions,
  homeReducer,
  instance,
  owns,
  validPlacement,
  type Character,
  type HomeAction,
  type Instance,
  type Ownership,
  type Pose,
} from "./model";
import { LockBadge, LockRule } from '../personalization/LockBadge';
import { trackLabels, badgeInfo } from '../badges/engine';
import { characterDepth, characterDrop, characterPoint, itemPoint, itemSize, spotFromPoint, stackSpot, surfacePoint, characterSize, seatAnchor } from "./geometry";
import { useHomeStore } from "./useHomeStore";
import { Drag, FloorGrid, Footprint, emptyPreview, TrayGhost, type DragConfig } from "./Drag";

const categoryNames: Record<string, string> = { "beds-seats": "Beds & seats", "tables-storage": "Tables & storage", kitchen: "Kitchen", "plants-nature": "Plants", lights: "Lights", "toys-fun": "Toys", "rugs-floor": "Rugs", "wall-art": "Wall art" };
function DecorArt({ item, tint, ...props }: React.ComponentProps<typeof ItemArt> & { tint?: import("./catalogMore").TintId }) {
  if (moreCatalog[item]) return <MoreItemArt id={item} tint={tint} {...props} rotation={props.rotation as import("./model").Rotation | undefined} />;
  return <ItemArt item={item} tint={tint} {...props} />;
}

export type HomeScreenProps = Ownership & {
  badges?: BadgeId[];
  initialItem?: string;
  renderCharacter?: (slot: Character["slot"], pose: Pose) => ReactNode;
  initialState?: unknown;
  persist?: (state: import("./model").HomeStateV2) => boolean;
  saveStatus?: ReactNode;
};
const ink = "#284F4B";
type IconName = "back" | "undo" | "redo" | "rotate" | "mirror" | "away" | "more" | "down" | "lock";
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    back: "M15 5L8 12L15 19",
    undo: "M8 5L3 10L8 15M3 10H14Q21 10 20 18",
    redo: "M16 5L21 10L16 15M21 10H10Q3 10 4 18",
    rotate: "M5 8A8 8 0 1 1 4 15M5 3V8H10",
    mirror: "M12 3V21M3 6H8V18H3ZM16 6H21V18H16Z",
    away: "M4 9H20V21H4ZM3 4H21V9H3M9 13H15",
    more: "M5 12H5M12 12H12M19 12H19",
    down: "M5 9L12 16L19 9",
    lock: "M7 10V7A5 5 0 0 1 17 7V10M5 10H19V21H5Z",
  };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
      <Path d={paths[name]} stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {name === "more" && [5, 12, 19].map((x) => <Circle key={x} cx={x} cy={12} r={1.4} fill={ink} />)}
    </Svg>
  );
}
function Button({
  label,
  icon,
  onPress,
  selected,
  disabled,
  iconOnly = false,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        selected && styles.chosen,
        { opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
      ]}
    >
      {icon && <Icon name={icon} />} {!iconOnly && <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}
function Placeholder({ pose }: { pose: Pose }) {
  return (
    <Svg width={60} height={92} viewBox="0 0 60 92" accessible={false}>
      <Path d="M14 47Q30 38 46 47L48 69H12Z" fill="#8BBAB1" stroke={ink} strokeWidth={2} />
      <Circle cx={30} cy={24} r={18} fill="#D9B495" stroke={ink} strokeWidth={2} />
      <Circle cx={24} cy={24} r={1.5} fill={ink} />
      <Circle cx={36} cy={24} r={1.5} fill={ink} />
      <Path
        d="M26 32Q30 35 34 32M15 49L9 63M45 49L51 63"
        stroke={ink}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={pose === "sit" ? "M20 68L12 76H23M40 68L48 76H37" : "M22 69V85H15M38 69V85H45"}
        stroke="#4A6866"
        strokeWidth={7}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
type KeyEvent = { nativeEvent: { key: string }; preventDefault: () => void };
/** RN native uses accessibilityActions; web additionally exposes the same operations to a keyboard. */
const keyboard = (handler: (e: KeyEvent) => void): ViewProps =>
  Platform.OS === "web" ? ({ onKeyDown: handler } as ViewProps) : {};
export function HomeScreen({ renderCharacter, badges = [], initialItem, initialState, persist, saveStatus, ...ownership }: HomeScreenProps) {
  const { width, height } = useWindowDimensions();
  const inset = useSafeAreaInsets();
  const app = useStore();
  const sound = useSounds(app.save.settings.sound);
  const reduced = useReducedMotion();
  const store = useHomeStore(ownership, initialState, persist);
  const room = currentRoom(store.state);
  const [mode, setMode] = useState<"play" | "decorate">(initialItem ? "decorate" : "play");
  const [tab, setTab] = useState<string>(themeRewards.some(t=>t.id===initialItem) ? "Room" : "Furniture");
  const [selected, setSelected] = useState<string>();
  const [placing, setPlacing] = useState<ItemId | undefined>(initialItem && (furnitureIds.includes(initialItem as typeof furnitureIds[number]) || Object.hasOwn(moreCatalog, initialItem)) ? initialItem as ItemId : undefined);
  const [draggedItem, setDraggedItem] = useState<ItemId>();
  const [collapsed, setCollapsed] = useState(initialItem ? false : height < 500);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useSheetPresence(confirm);
  const [hint, setHint] = useState(true);
  const [notice, setNotice] = useState(initialItem ? `Ready: ${initialItem.replaceAll("-", " ")}. Choose a clear spot or room style.` : "");
  const owner = app.save.learning?.active ?? "family", person = personFor(app.save);
  const acknowledge = app.personalize, identityEpoch = app.epoch;
  React.useEffect(() => {
    if (initialItem && person.unseen.includes(initialItem)) acknowledge({unseen:person.unseen.filter(id=>id!==initialItem)}, {learner:owner,epoch:identityEpoch});
  }, [initialItem, person.unseen, acknowledge, owner, identityEpoch]);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const canvas = useRef<View>(null);
  const inventory = useRef<ScrollView>(null), focusedInitialItem = useRef(false);
  const revealInitialItem = (id: string, x: number) => {
    if (id === initialItem && !focusedInitialItem.current) {
      focusedInitialItem.current = true;
      inventory.current?.scrollTo({x:Math.max(0,x-20),animated:false});
    }
  };
  const sequence = useRef(0);
  const preview = useSharedValue(emptyPreview);
  const decorating = mode === "decorate";
  const drawerHeight = decorating ? (collapsed ? 48 : 190) : 0;
  const editingItem = decorating && !!selected;
  const toolbarHeight = editingItem && height >= width ? 162 : 0;
  const availableHeight = height - inset.top - inset.bottom - drawerHeight - toolbarHeight;
  // Scene keeps the full width. Landscape uses almost all available height; no control column.
  const beach = availableHeight >= width * .925 || room.characters.some(c => c.anchor.startsWith("beach-"));
  const sceneUnits = beach ? 740 : 560;
  const sceneWidth = Math.min(width - (editingItem && width > height ? 278 : 0), availableHeight * 800 / sceneUnits);
  const sceneHeight = sceneWidth * sceneUnits / 800;
  const scale = sceneWidth / 800;
  const target = room.instances.find((i) => i.id === selected);
  const blockers = room.instances.map((i) => {
    const [w, h] = dimensions(i);
    const p = surfacePoint(i);
    return { ...i, w, h, wall: i.layer === "wall", surface: !!decorSpec(i.item).surface, sx: p.x, sy: p.y, radius: itemSize(i) * .42 };
  });
  const config: DragConfig = { preview, origin, scale, blockers };
  const feedback = (message: string) => {
    setHint(false);
    setNotice(message);
    store.setMessage(message);
  };
  const dispatch = (action: HomeAction | { type: "undo" | "redo" }, audible = false) => {
    if (action.type !== "undo" && action.type !== "redo") {
      const result = homeReducer(store.state, action as HomeAction, ownership);
      if (result.message) {
        feedback(result.message);
        return;
      }
      if (audible && result.state !== store.state) sound("tap");
    }
    store.dispatch(action);
    setNotice("");
    setHint(false);
  };
  const putOn = (i: Instance, parentId: string) => {
    const parent = room.instances.find(p => p.id === parentId);
    if (parent) dispatch({ type: "move", id: i.id, x: parent.x, y: parent.y, on: parent.id }, true);
  };
  const choose = (id: ItemId) => {
    setDraggedItem(undefined);
    if (!owns(id, ownership)) {
      const spec = itemSpec(id); feedback(spec.badge ? badgeRule(spec.badge as BadgeId) : `Earn it in ${spec.track ?? "Arcade"}.`);
      return;
    }
    if (personFor(app.save).unseen.includes(id)) app.personalize({ unseen: personFor(app.save).unseen.filter(i=>i!==id) }, { learner: app.save.learning?.active ?? "family", epoch: app.epoch });
    setPlacing(id);
    setSelected(undefined);
    setHint(false);
    setNotice("Tap a clear floor spot.");
  };
  const place = (id: ItemId, px: number, py: number) => {
    if (room.instances.length >= MAX_INSTANCES) {
      feedback("Put something away to make room.");
      return;
    }

    const spot = stackSpot(room.instances, instance("", id, 0, 0), px / scale, py / scale) ?? spotFromPoint(px, py, scale, itemSpec(id).layer === "wall");
    if (!spot || px < 0 || py < 0 || px > sceneWidth || py > sceneHeight) {
      feedback("Drop inside the room.");
      return;
    }
    let key: string;
    do {
      key = `home-${++sequence.current}`;
    } while (room.instances.some((i) => i.id === key));
    const candidate = { ...instance(key, id, spot.x, spot.y), ...("on" in spot && typeof spot.on === "string" ? { on: spot.on } : {}) };
    if (!validPlacement(room.instances, candidate)) {
      feedback("Try a clear spot. Keep the door free.");
      return;
    }
    dispatch({ type: "place", instance: candidate }, true);
    setPlacing(undefined);
    setSelected(key);
  };
  const itemAction = (i: Instance, action: string) => {
    if (action === "activate") {
      if (decorating) {
        setSelected(i.id);
        if (width > height) setCollapsed(true);
        setPlacing(undefined);
        setHint(false);
      } else {
        dispatch({ type: "toggle", id: i.id }, true);
      }
    } else if (["rotate", "mirror", "put-away"].includes(action))
      dispatch({ type: action as "rotate" | "mirror" | "put-away", id: i.id }, true);
    else {
      const delta: Record<string, [number, number]> = { left: [-1, 0], right: [1, 0], back: [0, -1], forward: [0, 1] };
      if (delta[action])
        dispatch({ type: "move", id: i.id, x: i.x + delta[action][0], y: i.y + delta[action][1] }, true);
    }
  };
  const switchMode = (next: "play" | "decorate") => {
    setMode(next);
    setSelected(undefined);
    setPlacing(undefined);
    setNotice("");
    preview.value = emptyPreview;
  };
  const measure = useCallback(() => canvas.current?.measureInWindow((x, y) => setOrigin({ x, y })), []);
  // A centered canvas can move without changing its own dimensions. Measure after
  // drawer/mode layout settles, not only on the canvas's size-change event.
  useLayoutEffect(() => {
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure, sceneWidth, sceneHeight, drawerHeight, inset.top, inset.bottom]);
  const seatActions = [
    ...anchors.filter(a => ["hello", "window", "beach-left", "beach-middle", "beach-right"].includes(a)).map(anchor => ({ name: `seat-${anchor}`, label: anchor.startsWith("beach-") ? `Stand on ${anchor.replace("-", " ")}` : `Move to ${anchor === "window" ? "window" : "floor"}`, anchor, seatId: undefined as string | undefined })),
    ...room.instances.filter(i => isSeat(i.item)).map(i => ({ name: `seat-id-${i.id}`, label: `Sit on ${itemSpec(i.item).name}`, anchor: seatAnchor(i), seatId: i.id })),
  ];
  const placementCommand = (name: string) => {
    if (!placing) return;
    const v = preview.value;
    if (name === "place") {
      const p = itemPoint(instance("", placing, v.x, v.y));
      place(placing, p.x * scale, p.y * scale);
      return;
    }
    const d: Record<string, [number, number]> = { left: [-1, 0], right: [1, 0], back: [0, -1], forward: [0, 1] };
    if (!d[name]) return;
    const wall = itemSpec(placing).layer === "wall";
    const x = Math.max(0, Math.min(wall ? 15 : 19, v.x + d[name][0])),
      y = Math.max(0, Math.min(wall ? 3 : 11, v.y + d[name][1]));
    const i = instance("", placing, x, y),
      [w, h] = dimensions(i),
      valid = room.instances.length < MAX_INSTANCES && validPlacement(room.instances, i);
    preview.value = { active: true, x, y, w, h, wall, valid };
    store.setMessage(`Column ${x + 1}, row ${y + 1}. ${valid ? "Clear spot." : "Try a clear spot."}`);
  };
  const entries = [
    ...room.instances.map((i) => {
      const p = itemPoint(i, room.instances),
        size = itemSize(i) * scale;
      const hitWidth = Math.max(48, size * 0.82);
      const hitHeight = Math.max(48, size * (i.item === "toy-box" ? 0.58 : i.layer === "ground" ? 0.4 : 0.82));
      const [w, h] = dimensions(i);
      return {
        key: i.id,
        depth: i.layer === "wall" ? -100 : i.layer === "ground" ? -50 : i.on ? itemPoint(room.instances.find(parent => parent.id === i.on)!).y + .5 : p.y,
        node: (
          <Drag
            testID={`object-${i.id}`}
            pointerEvents={placing ? "none" : "auto"}
            accessibilityRole="button"
            accessibilityLabel={`${itemSpec(i.item).name}, ${i.state === "active" ? "active" : "resting"}`}
            accessibilityHint={
              decorating ? "Drag to move. Arrow keys move; R rotates, M mirrors, Delete puts away." : "Tap to play."
            }
            accessibilityActions={
              decorating
                ? [
                    { name: "activate", label: "Select" },
                    ...["left", "right", "back", "forward", "rotate", "mirror", "put-away"].map((name) => ({
                      name,
                      label: name.replace("-", " "),
                    })),
                    ...(decorSpec(i.item).small ? room.instances.filter(parent => !parent.on && decorSpec(parent.item).surface).map(parent => ({ name: `stack:${parent.id}`, label: `Put on ${itemSpec(parent.item).name}` })) : []),
                  ]
                : [{ name: "activate", label: "Play" }]
            }
            onAccessibilityAction={(e) => e.nativeEvent.actionName.startsWith("stack:") ? putOn(i, e.nativeEvent.actionName.slice(6)) : itemAction(i, e.nativeEvent.actionName)}
            {...keyboard((e) => {
              const names: Record<string, string> = {
                ArrowLeft: "left",
                ArrowRight: "right",
                ArrowUp: "back",
                ArrowDown: "forward",
                r: "rotate",
                m: "mirror",
                Delete: "put-away",
                Backspace: "put-away",
                Enter: "activate",
                " ": "activate",
              };
              const name = names[e.nativeEvent.key];
              if (name && (decorating || name === "activate")) {
                e.preventDefault();
                itemAction(i, name);
              }
            })}
            enabled={decorating}
            reduced={reduced}
            config={{ ...config, foot: p, layer: i.layer, footprint: { w, h, wall: i.layer === "wall", id: i.id, small: !!decorSpec(i.item).small } }}
            onStart={() => {
              setDraggedItem(undefined);
              setSelected(undefined);
              setPlacing(undefined);
              setHint(false);
              setNotice("");
            }}
            onTap={() => {
              if (placing) {
                return;
              }
              itemAction(i, "activate");
            }}
            onDrop={(_x, _y, dx, dy) => {
              const px = p.x * scale + dx,
                py = p.y * scale + dy;
              const spot = stackSpot(room.instances, i, px / scale, py / scale) ?? spotFromPoint(px, py, scale, i.layer === "wall");
              if (!spot || px < 0 || py < 0 || px > sceneWidth || py > sceneHeight) {
                feedback("Drop inside the room.");
                return;
              }
              if (spot) dispatch({ type: "move", id: i.id, ...spot }, true);
              setSelected(i.id);
            }}
            style={{
              position: "absolute",
              left: p.x * scale - hitWidth / 2,
              top: p.y * scale - size * 0.85 + size - hitHeight,
              width: hitWidth,
              height: hitHeight,
              borderWidth: selected === i.id ? 2 : 0,
              borderColor: "#397C6C",
              borderRadius: 18,
            }}
          >
            <View
              pointerEvents="none"
              style={{ position: "absolute", left: (hitWidth - size) / 2, top: hitHeight - size }}
            >
              <DecorArt
                item={i.item}
                size={size}
                active={i.state === "active"}
                mirrored={i.mirrored}
                tint={i.tint}
                rotation={i.rotation}
              />
            </View>
          </Drag>
        ),
      };
    }),
    ...room.instances.filter(i => isSeat(i.item) && i.item !== "rug" && i.item !== "shelf" && room.characters.some(c => c.pose === "sit" && (c.seatId ? c.seatId === i.id : c.anchor === i.item || c.anchor === "seat"))).map(i => {
      const p = itemPoint(i, room.instances), size = itemSize(i) * scale;
      return { key: `seat-front-${i.id}`, depth: p.y + 2, node: <View pointerEvents="none" style={{ position: 'absolute', left: p.x * scale - size / 2, top: p.y * scale - size * .85 }}>{i.item === "chair" ? <DecorArt item={i.item} tint={i.tint} size={size} mirrored={i.mirrored} rotation={i.rotation} foreground/> : <SeatFront item={i} size={size}/>}</View> };
    }),
    ...room.characters.map((c) => {
      const p = characterPoint(room, c),
        size = (characterSize(c.slot)) * scale;
      return {
        key: `character-${c.slot}`,
        depth: characterDepth(room, c),
        node: (
          <Drag
            testID={`character-${c.slot}`}
            pointerEvents={placing ? "none" : "auto"}
            accessibilityRole="button"
            accessibilityLabel={["Islander", "Pip", "Poko"][c.slot] + `, ${c.pose}`}
            accessibilityHint="Drag to a seat, the floor or the beach. Arrow keys move; S cycles seats."
            accessibilityActions={[
              ...seatActions,
              ...["left", "right", "back", "forward"].map((name) => ({ name, label: `Move ${name}` })),
            ]}
            onAccessibilityAction={(e) => {
              const a = seatActions.find(a => a.name === e.nativeEvent.actionName);
              if (a) dispatch({ type: "character", slot: c.slot, anchor: a.anchor, ...(a.seatId ? { seatId: a.seatId } : {}) }, true);
              const deltas: Record<string, [number, number]> = {
                left: [-25.5, -1.5],
                right: [25.5, 1.5],
                back: [-7, -15.5],
                forward: [7, 15.5],
              };
              const d = deltas[e.nativeEvent.actionName];
              if (d)
                dispatch(
                  {
                    type: "character",
                    slot: c.slot,
                    anchor: "floor",
                    ...spotFromPoint(p.x + d[0], p.y + d[1], 1, false)!,
                  },
                  true
                );
            }}
            {...keyboard((e) => {
              const k = e.nativeEvent.key;
              const deltas: Record<string, [number, number]> = {
                ArrowLeft: [-25.5, -1.5],
                ArrowRight: [25.5, 1.5],
                ArrowUp: [-7, -15.5],
                ArrowDown: [7, 15.5],
              };
              if (deltas[k]) {
                e.preventDefault();
                dispatch(
                  {
                    type: "character",
                    slot: c.slot,
                    anchor: "floor",
                    ...spotFromPoint(p.x + deltas[k][0], p.y + deltas[k][1], 1, false)!,
                  },
                  true
                );
              }
              if (k === "s" || k === "Enter") {
                e.preventDefault();
                const index = seatActions.findIndex(a => c.seatId ? a.seatId === c.seatId : a.anchor === c.anchor);
                const next = seatActions[(index + 1) % seatActions.length];
                dispatch({ type: "character", slot: c.slot, anchor: next.anchor, ...(next.seatId ? { seatId: next.seatId } : {}) }, true);
              }
            })}
            enabled
            reduced={reduced}
            config={{ ...config, foot: p }}
            onTap={() => {
              setHint(false);
            }}
            onStart={() => {
              setHint(false);
              setSelected(undefined);
              setNotice("");
            }}
            onDrop={(_x, _y, dx, dy) =>
              dispatch(characterDrop(room, c.slot, p.x + dx / scale, p.y + dy / scale), true)
            }
            style={{
              position: "absolute",
              left: p.x * scale - size / 2,
              top: p.y * scale - size,
              width: Math.max(48, size),
              height: Math.max(48, size),
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 0,
                left: size * 0.15,
                width: size * 0.7,
                height: size * 0.13,
                borderRadius: 100,
                backgroundColor: "#3D60552A",
              }}
            />
            <View
              pointerEvents="none"
              style={{
                width: 60,
                height: 92,
                position: "absolute",
                left: (size - 60) / 2,
                top: (size - 92) / 2,
                alignItems: "center",
                justifyContent: "flex-end",
                transform: [{ scale: size / 92 }],
              }}
            >
              {renderCharacter?.(c.slot, c.pose) ?? (c.slot === 0 ? (
                <Placeholder pose={c.pose} />
              ) : c.slot === 1 ? (
                <View
                  style={{
                    borderWidth: 2,
                    borderBottomWidth: 5,
                    borderColor: "#87BBAF",
                    borderRadius: 28,
                    backgroundColor: "#C6E5DCBB",
                  }}
                >
                  <ReefFish size={55} />
                </View>
              ) : (
                <ArcadeArt game="crab-crossing" size={65} />
              ))}
            </View>
          </Drag>
        ),
      };
    }),
  ].sort((a, b) => a.depth - b.depth);
  const toolbarPoint = target ? itemPoint(target, room.instances) : undefined;

  const thumbnail = (id: ItemId, label: string) => {
    const owned = owns(id, ownership),
      spec = itemSpec(id),
      [w, h] = dimensions(instance("", id, 0, 0));
    return (
      <Drag
        key={id}
        testID={`inventory-${id}`}
        onLayout={e => revealInitialItem(id, e.nativeEvent.layout.x)}
        accessibilityRole="button"
        accessibilityLabel={`${label}${owned ? "" : `, locked, ${spec.badge ? badgeRule(spec.badge as BadgeId) : "Earn it in Arcade"}`}`}
        accessibilityHint="Drag upward into the room, or select then tap the floor."
        accessibilityActions={[{ name: "activate", label: "Choose" }]}
        onAccessibilityAction={() => choose(id)}
        {...keyboard((e) => {
          if (e.nativeEvent.key === "Enter" || e.nativeEvent.key === " ") {
            e.preventDefault();
            choose(id);
          }
        })}
        tray
        enabled={owned}
        reduced={reduced}
        config={{ ...config, layer: spec.layer, footprint: { w, h, wall: spec.layer === "wall", id: "", small: !!decorSpec(id).small } }}
        onStart={() => {
          setDraggedItem(id);
          setPlacing(undefined);
          setSelected(undefined);
          setHint(false);
          setNotice("");
        }}
        onTap={() => choose(id)}
        onDrop={(x, y) => place(id, x - origin.x, y - origin.y)}
        style={{
          width: 120,
          minHeight: 100,
          alignItems: "center",
          borderWidth: placing === id ? 2 : 0,
          borderColor: ink,
          borderRadius: 14,
          backgroundColor: "#FFF8E9",
        }}
      >
        <View pointerEvents="none" style={{ opacity: owned ? 1 : 0.3 }}>
          <DecorArt item={id} size={64} muted={!owned} />
        </View>
        <Text numberOfLines={1} style={styles.thumbLabel}>
          {label}
        </Text>
        {!owned && <Text numberOfLines={1} style={{fontSize:11, paddingHorizontal:6, color:ink}}>{spec.badge ? trackLabels[badgeInfo(spec.badge as BadgeId).track] : spec.track ?? "Arcade"}</Text>}
        {owned && personFor(app.save).unseen.includes(id) && <Text style={styles.meta}>New</Text>}
        {!owned && <LockBadge/>}
      </Drag>
    );
  };
  const trayItems = [...furnitureIds, ...Object.keys(moreCatalog)].filter(id => tab === "Furniture" || decorSpec(id).category === tab);
  return (
    <View style={styles.page}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><SkyArt /></View>
      <Text accessibilityLiveRegion="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
        {store.message}
      </Text>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: inset.top,
          paddingBottom: inset.bottom + drawerHeight + toolbarHeight,
          paddingRight: editingItem && width > height ? 278 : 0,
        }}
      >
        <View ref={canvas} onLayout={measure} testID="home-scene" style={{ width: sceneWidth, height: sceneHeight }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Room floor"
            accessibilityHint={
              placing
                ? "Tap to place the selected item. Arrow keys change spot and Enter places."
                : "Choose an item from Decorate to place."
            }
            accessibilityActions={[
              ...["left", "right", "back", "forward"].map((name) => ({ name, label: `Move placement ${name}` })),
              { name: "place", label: "Place selected item" },
            ]}
            onAccessibilityAction={(e) => placementCommand(e.nativeEvent.actionName)}
            // eslint-disable-next-line react-hooks/refs -- keyboard stores this callback; placement refs are read only on input.
            {...keyboard((e) => {
              const names: Record<string, string> = {
                ArrowLeft: "left",
                ArrowRight: "right",
                ArrowUp: "back",
                ArrowDown: "forward",
                Enter: "place",
              };
              const name = names[e.nativeEvent.key];
              if (placing && name) {
                e.preventDefault();
                placementCommand(name);
              }
            })}
            onPress={(e) => {
              if (!placing) {
                setSelected(undefined);
                return;
              }
              const { pageX, pageY } = e.nativeEvent;
              canvas.current?.measureInWindow((x, y) => place(placing, pageX - x, pageY - y));
            }}
            style={StyleSheet.absoluteFill}
          >
            <View pointerEvents="box-none" style={{ position: "absolute", width: sceneWidth, height: scale * 560 }}>
              {store.state.current === "home" ? <RoomArt
                theme={room.theme}
                badges={badges}
                onBadgePress={badge => router.push({ pathname:"/badges", params:{badge} })}
                reduced={reduced}
              /> : <RoomShellArt room={store.state.current} theme={room.theme} />}
            </View>
          </Pressable>
          {beach && <View pointerEvents="none" style={{ position: "absolute", top: 525 * scale, width: sceneWidth, height: Math.max(215 * scale, height - origin.y - 525 * scale) }}><ShoreArt depth={Math.max(215, (height - origin.y) / scale - 525)} /></View>}
          {decorating && <FloorGrid scale={scale} width={sceneWidth} height={sceneHeight} />}
          {entries.map((entry) => (
            <React.Fragment key={entry.key}>{entry.node}</React.Fragment>
          ))}
          <Footprint preview={preview} scale={scale} width={sceneWidth} height={sceneHeight} />
          {draggedItem && (
            <TrayGhost preview={preview} scale={scale} size={itemSize(instance("", draggedItem, 0, 0)) * scale}>
              <DecorArt item={draggedItem} size={itemSize(instance("", draggedItem, 0, 0)) * scale} />
            </TrayGhost>
          )}

        </View>
      </View>
          {decorating && target && toolbarPoint && (
            <View
              testID="object-toolbar"
              style={[
                styles.toolbar,
                { flexDirection: "column", alignItems: "center" },
                {
                  position: "absolute",
                  left: width > height ? undefined : Math.max(8, (width - 266) / 2),
                  right: width > height ? 8 : undefined,
                  bottom: drawerHeight + inset.bottom + 8,
                  zIndex: 20,
                },
              ]}
            >
              <View style={{ flexDirection: "row", flexWrap: "wrap", maxWidth: 250 }}>
              <Button
                label="Rotate"
                icon="rotate"
                disabled={itemSpec(target.item).rotations.length < 2}
                onPress={() => dispatch({ type: "rotate", id: target.id }, true)}
              />
              <Button
                label="Mirror"
                icon="mirror"
                disabled={!itemSpec(target.item).mirror}
                onPress={() => dispatch({ type: "mirror", id: target.id }, true)}
              />
              <Button
                label="Put away"
                icon="away"
                onPress={() => {
                  dispatch({ type: "put-away", id: target.id }, true);
                  setSelected(undefined);
                }}
              />
              </View>
              {decorSpec(target.item).tintable && <ScrollView horizontal style={{ width: 250, maxHeight: 48 }} showsHorizontalScrollIndicator={false}>
                {tintIds.map(tint => <Pressable key={tint} accessibilityRole="button" accessibilityLabel={`${tint} colour`} accessibilityState={{ selected: (target.tint ?? "original") === tint }} onPress={() => dispatch({ type: "tint", id: target.id, tint })} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: tintPalette[tint] ?? "#E9D7B8", borderColor: ink, borderWidth: (target.tint ?? "original") === tint ? 3 : 1 }}>{tint === "original" && <Text style={{textAlign:"center",color:ink}}>↺</Text>}</View></Pressable>)}
              </ScrollView>}
              {decorSpec(target.item).small && <ScrollView horizontal style={{ width: 250, maxHeight: 48 }}>{room.instances.filter(i => !i.on && decorSpec(i.item).surface).map(parent => <Button key={parent.id} label={`Put on ${itemSpec(parent.item).name}`} onPress={() => putOn(target, parent.id)} />)}</ScrollView>}
            </View>
          )}
      <View style={{ position: "absolute", top: inset.top + 94, alignSelf: "center", maxWidth: width - 16, zIndex: 10, backgroundColor: "#FFF8E9", borderRadius: 18 }}>
        <ScrollView horizontal contentContainerStyle={{ gap: 2 }} showsHorizontalScrollIndicator={false}>
          {roomIds.map(id => <Button key={id} label={roomNames[id]} selected={id === store.state.current} onPress={() => { dispatch({ type: "room", room: id }); setSelected(undefined); setPlacing(undefined); setDraggedItem(undefined); preview.value = emptyPreview; }} />)}
        </ScrollView>
      </View>
      <View
        pointerEvents="box-none"
        style={[styles.chrome, { top: inset.top + 8, left: inset.left + 8, right: inset.right + 8 }]}
      >
        <Button
          label="Back"
          icon="back"
          iconOnly
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
        <View style={styles.segment}>
          <Button label="Play" selected={!decorating} onPress={() => switchMode("play")} />
          <Button label="Decorate" selected={decorating} onPress={() => switchMode("decorate")} />
        </View>
        <Button label="More" icon="more" iconOnly onPress={() => setMenu(!menu)} />
      </View>
      {!!saveStatus && <View pointerEvents="box-none" style={{ position: "absolute", top: inset.top + 64, left: inset.left + 8, right: inset.right + 8, zIndex: 12 }}>{saveStatus}</View>}
      {decorating && (
        <View style={[styles.history, { top: inset.top + 62, right: inset.right + 8 }]}>
          <Button
            label="Undo"
            icon="undo"
            iconOnly
            disabled={!store.canUndo}
            onPress={() => {
              dispatch({ type: "undo" });
              setSelected(undefined);
            }}
          />
          <Button
            label="Redo"
            icon="redo"
            iconOnly
            disabled={!store.canRedo}
            onPress={() => {
              dispatch({ type: "redo" });
              setSelected(undefined);
            }}
          />
        </View>
      )}
      {(hint || (notice && !notice.startsWith("Earn"))) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss hint"
          pointerEvents="none"
          onPress={() => {
            setHint(false);
            setNotice("");
          }}
          style={[
            styles.hint,
            width > height
              ? { left: 8, top: inset.top + (saveStatus ? 94 : 72), maxWidth: Math.max(120, (width - sceneWidth) / 2 - 20) }
              : { bottom: drawerHeight + inset.bottom + 12 },
          ]}
        >
          <Text style={styles.hintText}>{notice || "Drag a friend. Tap a little home surprise."}</Text>
        </Pressable>
      )}
      {menu && (
        <View style={[styles.menu, { top: inset.top + 60, right: inset.right + 8 }]}>
          <Text style={styles.meta}>{persist ? "Your room saves on this device." : "Home stays for this visit."}</Text>
          {!!person.unseen.length && <Button label="Mark all seen" onPress={() => app.personalize({unseen:[]}, {learner:owner,epoch:app.epoch})} />}
          <Button label="My badges" onPress={() => router.push("/badges")} />
          <Button
            label="Reset room"
            onPress={() => {
              setMenu(false);
              setConfirm(true);
            }}
          />
        </View>
      )}
      {decorating && (
        <View style={[styles.drawer, { height: drawerHeight + inset.bottom, paddingBottom: inset.bottom }]}>
          <View style={styles.tabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["Furniture", ...Object.keys(categoryNames), "Stickers", "Room"].map((t) => (
              <Button
                key={t}
                label={categoryNames[t] ?? t}
                selected={t === tab}
                onPress={() => {
                  setTab(t);
                  setCollapsed(false);
                }}
              />
            ))}
            </ScrollView>
            <Button
              label={collapsed ? "Open drawer" : "Collapse drawer"}
              icon="down"
              iconOnly
              onPress={() => setCollapsed(!collapsed)}
            />
          </View>
          {!collapsed && notice.startsWith("Earn") && <LockRule>{notice}</LockRule>}
          {!collapsed && tab !== "Room" && tab !== "Stickers" && <FlatList key={tab} horizontal data={trayItems} initialScrollIndex={Math.max(0, trayItems.indexOf(initialItem ?? ""))} keyExtractor={id => id} renderItem={({item:id}) => thumbnail(id, itemSpec(id).name)} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={3} contentContainerStyle={styles.strip} getItemLayout={(_,index)=>({length:128,offset:128*index,index})} />}
          {!collapsed && (tab === "Room" || tab === "Stickers") && (
            <ScrollView
              horizontal
              ref={inventory}
              testID="inventory-strip"
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.strip}
            >

              {tab === "Stickers" && stickerIds.map((id) => thumbnail(`sticker:${id}`, stickerNames[id]))}
              {tab === "Room" && (
                <>
                  {wallThemes.map((wallpaper) => (
                    <Pressable
                      key={wallpaper}
                      accessibilityRole="button"
                      accessibilityLabel={`${wallpaper} walls`}
                      onLayout={e => revealInitialItem(wallpaper, e.nativeEvent.layout.x)}
                      onPress={() => { const reward = themeRewards.find(r=>r.id===wallpaper); if (reward && !ownership.ownedWallpapers?.includes(wallpaper)) feedback(badgeRule(reward.badge)); else { dispatch({ type: "theme", wallpaper }); if (personFor(app.save).unseen.includes(wallpaper)) app.personalize({ unseen: personFor(app.save).unseen.filter(id=>id!==wallpaper) }, {learner:app.save.learning?.active ?? "family", epoch:app.epoch}); } }}
                      style={[styles.swatch, { minWidth:180, height:140, backgroundColor: wallColors[wallpaper] }]}
                    >
                      <Text style={styles.label}>{wallpaper}</Text>
                      <Text style={styles.meta}>{themeRewards.find(r=>r.id===wallpaper) && !ownership.ownedWallpapers?.includes(wallpaper) ? badgeRule(themeRewards.find(r=>r.id===wallpaper)!.badge) : "Walls"}</Text>{person.unseen.includes(wallpaper) && <Text style={styles.meta}>New</Text>}
                    </Pressable>
                  ))}
                  {floorThemes.map((floor) => (
                    <Pressable
                      key={floor}
                      accessibilityRole="button"
                      accessibilityLabel={`${floor} floor`}
                      onLayout={e => revealInitialItem(floor, e.nativeEvent.layout.x)}
                      onPress={() => { const reward = themeRewards.find(r=>r.id===floor); if (reward && !ownership.ownedFloors?.includes(floor)) feedback(badgeRule(reward.badge)); else { dispatch({ type: "theme", floor }); if (personFor(app.save).unseen.includes(floor)) app.personalize({ unseen: personFor(app.save).unseen.filter(id=>id!==floor) }, {learner:app.save.learning?.active ?? "family", epoch:app.epoch}); } }}
                      style={[styles.swatch, { minWidth:180, height:140, backgroundColor: floorColors[floor] }]}
                    >
                      <Text style={styles.label}>{floor}</Text>
                      <Text style={styles.meta}>{themeRewards.find(r=>r.id===floor) && !ownership.ownedFloors?.includes(floor) ? badgeRule(themeRewards.find(r=>r.id===floor)!.badge) : "Floor"}</Text>{person.unseen.includes(floor) && <Text style={styles.meta}>New</Text>}
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      )}
      <Modal transparent visible={confirm} animationType="none" onRequestClose={() => setConfirm(false)}>
        <View accessibilityViewIsModal style={styles.scrim}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Start fresh?</Text>
            <Text style={styles.hintText}>Your room will return to its starter layout. You can Undo.</Text>
            <Button label="Keep my room" onPress={() => setConfirm(false)} />
            <Button
              label="Reset room"
              onPress={() => {
                dispatch({ type: "reset" });
                setConfirm(false);
                setSelected(undefined);
                setPlacing(undefined);
                setDraggedItem(undefined);
                // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value reset after confirmed reset.
                preview.value = emptyPreview;
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#C8DDD2", overflow: "hidden" },
  chrome: { position: "absolute", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  button: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E9EE",
    gap: 2,
  },
  label: { fontSize: 12, fontWeight: "800", color: ink },
  chosen: { backgroundColor: "#B4DCC7", borderWidth: 1, borderColor: "#4B8271" },
  segment: { flexDirection: "row", gap: 3, padding: 3, borderRadius: 21, backgroundColor: "#FFF8E9CC" },
  history: { position: "absolute", flexDirection: "row", gap: 6 },
  toolbar: {
    position: "absolute",
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: 20,
    backgroundColor: "#FFFAEE",
    boxShadow: "0 3px 12px #254C4425",
    zIndex: 600,
  },
  hint: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFF8E9F0",
  },
  hintText: { fontSize: 13, color: ink, textAlign: "center" },
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F9EFD9F5",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  tabs: { height: 48, flexDirection: "row", justifyContent: "center", gap: 4 },
  strip: { gap: 10, paddingHorizontal: 14, paddingTop: 3, paddingBottom: 5 },
  thumbLabel: { fontSize: 10, color: ink, fontWeight: "700", maxWidth: 80, paddingHorizontal: 3 },
  swatch: {
    width: 84,
    height: 86,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7B947D",
  },
  meta: { fontSize: 11, color: ink },
  menu: { position: "absolute", padding: 12, gap: 8, borderRadius: 16, backgroundColor: "#FFF8E9", zIndex: 700 },
  scrim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#234B4670",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  dialog: { maxWidth: 310, padding: 24, borderRadius: 24, backgroundColor: "#FFF8E9", gap: 12 },
  dialogTitle: { fontSize: 22, fontWeight: "800", color: ink, textAlign: "center" },
});
