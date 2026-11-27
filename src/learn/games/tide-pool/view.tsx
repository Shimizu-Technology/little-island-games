import { BoardColumns, useBoardColumns, useBoardGeometry } from '../../BoardSpace';
import { SCHOOL_BOARD_MIN } from '../../boardGeometry';
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { Button, C, Copy, Heading, IconButton, PressableScale } from "../../../components/ui";
import { easeInOut, nativeDriver, useReducedMotion } from "../../../components/motion";
import type { BoardProps } from "../../types";
import { CoachSpot } from "../../Coach";
import { AnswerTile } from "../../AnswerTile";
import { LARGE_TEXT, wordFitMultiplier } from "../../../components/wordFit";
import { useStepReveal } from "../../stepReveal";
import {
  answer,
  current,
  guesser,
  happy,
  isVoicedMission,
  makeChange,
  needFor,
  nextMission,
  sceneForMission,
  toggle,
  upgrade,
  type AnswerPicture,
  type Control,
  type Creature,
  type LegacyTideState,
  type MissionId,
  type TideSave,
  type TideState,
} from "./engine";
import {
  isTideClassify,
  tideClassifyCheck,
  tideClassifyDone,
  tideClassifyHelp,
  tideClassifyMission,
  tideClassifyNext,
  tideClassifyPlace,
  tideClassifyReady,
  tideClassifyTurn,
  type TideClassifyState,
} from "./missions";
export function CreatureArt({
  kind,
  size = 48,
  pale = false,
  facing = 0,
}: {
  kind: Creature;
  size?: number;
  pale?: boolean;
  facing?: number;
}) {
  const coral = pale ? "#F5EBDD" : C.coral;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      accessible
      accessibilityLabel={kind.replace("-", " ") + (pale ? ", pale" : "")}
    >
      <G rotation={kind === "crab" ? facing * 90 : 0} origin="40,40">
        {kind === "coral" ? (
          <G>
            {pale && (
              <Path
                d="M39 70V18 M39 44L19 32V18 M39 56L60 39V22 M39 29L52 15 M19 32L8 26 M60 39L70 28"
                stroke="#BFAE98"
                strokeWidth="14"
                strokeLinecap="round"
                fill="none"
              />
            )}
            <Path
              d="M39 70V18 M39 44L19 32V18 M39 56L60 39V22 M39 29L52 15 M19 32L8 26 M60 39L70 28"
              stroke={coral}
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
            />
          </G>
        ) : kind === "seaweed" ? (
          <G>
            <Path
              d="M24 73Q5 53 25 37T26 6 M41 74Q63 55 42 38T45 9 M58 72Q76 53 61 42T64 19"
              stroke={C.teal}
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
          </G>
        ) : kind === "fish" ? (
          <G>
            <Path d="M53 38L74 19V60Z" fill={C.gold} />
            <Ellipse cx="33" cy="40" rx="27" ry="20" fill={C.blue} />
            <Circle cx="20" cy="35" r="4" fill={C.paper} />
            <Circle cx="20" cy="35" r="2" fill={C.ink} />
          </G>
        ) : kind === "sea-star" ? (
          <Path
            d="M40 6L49 28L73 31L54 47L61 73L40 57L18 73L25 47L6 31L31 28Z"
            fill={C.coral}
            stroke={C.ink}
            strokeWidth="2"
          />
        ) : kind === "snail" ? (
          <G>
            <Path d="M7 61Q37 48 67 55L74 65H8Z" fill={C.gold} />
            <Circle cx="38" cy="41" r="25" fill="#B98E67" />
            <Path d="M49 45Q54 22 35 25T26 48Q32 57 40 48" stroke={C.cream} strokeWidth="4" fill="none" />
            <Path d="M65 56V42M73 58V43" stroke={C.ink} strokeWidth="3" />
          </G>
        ) : (
          <G>
            <Path
              d="M21 43L9 35L5 20 M59 43L71 35L75 20 M21 52L7 60 M22 60L11 72 M59 52L73 60 M58 60L69 72"
              stroke={C.coral}
              strokeWidth="6"
              strokeLinecap="round"
            />
            <Ellipse cx="40" cy="49" rx="25" ry="19" fill={C.coral} />
            <Path d="M28 34V23M52 34V23" stroke={C.ink} strokeWidth="4" />
            <Circle cx="28" cy="21" r="5" fill={C.ink} />
            <Circle cx="52" cy="21" r="5" fill={C.ink} />
            <Path d="M31 51Q40 58 49 51" stroke={C.cream} strokeWidth="3" fill="none" />
          </G>
        )}
      </G>
    </Svg>
  );
}
/** Small, instantly nameable answer pictures. */
export function AnswerArt({ picture, size = 64 }: { picture: AnswerPicture; size?: number }) {
  if (picture === "fish" || picture === "sea-star" || picture === "seaweed")
    return <CreatureArt kind={picture} size={size} />;
  if (picture === "pale-coral") return <CreatureArt kind="coral" pale size={size} />;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {picture === "algae" ? (
        <G>
          <Path d="M8 66Q8 34 40 30Q72 34 72 66Z" fill="#9AA29C" stroke={C.ink} strokeWidth="2" />
          <Path
            d="M14 46Q20 36 28 42Q34 32 42 40Q50 31 56 40Q64 34 68 46Q58 44 50 48Q40 42 32 48Q22 43 14 46Z"
            fill="#5FA05A"
          />
          {[20, 32, 44, 56].map((x) => (
            <Path
              key={x}
              d={`M${x} 44l-2 -7M${x + 4} 44l1 -8`}
              stroke="#3E7E3B"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </G>
      ) : picture === "sand" ? (
        <G>
          <Path d="M4 68Q22 34 40 34Q58 34 76 68Z" fill="#E4C88F" stroke="#B89A5E" strokeWidth="2" />
          {[
            [24, 56],
            [36, 48],
            [48, 58],
            [56, 50],
            [30, 62],
          ].map(([x, y]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r="1.8" fill="#A9864D" />
          ))}
        </G>
      ) : picture === "shell" ? (
        <G>
          <Path
            d="M14 58Q8 30 36 18Q62 10 68 34Q72 56 46 64Q28 70 14 58Z"
            fill="#F2CBB0"
            stroke="#B5694E"
            strokeWidth="2.5"
          />
          <Path d="M50 38Q48 28 38 30Q28 34 32 46Q36 54 46 50" fill="none" stroke="#B5694E" strokeWidth="2.5" />
          <Ellipse cx="30" cy="54" rx="9" ry="6" fill="#5A3A2C" />
        </G>
      ) : picture === "sun" ? (
        <G>
          {Array.from({ length: 8 }, (_, i) => (
            <Path
              key={i}
              d="M40 6V16"
              stroke={C.gold}
              strokeWidth="5"
              strokeLinecap="round"
              rotation={i * 45}
              origin="40,40"
            />
          ))}
          <Circle cx="40" cy="40" r="17" fill={C.gold} />
        </G>
      ) : picture === "cloud" ? (
        <Path
          d="M18 58Q4 58 6 46Q8 34 22 36Q24 20 42 22Q58 22 60 36Q76 36 74 48Q72 58 60 58Z"
          fill="#8E9AA0"
          stroke="#5C676C"
          strokeWidth="2"
        />
      ) : picture === "water" ? (
        <G>
          <Path d="M40 8Q22 34 22 48A18 18 0 0 0 58 48Q58 34 40 8Z" fill="#5DA9C2" stroke={C.blue} strokeWidth="2" />
          <Path d="M32 50Q32 58 40 60" stroke="#D9F0F5" strokeWidth="3" fill="none" strokeLinecap="round" />
        </G>
      ) : picture === "air" ? (
        <G stroke="#7FA9BC" strokeWidth="5" strokeLinecap="round" fill="none">
          <Path d="M8 30H50Q62 30 60 20Q56 12 48 18" />
          <Path d="M8 44H62Q74 44 72 54Q68 62 60 56" />
          <Path d="M14 58H38" />
        </G>
      ) : picture === "low" || picture === "deep" ? (
        <G>
          <Ellipse cx="40" cy="52" rx="36" ry="20" fill="#B39B7F" />
          <Ellipse
            cx="40"
            cy={picture === "deep" ? 48 : 58}
            rx={picture === "deep" ? 33 : 24}
            ry={picture === "deep" ? 17 : 8}
            fill="#5DA9C2"
          />
          {picture === "deep" && (
            <Path
              d="M40 6V26M32 18L40 26L48 18"
              stroke={C.blue}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              transform="rotate(180 40 16)"
            />
          )}
          {picture === "low" && (
            <Path d="M40 6V26M32 18L40 26L48 18" stroke={C.blue} strokeWidth="4" fill="none" strokeLinecap="round" />
          )}
        </G>
      ) : (
        <G>
          <Path
            d="M40 76V30M40 56L20 44V30M40 66L60 50V34M40 40L54 26"
            stroke={C.coral}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <Path d="M64 20V4M57 11L64 4L71 11" stroke={C.teal} strokeWidth="4" fill="none" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}
/** Coral with a face that smiles when it has what it needs. */
function Coral({ size, happy, pale }: { size: number; happy: boolean; pale: boolean }) {
  return (
    <View style={{ width: size, height: size }}>
      <CreatureArt kind="coral" size={size} pale={pale} />
      <Svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        style={{ position: "absolute" }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Circle cx="39" cy="48" r="13" fill={pale ? "#F5EBDD" : C.coral} />
        <Circle cx="34" cy="45" r="2.4" fill={C.ink} />
        <Circle cx="44" cy="45" r="2.4" fill={C.ink} />
        <Path
          d={happy ? "M33 51Q39 57 45 51" : "M33 55Q39 49 45 55"}
          stroke={C.ink}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
function Thermometer({ warm, size = 34 }: { warm: boolean; size?: number }) {
  return (
    <Svg
      width={size * 0.6}
      height={size}
      viewBox="0 0 24 40"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Rect x="8" y="2" width="8" height="28" rx="4" fill="#FFF" stroke={C.ink} strokeWidth="1.5" />
      <Rect x="10" y={warm ? 6 : 20} width="4" height={warm ? 24 : 10} fill={warm ? "#D9553C" : "#4F8FC0"} />
      <Circle cx="12" cy="32" r="6" fill={warm ? "#D9553C" : "#4F8FC0"} stroke={C.ink} strokeWidth="1.5" />
    </Svg>
  );
}
type Look = { sun: boolean; cool: boolean; high: boolean };
/**
 * The pool and its creatures. `p` runs 0→1 while a change happens; every mission animates its own story
 * (the snail slides to the rock, the hermit crab moves into the shell, the water drops, the coral pales).
 */
export function PoolScene({
  mission,
  watched,
  look,
  p,
  width,
}: {
  mission: MissionId;
  watched: boolean;
  look: Look;
  p: Animated.Value;
  width: number;
}) {
  const side = useBoardColumns(), sceneWidth = side ? width * .46 : width;
  const geometry = useBoardGeometry('tide-pool', Math.min(sceneWidth, 420) * 0.53, SCHOOL_BOARD_MIN['tide-pool']);
  const W = Math.min(sceneWidth, 420, geometry.height / 0.53),
    H = W * 0.53,
    k = W / 320;
  const at = (x: number, y: number, size: number) => ({
    position: "absolute" as const,
    left: x * k - (size * k) / 2,
    top: y * k - (size * k) / 2,
  });
  const over = (from: number, to: number) => p.interpolate({ inputRange: [0, from, to, 1], outputRange: [0, 0, 1, 1] });
  // Sun and tide during a mission's story.
  const sunNow = mission === "seaweed" ? watched : look.sun;
  const highNow = mission === "tide" ? !watched : look.high;
  const lowWater = mission === "tide" ? over(0.1, 0.7) : new Animated.Value(highNow ? 0 : 1);
  const label =
    mission === "snail"
      ? watched
        ? "The snail is eating the green fuzz on the rock."
        : "A rock with green fuzz, a fish and sand."
      : mission === "crab"
        ? watched
          ? "The hermit crab moved into the empty shell."
          : "An empty shell, a sea star and seaweed."
        : mission === "coral"
          ? `The coral looks ${happy(look) ? "happy" : "sad"}. ${look.sun ? "Sunny" : "Cloudy"}, ${look.cool ? "usual reef temperature" : "too hot"} water, tide ${look.high ? "in" : "out"}.`
          : mission === "seaweed"
            ? watched
              ? "The sun is out and the seaweed grew tall."
              : "Clouds hide the sun. The seaweed is small."
            : mission === "tide"
              ? watched
                ? "The tide went out. The pool is shallow."
                : "The tide is in. The pool is deep."
              : mission === "fish"
                ? watched
                  ? "The fish swims and breathes in the water."
                  : "A pool of water with no fish yet."
                : watched
                  ? "The water got hot and the coral turned white."
                  : "Bright coral at its usual reef temperature.";
  return (
    <View testID={geometry.testID} onLayout={geometry.onLayout}
      accessible
      accessibilityLabel={label}
      style={{
        width: W,
        height: H,
        alignSelf: "center",
        overflow: "hidden",
        borderRadius: 20,
        backgroundColor: sunNow ? "#F7E7BA" : "#D7DFE2",
      }}
    >
      <Svg width={W} height={H} viewBox="0 0 320 170" style={{ position: "absolute" }}>
        <Rect x="0" y="52" width="320" height="118" fill="#EED9A8" />
        <Ellipse cx="160" cy="114" rx="152" ry="52" fill="#B39B7F" />
        <Ellipse cx="160" cy="128" rx="122" ry="24" fill="#8EC6CD" />
      </Svg>
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          opacity: lowWater.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        }}
      >
        <Svg width={W} height={H} viewBox="0 0 320 170">
          <Ellipse cx="160" cy="110" rx="140" ry="44" fill="#8EC6CD" />
          <Path d="M40 104Q62 90 80 106M230 112Q250 98 268 112" fill="none" stroke="#CFEAEC" strokeWidth="4" />
        </Svg>
      </Animated.View>
      {/* Sun or cloud */}
      <View style={at(284, 26, 40)}>
        <AnswerArt picture="sun" size={40 * k} />
      </View>
      {mission === "seaweed" ? (
        <Animated.View
          style={[
            at(278, 28, 56),
            {
              opacity: over(0, 0.6).interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ translateX: over(0, 0.6).interpolate({ inputRange: [0, 1], outputRange: [0, 60 * k] }) }],
            },
          ]}
        >
          <AnswerArt picture="cloud" size={56 * k} />
        </Animated.View>
      ) : (
        !look.sun && (
          <View style={at(278, 28, 56)}>
            <AnswerArt picture="cloud" size={56 * k} />
          </View>
        )
      )}
      {(mission === "coral" || mission === "heat") && (
        <View style={[at(26, 26, 34), { flexDirection: "row" }]}>
          {mission === "heat" ? (
            <>
              <Animated.View
                style={{
                  position: "absolute",
                  opacity: over(0, 0.4).interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                }}
              >
                <Thermometer warm={false} size={34 * k} />
              </Animated.View>
              <Animated.View style={{ opacity: over(0, 0.4) }}>
                <Thermometer warm size={34 * k} />
              </Animated.View>
            </>
          ) : (
            <Thermometer warm={!look.cool} size={34 * k} />
          )}
        </View>
      )}
      {/* Rock with green fuzz (snail mission) */}
      {mission === "snail" && (
        <View style={at(84, 112, 64)}>
          <Svg width={64 * k} height={64 * k} viewBox="0 0 80 80">
            <Path d="M8 66Q8 34 40 30Q72 34 72 66Z" fill="#9AA29C" stroke={C.ink} strokeWidth="2" />
          </Svg>
          <Animated.View
            style={{
              position: "absolute",
              opacity: over(0.55, 1).interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            }}
          >
            <AnswerArt picture="algae" size={64 * k} />
          </Animated.View>
        </View>
      )}
      {mission === "snail" && (
        <Animated.View
          style={[
            at(20, 126, 46),
            {
              transform: [
                { translateX: over(0, 0.55).interpolate({ inputRange: [0, 1], outputRange: [0, 64 * k] }) },
                { translateY: over(0, 0.55).interpolate({ inputRange: [0, 1], outputRange: [0, -8 * k] }) },
              ],
            },
          ]}
        >
          <CreatureArt kind="snail" size={46 * k} />
        </Animated.View>
      )}
      {mission === "crab" && (
        <>
          <View style={at(112, 128, 38)}>
            <CreatureArt kind="sea-star" size={38 * k} />
          </View>
          <View style={at(60, 104, 52)}>
            <CreatureArt kind="seaweed" size={52 * k} />
          </View>
          <View style={at(214, 128, 46)}>
            <AnswerArt picture="shell" size={46 * k} />
          </View>
          <Animated.View
            style={[
              at(350, 126, 40),
              {
                transform: [
                  { translateX: over(0, 0.7).interpolate({ inputRange: [0, 1], outputRange: [0, -128 * k] }) },
                  { scale: over(0.7, 1).interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) },
                ],
              },
            ]}
          >
            <CreatureArt kind="crab" size={40 * k} facing={3} />
          </Animated.View>
        </>
      )}
      {(mission === "seaweed" || mission === "coral" || mission === "tide") && (
        <Animated.View
          style={[
            at(110, 104, 56),
            mission === "seaweed" && {
              transform: [
                { translateY: over(0.4, 1).interpolate({ inputRange: [0, 1], outputRange: [14 * k, 0] }) },
                { scaleY: over(0.4, 1).interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] }) },
              ],
            },
          ]}
        >
          <CreatureArt kind="seaweed" size={56 * k} />
        </Animated.View>
      )}
      {(mission === "coral" || mission === "heat") && (
        <View style={at(228, 104, 70)}>
          {mission === "heat" ? (
            <>
              <Animated.View
                style={{
                  position: "absolute",
                  opacity: over(0.3, 1).interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                }}
              >
                <CreatureArt kind="coral" size={70 * k} />
              </Animated.View>
              <Animated.View style={{ opacity: over(0.3, 1) }}>
                <CreatureArt kind="coral" pale size={70 * k} />
              </Animated.View>
            </>
          ) : (
            <Coral size={70 * k} happy={happy(look)} pale={!look.cool} />
          )}
        </View>
      )}
      {mission === "tide" && (
        <>
          <View style={at(150, 134, 34)}>
            <CreatureArt kind="sea-star" size={34 * k} />
          </View>
          <View style={at(196, 128, 40)}>
            <CreatureArt kind="fish" size={40 * k} />
          </View>
        </>
      )}
      {(mission === "snail" || mission === "seaweed" || mission === "coral") && (
        <View style={at(176, 112, 40)}>
          <CreatureArt kind="fish" size={40 * k} />
        </View>
      )}
      {mission === "fish" && (
        <Animated.View
          style={[
            at(-40, 110, 50),
            {
              transform: [{ translateX: over(0, 0.6).interpolate({ inputRange: [0, 1], outputRange: [0, 200 * k] }) }],
            },
          ]}
        >
          <CreatureArt kind="fish" size={50 * k} />
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                left: -2 * k + i * 6 * k,
                top: 8 * k,
                width: 7 * k,
                height: 7 * k,
                borderRadius: 4 * k,
                borderWidth: 1.5,
                borderColor: "#FFF",
                opacity: over(0.6, 0.8),
                transform: [
                  { translateY: over(0.6, 1).interpolate({ inputRange: [0, 1], outputRange: [0, -(16 + i * 8) * k] }) },
                ],
              }}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}
const controlArt: Record<Control, [React.ReactNode, React.ReactNode, string, string]> = {
  sun: [
    <AnswerArt key="s" picture="sun" size={36} />,
    <AnswerArt key="c" picture="cloud" size={36} />,
    "Sunny",
    "Cloudy",
  ],
  cool: [<Thermometer key="c" warm={false} size={36} />, <Thermometer key="w" warm size={36} />, "Usual reef temperature", "Too hot"],
  high: [
    <AnswerArt key="d" picture="deep" size={36} />,
    <AnswerArt key="l" picture="low" size={36} />,
    "Tide in",
    "Tide out",
  ],
};
export function Board(props: BoardProps<TideSave>) {
  if (isTideClassify(props.session.state)) {
    return <TideClassifyBoard {...props} session={{ ...props.session, state: props.session.state }} />;
  }
  return (
    <ClassicTideBoard
      {...props}
      session={{ ...props.session, state: props.session.state as TideState | LegacyTideState }}
    />
  );
}

/** Levels 4–5 native multi-rule habitat & trait classification board right at the tide pool. */
function TideClassifyBoard({
  session,
  update,
  practice,
  assistance,
  sound,
  width,
  active,
  coach,
  cheer,
}: BoardProps<TideSave> & { session: { state: TideClassifyState } }) {
  const s = session.state;
  const o = session.options;
  const m = tideClassifyMission(s);
  const [p] = useState(() => new Animated.Value(1));
  useStepReveal(s.index);

  if (tideClassifyDone(s) || !m) {
    return (
      <View style={{ gap: 12, alignItems: "center", padding: 12 }}>
        <PoolScene mission="coral" watched look={{ sun: true, cool: true, high: true }} p={p} width={width} />
        <Heading style={{ textAlign: "center" }}>Every reef habitat sorted!</Heading>
        <Copy style={{ color: C.ink, textAlign: "center" }}>
          You classified all {s.ids.length} Level {s.level} tide-pool missions.
        </Copy>
      </View>
    );
  }

  const ready = tideClassifyReady(s);
  const who = session.names?.[tideClassifyTurn(s)] ?? `Player ${tideClassifyTurn(s) + 1}`;
  const counts: [number, number] = [
    s.placed.filter((b) => b === 0).length,
    s.placed.filter((b) => b === 1).length,
  ];

  function check() {
    if (!active || !ready || !m) return;
    const next = tideClassifyCheck(s);
    if (next === s) return;
    if (coach.active) coach.done();
    if (!s.missed && !s.helped) {
      practice(m.skill, next.solved);
      practice("sci.predict", next.solved);
    }
    if (next.solved) cheer(s.index === s.ids.length - 1 ? "big" : "right");
    else sound("tap");
    update(next);
  }

  return (
    <View style={{ gap: 10, maxWidth: 620, width: "100%", alignSelf: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Copy style={{ fontSize: 13, fontWeight: "800", color: C.muted }}>
          {o.mode === "together" ? `${who}’s mission · ` : ""}Mission {s.index + 1} of {s.ids.length}
        </Copy>
        {!s.solved && !s.helped && (
          <Button
            compact
            quiet
            disabled={!active}
            style={{ minHeight: 48 }}
            onPress={() => {
              if (!active) return;
              assistance?.();
              update(tideClassifyHelp(s));
            }}
          >
            Rule clue
          </Button>
        )}
      </View>

      <BoardColumns
        drawing={
          <View style={{ gap: 8 }}>
            <PoolScene mission="coral" watched look={{ sun: true, cool: true, high: true }} p={p} width={width} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {m.buckets.map((bucket, idx) => (
                <View
                  key={`${m.id}-b-${idx}`}
                  style={{
                    flex: 1,
                    backgroundColor: idx === 0 ? "#E4F1F4" : C.soft,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: idx === 0 ? C.teal : C.gold,
                    padding: 8,
                    gap: 2,
                  }}
                >
                  <Copy style={{ fontSize: 14, fontWeight: "900", color: C.ink }}>
                    {bucket.label} ({counts[idx]})
                  </Copy>
                  <Copy style={{ fontSize: 12, color: C.muted }}>{bucket.rule}</Copy>
                </View>
              ))}
            </View>
          </View>
        }
      >
        <View
          style={{
            backgroundColor: C.paper,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: C.line,
            padding: 12,
            gap: 4,
          }}
        >
          <Heading style={{ fontSize: 18 }}>{m.title}</Heading>
          <Copy style={{ fontSize: 15, color: C.ink, fontWeight: "600" }}>{m.prompt}</Copy>
        </View>

        {s.helped && !s.solved && (
          <View
            accessibilityLiveRegion="polite"
            style={{
              backgroundColor: C.soft,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: C.gold,
              padding: 10,
            }}
          >
            <Copy style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>{m.hint}</Copy>
          </View>
        )}

        {s.checkedWrong && !s.solved && (
          <Copy accessibilityLiveRegion="polite" style={{ fontSize: 14, fontWeight: "800", color: C.coral }}>
            Some creatures are in the wrong bucket — check the highlighted cards against both rules!
          </Copy>
        )}

        <CoachSpot active={coach.active && !s.solved} handAt="none">
          <View style={{ gap: 8 }}>
            {m.specimens.map((sp, i) => {
              const assigned = s.placed[i];
              const isWrongAfterCheck = s.checkedWrong && assigned !== null && assigned !== sp.bucket;
              const isRight = s.solved;
              return (
                <View
                  key={`${m.id}-${sp.id}`}
                  style={{
                    backgroundColor: isRight ? C.success : isWrongAfterCheck ? C.coralFill : C.paper,
                    borderRadius: 16,
                    borderWidth: isRight || isWrongAfterCheck ? 2.5 : 2,
                    borderColor: isRight ? C.teal : isWrongAfterCheck ? C.coral : C.line,
                    padding: 10,
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <CreatureArt kind={sp.creature} size={42} />
                    <View style={{ flex: 1 }}>
                      <Copy style={{ fontSize: 15, fontWeight: "800", color: C.ink }}>{sp.name}</Copy>
                      <Copy style={{ fontSize: 13, color: C.muted }}>{sp.traits}</Copy>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {([0, 1] as const).map((bucketIdx) => {
                      const selected = assigned === bucketIdx;
                      return (
                        <PressableScale
                          key={bucketIdx}
                          accessibilityRole="button"
                          accessibilityLabel={`Sort ${sp.name} into ${m.buckets[bucketIdx].label}`}
                          accessibilityState={{ selected, disabled: !active || s.solved }}
                          disabled={!active || s.solved}
                          onPress={() => {
                            if (!active || s.solved) return;
                            if (coach.active) coach.done();
                            sound("tap");
                            update(tideClassifyPlace(s, i, bucketIdx));
                          }}
                          style={{
                            flex: 1,
                            minHeight: 48,
                            borderRadius: 12,
                            borderWidth: selected ? 2.5 : 1.5,
                            borderColor: selected ? (bucketIdx === 0 ? C.teal : C.coral) : C.line,
                            backgroundColor: selected ? (bucketIdx === 0 ? "#DDF0EE" : C.soft) : C.cream,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Copy
                            style={{
                              fontSize: 13,
                              fontWeight: selected ? "900" : "700",
                              color: C.ink,
                              textAlign: "center",
                            }}
                          >
                            {selected ? "✓ " : ""}
                            {m.buckets[bucketIdx].label}
                          </Copy>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </CoachSpot>

        {!s.solved ? (
          <Button disabled={!active || !ready} onPress={check}>
            Check sort
          </Button>
        ) : (
          <View
            accessibilityLiveRegion="polite"
            style={{
              backgroundColor: C.success,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: C.teal,
              padding: 12,
              gap: 8,
            }}
          >
            <Copy style={{ fontSize: 16, fontWeight: "800", color: C.ink }}>Spot on!</Copy>
            <Copy style={{ fontSize: 15, color: C.ink }}>{m.why}</Copy>
            <Button icon="right" disabled={!active} onPress={() => update(tideClassifyNext(s))}>
              {s.index === s.ids.length - 1 ? "Finish lab" : "Next mission"}
            </Button>
          </View>
        )}
      </BoardColumns>
    </View>
  );
}

function ClassicTideBoard({
  session,
  update,
  practice,
  sound,
  width,
  active,
  coach,
  cheer,
}: BoardProps<TideSave> & { session: { state: TideState | LegacyTideState } }) {
  const o = session.options,
    s = upgrade(session.state, o),
    together = o.mode === "together",
    need = needFor(o),
    reduced = useReducedMotion(),
    m = current(s);
  const [p] = useState(() => new Animated.Value(s.watched ? 1 : 0));
  const [playing, setPlaying] = useState(false);
  const large = useWindowDimensions().fontScale >= LARGE_TEXT;
  // The next question opens at the top of the board, above the answers the child just used.
  useStepReveal(s.index);
  const name = (seat: number) => session.names?.[seat] || `Player ${seat + 1}`;
  const right = m?.kind === "guess" && s.guesses.length > 0 && s.guesses.every((g) => g === m.right);
  // Speak the question when a mission opens. On a brand-new round, wait for the frame's spoken intro.
  const first = useRef(session.revision === 0);
  const questionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    // Web reloads have no user activation yet; the speaker button stays available.
    const canAutoPlay =
      Platform.OS !== "web" || (typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive);
    if (!active || !m || !isVoicedMission(m.id) || !canAutoPlay || s.guesses.length > 0 || s.watched) return;
    const wait = first.current ? 3300 : 250;
    first.current = false;
    const timer = setTimeout(() => sound(`tide-pool-q-${m.id}`, true), wait);
    questionTimer.current = timer;
    return () => clearTimeout(timer);
  }, [active, m, sound, s.guesses.length, s.watched]);
  useEffect(() => {
    if (!s.watched) p.setValue(0);
    else if (!playing) p.setValue(1);
  }, [s.index, s.watched, playing, p]);
  if (!m)
    return (
      <View style={{ gap: 10 }}>
        <Copy style={{ fontWeight: "700", color: C.ink, fontSize: 20 }}>Every pool question answered!</Copy>
        <PoolScene mission="coral" watched look={{ sun: true, cool: true, high: true }} p={p} width={width} />
      </View>
    );
  const voiced = isVoicedMission(m.id);
  const pick = (choice: number) => {
    if (!active || s.guesses.length >= need) return;
    clearTimeout(questionTimer.current);
    const ok = choice === m.right;
    practice("sci.predict", ok);
    practice(m.skill, ok);
    update(answer(s, choice, o));
    if (coach.active) coach.done();
    if (s.guesses.length + 1 === need) sound(voiced ? `tide-pool-do-${m.id}` : "tap", voiced);
  };
  const doChange = () => {
    if (!active) return;
    clearTimeout(questionTimer.current);
    practice("sci.cause-effect", right);
    update(makeChange(s, o));
    if (right) cheer("right", voiced ? `tide-pool-right-${m.id}` : undefined);
    else sound(voiced ? `tide-pool-surprise-${m.id}` : "tap", voiced);
    if (reduced) return;
    setPlaying(true);
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 2200, easing: easeInOut, useNativeDriver: nativeDriver }).start(() =>
      setPlaying(false)
    );
  };
  const flip = (control: Control) => {
    if (!active) return;
    clearTimeout(questionTimer.current);
    const n = toggle(s, control);
    const score = (x: typeof s.pool) => Number(x.sun) + Number(x.cool) + Number(x.high);
    const better = score(n.pool) > score(s.pool);
    practice("sci.cause-effect", better);
    update(n);
    if (coach.active) coach.done();
    if (n.watched) {
      cheer("right", "science-v25-tide-coral");
    } else sound(better ? "match" : "tap");
  };
  const promptKey = s.watched
    ? m.kind === "fix"
      ? "science-v25-tide-coral"
      : m.id === "heat" ? "science-v25-tide-heat" : `tide-pool-${right ? "right" : "surprise"}-${m.id}`
    : m.kind === "guess" && s.guesses.length === need
      ? `tide-pool-do-${m.id}`
      : `tide-pool-q-${m.id}`;
  // Answer labels share one size: the largest at which every word fits its tile (6-pt padding, 2-pt border).
  const answerMax = large && m.kind === "guess" ? Math.min(...m.answers.map(a => wordFitMultiplier(a.label, 14, (width - 8 * (m.answers.length - 1)) / m.answers.length - 16, 2))) : undefined;
  // At accessibility sizes each control is a row of its two choices, picture above words, so long labels get the room.
  const controlInner = (width - 8) / 2 - 14;
  const answers = (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {m.answers.map((a, i) => {
        const chosen = s.guesses.includes(i);
        const reveal = s.watched && !playing;
        return (
          <AnswerTile
            key={a.picture}
            label={`${a.label}${chosen ? ", your answer" : ""}${reveal && i === m.right ? ", the answer" : ""}`}
            selected={chosen}
            correct={reveal && i === m.right}
            wrong={reveal && chosen && i !== m.right}
            disabled={!active || s.guesses.length >= need}
            onPress={() => pick(i)}
            style={{
              flex: 1,
              minHeight: 104,
              borderRadius: 16,
              padding: 6,
              alignItems: "center",
              justifyContent: "center",
              opacity: s.guesses.length >= need && !chosen && !(reveal && i === m.right) ? 0.55 : 1,
            }}
          >
            <AnswerArt picture={a.picture} size={58} />
            <Copy maxFontSizeMultiplier={answerMax} style={{ fontSize: 14, fontWeight: "700", color: C.ink, textAlign: "center" }}>{a.label}</Copy>
          </AnswerTile>
        );
      })}
    </View>
  );
  const last = s.index === s.missions.length - 1;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Copy style={{ fontWeight: "700", color: C.ink, flex: 1, fontSize: 20 }}>{m.question}</Copy>
        {voiced && <IconButton icon="sound-on" label="Hear this" onPress={() => sound(promptKey)} />}
      </View>
      {together && m.kind === "guess" && !s.watched && (
        <Copy style={{ fontSize: 14, color: C.ink }}>
          {s.guesses.length < need ? `${name(guesser(s))} picks an answer` : `${name(s.starter)} makes the change`}
        </Copy>
      )}
      <BoardColumns drawing={<PoolScene mission={sceneForMission(m.id)} watched={s.watched} look={s.pool} p={p} width={width} />}>
      {m.kind === "fix" ? (
        <CoachSpot active={coach.active && !s.watched} handAt="none">
          <View testID="tide-controls" style={{ flexDirection: large ? "column" : "row", gap: 8 }}>
            {(["sun", "cool", "high"] as const).map((control) => (
              <View key={control} style={large ? { flexDirection: "row", gap: 8 } : { flex: 1, gap: 4 }}>
                {[true, false].map((on) => {
                  const selected = s.pool[control] === on;
                  const [good, bad, goodLabel, badLabel] = controlArt[control];
                  return (
                    <PressableScale
                      key={String(on)}
                      accessibilityRole="button"
                      accessibilityLabel={on ? goodLabel : badLabel}
                      accessibilityState={{ selected, disabled: s.watched }}
                      disabled={!active || selected || s.watched}
                      onPress={() => flip(control)}
                      style={{
                        minHeight: control === "cool" ? 90 : 56,
                        flex: large ? 1 : undefined,
                        padding: large ? 4 : undefined,
                        borderRadius: 14,
                        flexDirection: control === "cool" || large ? "column" : "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        backgroundColor: selected ? C.soft : C.paper,
                        borderWidth: 3,
                        borderColor: selected ? C.teal : C.line,
                      }}
                    >
                      {on ? good : bad}
                      <Copy maxFontSizeMultiplier={large ? wordFitMultiplier(on ? goodLabel : badLabel, 13, controlInner, 2) : undefined} style={{ fontSize: 13, fontWeight: "700", color: C.ink, textAlign: "center", flexShrink: 1 }}>{on ? goodLabel : badLabel}</Copy>
                    </PressableScale>
                  );
                })}
              </View>
            ))}
          </View>
        </CoachSpot>
      ) : (
        <CoachSpot active={coach.active && s.guesses.length === 0} handAt="none">
          {answers}
        </CoachSpot>
      )}
      {m.kind === "guess" && s.guesses.length === need && !s.watched && (
        <Button onPress={doChange} disabled={!active}>
          {m.change}
        </Button>
      )}
      {s.watched && !playing && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            borderRadius: 14,
            padding: 10,
            gap: 2,
            backgroundColor: m.kind === "fix" || right ? C.success : "#FCEFD2",
          }}
        >
          <Copy style={{ fontWeight: "700", color: C.ink, fontSize: 17 }}>
            {m.kind === "fix" ? "The coral is happy!" : right ? "You guessed it!" : "Surprise!"}
          </Copy>
          <Copy style={{ fontSize: 15, color: C.ink }}>{m.why}</Copy>
          {together && m.kind === "guess" && (
            <Copy style={{ fontSize: 13, color: C.ink }}>
              {s.guesses.map((g, i) => `${name((s.starter + i) % 2)}: ${m.answers[g].label}`).join(" · ")}
            </Copy>
          )}
        </View>
      )}
      {s.watched && !playing && (
        <Button icon="right" onPress={() => active && update(nextMission(s, o))}>
          {last ? "Finish" : "Next question"}
        </Button>
      )}
      </BoardColumns>
    </View>
  );
}
export function Art({ size }: { size: number }) {
  const [p] = useState(() => new Animated.Value(0));
  return (
    <View style={{ width: size, height: size, justifyContent: "center", overflow: "hidden" }}>
      <PoolScene mission="coral" watched look={{ sun: true, cool: true, high: true }} p={p} width={size} />
    </View>
  );
}
