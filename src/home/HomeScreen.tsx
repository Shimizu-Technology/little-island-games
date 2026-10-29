import React, { useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArcadeArt, ReefFish, stickerNames } from "../arcade/Art";
import { stickerIds, type StickerId } from "../arcade/progress";
import { ItemArt } from "./art/Items";
import { RoomArt, floorColors, wallColors } from "./art/Room";
import {
  badgeIds,
  catalog,
  floorThemes,
  furnitureIds,
  itemSpec,
  wallThemes,
  type BadgeId,
  type ItemId,
} from "./catalog";
import {
  anchorAvailable,
  anchors,
  instance,
  owns,
  validPlacement,
  type Anchor,
  type Character,
  type HomeState,
  type Instance,
  type Ownership,
  type Pose,
} from "./model";
import { floorPoint, itemPoint, spotFromPoint } from "./geometry";
import { useHomeStore } from "./useHomeStore";
export type HomeScreenProps = Ownership & {
  badges?: BadgeId[];
  renderCharacter?: (slot: Character["slot"], pose: Pose) => ReactNode;
  initialState?: unknown;
};
const ink = "#284F4B";
function Button({
  label,
  onPress,
  selected = false,
  disabled = false,
  small = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        small && { paddingHorizontal: 12 },
        selected && styles.chosen,
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[styles.buttonText, selected && { color: "#FFF9E9" }]}>{label}</Text>
    </Pressable>
  );
}
function characterPoint(state: HomeState, anchor: Anchor) {
  const seat = state.instances.find((i) => i.item === anchor);
  return seat
    ? { ...itemPoint(seat), y: itemPoint(seat).y - (anchor === "rug" ? 0 : 27) }
    : anchor === "window"
      ? floorPoint(7, 1)
      : floorPoint(4, 1);
}
function Placeholder({ pose }: { pose: Pose }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: 25,
          height: 25,
          borderRadius: 16,
          backgroundColor: "#D9B495",
          borderWidth: 2,
          borderColor: ink,
        }}
      />
      <View
        style={{
          width: 30,
          height: pose === "sit" ? 21 : 33,
          borderRadius: 12,
          backgroundColor: "#8BBAB1",
          borderWidth: 2,
          borderColor: ink,
        }}
      />
      <View style={{ width: 24, height: 8, borderRadius: 4, backgroundColor: "#4A6866" }} />
    </View>
  );
}
export function HomeScreen({ renderCharacter, badges = [], initialState, ...ownership }: HomeScreenProps) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 850 || width > height;
  const store = useHomeStore(ownership, initialState);
  const [mode, setMode] = useState<"play" | "decorate">("play");
  const [tab, setTab] = useState<"Furniture" | "Stickers" | "Room">("Furniture");
  const [selected, setSelected] = useState<string>();
  const [placing, setPlacing] = useState<ItemId>();
  const [moving, setMoving] = useState(false);
  const [spot, setSpot] = useState({ x: 3, y: 2 });
  const [slot, setSlot] = useState<Character["slot"]>(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const sequence = useRef(0);
  const canvasRef = useRef<View>(null);
  const target = store.state.instances.find((i) => i.id === selected);
  const candidate = placing
    ? instance("", placing, spot.x, spot.y)
    : moving && target
      ? { ...target, ...spot }
      : undefined;
  const valid = candidate && validPlacement(store.state.instances, candidate);
  const sceneWidth = Math.min(
    wide ? width - 346 : width - 24,
    (height - (wide && mode === "play" ? 190 : 230)) / 0.7,
    850
  );
  const sceneHeight = sceneWidth * 0.7;
  const scale = sceneWidth / 800;
  const choose = (item: ItemId) => {
    if (!owns(item, ownership)) {
      store.setMessage(
        `Earn it in ${item.startsWith("sticker:") ? "Arcade" : itemSpec(item).track}. The badge system will supply your earned items.`
      );
      return;
    }
    setPlacing(item);
    setMoving(false);
    setSelected(undefined);
    setSpot({ x: 3, y: itemSpec(item).layer === "wall" ? 0 : 2 });
    store.setMessage("Tap a clear spot in the room, or use the arrows. Then Place.");
  };
  const place = () => {
    if (!candidate) return;
    if (placing) {
      let id: string;
      do {
        id = `home-${++sequence.current}-${store.state.instances.length}`;
      } while (store.state.instances.some((i) => i.id === id));
      store.dispatch({ type: "place", instance: { ...candidate, id } });
    } else if (target) store.dispatch({ type: "move", id: target.id, ...spot });
    if (valid && (!placing || store.state.instances.length < 32)) {
      setPlacing(undefined);
      setMoving(false);
    }
  };
  const tapItem = (i: Instance) => {
    if (mode === "decorate") {
      setSelected(i.id);
      setPlacing(undefined);
      setMoving(false);
    } else {
      store.dispatch({ type: "toggle", id: i.id });
      if (itemSpec(i.item).interactive)
        store.setMessage(
          i.state === "rest" ? `${itemSpec(i.item).interactive}!` : `${itemSpec(i.item).name} settles down.`
        );
    }
  };
  const inventory = (
    <View style={[styles.inventory, wide && { width: 302, flexBasis: 302, flexGrow: 0, flexShrink: 0 }]}>
      <View style={styles.row}>
        {(["Furniture", "Stickers", "Room"] as const).map((t) => (
          <Button key={t} label={t} selected={tab === t} onPress={() => setTab(t)} small />
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tiles}>
        {tab === "Furniture" &&
          furnitureIds.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${catalog[id].name}${owns(id, ownership) ? "" : `, Earn it in ${catalog[id].track}`}`}
              onPress={() => choose(id)}
              style={[styles.tile, placing === id && styles.tileSelected]}
            >
              <View style={{ opacity: owns(id, ownership) ? 1 : 0.42 }}>
                <ItemArt item={id} size={76} />
              </View>
              <Text style={styles.tileName}>{catalog[id].name}</Text>
              <Text style={styles.meta}>
                {owns(id, ownership) ? "Yours to use" : `Earn it in ${catalog[id].track}`}
              </Text>
            </Pressable>
          ))}
        {tab === "Stickers" &&
          stickerIds.map((id) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${stickerNames[id]} sticker`}
              onPress={() => choose(`sticker:${id}`)}
              style={[styles.tile, placing === `sticker:${id}` && styles.tileSelected]}
            >
              <View style={{ opacity: owns(`sticker:${id}`, ownership) ? 1 : 0.4 }}>
                <ItemArt item={`sticker:${id}`} size={64} />
              </View>
              <Text style={styles.tileName}>{stickerNames[id]}</Text>
              <Text style={styles.meta}>
                {owns(`sticker:${id}`, ownership) ? "Reuse on any wall spot" : "Earn stickers in Arcade"}
              </Text>
            </Pressable>
          ))}
        {tab === "Room" && (
          <View style={{ width: "100%", gap: 8 }}>
            <Text style={styles.subtitle}>Walls</Text>
            <View style={styles.wrap}>
              {wallThemes.map((wallpaper, n) => (
                <Pressable
                  key={wallpaper}
                  accessibilityRole="button"
                  accessibilityLabel={`${wallpaper} walls`}
                  onPress={() => store.dispatch({ type: "theme", wallpaper })}
                  style={[
                    styles.swatch,
                    { backgroundColor: wallColors[wallpaper] },
                    store.state.theme.wallpaper === wallpaper && styles.tileSelected,
                  ]}
                >
                  <Text style={styles.tileName}>
                    {wallpaper}
                    {store.state.theme.wallpaper === wallpaper ? " ✓" : ""}
                  </Text>
                  <Text style={styles.meta}>
                    {n < 2 || ownership.ownedWallpapers?.includes(wallpaper)
                      ? "Yours"
                      : n === 2
                        ? "Night Sky badge set"
                        : "Reading badge set"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.subtitle}>Floors</Text>
            <View style={styles.wrap}>
              {floorThemes.map((floor, n) => (
                <Pressable
                  key={floor}
                  accessibilityRole="button"
                  accessibilityLabel={`${floor} floor`}
                  onPress={() => store.dispatch({ type: "theme", floor })}
                  style={[
                    styles.swatch,
                    { backgroundColor: floorColors[floor] },
                    store.state.theme.floor === floor && styles.tileSelected,
                  ]}
                >
                  <Text style={styles.tileName}>
                    {floor}
                    {store.state.theme.floor === floor ? " ✓" : ""}
                  </Text>
                  <Text style={styles.meta}>
                    {n < 2 || ownership.ownedFloors?.includes(floor)
                      ? "Yours"
                      : n === 2
                        ? "Science badge set"
                        : "Reading badge set"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
  const playControls = (
    <>
      <View style={styles.wrap}>
        {(["Islander", "Pip", "Poko"] as const).map((name, n) => (
          <Button key={name} label={name} selected={slot === n} onPress={() => setSlot(n as Character["slot"])} />
        ))}
      </View>
      <Text style={styles.meta}>Choose a friend, then a place. Tap objects to play.</Text>
      <View style={styles.wrap}>
        {anchors
          .filter((a) => anchorAvailable(store.state.instances, a))
          .map((a) => (
            <Button
              key={a}
              label={a === "hello" ? "Stand here" : a === "window" ? "Beach view" : `Sit: ${a}`}
              onPress={() => store.dispatch({ type: "character", slot, anchor: a })}
            />
          ))}
      </View>
    </>
  );
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Button label="‹ Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} small />
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>A PLACE TO JUST BE</Text>
          <Text style={styles.title}>Island Home</Text>
        </View>
      </View>
      <View style={[styles.row, { justifyContent: "center" }]}>
        <Button
          label="Play"
          selected={mode === "play"}
          onPress={() => {
            setMode("play");
            setPlacing(undefined);
            setMoving(false);
            setSelected(undefined);
          }}
        />
        <Button label="Decorate" selected={mode === "decorate"} onPress={() => setMode("decorate")} />
        {mode === "decorate" && (
          <Button
            label="Done"
            onPress={() => {
              setMode("play");
              setPlacing(undefined);
              setMoving(false);
              setSelected(undefined);
            }}
          />
        )}
      </View>
      <View style={[styles.body, wide && { flexDirection: "row" }]}>
        <View style={{ alignItems: "center", flex: wide ? 1 : undefined, minWidth: 0 }}>
          <View ref={canvasRef} style={{ width: sceneWidth, height: sceneHeight }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Room placement canvas"
              onPress={(e) => {
                if (!candidate) return;
                const { pageX, pageY } = e.nativeEvent;
                canvasRef.current?.measureInWindow((x, y) => {
                  const nextSpot = spotFromPoint(pageX - x, pageY - y, scale, candidate.layer === "wall");
                  if (nextSpot) setSpot(nextSpot);
                });
              }}
              style={{ position: "absolute", width: sceneWidth, height: sceneHeight }}
            >
              <View pointerEvents="none" style={{ width: "100%", height: "100%" }}>
                <RoomArt theme={store.state.theme} badges={badges.filter((b) => badgeIds.includes(b))} />
              </View>
            </Pressable>
            {[
              ...store.state.instances.map((i) => {
                const p = itemPoint(i);
                const size =
                  (i.item === "bed" || i.item === "rug" || i.item === "mat"
                    ? 160
                    : i.layer === "wall"
                      ? 58
                      : ["table", "books", "shelf", "trophies", "toy-box", "aquarium", "checkers"].includes(i.item)
                        ? 120
                        : 98) * scale;
                return {
                  key: i.id,
                  depth: i.layer === "wall" ? -100 : i.layer === "ground" ? -50 : p.y,
                  node: (
                    <Pressable
                      pointerEvents={candidate ? "none" : "auto"}
                      accessibilityRole="button"
                      accessibilityLabel={`${itemSpec(i.item).name}, ${i.state === "active" ? "active" : "resting"}`}
                      onPress={() => tapItem(i)}
                      style={{
                        position: "absolute",
                        left: p.x * scale - size / 2,
                        top: p.y * scale - size * 0.85,
                        minWidth: 48,
                        minHeight: 48,
                        borderWidth: selected === i.id ? 2 : 0,
                        borderColor: "#387568",
                        borderRadius: 15,
                      }}
                    >
                      <ItemArt
                        item={i.item}
                        size={size}
                        active={i.state === "active"}
                        mirrored={i.mirrored}
                        rotation={i.rotation}
                      />
                    </Pressable>
                  ),
                };
              }),
              ...store.state.characters.map((c) => {
                const p = characterPoint(store.state, c.anchor);
                const characterSize = Math.max(28, 65 * scale);
                return {
                  key: `character-${c.slot}`,
                  depth: p.y,
                  node: (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: (p.x + c.slot * 17) * scale - characterSize / 2,
                        top: p.y * scale - characterSize,
                        width: characterSize,
                        height: characterSize,
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          width: 60,
                          height: 65,
                          left: (characterSize - 60) / 2,
                          top: (characterSize - 65) / 2,
                          alignItems: "center",
                          transform: [{ scale: characterSize / 65 }],
                        }}
                      >
                        {renderCharacter ? (
                          renderCharacter(c.slot, c.pose)
                        ) : c.slot === 0 ? (
                          <Placeholder pose={c.pose} />
                        ) : c.slot === 1 ? (
                          <View
                            style={{
                              borderBottomWidth: 4,
                              borderColor: "#D7E9DF",
                              borderRadius: 30,
                              backgroundColor: "#C6E5DC99",
                            }}
                          >
                            <ReefFish size={55} />
                          </View>
                        ) : (
                          <ArcadeArt game="crab-crossing" size={55} />
                        )}
                      </View>
                    </View>
                  ),
                };
              }),
            ]
              .sort((a, b) => a.depth - b.depth)
              .map((entry) => (
                <React.Fragment key={entry.key}>{entry.node}</React.Fragment>
              ))}
            {candidate && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: itemPoint(candidate).x * scale - 29,
                  top: itemPoint(candidate).y * scale - 50,
                  borderWidth: 3,
                  borderColor: valid ? "#287C67" : "#AC504A",
                  borderRadius: 16,
                  backgroundColor: valid ? "#E2F7DECC" : "#FBD5CDCC",
                }}
              >
                <ItemArt item={candidate.item} size={58} />
                <Text style={{ color: ink, textAlign: "center", fontWeight: "bold" }}>
                  {valid ? "✓ Clear" : "× Try here?"}
                </Text>
              </View>
            )}
          </View>
          <ScrollView
            style={{ maxHeight: wide ? Math.max(60, height - sceneHeight - 145) : undefined, width: "100%" }}
            contentContainerStyle={{ alignItems: "center", gap: 4 }}
          >
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {store.state.instances.length >= 32 ? "Put something away to make room." : store.message}
            </Text>
            {mode === "play" ? (
              !wide && playControls
            ) : (
              <>
                {candidate ? (
                  <View style={styles.wrap}>
                    <Button label="Left" onPress={() => setSpot((s) => ({ ...s, x: Math.max(0, s.x - 1) }))} />
                    <Button
                      label="Right"
                      onPress={() =>
                        setSpot((s) => ({ ...s, x: Math.min(candidate.layer === "wall" ? 7 : 9, s.x + 1) }))
                      }
                    />
                    <Button label="Back" onPress={() => setSpot((s) => ({ ...s, y: Math.max(0, s.y - 1) }))} />
                    <Button
                      label="Forward"
                      onPress={() =>
                        setSpot((s) => ({ ...s, y: Math.min(candidate.layer === "wall" ? 1 : 5, s.y + 1) }))
                      }
                    />
                    <Button
                      label={moving ? "Set down" : "Place"}
                      disabled={!valid || (placing !== undefined && store.state.instances.length >= 32)}
                      onPress={place}
                    />
                    <Button
                      label="Cancel"
                      onPress={() => {
                        setMoving(false);
                        setPlacing(undefined);
                      }}
                    />
                  </View>
                ) : target ? (
                  <>
                    <Text style={styles.meta}>{itemSpec(target.item).name}</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ maxWidth: sceneWidth }}
                      contentContainerStyle={styles.row}
                    >
                      <Button
                        label="Move"
                        onPress={() => {
                          setMoving(true);
                          setSpot({ x: target.x, y: target.y });
                        }}
                      />
                      <Button
                        label="Rotate"
                        disabled={itemSpec(target.item).rotations.length < 2}
                        onPress={() => store.dispatch({ type: "rotate", id: target.id })}
                      />
                      <Button
                        label="Mirror"
                        disabled={!itemSpec(target.item).mirror}
                        onPress={() => store.dispatch({ type: "mirror", id: target.id })}
                      />
                      <Button
                        label="Put away"
                        onPress={() => {
                          store.dispatch({ type: "put-away", id: target.id });
                          setSelected(undefined);
                        }}
                      />
                    </ScrollView>
                  </>
                ) : (
                  <Text style={styles.meta}>Choose something below, or tap an object to change it.</Text>
                )}
                <View style={styles.wrap}>
                  <Button label="Undo" disabled={!store.canUndo} onPress={() => store.dispatch({ type: "undo" })} />
                  <Button label="Redo" disabled={!store.canRedo} onPress={() => store.dispatch({ type: "redo" })} />
                  <Button label="Reset room" onPress={() => setConfirmReset(true)} />
                </View>
              </>
            )}
            <ScrollView
              horizontal
              style={{ maxWidth: sceneWidth }}
              contentContainerStyle={styles.row}
              accessibilityLabel="Objects in this room"
            >
              {store.state.instances.map((i, index) => (
                <Button
                  key={i.id}
                  label={`${mode === "play" ? "Play" : "Edit"}: ${itemSpec(i.item).name} ${index + 1}`}
                  onPress={() => tapItem(i)}
                  small
                />
              ))}
            </ScrollView>
            <Text style={styles.session}>Room kept for this visit · saving arrives with your Islander</Text>
          </ScrollView>
        </View>
        {wide && mode === "play" && (
          <ScrollView
            style={[styles.inventory, { width: 302, flexBasis: 302, flexGrow: 0, flexShrink: 0 }]}
            contentContainerStyle={{ gap: 12, padding: 12 }}
          >
            <Text style={styles.subtitle}>Make a little story</Text>
            {playControls}
            <Text style={styles.meta}>Nothing to finish. Just make yourself at home.</Text>
          </ScrollView>
        )}
        {mode === "decorate" && inventory}
      </View>
      {confirmReset && (
        <View style={styles.scrim}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text style={styles.title}>A fresh little room?</Text>
            <Text style={styles.message}>
              Bring back the starter furniture. Your earned items stay yours. You can undo this.
            </Text>
            <Button label="Keep my room" onPress={() => setConfirmReset(false)} />
            <Button
              label="Reset to starter room"
              onPress={() => {
                store.dispatch({ type: "reset" });
                setConfirmReset(false);
                setSelected(undefined);
                setPlacing(undefined);
                setMoving(false);
              }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
export const homeStickerItems = (stickers: readonly StickerId[]): ItemId[] =>
  stickers.map((id) => `sticker:${id}` as const);
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F9F4E5", paddingHorizontal: 12, gap: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 8 },
  eyebrow: { fontSize: 10, letterSpacing: 2, fontWeight: "800", color: "#627C6D" },
  title: { fontSize: 28, fontWeight: "800", color: ink },
  subtitle: { fontSize: 18, fontWeight: "800", color: ink },
  row: { flexDirection: "row", gap: 6, alignItems: "center" },
  wrap: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  body: { flex: 1, gap: 10, minHeight: 0 },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 17,
    backgroundColor: "#E7E9D9",
    borderWidth: 1,
    borderColor: "#CCD7C3",
    alignItems: "center",
    justifyContent: "center",
  },
  chosen: { backgroundColor: "#376D62", borderColor: "#376D62" },
  buttonText: { color: ink, fontSize: 14, fontWeight: "800" },
  message: { fontSize: 14, color: ink, textAlign: "center", paddingVertical: 5, maxWidth: 550, minHeight: 30 },
  meta: { fontSize: 11, color: "#5F7569", textAlign: "center", lineHeight: 16 },
  session: { fontSize: 10, color: "#6A7C6F", textAlign: "center", paddingVertical: 4 },
  inventory: {
    flex: 1,
    minHeight: 120,
    backgroundColor: "#FFFBEF",
    borderWidth: 1,
    borderColor: "#D9DECC",
    padding: 8,
    borderRadius: 22,
    gap: 8,
    marginBottom: 8,
  },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, paddingBottom: 12 },
  tile: {
    width: 126,
    minHeight: 135,
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E8E3D1",
    backgroundColor: "#FAF5E6",
    alignItems: "center",
  },
  tileSelected: { borderWidth: 2, borderColor: "#347566" },
  tileName: { fontSize: 12, fontWeight: "800", color: ink, textAlign: "center" },
  swatch: {
    width: 126,
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D3C9AA",
    justifyContent: "center",
    padding: 8,
  },
  scrim: {
    position: "absolute",
    inset: 0,
    backgroundColor: "#1C403E88",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  dialog: { maxWidth: 420, backgroundColor: "#FFFAE9", padding: 24, borderRadius: 28, gap: 12 },
});
