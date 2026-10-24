import React, { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { Button, C, Copy, IconButton, PressableScale } from "../../../components/ui";
import { easeOut, nativeDriver, useReducedMotion } from "../../../components/motion";
import type { BoardProps } from "../../types";
import { PredictTry } from "../../kit/PredictTry";
import {
  availableActions,
  choices,
  creatures,
  expected,
  explanation,
  initialPool,
  observed,
  missionMet,
  missions,
  nextExperiment,
  tryChange,
  type Action,
  type Creature,
  type Pool,
  type TideState,
} from "./engine";
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
          <Path
            d="M39 70V18 M39 44L19 32V18 M39 56L60 39V22 M39 29L52 15 M19 32L8 26 M60 39L70 28"
            stroke={coral}
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
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
export function PoolScene({ pool, width }: { pool: Pool; width: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`Tide pool: ${pool.high ? "high" : "low"} tide, ${pool.warm ? "warm" : "cool"}, ${pool.light ? "sunlight" : "shade"}, salt level ${pool.salt} of 2. ${pool.creatures.join(", ")}.${pool.heat === 2 ? " Coral is pale." : ""}`}
      style={{
        height: 145,
        width,
        alignSelf: "center",
        overflow: "hidden",
        borderRadius: 20,
        backgroundColor: pool.light ? "#F7E7BA" : "#D0DBDF",
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 320 145">
        <Circle cx="282" cy="24" r="16" fill={pool.light ? C.gold : "#ABBCC1"} />
        <Ellipse cx="160" cy="104" rx="155" ry="42" fill="#B39B7F" />
        <Ellipse cx="160" cy="98" rx="142" ry={pool.high ? 39 : 22} fill={pool.salt === 2 ? "#8EC6CD" : "#B7DCE2"} />
        <Path d="M42 101Q64 82 79 104M239 112Q255 92 271 110" fill="none" stroke={C.cream} strokeWidth="5" />
        {Array.from({ length: pool.algae }, (_, i) => (
          <Ellipse key={i} cx={90 + i * 60} cy={113} rx={14} ry={5} fill={C.teal} />
        ))}
      </Svg>
      <View
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          flexDirection: "row",
          justifyContent: "space-evenly",
          alignItems: "flex-end",
        }}
      >
        {pool.creatures.map((c) => (
          <View
            key={c}
            style={{
              opacity:
                pool.salt < 2 || (c === "seaweed" && !pool.light) || (!pool.high && (c === "fish" || c === "sea-star"))
                  ? 0.5
                  : 1,
            }}
          >
            <CreatureArt kind={c} pale={c === "coral" && pool.heat === 2} size={Math.min(48, (width - 24) / 6)} />
          </View>
        ))}
      </View>
    </View>
  );
}
/** Pictures describe each prediction before the simulated change is applied. */
function PredictionPicture({ action, choice }: { action: Action; choice: number }) {
  if (creatures.includes(action as Creature))
    return choice === 0 ? (
      <CreatureArt kind={action as Creature} size={42} />
    ) : (
      <Svg width={42} height={42} viewBox="0 0 48 48" accessible accessibilityLabel="Empty space">
        <Ellipse cx="24" cy="34" rx="19" ry="8" fill="none" stroke={C.muted} strokeWidth="2" strokeDasharray="4 3" />
      </Svg>
    );
  if (action === "temperature") return <CreatureArt kind="coral" pale={choice === 1} size={42} />;
  if (action === "sun")
    return (
      <View style={{ flexDirection: "row", alignItems: "center", opacity: choice === 0 ? 1 : 0.45 }}>
        <Svg
          width={24}
          height={42}
          viewBox="0 0 24 42"
          accessible
          accessibilityLabel={choice === 0 ? "Sunlight" : "Shade"}
        >
          <Circle cx="12" cy="13" r="8" fill={choice === 0 ? C.gold : C.muted} />
        </Svg>
        <CreatureArt kind="seaweed" size={38} />
      </View>
    );
  return (
    <Svg
      width={54}
      height={42}
      viewBox="0 0 54 42"
      accessible
      accessibilityLabel={
        action === "rain"
          ? choice === 0
            ? "Fewer salt grains"
            : "More salt grains"
          : choice === 0
            ? "Fish below the water"
            : "Fish above low water"
      }
    >
      <Path
        d={`M1 ${action === "tide" && choice === 1 ? 32 : 12}Q14 6 27 12T53 12`}
        stroke={C.blue}
        strokeWidth="3"
        fill="none"
      />
      {action === "rain" ? (
        Array.from({ length: choice === 0 ? 2 : 6 }, (_, i) => (
          <Circle key={i} cx={10 + (i % 3) * 16} cy={22 + Math.floor(i / 3) * 12} r={3} fill={C.gold} />
        ))
      ) : (
        <G>
          <Ellipse cx="24" cy="24" rx="12" ry="7" fill={C.coral} />
          <Path d="M34 24L46 16V32Z" fill={C.gold} />
        </G>
      )}
    </Svg>
  );
}
const labels: Record<Action, string> = {
  sun: "Sun / shade",
  rain: "Add rain",
  temperature: "Warm / cool",
  tide: "Tide in / out",
  crab: "Hermit crab",
  snail: "Snail",
  fish: "Fish",
  "sea-star": "Sea star",
  seaweed: "Seaweed",
  coral: "Coral",
};
export function Board({ session, update, practice, sound, width, active }: BoardProps<TideState>) {
  const s = session.state,
    together = session.options.mode === "together",
    need = together ? 2 : 1,
    reduced = useReducedMotion(),
    [fade] = useState(() => new Animated.Value(1));
  const chooser = s.starter,
    predictor = ((chooser + s.guesses.length + 1) % 2) as 0 | 1;
  const mission = missions.find((m) => m.id === s.missions[s.index]),
    done = !mission;
  const name = (seat: number) => session.names?.[seat] || `Player ${seat + 1}`;
  const actual = s.last ? observed(s.pool, s.last) : 0;
  const prompt =
    s.result && s.last
      ? `tide-pool-${s.guesses.every((p) => p === actual) ? "why" : "surprise"}-${s.last}-${s.last === "sun" ? Number(s.pool.light) : s.last === "temperature" ? Number(s.pool.warm) : s.last === "tide" ? Number(s.pool.high) : "any"}`
      : s.action
        ? `tide-pool-predict-${s.action}`
        : mission
          ? `tide-pool-mission-${mission.id}`
          : "tide-pool-help";
  useEffect(() => {
    if (!active || (s.action && !s.result)) return;
    sound(prompt);
    if (s.result) {
      fade.setValue(reduced ? 1 : 0.65);
      const animation = Animated.timing(fade, {
        toValue: 1,
        duration: reduced ? 0 : 240,
        easing: easeOut,
        useNativeDriver: nativeDriver,
      });
      animation.start();
      return () => animation.stop();
    }
  }, [active, s.action, s.result, prompt, sound, reduced, fade]);
  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Copy style={{ fontWeight: "700", color: C.ink, flex: 1 }}>
          {done ? "Our pool discoveries are complete." : mission.text}
        </Copy>
        <IconButton icon="sound-on" label="Hear this instruction" onPress={() => sound(prompt)} />
      </View>
      {together && !done && (
        <Copy style={{ fontSize: 13 }}>
          {!s.action
            ? `${name(chooser)} chooses a change.`
            : s.result
              ? "Compare your ideas. Both can match!"
              : s.guesses.length < need
                ? `${name(predictor)} predicts.`
                : `${name(chooser)} tries the change.`}
        </Copy>
      )}
      <Animated.View style={{ opacity: fade }}>
        <PoolScene pool={s.pool} width={Math.min(width, 360)} />
      </Animated.View>
      <Copy style={{ fontSize: 12 }}>
        {s.pool.warm ? "Warm water" : "Cool water"} · {s.pool.high ? "High tide" : "Low tide"} ·{" "}
        {s.pool.salt === 2 ? "Seawater salt" : "Less salty"}
        {s.pool.grazed ? " · Snails scraped algae" : s.pool.warm && s.pool.heat < 2 ? " · Keep watching the coral" : ""}
      </Copy>
      {!done && !s.action && (
        <>
          <Copy>Choose one change. First, we will predict.</Copy>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {availableActions(session.options.pace).map((a) => (
              <PressableScale
                key={a}
                accessibilityRole="button"
                accessibilityLabel={`${creatures.includes(a as Creature) ? (s.pool.creatures.includes(a as Creature) ? "Remove" : "Add") : "Change"} ${labels[a]}`}
                disabled={!active}
                onPress={() => {
                  update({ ...s, action: a });
                }}
                style={{
                  width: "31%",
                  minHeight: 50,
                  backgroundColor: C.paper,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 5,
                }}
              >
                {creatures.includes(a as Creature) && <CreatureArt kind={a as Creature} size={27} />}
                <Copy style={{ fontSize: 12, textAlign: "center" }}>
                  {creatures.includes(a as Creature) ? `${s.pool.creatures.includes(a as Creature) ? "−" : "+"} ` : ""}
                  {labels[a]}
                </Copy>
              </PressableScale>
            ))}
          </View>
        </>
      )}
      {!done && s.action && !s.result && (
        <PredictTry
          choices={choices(s.action)}
          pictures={[
            <PredictionPicture key="a" action={s.action} choice={0} />,
            <PredictionPicture key="b" action={s.action} choice={1} />,
          ]}
          value={s.guesses.length === need ? s.guesses[need - 1] : null}
          onPredict={(p) => {
            if (s.guesses.length >= need) return;
            practice("sci.predict", p === expected(s.pool, s.action!));
            update({ ...s, guesses: [...s.guesses, p] });
          }}
          onTry={() => {
            practice(
              "sci.cause-effect",
              s.guesses.some((p) => p === expected(s.pool, s.action!))
            );
            practice(
              mission.skill,
              s.guesses.some((p) => p === expected(s.pool, s.action!))
            );
            update(tryChange(s, together));
          }}
          sound={sound}
          promptKey={`tide-pool-predict-${s.action}`}
          disabled={!active || s.guesses.length > need}
        />
      )}
      {s.result && s.last && (
        <>
          <Copy style={{ fontWeight: "700", color: C.ink }}>
            {s.guesses.every((p) => p === actual) ? "Let’s see why…" : "Surprise! Here’s why…"}
          </Copy>
          <Copy>{explanation(s.pool, s.last)}</Copy>
          {together && (
            <Copy style={{ fontSize: 13 }}>
              {s.guesses.map((p, i) => `${name((chooser + i + 1) % 2)}: ${choices(s.last!)[p]}`).join(" · ")}
            </Copy>
          )}
          <Button
            compact
            onPress={() =>
              update({ ...nextExperiment(s), starter: together ? (((s.starter + 1) % 2) as 0 | 1) : s.starter })
            }
          >
            {missionMet(s) ? "Mission discovered · next" : "Try another change"}
          </Button>
        </>
      )}
      <Copy style={{ fontSize: 11, lineHeight: 15 }}>
        In real life, species differ and changes take longer. Watch real tide pools with a grown-up; leave creatures at
        home.
      </Copy>
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: "center", overflow: "hidden" }}>
      <PoolScene pool={initialPool()} width={size} />
    </View>
  );
}
