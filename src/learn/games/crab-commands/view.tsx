import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Svg, { G, Path, Rect } from "react-native-svg";
import { Button, C, Copy, IconButton, PressableScale } from "../../../components/ui";
import { useReducedMotion } from "../../../components/motion";
import type { BoardProps } from "../../types";
import { CreatureArt } from "../tide-pool/view";
import {
  commands,
  currentLevel,
  run,
  solved,
  solve,
  tick,
  type Command,
  type CrabState,
  type Level,
  type Walker,
} from "./engine";
export const cardLabel: Record<Command, string> = {
  up: "Up",
  right: "Right",
  down: "Down",
  left: "Left",
  forward: "Forward",
  "turn-left": "Turn left",
  "turn-right": "Turn right",
  repeat: "Repeat ×2",
};
export function ArrowArt({ command, size = 26 }: { command: Command; size?: number }) {
  const turn = command.startsWith("turn"),
    repeat = command === "repeat";
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessible accessibilityLabel={cardLabel[command]}>
      <G rotation={command === "right" ? 90 : command === "down" ? 180 : command === "left" ? 270 : 0} origin="20,20">
        <Path
          d={
            repeat
              ? "M10 11Q32 1 32 22H25L34 32L39 19H33 M30 32Q7 41 7 18H14L5 8L1 22H7"
              : turn
                ? command === "turn-left"
                  ? "M30 34V20Q30 10 14 10H7M16 2L7 10L16 18"
                  : "M10 34V20Q10 10 26 10H33M24 2L33 10L24 18"
                : "M20 35V7M8 19L20 7L32 19"
          }
          fill="none"
          stroke={C.ink}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
}
export function Beach({ level, walker, size }: { level: Level; walker: Walker; size: number }) {
  let shell = 0;
  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 250 250"
        accessible
        accessibilityLabel={`Beach grid. Crab row ${Math.floor(walker.pos / 5) + 1}, column ${(walker.pos % 5) + 1}, facing ${["up", "right", "down", "left"][walker.facing]}.${walker.bump ? " Bumped into an obstacle." : ""}`}
      >
        {level.rows
          .join("")
          .split("")
          .map((c, i) => {
            const x = (i % 5) * 50,
              y = Math.floor(i / 5) * 50,
              gone = c === "S" && !!(walker.shells & (1 << shell++));
            return (
              <G key={i}>
                <Rect x={x + 1} y={y + 1} width="48" height="48" rx="8" fill={c === "#" ? "#CAA980" : C.cream} />
                {c === "#" ? (
                  <Path
                    d={`M${x + 8} ${y + 40}V${y + 20}H${x + 13}V${y + 10}H${x + 21}V${y + 20}H${x + 29}V${y + 10}H${x + 37}V${y + 20}H${x + 42}V${y + 40}Z`}
                    fill="#997C60"
                  />
                ) : c === "S" && !gone ? (
                  <Path
                    d={`M${x + 12} ${y + 29}Q${x + 7} ${y + 9} ${x + 25} ${y + 9}Q${x + 44} ${y + 9} ${x + 38} ${y + 29}L${x + 25} ${y + 40}Z`}
                    fill={C.gold}
                    stroke={C.coral}
                    strokeWidth="2"
                  />
                ) : c === "H" ? (
                  <G>
                    <Path
                      d={`M${x + 5} ${y + 40}L${x + 9} ${y + 19}L${x + 27} ${y + 8}L${x + 43} ${y + 24}L${x + 46} ${y + 40}Z`}
                      fill={C.teal}
                    />
                    <Path
                      d={`M${x + 17} ${y + 40}V${y + 29}Q${x + 25} ${y + 18} ${x + 33} ${y + 29}V${y + 40}`}
                      fill={C.cream}
                    />
                  </G>
                ) : null}
              </G>
            );
          })}
      </Svg>
      <View
        style={{
          position: "absolute",
          width: size / 5,
          height: size / 5,
          left: ((walker.pos % 5) * size) / 5,
          top: (Math.floor(walker.pos / 5) * size) / 5,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CreatureArt kind="crab" size={size / 5 - 4} facing={walker.facing} />
      </View>
    </View>
  );
}
export function Board({ session, update, practice, sound, width, height, active }: BoardProps<CrabState>) {
  const s = session.state,
    l = currentLevel(s),
    w = run(l, s.program.slice(0, s.cursor)),
    done = s.completed.length === 3,
    won = !done && solved(l, w),
    reduced = useReducedMotion(),
    [hint, setHint] = useState(false);
  useEffect(() => {
    if (!active || !s.running) return;
    const timer = setTimeout(
      () => {
        const n = tick(s),
          result = run(l, n.program.slice(0, n.cursor));
        update(n);
        if (result.bump) {
          practice("think.debug", false);
          sound("crab-commands-bump");
        } else if (solved(l, result)) {
          practice(l.skill, true);
          if (s.debugging) practice("think.debug", true);
          sound("crab-commands-home");
        } else sound("tap");
      },
      reduced ? 90 : 520
    );
    return () => clearTimeout(timer);
  }, [s, l, active, update, practice, sound, reduced]);
  useEffect(() => {
    if (active && s.program.length === 0 && !done) sound("crab-commands-plan");
  }, [active, done, s.program.length, sound]);
  const edit = (program: Command[], placed = false) => {
    if (!active || s.running) return;
    update({ ...s, program, cursor: 0, cards: placed ? Math.min(1000000, s.cards + 1) : s.cards });
    setHint(false);
  };
  const strip = useRef<ScrollView>(null);
  useEffect(() => {
    strip.current?.scrollTo({
      y: Math.max(0, Math.floor((s.cursor - 1) / Math.max(1, Math.floor((width - 10) / 49)))) * 53,
      animated: false,
    });
  }, [s.cursor, width]);
  const shortest = hint ? solve(l) : [];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Copy style={{ fontWeight: "700", color: C.ink, flex: 1 }}>
          {done ? "Every crab is home!" : `Beach ${s.completed.length + 1} of 3 · collect all shells, then home`}
        </Copy>
        <IconButton
          icon="sound-on"
          label="Hear this instruction"
          onPress={() => sound(w.bump ? "crab-commands-bump" : won ? "crab-commands-home" : "crab-commands-help")}
        />
      </View>
      {session.options.mode === "together" && !done && (
        <Copy style={{ fontSize: 13 }}>
          {session.names?.[(s.starter + s.cards) % 2] || `Player ${((s.starter + s.cards) % 2) + 1}`} places the next
          card.
        </Copy>
      )}
      <Beach level={l} walker={w} size={Math.min(width, height < 740 ? 175 : 260)} />
      {!done && (
        <>
          <ScrollView ref={strip} nestedScrollEnabled style={{ maxHeight: 112 }}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 5,
                minHeight: 46,
                backgroundColor: C.paper,
                padding: 5,
                borderRadius: 12,
              }}
            >
              {s.program.length === 0 && <Copy style={{ fontSize: 13, padding: 7 }}>Your program goes here ↓</Copy>}
              {s.program.map((c, i) => (
                <PressableScale
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`Card ${i + 1}: ${cardLabel[c]}${s.cursor === i + 1 ? ", running card" : ""}. Tap to remove`}
                  disabled={s.running}
                  onPress={() => edit(s.program.filter((_, j) => j !== i))}
                  style={{
                    width: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    borderWidth: 2,
                    borderColor: s.cursor === i + 1 ? (w.bump ? C.error : C.teal) : C.line,
                    backgroundColor: s.cursor === i + 1 ? C.soft : C.cream,
                  }}
                >
                  <ArrowArt command={c} size={22} />
                  <Copy style={{ fontSize: 10, lineHeight: 12 }}>{i + 1}</Copy>
                </PressableScale>
              ))}
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {commands(l.pace).map((c) => (
              <PressableScale
                key={c}
                accessibilityRole="button"
                accessibilityLabel={`Add ${cardLabel[c]} card`}
                disabled={s.running || won || s.program.length >= 80}
                onPress={() => {
                  sound(`crab-commands-card-${c}`);
                  edit([...s.program, c], true);
                }}
                style={{
                  flex: 1,
                  minWidth: 64,
                  minHeight: 57,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: C.paper,
                  borderRadius: 12,
                }}
              >
                <ArrowArt command={c} />
                <Copy style={{ fontSize: 11 }}>{cardLabel[c]}</Copy>
              </PressableScale>
            ))}
          </View>
          {won ? (
            <>
              <Copy>All shells collected. The crab is home!</Copy>
              <Button
                compact
                onPress={() => {
                  setHint(false);
                  update({
                    ...s,
                    completed: [...s.completed, s.program.slice(0, s.cursor)],
                    program: [],
                    cursor: 0,
                    running: false,
                    debugging: false,
                  });
                }}
              >
                Next beach
              </Button>
            </>
          ) : (
            <>
              <Copy style={{ fontSize: 13 }}>
                {w.bump
                  ? `Bump at card ${s.cursor}. Change it, then Go again.`
                  : s.running
                    ? `Running card ${s.cursor + 1}…`
                    : s.cursor > 0
                      ? "The crab needs more steps. Add or change a card."
                      : "Tap arrows in order, then Go. Tap a placed card to remove it."}
              </Copy>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Button
                  compact
                  disabled={s.running || s.program.length === 0 || !active}
                  onPress={() => {
                    practice("think.sequence", solved(l, run(l, s.program)));
                    if (s.program.includes("repeat")) practice("think.loops", solved(l, run(l, s.program)));
                    update({ ...s, cursor: 0, running: true });
                  }}
                >
                  Go
                </Button>
                <Button compact quiet disabled={s.running} onPress={() => edit([])}>
                  Clear
                </Button>
                <Button
                  compact
                  quiet
                  disabled={s.running}
                  onPress={() => {
                    setHint(!hint);
                    sound("crab-commands-hint");
                  }}
                >
                  Hint
                </Button>
              </View>
              {hint && (
                <View style={{ gap: 4 }}>
                  <Copy style={{ fontSize: 12 }}>A shortest plan · tap a card to hear it</Copy>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {shortest.map((c, i) => (
                      <PressableScale
                        key={i}
                        accessibilityRole="button"
                        accessibilityLabel={`Hint card ${i + 1}: ${cardLabel[c]}`}
                        onPress={() => sound(`crab-commands-card-${c}`)}
                        style={{
                          minWidth: 44,
                          minHeight: 44,
                          backgroundColor: C.paper,
                          borderRadius: 8,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ArrowArt command={c} size={22} />
                      </PressableScale>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
          {l.pace === "hard" && <Copy style={{ fontSize: 11 }}>Repeat ×2 does the previous card two more times.</Copy>}
        </>
      )}
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <CreatureArt kind="crab" size={size * 0.8} />
    </View>
  );
}
