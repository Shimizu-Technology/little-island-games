import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Ellipse, Path, Circle } from "react-native-svg";
import { Button, C, Copy, IconButton } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { Dice, NumberPath, NumberStone, Turtle, Tide } from "../../kit/NumberParts";
import {
  boardEnd,
  currents,
  nextStone,
  reefMove,
  reefRound,
  shellStops,
  type ReefAction,
  type ReefState,
} from "./engine";

export function Board({ session, update, practice, sound, soundOn, active, width }: BoardProps<ReefState>) {
  const s = session.state,
    o = session.options,
    end = boardEnd(o);
  const r = useMemo(() => reefRound(s, o), [s, o]);
  const computer = o.mode === "solo" && r.turn === 1 && r.phase !== "done";
  const speechTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [narrating, setNarrating] = useState(false);
  useEffect(
    () => () => {
      if (speechTimer.current) clearTimeout(speechTimer.current);
    },
    []
  );
  function holdCount(ms: number) {
    if (!soundOn) return;
    if (speechTimer.current) clearTimeout(speechTimer.current);
    setNarrating(true);
    speechTimer.current = setTimeout(() => setNarrating(false), ms);
  }
  const [browse, setBrowse] = useState<number | null>(null),
    [feedback, setFeedback] = useState("");
  const expected =
    r.phase === "move" || r.phase === "current"
      ? nextStone(r, o)
      : r.positions[o.mode === "together" ? 0 : r.turn] || 1;
  const first = browse ?? Math.floor((expected - 1) / 20) * 20 + 1;
  const marks: Record<number, string> = {};
  for (const n of shellStops(s)) marks[n] = "○";
  for (const [n, offset] of Object.entries(currents)) marks[Number(n)] = offset > 0 ? "+2" : "−1";
  const name =
    o.mode === "solo"
      ? r.turn === 0
        ? "Your turtle"
        : "Island friend"
      : session.names?.[r.turn] ?? `Player ${r.turn + 1}`;
  let prompt =
    r.phase === "roll"
      ? `${name}: ${o.pace === "easy" ? "spin" : "roll"}, then count on.`
      : r.phase === "bonus"
      ? `Shell stop: which is bigger, ${r.bonus![0]} or ${r.bonus![1]}?`
      : r.phase === "done"
      ? o.mode === "together"
        ? r.winner === 0
          ? "Your team reached the island!"
          : "The tide reached the island. You counted a long way!"
        : o.mode === "solo"
        ? r.winner === 0
          ? "Your turtle reached the island!"
          : "Your island friend reached the island!"
        : `${session.names?.[r.winner!] ?? `Player ${r.winner! + 1}`} reached the island!`
      : `${name}: ${r.remaining} ${r.remaining === 1 ? "step" : "steps"} ${r.direction < 0 ? "back" : "to go"}.`;
  if (r.phase === "current") prompt = `${r.direction > 0 ? "Current +2" : "Current −1"} · ${prompt}`;
  const hasMoved = s.history.length > 0;
  const phaseAudio =
    r.phase === "roll"
      ? "reef-race-roll"
      : r.phase === "bonus"
      ? `reef-race-bonus-${end}-${r.positions[o.mode === "together" ? 0 : r.turn]}`
      : r.phase === "current"
      ? r.direction > 0
        ? "reef-race-forward"
        : "reef-race-back"
      : r.phase === "done"
      ? o.mode === "together" && r.winner === 1
        ? "reef-race-tide-finish"
        : "reef-race-finish"
      : "reef-race-step";
  useEffect(() => {
    if (!active || r.phase === "move") return;
    const delay = hasMoved ? 1800 : 0;
    const timer = setTimeout(() => sound(phaseAudio), delay);
    return () => clearTimeout(timer);
  }, [active, phaseAudio, sound, hasMoved, r.phase]);
  // Computer takes the same numbered steps; pausing a sheet cancels the pending step.
  useEffect(() => {
    if (!active || !computer) return;
    const timer = setTimeout(
      () => {
        const action: ReefAction = r.phase === "roll" ? "roll" : r.phase === "bonus" ? "skip" : nextStone(r, o);
        if (typeof action === "number") sound(`reef-race-number-${action}`);
        const next = reefMove(s, o, action);
        if (action === "roll") sound(`reef-race-roll-${reefRound(next, o).dice.reduce((a, b) => a + b, 0)}`);
        update(next);
      },
      r.phase === "move" ? (s.history[s.history.length - 1] === "roll" ? 3200 : 1700) : 4600
    );
    return () => clearTimeout(timer);
  }, [active, computer, r, o, s, sound, update]);
  function move(action: ReefAction) {
    if (!active || computer || (typeof action === "number" && narrating)) return;
    if (typeof action === "number") holdCount(1200);
    const next = reefMove(s, o, action);
    if (typeof action === "number") {
      const skill = r.phase === "bonus" ? "num.compare" : "num.count-on";
      practice(skill, next !== s);
      if (r.phase === "move" && r.remaining === 1)
        practice(o.pace === "hard" ? "num.add-within-20" : "num.add-within-10", next !== s);
      if (next !== s && r.phase !== "bonus") practice("num.number-line", true);
      if (next === s) {
        setFeedback(
          r.phase === "bonus"
            ? "The bigger number comes later on the path. Try again, or sail past."
            : `Count from ${r.positions[o.mode === "together" ? 0 : r.turn]}. The next stone is ${expected}.`
        );
        sound(r.phase === "bonus" ? "reef-race-bonus-try" : `reef-race-number-${expected}`);
      } else {
        sound(`reef-race-number-${action}`);
        setFeedback("");
      }
    }
    if (next !== s) {
      if (action === "roll") {
        const rolled = reefRound(next, o).dice.reduce((a, b) => a + b, 0);

        sound(`reef-race-roll-${rolled}`);
      }
      const changed = reefRound(next, o);
      if (changed.phase !== r.phase && (changed.phase === "current" || changed.phase === "bonus"))
        holdCount(changed.phase === "bonus" ? 7000 : 5200);
      setBrowse(null);
      update(next);
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <View
          accessibilityLabel={`Green turtle at ${r.positions[0]}. ${
            o.mode === "together" ? "Tide" : "Coral turtle"
          } at ${r.positions[1]}.`}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Turtle size={34} />
          <Text style={{ fontWeight: "800", color: C.ink }}>{r.positions[0]}</Text>
          {o.mode === "together" ? <Tide size={34} /> : <Turtle size={34} coral />}
          <Text style={{ fontWeight: "800", color: C.ink }}>
            {r.positions[1]}
            {o.mode === "together" ? " tide" : ""}
          </Text>
        </View>
        <Dice values={r.dice} spinner={o.pace === "easy"} />
      </View>
      <Copy style={{ fontSize: 16, fontWeight: "800", minHeight: 42 }}>{prompt}</Copy>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Button compact quiet icon="sound-on" label="Hear what to do" onPress={() => sound(phaseAudio)}>
          Hear
        </Button>
        {r.phase === "roll" && (
          <Button compact disabled={!active || computer || narrating} onPress={() => move("roll")}>
            {o.pace === "easy" ? "Spin 1–3" : "Roll dice"}
          </Button>
        )}
        {r.phase === "bonus" && (
          <Button
            compact
            quiet
            disabled={!active || computer || narrating}
            onPress={() => {
              move("skip");
              sound("reef-race-skip");
            }}
          >
            Sail past
          </Button>
        )}
      </View>
      {r.phase === "bonus" && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {r.bonus!.map((n) => (
            <NumberStone key={n} n={n} disabled={!active || computer || narrating} onPress={() => move(n)} />
          ))}
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <IconButton
          icon="left"
          label="Earlier path stones"
          disabled={first === 1}
          onPress={() => setBrowse(Math.max(1, first - 20))}
        />
        <Copy style={{ fontSize: 12 }}>
          Path {first}–{Math.min(end, first + 19)} of {end}
        </Copy>
        <IconButton
          icon="right"
          label="Later path stones"
          disabled={first + 19 >= end}
          onPress={() => setBrowse(Math.min(Math.floor((end - 1) / 20) * 20 + 1, first + 20))}
        />
      </View>
      <NumberPath
        first={first}
        last={Math.min(end, first + 19)}
        width={width}
        positions={r.positions}
        marks={marks}
        tide={o.mode === "together"}
        disabled={!active || computer || narrating || !["move", "current", "bonus"].includes(r.phase)}
        onStone={move}
      />
      {browse !== null && (
        <Button compact quiet onPress={() => setBrowse(null)}>
          Back to your turtle
        </Button>
      )}
      <Copy style={{ fontSize: 13, minHeight: 34 }}>
        {feedback ||
          (narrating ? "Count with your turtle…" : "") ||
          (r.phase === "move" || r.phase === "current"
            ? `Count from ${r.positions[o.mode === "together" ? 0 : r.turn]}. Tap every next stone.`
            : "○ A shell stop · +2 / −1 A current · follow the numbers.")}
      </Copy>
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return (
    <View
      style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}
      accessibilityLabel="A green turtle crossing a numbered coral reef"
    >
      <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}>
        <Ellipse cx="60" cy="69" rx="54" ry="33" fill="#B5DCD6" />
        <Path d="M14 89Q25 67 50 79T102 49" stroke="#668E86" strokeWidth="5" fill="none" />
        {[
          [23, 81],
          [49, 79],
          [77, 76],
          [98, 57],
        ].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r="9" fill={C.cream} />
        ))}
        <Path
          d="M14 98V81M10 87L14 91 21 83M99 99V81M93 88L99 93 106 84"
          stroke={C.coral}
          strokeWidth="4"
          fill="none"
        />
      </Svg>
      <View style={{ position: "absolute", top: size * 0.24 }}>
        <Turtle size={size * 0.62} />
      </View>
    </View>
  );
}
