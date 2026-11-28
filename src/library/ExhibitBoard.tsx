import { BoardPanView, createBoardPan, nativeBoardPan, boardTouchStyle } from '../gestures/BoardPan';
import React, { useMemo, useRef, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { Text } from "../components/Text";
import { Motif } from "../explore/ExploreArt";
import {
  FOOD_CHAIN,
  HABITATS,
  HABITAT_CHOICES,
  PLACES,
  dayNightDot,
  type LabAction,
  type LabState,
} from "../explore/activities";
import { SceneBackdrop } from "./SceneBackdrop";
import { s } from "./ui";
import { WordLabel } from "./WordLabel";

const reef = [
  [53, 61],
  [180, 65],
  [288, 139],
  [169, 223],
  [55, 295],
];
function Creature({ index }: { index: number }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 100" accessible={false}>
      {index === 0 ? (
        <G transform="translate(10 -6) scale(.85)">
          <Motif name="sun" />
        </G>
      ) : index < 3 ? (
        <G stroke="#254E4B" strokeWidth={2.5}>
          {[-1, 0, 1].map((n) => (
            <G key={n} transform={`translate(${60 + n * 28} ${45 + (n === 0 ? -12 : 7)})`}>
              <Path d="M0-14C-18-11-12 23 1 17S19-10 0-14Z" fill={index === 1 ? "#80A97D" : "#D49A78"} />
              {index === 1 ? (
                <Path d="M-13-9l-5-4M11 6l6 6M-12 12l-6 5" />
              ) : (
                <Circle cx={4} cy={-2} r={2} fill="#254E4B" />
              )}
            </G>
          ))}
        </G>
      ) : (
        <G transform={index === 3 ? "translate(22 10) scale(.65)" : "translate(2 -4) scale(.95)"}>
          <Motif name="fish" />
        </G>
      )}
    </Svg>
  );
}
/** Every picture remains a choice. The existing engine decides whether a link is valid. */
export function ReefBoard({ state, act }: { state: LabState; act: (action: LabAction) => void }) {
  const { fontScale } = useWindowDimensions();
  const [expandedLabels, setExpandedLabels] = useState(false);
  const largeText = fontScale > 1.4 || expandedLabels;
  return (
    <View
      style={
        largeText
          ? {
              width: "100%",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 16,
              padding: 12,
              backgroundColor: "#DCE9D8",
              borderRadius: 24,
            }
          : {
              width: "100%",
              aspectRatio: 360 / 350,
              maxWidth: 560,
              alignSelf: "center",
              overflow: "hidden",
              borderRadius: 28,
            }
      }
    >
      {!largeText && <SceneBackdrop category="ocean" />}
      {!largeText && (
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 360 350"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0 }}
          accessible={false}
        >
          {reef.slice(0, -1).map(([x, y], i) => {
            const [nx, ny] = reef[i + 1];
            return i < state.chain.length - 1 ? (
              <G key={i}>
                <Path d={`M${x} ${y}L${nx} ${ny}`} stroke="#315F54" strokeWidth={4} />
                <G
                  transform={`translate(${(x + nx) / 2} ${(y + ny) / 2}) rotate(${(Math.atan2(ny - y, nx - x) * 180) / Math.PI})`}
                >
                  <Path d="m-8-7 9 7-9 7" stroke="#315F54" strokeWidth={4} fill="none" />
                </G>
              </G>
            ) : null;
          })}
        </Svg>
      )}
      {reef.map(([x, y], i) => (
        <Pressable
          key={i}
          accessibilityRole="button"
          accessibilityLabel={FOOD_CHAIN[i]}
          aria-selected={state.chain.includes(FOOD_CHAIN[i])}
          accessibilityState={{
            selected: state.chain.includes(FOOD_CHAIN[i]),
            disabled: state.chain.includes(FOOD_CHAIN[i]) || state.chain.length === 5,
          }}
          disabled={state.chain.includes(FOOD_CHAIN[i]) || state.chain.length === 5}
          onPress={() => act({ type: "chain", item: FOOD_CHAIN[i] })}
          style={({ pressed }) =>
            largeText
              ? { width: "100%", alignItems: "center", opacity: pressed ? 0.7 : 1 }
              : {
                  position: "absolute",
                  left: `${((x - 45) / 360) * 100}%`,
                  top: `${((y - 44) / 350) * 100}%`,
                  width: "25%",
                  minHeight: 86,
                  alignItems: "center",
                  opacity: pressed ? 0.7 : 1,
                }
          }
        >
          <View
            style={{
              width: "100%",
              maxWidth: largeText ? 120 : undefined,
              aspectRatio: 1.36,
              borderRadius: 38,
              backgroundColor: state.chain.includes(FOOD_CHAIN[i]) ? "#FFF0B9" : "#E8F3DC",
              borderWidth: state.chain.includes(FOOD_CHAIN[i]) ? 3 : 1.5,
              borderColor: "#476E59",
            }}
          >
            <Creature index={i} />
          </View>
          <WordLabel
            onWordLayout={(event) => setExpandedLabels(event.nativeEvent.layout.height > 24)}
            style={{ width: largeText ? "100%" : 116, maxWidth: largeText ? "100%" : 116,
              backgroundColor: "#FFF5DC", paddingHorizontal: 4, borderRadius: 6 }}
            textStyle={[s.small, { fontSize: 12, lineHeight: 16, fontWeight: "800", textAlign: "center" }]}
          >{FOOD_CHAIN[i]}</WordLabel>
        </Pressable>
      ))}
    </View>
  );
}
export function SkyBoard({ state, act }: { state: LabState; act: (action: LabAction) => void }) {
  const suppressTap = useRef(false);
  const gesture = useMemo(
    () =>
      // PanResponder stores callbacks; it does not read their refs during render.
      // eslint-disable-next-line react-hooks/refs
      createBoardPan({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_, g) => {
          // Web also emits a click after mouse-up. Consume that same input once.
          suppressTap.current = true;
          setTimeout(() => {
            suppressTap.current = false;
          }, 0);
          if (Math.abs(g.dx) > 40 && Math.abs(g.dx) > Math.abs(g.dy ?? 0) * 1.5) act({ type: "turn", by: g.dx < 0 ? 1 : -1 });
          else if (nativeBoardPan && Math.hypot(g.dx, g.dy) < 8) act({ type: "turn", by: 1 });
        },
      }),
    [act]
  );
  return (
    <BoardPanView pan={gesture} enabled={true}
      {...gesture.panHandlers}
      style={{ ...boardTouchStyle, backgroundColor: "#283E59", borderRadius: 28, overflow: "hidden", paddingTop: 16 }}
    >
      <Svg width="100%" height={44} viewBox="0 0 400 44" accessible={false}>
        {[
          [24, 14],
          [73, 29],
          [143, 12],
          [246, 23],
          [328, 10],
          [373, 32],
        ].map(([x, y], i) => (
          <G key={i} stroke="#F1DA9E" strokeWidth={2}>
            <Path d={`M${x - 4} ${y}h8M${x} ${y - 4}v8`} />
          </G>
        ))}
      </Svg>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Turn Earth one eighth. Follow the coral place dot."
        accessibilityHint="Tap or swipe the Earth to turn it."
        onPress={() => {
          if (!suppressTap.current) act({ type: "turn", by: 1 });
        }}
      >
        <SkyPicture turn={state.turn} />
      </Pressable>
      <Text style={[s.small, { color: "#FFF3D1", textAlign: "center", padding: 12 }]}>Tap or swipe Earth</Text>
    </BoardPanView>
  );
}

/** Same dayNightDot projection and light direction as the shared engine illustration. */
function SkyPicture({ turn }: { turn: number }) {
  const { width } = useWindowDimensions();
  const dot = dayNightDot(turn);
  return (
    <Svg width="100%" height={width < 650 ? 270 : 330} viewBox="0 0 400 280" accessible={false}>
      <Circle cx={45} cy={140} r={30} fill="#F0CF7C" stroke="#D6AF64" strokeWidth={3} />
      {[115, 140, 165].map((y) => (
        <Path key={y} d={`M90 ${y}h58m-8-5 8 5-8 5`} stroke="#F0CF7C" strokeWidth={3} fill="none" />
      ))}
      <Circle cx={255} cy={140} r={91} fill="#91C5D0" stroke="#DCE7D4" strokeWidth={3} />
      <G rotation={-turn * 45} origin="255,140">
        <Path d="m200 86 32 12-9 39-37 25m67-73 38 37-12 43" fill="#80A97D" stroke="#476E59" strokeWidth={3} />
      </G>
      <Path d="M255 49a91 91 0 0 1 0 182Z" fill="#17273E" opacity={0.82} />
      <Circle cx={255 + dot.x * 76} cy={140 + dot.y * 76} r={11} fill="#D4896C" stroke="#FFF3D4" strokeWidth={4} />
    </Svg>
  );
}
export function HabitatBoard({ state, act }: { state: LabState; act: (a: LabAction) => void }) {
  const { fontScale } = useWindowDimensions();
  const [expandedLabels, setExpandedLabels] = useState(false);
  const animal = HABITATS[state.habitatFeedback ? state.habitat - 1 : state.habitat];
  if (!animal) return null;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: 210, overflow: "hidden", borderRadius: 28 }}>
        <SceneBackdrop
          category={animal.home.includes("reef") || animal.home.includes("Seagrass") ? "ocean" : "animals"}
        />
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" }}>
          <Svg width={170} height={150} viewBox="0 0 120 120" accessible={false}>
            <Motif name={animal.art} />
          </Svg>
          <WordLabel style={{ backgroundColor: "#FFF3D4", borderRadius: 12, paddingHorizontal: 12 }}
            textStyle={[s.heading, { marginTop: 0 }]}>{animal.animal}</WordLabel>
        </View>
      </View>
      {!state.habitatFeedback && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {HABITAT_CHOICES.map((home, i) => (
            <Pressable
              key={home}
              accessibilityRole="button"
              accessibilityLabel={home}
              onPress={() => act({ type: "habitat", choice: home })}
              style={({ pressed }) => ({
                width: fontScale > 1.4 || expandedLabels ? "100%" : "48%",
                overflow: "hidden",
                borderRadius: 20,
                borderWidth: 2,
                borderColor: "#577E69",
                opacity: pressed ? 0.7 : 1,
                backgroundColor: "#FFF3D4",
              })}
            >
              <View style={{ height: 100 }}>
                <SceneBackdrop category={i === 0 ? "plants" : i === 2 ? "weather" : "ocean"} />
                <Svg
                  width="100%"
                  height={100}
                  viewBox="0 0 160 100"
                  style={{ position: "absolute", inset: 0 }}
                  accessible={false}
                >
                  <G transform="translate(35 2) scale(.7)">
                    <Motif name={i === 0 ? "butterfly" : i === 1 ? "coral" : i === 2 ? "tadpole" : "seagrass"} />
                  </G>
                </Svg>
              </View>
              <WordLabel onWordLayout={(event) => setExpandedLabels(event.nativeEvent.layout.height > 28)}
                style={{ padding: 10 }} textStyle={s.actionText}>{home}</WordLabel>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
export function MapBoard({ state, act }: { state: LabState; act: (a: LabAction) => void }) {
  const [width, setWidth] = useState(360);
  const scale = width / 400;
  const pinY = [112, 54, 163, 112, 207];
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        width: "100%",
        maxWidth: 560,
        alignSelf: "center",
        height: width * 0.55 + 60,
        backgroundColor: "#C2DFE3",
        borderRadius: 28,
        overflow: "hidden",
      }}
    >
      <Svg width="100%" height={width * 0.55} viewBox="0 0 400 220" accessible={false}>
        {[55, 110, 165].map((y) => (
          <Path key={y} d={`M8 ${y}h384`} stroke="#8DBAB9" strokeDasharray="4 6" />
        ))}
        <Path
          d="m20 45 22-21 38 4 35 25-22 24-19 4-8 28-19-20-9-25ZM92 109l37 18 12 30-17 38-16-25-7-33ZM174 36l30-10 26 13 28-13 39 8 22 24-12 20-15 15-20-5-18-27-24 9-31-13-24-6ZM175 85l43-8 26 36-21 44-25-9-16-37ZM333 53l6 8-2 15-5-8ZM314 91l5 10-3 10-4-10ZM287 148l26-10 36 11 7 22-35 13-30-13ZM18 200l66-9 47 6 48-7 41 6 61-6 65 8 36-1v20H18Z"
          fill="#9BBF92"
          stroke="#537F68"
          strokeWidth={1.5}
        />
        <Path d="M367 23v27m-7-18 7-9 7 9" fill="none" stroke="#254E4B" strokeWidth={2} />
        {PLACES.map((p, i) => (
          <Path key={p.id} d={`M${p.x} ${p.y}L${p.x} ${pinY[i]}`} stroke="#527E69" strokeWidth={2} />
        ))}
      </Svg>
      {PLACES.map((place, i) => (
        <Pressable
          key={place.id}
          accessibilityRole="button"
          accessibilityLabel={`${i + 1}. ${place.name}`}
          aria-selected={state.visited.includes(place.id)}
          disabled={state.expedition === PLACES.length}
          accessibilityState={{
            selected: state.visited.includes(place.id),
            disabled: state.expedition === PLACES.length,
          }}
          onPress={() => act({ type: "place", id: place.id })}
          style={({ pressed }) => ({
            position: "absolute",
            left: place.x * scale - 22,
            top: pinY[i] * scale - 22,
            minWidth: 44,
            minHeight: 44,
            borderRadius: 24,
            borderWidth: 3,
            borderColor: "#FFF3D4",
            backgroundColor: state.visited.includes(place.id) ? "#B75C49" : "#315F54",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: "#FFF3D4", fontSize: 20, fontWeight: "800" }}>{i + 1}</Text>
        </Pressable>
      ))}
    </View>
  );
}
