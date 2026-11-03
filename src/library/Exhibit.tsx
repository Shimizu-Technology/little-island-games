import React, { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { Text } from "../components/Text";
import { C, Copy, Heading } from "../components/ui";
import { HabitatBoard, MapBoard, ReefBoard, SkyBoard } from "./ExhibitBoard";
import { EarthLabArt, Motif } from "../explore/ExploreArt";
import { LabGuidance } from "../explore/LabManipulatives";
import { FOOD_CHAIN, HABITATS, LabAction, LabState, PLACES, WATER_ACTIONS, WaterPlace } from "../explore/activities";
import { WorldId, WORLDS } from "../explore/content";
import { GuidanceKey, QUALITY_GUIDANCE } from "../explore/guidance";
import { LabAudioKey, labAudioKey } from "../explore/labAudio";
import {
  ExhibitObservation,
  canObserve,
  keepObservation,
  observationLabel,
  skyLabel,
  waterDestinations,
  waterLabels,
} from "./exhibits";

import { WordLabel } from "./WordLabel";

export type ExhibitProps = {
  world: WorldId;
  title?: string;
  state: LabState;
  onAction: (action: LabAction) => void;
  sound: boolean;
  onHear?: (key: GuidanceKey | LabAudioKey) => void;
  speaking?: string;
  limits?: string;
};

/** Keep controls flexible in a scrolling parent, including at accessibility text sizes. */
function Control({
  children,
  onPress,
  disabled = false,
  selected = false,
  hint,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityHint={hint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        s.control,
        selected && s.selected,
        disabled && s.disabled,
        pressed && !disabled && s.pressed,
        focused && s.focused,
      ]}
    >
      <Text style={[s.controlText, selected && s.selectedText]}>{children}</Text>
    </Pressable>
  );
}

const reefPoints = [
  [42, 43],
  [91, 133],
  [160, 78],
  [222, 143],
  [282, 75],
];
/** Empty rings do not reveal the next answer; only engine-accepted links acquire a picture. */
function ReefScene({ chain }: { chain: string[] }) {
  return (
    <View style={s.reefFrame}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 320 230"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Rect width={320} height={230} rx={24} fill="#DAEEE7" />
        <Path d="M0 74Q40 63 80 74T160 74T240 74T320 74V230H0Z" fill="#AED6CE" />
        <Path d="M0 200Q65 186 130 203T260 202T330 208V230H0Z" fill="#E9D5A5" />
        <G transform="translate(6,166) scale(.4)">
          <Motif name="coral" />
        </G>
        <Path d="M291 223q-16-35-4-53m7 53q-4-42 12-55" fill="none" stroke="#629180" strokeWidth={5} />
        {reefPoints.map(([x, y], i) => {
          const filled = i < chain.length;
          const next = reefPoints[i + 1];
          return (
            <G key={i}>
              {next && i < chain.length - 1 && (
                <Path d={`M${x} ${y}L${next[0]} ${next[1]}`} stroke={C.teal} strokeWidth={3} />
              )}
              <Circle
                cx={x}
                cy={y}
                r={29}
                fill={filled ? "#FFFAE9" : "#DCEBE5"}
                stroke={i === chain.length - 1 ? C.coral : "#759D91"}
                strokeWidth={i === chain.length - 1 ? 4 : 1.5}
                strokeDasharray={filled ? undefined : "4 5"}
              />
              {filled &&
                (i === 0 ? (
                  <G transform={`translate(${x - 22},${y - 22}) scale(.37)`}>
                    <Motif name="sun" />
                  </G>
                ) : i < 3 ? (
                  <G fill={i === 1 ? "#659368" : "#C9896A"} stroke={C.ink} strokeWidth={1.5}>
                    {[-12, 0, 12].map((dx, n) => (
                      <Ellipse key={dx} cx={x + dx} cy={y + (n % 2 ? -6 : 6)} rx={4} ry={9} />
                    ))}
                  </G>
                ) : (
                  <G
                    transform={`translate(${x - (i === 3 ? 18 : 25)},${y - (i === 3 ? 18 : 25)}) scale(${i === 3 ? 0.3 : 0.42})`}
                  >
                    <Motif name="fish" />
                  </G>
                ))}
            </G>
          );
        })}
        {reefPoints.slice(0, Math.max(0, chain.length - 1)).map(([x, y], i) => {
          const [nx, ny] = reefPoints[i + 1];
          return (
            <G
              key={i}
              transform={`translate(${(x + nx) / 2},${(y + ny) / 2}) rotate(${(Math.atan2(ny - y, nx - x) * 180) / Math.PI})`}
            >
              <Path d="M-5-5 2 0-5 5" fill="none" stroke={C.teal} strokeWidth={3} />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const waterPoints: Record<WaterPlace, [number, number]> = {
  ocean: [50, 166],
  vapor: [58, 53],
  cloud: [188, 43],
  rain: [274, 111],
  ground: [252, 192],
  ice: [145, 191],
};
function WaterScene({ place, act }: { place: WaterPlace; act?: (action: LabAction) => void }) {
  const { fontScale } = useWindowDimensions();
  const [expandedLabels, setExpandedLabels] = useState(false);
  const largeText = fontScale > 1.4 || expandedLabels;
  const next = waterDestinations(place);
  const [sx, sy] = waterPoints[place];
  return (
    <View style={largeText ? { width: "100%", gap: 12 } : s.waterFrame}>
      <Svg
        width="100%"
        height={largeText ? 254 : "100%"}
        viewBox="0 0 320 240"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Rect width={320} height={240} rx={24} fill="#E2EFE7" />
        <Circle cx={26} cy={27} r={18} fill="#E8C775" />
        <Path d="M0 144Q75 133 155 170L225 121 320 154V240H0Z" fill="#A9C6A0" />
        <Path d="M0 151Q51 134 99 160L124 240H0Z" fill="#7CB5BE" />
        <Path d="M181 212Q234 205 320 216V240H181Z" fill="#B68F6C" />
        {next.map((destination) => {
          const [x, y] = waterPoints[destination];
          return (
            <G key={destination}>
              <Path d={`M${sx} ${sy}L${x} ${y}`} stroke={C.teal} strokeWidth={3} strokeDasharray="5 5" />
              <G
                transform={`translate(${(sx + x) / 2},${(sy + y) / 2}) rotate(${(Math.atan2(y - sy, x - sx) * 180) / Math.PI})`}
              >
                <Path d="M-6-5 2 0-6 5" fill="none" stroke={C.teal} strokeWidth={3} />
              </G>
            </G>
          );
        })}
        <G transform={`translate(${sx + 19} ${sy - 28})`}>
          <Path d="M0-11C-4-5-9 0-9 6a9 9 0 0 0 18 0C9 0 4-5 0-11Z" fill="#367E9A" stroke="#FFF3D4" strokeWidth={2.5} />
          <Path d="M-4 5q-1 5 4 6" fill="none" stroke="#D9F1EB" strokeWidth={2} />
        </G>
        {(Object.keys(waterPoints) as WaterPlace[]).map((key) => {
          const [x, y] = waterPoints[key];
          return (
            <G key={key} opacity={key === place || next.includes(key) ? 1 : 0.5}>
              <Circle
                cx={x}
                cy={y}
                r={28}
                fill="#FFFAE9"
                stroke={key === place ? C.coral : C.teal}
                strokeWidth={key === place ? 4 : 1}
              />
              {key === "vapor" ? (
                [-10, 0, 10].map((dx) => (
                  <Path
                    key={dx}
                    d={`M${x + dx} ${y + 16}q-6-8 0-16t0-16`}
                    fill="none"
                    stroke="#527D85"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                ))
              ) : key === "cloud" || key === "rain" ? (
                <G>
                  <Path
                    d={`M${x - 17} ${y + 2}q-7-12 6-12q7-15 18-5q16-3 17 11q0 11-17 9H${x - 17}`}
                    fill="#A4CAD0"
                    stroke="#527D85"
                    strokeWidth={1.5}
                  />
                  {key === "rain" &&
                    [-9, 0, 9].map((dx) => (
                      <Path key={dx} d={`M${x + dx} ${y + 9}l-3 8`} stroke="#527D85" strokeWidth={2} />
                    ))}
                </G>
              ) : key === "ice" ? (
                <Rect
                  x={x - 15}
                  y={y - 15}
                  width={30}
                  height={30}
                  rx={6}
                  fill="#B4DDE4"
                  stroke="#527D85"
                  strokeWidth={2}
                />
              ) : key === "ground" ? (
                <G>
                  <Path d={`M${x - 19} ${y - 12}h38v29h-38Z`} fill="#B68F6C" />
                  <Path
                    d={`M${x - 16} ${y}q8 6 16 0t16 0m-32 9q8 6 16 0t16 0`}
                    fill="none"
                    stroke="#367E9A"
                    strokeWidth={3}
                  />
                </G>
              ) : (
                <Path d={`M${x - 20} ${y}q10-8 20 0t20 0v15h-40Z`} fill="#73B6C9" stroke="#527D85" strokeWidth={2} />
              )}
            </G>
          );
        })}
      </Svg>
      {act &&
        (Object.keys(waterPoints) as WaterPlace[]).map((key) => {
          const [x, y] = waterPoints[key];
          const choice = WATER_ACTIONS[place].find((entry) => entry.next === key);
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={choice?.label ?? `${waterLabels[key]}${place === key ? " · you are here" : ""}`}
              accessibilityState={{ selected: place === key, disabled: !choice }}
              aria-selected={place === key}
              disabled={!choice}
              onPress={() => {
                if (choice) act({ type: "water", action: choice.action });
              }}
              style={({ pressed }) => ({
                position: largeText ? "relative" : "absolute",
                left: largeText ? undefined : `${((x - 27) / 320) * 100}%`,
                top: largeText ? undefined : `${((y - 27) / 240) * 100}%`,
                width: largeText ? "100%" : "17%",
                height: largeText ? undefined : "23%",
                minHeight: 44,
                minWidth: 44,
                borderRadius: 30,
                borderWidth: choice ? 3 : 0,
                borderColor: "#315F54",
                backgroundColor: pressed ? "#FFF3D188" : "transparent",
                justifyContent: "flex-end",
                alignItems: "center",
              })}
            >
              <WordLabel onWordLayout={(event) => setExpandedLabels(event.nativeEvent.layout.height > 22)}
                style={{ width: largeText ? "100%" : 110, maxWidth: largeText ? "100%" : 110, backgroundColor: "#FFF5DC",
                paddingHorizontal: 3, borderRadius: 5, top: largeText ? 0 : 16 }}
                textStyle={{ fontSize: 12, fontWeight: "700", color: C.ink }}>
                {waterLabels[key]}
              </WordLabel>
            </Pressable>
          );
        })}
    </View>
  );
}

const introductions: Record<WorldId, string> = {
  oceans:
    "Build one possible ocean food chain. Start with the energy source, then choose who receives that energy next.",
  weather:
    "Move a drop through water's different states. Choose an action, watch what changes, and try a different route.",
  space: "Turn Earth while the Sun stays on the left. Follow the coral-colored dot: it marks one place on Earth.",
  animals: "Find a suitable habitat for each animal. Think about food, water, shelter, and space.",
  world: "Follow a clue around the world. North is up on this map. Tap a numbered map pin.",
};

function Picture({ world, state }: { world: WorldId; state: LabState }) {
  if (world === "oceans") return <ReefScene chain={state.chain} />;
  if (world === "weather") return <WaterScene place={state.water} />;
  return <EarthLabArt turn={state.turn} />;
}

/** Controlled, untimed native exhibit. The caller owns validated LabState and audio lifecycle.
 * Give this component a vertical scroll parent; it deliberately does not own navigation or Store.
 */
export function Exhibit(props: ExhibitProps) {
  // Changing worlds discards visit-only UI without resetting the parent's engine state.
  return <ExhibitVisit key={props.world} {...props} />;
}

function ExhibitVisit({ world, title, state, onAction, sound, onHear, speaking, limits }: ExhibitProps) {
  const [help, setHelp] = useState(false);
  const [observations, setObservations] = useState<ExhibitObservation[]>([]);
  const observable = canObserve(world);
  const guidance: GuidanceKey = `lab-${world}`;
  const oldHabitatMessage =
    world === "animals" && !state.habitatFeedback && HABITATS.some((animal) => animal.why === state.message);
  const message = oldHabitatMessage ? "" : state.message;
  const audio = labAudioKey(message);
  const animalDone = state.habitat === HABITATS.length && !state.habitatFeedback;
  const mapDone = state.expedition === PLACES.length;
  const summary =
    world === "space"
      ? skyLabel(state.turn)
      : world === "oceans"
        ? state.chain.length
          ? state.chain.join(" → ")
          : `0 / ${FOOD_CHAIN.length} links`
        : world === "weather"
          ? waterLabels[state.water]
          : world === "animals"
            ? `${state.matched.length} of ${HABITATS.length} habitats found`
            : `${state.visited.length} of ${PLACES.length} destinations found`;
  const currentObservationLabel = observable ? observationLabel({ version: 1, world, state }) : "";
  const alreadyKept = observations.some(
    (observation) => observation.world === world && observationLabel(observation) === currentObservationLabel
  );

  return (
    <View style={s.exhibit}>
      <Heading style={s.title}>{title ?? WORLDS.find((entry) => entry.id === world)?.activity}</Heading>
      {world === "world" && !mapDone && (
        <View style={s.notebook}>
          <Copy>{PLACES[state.expedition].clue}</Copy>
          <Text style={s.caption}>{PLACES.map((place, i) => `${i + 1} ${place.name}`).join(" · ")}</Text>
        </View>
      )}
      {observable && (
        <View style={[s.picture, world === "space" && s.sky]}>
          {world === "space" ? (
            <SkyBoard state={state} act={onAction} />
          ) : world === "oceans" ? (
            <ReefBoard state={state} act={onAction} />
          ) : (
            <WaterScene place={state.water} act={onAction} />
          )}
        </View>
      )}
      {!observable &&
        !(world === "animals" ? animalDone : mapDone) &&
        (world === "animals" ? (
          <HabitatBoard state={state} act={onAction} />
        ) : (
          <MapBoard state={state} act={onAction} />
        ))}
      <View style={s.row}>
        {onHear && (
          <Control disabled={!sound} onPress={() => onHear(guidance)}>
            Hear instructions
          </Control>
        )}
      </View>
      <View accessibilityLiveRegion="polite" style={s.status}>
        <Text style={s.summary}>{summary}</Text>
        {world === "space" && (
          <Copy>
            Half of Earth faces sunlight. The other half faces away. This view looks down from above the North Pole.
          </Copy>
        )}
        {!!message && <Copy>{message}</Copy>}
        {!!audio && onHear && (
          <Control disabled={!sound} onPress={() => onHear(audio)}>
            {speaking === audio ? "Hear this again" : "Hear this"}
          </Control>
        )}
      </View>

      {world === "space" ? (
        <View style={s.row}>
          <Control onPress={() => onAction({ type: "turn", by: -1 })} hint="Move the place dot one step backward.">
            Turn back
          </Control>
          <Control
            onPress={() => onAction({ type: "turn", by: 1 })}
            hint="Move the place dot one eighth of a full turn."
          >
            Turn Earth ⅛
          </Control>
          <Copy>Eight steps make one whole turn. The real Earth takes about a day.</Copy>
        </View>
      ) : world === "animals" && animalDone ? (
        <Copy>You found a suitable place for each animal.</Copy>
      ) : world === "world" && mapDone ? (
        <Copy>You found Guam, Japan, Australia, Africa, and Antarctica. Start again to revisit the route.</Copy>
      ) : null}

      {world === "oceans" && (
        <Control disabled={!state.chain.length} onPress={() => onAction({ type: "unchain" })}>
          Remove last link
        </Control>
      )}
      {world === "weather" && (
        <View style={s.notebook}>
          <Text style={s.caption}>Your recent journey</Text>
          <Copy>{state.journey.map((place) => waterLabels[place]).join(" → ")}</Copy>
        </View>
      )}
      {world === "animals" && state.habitatFeedback && (
        <Control onPress={() => onAction({ type: "next-animal" })}>
          {state.habitat === HABITATS.length ? "See all matches" : "Next animal"}
        </Control>
      )}

      {observable && (
        <View style={s.notebook}>
          <Heading style={s.subheading}>Compare observations</Heading>
          <Copy>Keep two pictures for this visit. Leaving this exhibit clears them.</Copy>
          <View style={s.row}>
            <Control
              disabled={alreadyKept}
              hint="Keep this picture beside your other observation. A third replaces the oldest."
              onPress={() => setObservations((previous) => keepObservation(previous, world, state))}
            >
              {alreadyKept ? "Observation kept" : "Keep this observation"}
            </Control>
            {observations.length > 0 && <Control onPress={() => setObservations([])}>Clear observations</Control>}
          </View>
          <View style={s.comparison}>
            {observations.map((observation, i) => (
              <View key={i} style={s.observation}>
                <Text style={s.caption}>{`Observation ${i + 1}`}</Text>
                <Picture world={observation.world} state={observation.state} />
                <Copy>{observationLabel(observation)}</Copy>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={s.row}>
        <Control
          onPress={() => onAction({ type: "reset" })}
          hint="Start this model again. Kept observations remain available for comparison."
        >
          Reset model
        </Control>
        <Control selected={help} onPress={() => setHelp((visible) => !visible)}>
          {help ? "Hide hints" : "Hints & word help"}
        </Control>
      </View>
      {help && (
        <View style={s.notebook}>
          <Copy>{introductions[world]}</Copy>
          <Copy>{QUALITY_GUIDANCE[guidance]}</Copy>
          <LabGuidance world={world} sound={sound} onSpeak={onHear} speaking={speaking} />
        </View>
      )}
      {!sound && <Copy>Sound is off. The directions and word help are here to read.</Copy>}
      {!!limits && (
        <View style={s.notebook}>
          <Heading style={s.subheading}>About this model</Heading>
          <Copy>{limits}</Copy>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  exhibit: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    padding: 8,
    gap: 16,
    backgroundColor: C.cream,
    borderRadius: 24,
  },
  title: { fontSize: 28 },
  subheading: { fontSize: 21 },
  picture: { borderRadius: 24, overflow: "hidden", backgroundColor: "#DAEEE7" },
  reefFrame: { width: "100%", aspectRatio: 320 / 230, maxHeight: 440 },
  waterFrame: { width: "100%", aspectRatio: 320 / 240, maxWidth: 720, alignSelf: "center" },
  sky: { backgroundColor: "#283E59" },
  status: { gap: 10, backgroundColor: "#FFF3D4", borderRadius: 18, padding: 16 },
  summary: { fontSize: 19, fontWeight: "700", color: C.ink },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  control: {
    minHeight: 48,
    minWidth: 48,
    maxWidth: "100%",
    flexShrink: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: C.paper,
    borderWidth: 2,
    borderColor: C.teal,
    borderRadius: 18,
    justifyContent: "center",
  },
  controlText: { fontSize: 17, fontWeight: "700", color: C.teal, textAlign: "center" },
  selected: { backgroundColor: C.teal },
  selectedText: { color: C.paper },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
  focused: { outlineColor: C.teal, outlineWidth: 3, outlineStyle: "solid", outlineOffset: 3 },
  notebook: { padding: 14, gap: 12, backgroundColor: "#EDF1E5", borderRadius: 20 },
  caption: { fontSize: 16, fontWeight: "700", color: C.ink },
  comparison: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  observation: {
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 0,
    maxWidth: "100%",
    gap: 8,
    padding: 10,
    backgroundColor: C.paper,
    borderRadius: 16,
  },
});
