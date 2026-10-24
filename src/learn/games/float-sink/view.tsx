import React, { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { Button, C, Copy, IconButton, PressableScale } from "../../../components/ui";
import { easeInOut, nativeDriver, useReducedMotion } from "../../../components/motion";
import type { BoardProps } from "../../types";
import { PredictTry } from "../../kit/PredictTry";
import { act, capacity, dock, objects, shapes, type FloatState, type Shape } from "./engine";
export function ObjectArt({ id, size = 62 }: { id: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" accessible accessibilityLabel={id.replaceAll("-", " ")}>
      <G stroke={C.ink} strokeWidth="2">
        {id.includes("bottle") ? (
          <G>
            <Path d="M30 8H50V22L58 30V71H22V30L30 22Z" fill={id.startsWith("full") ? "#83BAC8" : "#E6F2F0"} />
            <Rect x="30" y="5" width="20" height="8" fill={C.teal} />
            {id.startsWith("empty") && <Circle cx="40" cy="43" r="10" fill={C.paper} stroke="none" />}
          </G>
        ) : ["toy-boat", "clay-boat", "bowl", "wide", "foil"].includes(id) ? (
          <G>
            <Path
              d={id === "wide" ? "M4 36Q40 60 76 36L65 62H15Z" : "M10 28Q40 55 70 28L61 62H19Z"}
              fill={id === "foil" ? "#B8C8CD" : C.coral}
            />
            <Path d="M10 28Q40 55 70 28" fill="none" stroke={C.cream} strokeWidth="5" />
            {id === "toy-boat" && <Path d="M40 29V5L62 26H40" fill={C.gold} />}
          </G>
        ) : id === "leaf" ? (
          <G>
            <Path d="M10 65Q0 12 68 9Q74 65 10 65Z" fill={C.teal} />
            <Path d="M10 65L58 20" stroke={C.cream} />
          </G>
        ) : id === "key" ? (
          <G>
            <Circle cx="26" cy="24" r="15" fill={C.gold} />
            <Path d="M36 35L66 65M55 54L63 46M63 62L72 53" stroke={C.gold} strokeWidth="9" />
          </G>
        ) : id === "spoon" ? (
          <G>
            <Ellipse cx="27" cy="22" rx="14" ry="19" rotation="-30" origin="27,22" fill="#B0C2CB" />
            <Path d="M37 38L65 70" stroke="#91A5B0" strokeWidth="9" />
          </G>
        ) : id === "shell" ? (
          <G>
            <Path d="M9 50Q0 14 40 10Q80 14 71 50L43 70H37Z" fill="#E4B69C" />
            <Path d="M40 14V65M15 29L35 64M65 29L45 64" stroke={C.cream} />
          </G>
        ) : id === "log" || id === "cork" ? (
          <G>
            <Rect x="6" y={id === "log" ? 22 : 15} width="63" height="42" rx="12" fill="#B98E67" />
            <Ellipse cx="63" cy="43" rx="10" ry="20" fill="#E1C39A" />
            <Path d="M12 34H45M16 49H43" stroke={C.cream} />
          </G>
        ) : id === "sponge" ? (
          <G>
            <Rect x="9" y="18" width="62" height="48" rx="10" fill={C.gold} />
            {[20, 40, 60].map((x) => (
              <Circle key={x} cx={x} cy={(x % 40) + 30} r="5" fill="#B98E67" />
            ))}
          </G>
        ) : (
          <G>
            <Circle
              cx="40"
              cy="42"
              r={id === "coin" ? 20 : 28}
              fill={id === "apple" ? C.coral : id === "coconut" ? "#92714D" : id === "coin" ? C.gold : "#A2A4A0"}
            />
            {id === "apple" ? (
              <Path d="M39 17Q37 3 51 8" stroke={C.teal} strokeWidth="5" fill="none" />
            ) : (
              <Path d="M24 40Q33 24 48 31" stroke={C.cream} fill="none" />
            )}
          </G>
        )}
      </G>
    </Svg>
  );
}
export function Tank({
  object,
  sunk,
  dropped,
  pebbles = 0,
  width,
}: {
  object: string;
  sunk: boolean;
  dropped: boolean;
  pebbles?: number;
  width: number;
}) {
  const reduced = useReducedMotion(),
    [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(y, {
      toValue: dropped ? (sunk ? 68 : 18) : 0,
      duration: reduced ? 0 : 550,
      easing: easeInOut,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [dropped, sunk, reduced, y, object]);
  return (
    <View style={{ height: 155, width: Math.min(width, 520), alignSelf: "center" }}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 320 155"
        accessible
        accessibilityLabel={`Dock tank: ${dropped ? (sunk ? "sank" : "floating") : "ready to drop"}. ${pebbles} pebbles.`}
      >
        <Rect x="10" y="26" width="300" height="123" rx="18" fill="#EFF6F4" stroke={C.blue} strokeWidth="3" />
        <Path d="M12 74Q40 64 66 74T122 74T178 74T234 74T308 74V132Q308 147 292 147H28Q12 147 12 132Z" fill="#9DCBD9" />
        <Path d="M0 30H85M20 30V60M60 30V60" stroke="#9F7F5D" strokeWidth="9" />
      </Svg>
      <Animated.View style={{ position: "absolute", top: 11, alignSelf: "center", transform: [{ translateY: y }] }}>
        <ObjectArt id={object} size={68} />
        <View style={{ position: "absolute", top: 26, left: 6 }}>
          <Svg width={56} height={20} viewBox="0 0 56 20">
            {Array.from({ length: Math.min(pebbles, 7) }, (_, i) => (
              <Circle key={i} cx={5 + i * 7} cy={10} r={3.5} fill={C.ink} />
            ))}
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
}
const shapeName: Record<Shape, string> = {
  ball: "Solid ball",
  bowl: "Clay bowl",
  wide: "Wide clay boat",
  foil: "Foil boat",
};
export function Board({ session, update, practice, sound, width, active }: BoardProps<FloatState>) {
  const s = session.state,
    o = session.options,
    d = dock(s, o)!,
    object = objects.find((x) => x.id === s.items[d.index]),
    [sortMiss, setSortMiss] = useState(false);
  const seat = ((s.starter + d.boat) % 2) as 0 | 1,
    name = session.names?.[seat] || `Player ${seat + 1}`;
  const send = (e: Parameters<typeof act>[1]) => {
    if (active) update(act(s, e, o));
  };
  const prompt =
    d.phase === "predict" && object
      ? `float-sink-object-${object.id}`
      : d.phase === "drop"
        ? "float-sink-drop"
        : d.phase === "sort" && object
          ? `float-sink-${d.guess === (object.floats ? 0 : 1) ? "why" : "surprise"}-${object.id}`
          : d.phase === "shape"
            ? "float-sink-build"
            : d.phase === "load"
              ? d.pebbles > 0
                ? `float-sink-count-${d.pebbles}`
                : `float-sink-shape-${d.shape}`
              : d.shape === "ball"
                ? "float-sink-ball-sank"
                : `float-sink-sank-${d.pebbles}`;
  useEffect(() => {
    if (active && d.phase !== "predict") sound(prompt);
  }, [active, d.phase, prompt, sound]);
  const boatPhase = ["shape", "load", "pass", "done"].includes(d.phase),
    sunk = boatPhase
      ? !!d.shape && (d.shape === "ball" || d.pebbles > capacity(d.shape, o.pace === "hard"))
      : !!object && !object.floats;
  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Copy style={{ fontWeight: "700", color: C.ink, flex: 1 }}>
          {boatPhase ? "Boat workshop" : `${d.index + 1} of ${s.items.length} · ${object?.name}`}
          {o.mode === "versus" && boatPhase && d.phase !== "done" ? ` · ${name}` : ""}
        </Copy>
        <IconButton icon="sound-on" label="Hear this instruction" onPress={() => sound(prompt)} />
      </View>
      <Tank
        key={boatPhase ? d.shape || "clay" : object!.id}
        object={boatPhase ? d.shape || "clay" : object!.id}
        sunk={sunk}
        dropped={boatPhase ? d.shape !== null : d.phase === "sort"}
        pebbles={d.pebbles}
        width={width}
      />
      {d.phase === "predict" && (
        <PredictTry
          showTry={false}
          choices={["Float", "Sink"]}
          value={null}
          onPredict={(p) => {
            practice("sci.predict", p === (object!.floats ? 0 : 1));
            practice(object!.skill, p === (object!.floats ? 0 : 1));
            send({ kind: "predict", value: p });
          }}
          onTry={() => {}}
          sound={sound}
          promptKey={`float-sink-object-${object!.id}`}
          disabled={!active}
        />
      )}
      {d.phase === "drop" && (
        <>
          <Copy>You predict: {d.guess === 0 ? "float" : "sink"}. Let’s test it.</Copy>
          <Button compact onPress={() => send({ kind: "drop" })}>
            Drop into the tank
          </Button>
        </>
      )}
      {d.phase === "sort" && object && (
        <>
          <Copy style={{ fontWeight: "700", color: C.ink }}>
            {d.guess === (object.floats ? 0 : 1) ? "Let’s see why…" : "Surprise! Here’s why…"}
          </Copy>
          <Copy>{object.why}</Copy>
          <Copy style={{ fontSize: 13 }}>
            {sortMiss ? "Look where it settled. Try the other shelf." : "Sort it where you saw it settle."}
          </Copy>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {([0, 1] as const).map((p) => (
              <Button
                compact
                quiet
                key={p}
                style={{ flex: 1 }}
                onPress={() => {
                  const correct = p === (object.floats ? 0 : 1);
                  practice("sci.float-sink", correct);
                  if (!correct) {
                    setSortMiss(true);
                    sound("float-sink-sort-again");
                  } else {
                    setSortMiss(false);
                    send({ kind: "sort", value: p });
                  }
                }}
              >
                {p === 0 ? "Float shelf" : "Sink shelf"}
              </Button>
            ))}
          </View>
        </>
      )}
      {d.phase === "shape" && (
        <>
          <Copy>Same lump, new shape. Make room for air and keep water out.</Copy>
          {o.pace === "hard" && (
            <Copy style={{ fontSize: 13 }}>Design rule: same amount of clay; fit inside the narrow tank.</Copy>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {shapes.map((shape) => (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={shapeName[shape]}
                key={shape}
                style={{
                  width: "48%",
                  minHeight: 64,
                  padding: 6,
                  backgroundColor: C.paper,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={() => {
                  practice("sci.shape-buoyancy", shape !== "ball");
                  send({ kind: "shape", value: shape });
                }}
              >
                <ObjectArt id={shape} size={30} />
                <Copy style={{ fontSize: 12 }}>{shapeName[shape]}</Copy>
              </PressableScale>
            ))}
          </View>
        </>
      )}
      {d.phase === "load" && (
        <>
          <Copy>
            {shapeName[d.shape!]} · {d.pebbles} pebbles aboard
          </Copy>
          <Button
            compact
            onPress={() => {
              practice("sci.shape-buoyancy", d.shape !== "ball");
              send({ kind: "load" });
            }}
          >
            Add one pebble
          </Button>
          <Copy style={{ fontSize: 13 }}>Water pushes up. More load pushes the boat deeper.</Copy>
        </>
      )}
      {(d.phase === "pass" || d.phase === "done") && (
        <>
          <Copy>
            {d.shape === "ball"
              ? "The solid clay ball sank with no pebbles."
              : `The boat sank. It held ${capacity(d.shape!, o.pace === "hard")} pebbles before the next one.`}
          </Copy>
          <Copy style={{ fontSize: 13 }}>
            {d.shape === "ball"
              ? "The same clay in a hollow bowl can push more water aside."
              : "The next pebble made it too heavy for the water it could push aside."}
          </Copy>
          {d.phase === "pass" ? (
            <Button compact onPress={() => send({ kind: "pass" })}>
              Pass to the next boat builder
            </Button>
          ) : (
            <Copy style={{ fontWeight: "700", color: C.ink }}>
              {o.mode === "solo"
                ? "Experiment complete. Try another shape next round!"
                : `${session.names?.[0] || "Player 1"}: ${d.held[0]} · ${session.names?.[1] || "Player 2"}: ${d.held[1]}`}
            </Copy>
          )}
        </>
      )}
      {d.shelf.length > 0 && (
        <View style={{ flexDirection: "row", gap: 6 }}>
          {[true, false].map((floats) => (
            <View key={String(floats)} style={{ flex: 1, backgroundColor: C.paper, borderRadius: 10, padding: 5 }}>
              <Copy style={{ fontSize: 11 }}>{floats ? "Float shelf" : "Sink shelf"}</Copy>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {d.shelf
                  .filter((id) => objects.find((x) => x.id === id)?.floats === floats)
                  .map((id) => (
                    <ObjectArt key={id} id={id} size={25} />
                  ))}
              </View>
            </View>
          ))}
        </View>
      )}
      <Copy style={{ fontSize: 11, lineHeight: 15 }}>
        In real life, size, material, trapped air and balance change the result. These are example objects and equal
        pebbles.
      </Copy>
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, justifyContent: "center" }}>
      <Tank object="toy-boat" sunk={false} dropped width={size} />
    </View>
  );
}
