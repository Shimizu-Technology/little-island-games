import { BoardColumns, useBoardColumns, useBoardGeometry, useBoardSpace } from '../../BoardSpace';
import { SCHOOL_BOARD_MIN } from '../../boardGeometry';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { Text } from "../../../components/Text";
import { Button, C, Copy, Heading, IconButton, PressableScale } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { LARGE_TEXT, wordFitMultiplier } from "../../../components/wordFit";
import { useStepReveal } from "../../stepReveal";
import { CoachSpot } from "../../Coach";
import {
  FlagIcon,
  RaceBar,
  ReefBoard,
  ShellIcon,
  Spinner,
  Tide,
  Turtle,
  specialIcon,
  useShake,
  type Special,
  type Token,
} from "../../kit/NumberParts";
import { sectionOf, sectionRange } from "../../kit/numbers";
import { boardEnd, currents, nextStone, reefMove, reefRound, shellStops, type ReefRaceState, type ReefState } from "./engine";
import {
  isReefRoute,
  reefRouteDone,
  reefRouteHelp,
  reefRouteNext,
  reefRoutePick,
  reefRouteTask,
  reefRouteTurn,
  type ReefRouteState,
} from "./stages";

const ink = C.ink;

function BiggerCard({ n, onPress, disabled, wrong }: { n: number; onPress: () => void; disabled: boolean; wrong: number }) {
  const shake = useShake(wrong);
  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX: shake }] }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${n}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={{
          minHeight: 96,
          borderRadius: 20,
          borderWidth: 3,
          borderColor: "#D79A22",
          backgroundColor: "#FFF6E0",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
        }}
      >
        <ShellIcon size={34} />
        <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 44, fontWeight: "900", color: ink }}>{n}</Text>
      </PressableScale>
    </Animated.View>
  );
}

function PlayerChip({ token, toGo, narrow, width }: { token: Token; toGo: number; narrow: boolean; width: number }) {
  // At accessibility sizes the name wraps between words onto two lines and stops where each word fits the card
  // (38-pt turtle, 6-pt gap, 8-pt padding and 3-pt border each side), so "Your turtle" is never cut to "Yo…".
  const large = useWindowDimensions().fontScale >= LARGE_TEXT, room = width - 38 - 6 - 22;
  const school = useBoardSpace(), labelSize = narrow ? school?.ready ? 13 : 12.5 : 14;
  return (
    <View
      accessibilityLabel={`${token.label}: ${toGo} to go${token.active ? ", playing now" : ""}`}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minHeight: 46,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: token.active ? (token.kind === "coral" ? C.coral : token.kind === "tide" ? C.blue : C.teal) : "transparent",
        backgroundColor: token.active ? C.paper : "rgba(255,255,255,0.45)",
      }}
    >
      {token.kind === "tide" ? <Tide size={38} /> : <Turtle size={38} coral={token.kind === "coral"} />}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={large ? 2 : 1} maxFontSizeMultiplier={large ? wordFitMultiplier(token.label, labelSize, room, 1.5) : undefined} style={{ fontSize: labelSize, fontWeight: "900", color: ink }}>
          {token.label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <FlagIcon size={14} />
          <Text maxFontSizeMultiplier={large ? 1.5 : undefined} style={{ fontSize: 13, fontWeight: "800", color: ink }}>{toGo} to go</Text>
        </View>
      </View>
    </View>
  );
}

/** Little footprints: one for each hop still to make. */
function Hops({ count, back }: { count: number; back: boolean }) {
  return (
    <View accessibilityLabel={`${count} ${count === 1 ? "hop" : "hops"} ${back ? "back" : "to go"}`} style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, maxWidth: 150 }}>
      {Array.from({ length: Math.min(12, count) }, (_, i) => (
        <Svg key={i} width={22} height={22} viewBox="0 0 24 24" accessible={false}>
          <Ellipse cx="12" cy="14" rx="6" ry="7" fill={back ? C.coral : C.teal} />
          <Circle cx="6" cy="6" r="2.4" fill={back ? C.coral : C.teal} />
          <Circle cx="12" cy="4" r="2.4" fill={back ? C.coral : C.teal} />
          <Circle cx="18" cy="6" r="2.4" fill={back ? C.coral : C.teal} />
        </Svg>
      ))}
    </View>
  );
}

export function Board(props: BoardProps<ReefRaceState>) {
  if (isReefRoute(props.session.state)) {
    return <ReefRouteBoard {...props} session={{ ...props.session, state: props.session.state }} />;
  }
  return <ClassicReefBoard {...props} session={{ ...props.session, state: props.session.state }} />;
}

const L5_SECTIONS: readonly { section: number; label: string; aria: string }[] = [
  { section: 0, label: "1–25", aria: "Show stones 1 to 25" },
  { section: 1, label: "26–50", aria: "Show stones 26 to 50" },
  { section: 2, label: "51–75", aria: "Show stones 51 to 75" },
  { section: 3, label: "76–100", aria: "Show stones 76 to 100" },
];

/** Levels 4–5 native multi-step reef-hop & route-comparison board right on the ReefBoard track. */
function ReefRouteBoard({
  session,
  update,
  practice,
  assistance,
  sound,
  active,
  width,
  height,
  coach,
  cheer,
}: BoardProps<ReefRaceState> & { session: { state: ReefRouteState } }) {
  const s = session.state;
  const o = session.options;
  const task = reefRouteTask(s);
  const [wrongPulse, setWrongPulse] = useState({ n: 0, key: 0 });
  const anchorSection = task ? sectionOf(task.anchor, task.end) : 0;
  const solvedSection =
    task && s.solved
      ? sectionOf(task.kind === "route" && task.routes ? task.routes[task.target].landing : task.target, task.end)
      : anchorSection;
  const viewKey = `${task?.id ?? "done"}:${s.solved ? 1 : 0}`;
  const [sectionChoice, setSectionChoice] = useState<{ key: string; section: number } | null>(null);
  const viewSection = sectionChoice && sectionChoice.key === viewKey ? sectionChoice.section : solvedSection;
  const setViewSection = (sec: number) => setSectionChoice({ key: viewKey, section: sec });
  useStepReveal(s.index);

  const side = useBoardColumns();
  const reserved = 340 + (task?.end === 100 ? 58 : 0) + (session.match ? 66 : 0);
  const pathH = Math.round(Math.max(250, Math.min(width * (width > 600 ? 0.56 : 1.1), height - reserved)));
  const geometry = useBoardGeometry("reef-race", pathH, SCHOOL_BOARD_MIN["reef-race"]);

  if (reefRouteDone(s) || !task) {
    const scores: [number, number] = [0, 0];
    s.clean.forEach((ok, idx) => {
      if (ok) scores[(s.starter + idx) % 2]++;
    });
    return (
      <View style={{ alignItems: "center", gap: 12, padding: 14 }}>
        <IslandCheer />
        <Heading style={{ textAlign: "center" }}>
          {o.mode === "versus"
            ? scores[0] === scores[1]
              ? "A reef race tie!"
              : `${session.names?.[scores[0] > scores[1] ? 0 : 1] ?? "Player"} wins the reef sprint!`
            : "You charted every reef route!"}
        </Heading>
        <Copy style={{ color: C.ink, textAlign: "center" }}>
          All {s.ids.length} Level {s.level} reef-hop challenges complete.
        </Copy>
      </View>
    );
  }

  const section = task.end === 100 ? viewSection : anchorSection;
  const [first, last] = sectionRange(section, task.end);
  const turnSeat = reefRouteTurn(s) ?? 0;
  const who = session.names?.[turnSeat] ?? `Player ${turnSeat + 1}`;

  const specials: Record<number, Special> = { ...task.markers };
  if (task.kind === "start") specials[task.anchor] = "shell";

  const tokens: Token[] =
    task.kind === "route" && task.routes
      ? s.solved
        ? [
            { kind: "teal", at: task.routes[task.target].landing, label: `Route ${task.target === 0 ? "A" : "B"}`, active: true },
            { kind: "coral", at: task.routes[1 - task.target].landing, label: `Route ${task.target === 0 ? "B" : "A"}`, active: false },
          ]
        : [{ kind: "teal", at: task.anchor, label: "Your turtle", active: true }]
      : [
          {
            kind: "teal",
            at: s.solved ? task.target : task.anchor,
            label: task.kind === "start" ? (s.solved ? "Start stone" : "Finish stone") : "Your turtle",
            active: true,
          },
        ];

  function submit(value: number) {
    if (!active || s.solved || !task) return;
    const next = reefRoutePick(s, value);
    if (next === s) return;
    if (coach.active) coach.done();
    if (s.wrongCount === 0 && !s.helped) {
      practice(task.skill, next.solved);
      practice("num.number-line", next.solved);
    }
    if (next.solved) {
      cheer(s.index === s.ids.length - 1 ? "big" : "right");
    } else {
      setWrongPulse((w) => ({ n: value, key: w.key + 1 }));
      sound("reef-race-try", true);
    }
    update(next);
  }

  const wrongNote =
    s.lastWrong !== null && !s.solved
      ? task.kind === "route"
        ? `Route ${s.lastWrong === 0 ? "A" : "B"} lands behind the other route — compare both totals and try again!`
        : s.lastWrong < task.target
          ? `Stone ${s.lastWrong} is a bit too low — check each hop and try again!`
          : `Stone ${s.lastWrong} is a bit too high — check each hop and try again!`
      : null;

  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          backgroundColor: C.paper,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: C.line,
          padding: 12,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Copy style={{ fontSize: 13, fontWeight: "800", color: C.muted }}>
            {o.mode !== "solo" ? `${who}’s turn · ` : ""}Challenge {s.index + 1} of {s.ids.length}
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
                if (task.end === 100 && task.kind !== "route") {
                  setViewSection(sectionOf(task.midpoint, task.end));
                }
                update(reefRouteHelp(s));
              }}
            >
              Step 1 hint
            </Button>
          )}
        </View>
        <Text accessibilityLiveRegion="polite" style={{ fontSize: 18, fontWeight: "900", color: ink, lineHeight: 24 }}>
          {task.prompt}
        </Text>
        {task.steps.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <View
              style={{
                backgroundColor: C.soft,
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 5,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Turtle size={20} />
              <Copy style={{ fontSize: 13, fontWeight: "800", color: ink }}>
                {task.kind === "start" ? `Landed on ${task.anchor}` : `Start ${task.anchor}`}
              </Copy>
            </View>
            {task.steps.map((st, idx) => (
              <View
                key={`${task.id}-step-${idx}`}
                style={{
                  backgroundColor: st.kind === "crab" ? C.coralFill : st.kind === "wave" ? "#DDF0EE" : C.cream,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: st.kind === "crab" ? C.coral : st.kind === "wave" ? C.teal : C.line,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {st.kind !== "hop" && specialIcon(st.kind, 18)}
                <Copy style={{ fontSize: 13, fontWeight: "800", color: ink }}>{st.label}</Copy>
              </View>
            ))}
          </View>
        )}
        {s.helped && !s.solved && (
          <View
            accessibilityLiveRegion="polite"
            style={{
              backgroundColor: C.soft,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: C.gold,
              paddingHorizontal: 10,
              paddingVertical: 7,
            }}
          >
            <Copy style={{ fontSize: 14, fontWeight: "700", color: ink }}>{task.hint}</Copy>
          </View>
        )}
        {wrongNote && (
          <Copy accessibilityLiveRegion="polite" style={{ fontSize: 14, fontWeight: "800", color: C.coral }}>
            {wrongNote}
          </Copy>
        )}
      </View>

      <BoardColumns
        legacyDrawingLast
        drawing={
          <View style={{ gap: 8 }}>
            {task.end === 100 && (
              <View
                accessibilityRole="tablist"
                accessibilityLabel="Reef path sections"
                style={{ flexDirection: "row", gap: 6 }}
              >
                {L5_SECTIONS.map((sec) => {
                  const selected = section === sec.section;
                  return (
                    <PressableScale
                      key={sec.section}
                      testID={`reef-section-${sec.section}`}
                      accessibilityRole="button"
                      accessibilityLabel={sec.aria}
                      accessibilityState={{ selected }}
                      onPress={() => setViewSection(sec.section)}
                      style={{
                        flex: 1,
                        minWidth: 48,
                        minHeight: 48,
                        borderRadius: 12,
                        borderWidth: selected ? 2.5 : 1.5,
                        borderColor: selected ? C.teal : C.line,
                        backgroundColor: selected ? "#DDF0EE" : C.paper,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 4,
                        paddingVertical: 6,
                      }}
                    >
                      <Copy
                        style={{
                          fontSize: 13,
                          fontWeight: selected ? "900" : "700",
                          color: ink,
                          textAlign: "center",
                        }}
                      >
                        {sec.label}
                      </Copy>
                    </PressableScale>
                  );
                })}
              </View>
            )}
            <View testID={geometry.testID} onLayout={geometry.onLayout}>
              <ReefBoard
                width={side ? width * 0.46 : width}
                height={geometry.height}
                first={first}
                last={last}
                end={task.end}
                section={section}
                tokens={tokens}
                specials={specials}
                next={s.helped && !s.solved && task.kind !== "route" ? task.midpoint : null}
                wrong={wrongPulse}
                disabled={!active || s.solved || task.kind === "route"}
                onStone={(n) => task.kind !== "route" && submit(n)}
                coach={coach.active && !s.solved && task.kind !== "route"}
              />
            </View>
          </View>
        }
      >
        {task.kind === "route" && task.routes ? (
          <CoachSpot active={coach.active && !s.solved} handAt="none">
            <View style={{ gap: 8 }}>
              {task.routes.map((route, idx) => {
                const isRight = s.solved && idx === task.target;
                const isWrong = !s.solved && s.lastWrong === idx;
                return (
                  <PressableScale
                    key={`${task.id}-route-${idx}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${route.label}${isRight ? ", wins" : ""}`}
                    accessibilityState={{ disabled: !active || s.solved, selected: isRight }}
                    disabled={!active || s.solved}
                    onPress={() => submit(idx)}
                    style={{
                      minHeight: 62,
                      borderRadius: 18,
                      borderWidth: isRight || isWrong ? 3 : 2,
                      borderColor: isRight ? C.teal : isWrong ? C.coral : C.line,
                      backgroundColor: isRight ? C.success : isWrong ? C.coralFill : C.paper,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Copy style={{ fontSize: 16, fontWeight: "800", color: ink }}>{route.label}</Copy>
                      {s.solved && (
                        <Copy style={{ fontSize: 13, fontWeight: "700", color: C.teal }}>
                          Lands on stone {route.landing}
                        </Copy>
                      )}
                    </View>
                    {isRight && <Copy style={{ fontSize: 22, fontWeight: "900", color: C.teal }}>✓</Copy>}
                  </PressableScale>
                );
              })}
            </View>
          </CoachSpot>
        ) : (
          !s.solved && (
            <Copy style={{ fontSize: 15, fontWeight: "700", color: C.muted, textAlign: "center" }}>
              Tap the exact stone on the reef path!
            </Copy>
          )
        )}

        {s.solved && (
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
            <Copy style={{ fontSize: 15, fontWeight: "800", color: ink }}>{task.explain}</Copy>
            <Button disabled={!active} onPress={() => update(reefRouteNext(s))}>
              {s.index === s.ids.length - 1 ? "Finish race" : "Next challenge"}
            </Button>
          </View>
        )}
      </BoardColumns>
    </View>
  );
}

function ClassicReefBoard({ session, update, practice, sound, active, width, height, coach, cheer }: BoardProps<ReefRaceState> & { session: { state: ReefState } }) {
  const s = session.state,
    o = session.options,
    end = boardEnd(o);
  const r = useMemo(() => reefRound(s, o), [s, o]);
  const before = useMemo(() => (s.history.length ? reefRound({ ...s, history: s.history.slice(0, -1) }, o) : null), [s, o]);
  const mover = o.mode === "together" ? 0 : r.turn;
  const computer = o.mode === "solo" && r.turn === 1 && r.phase !== "done";
  const [spin, setSpin] = useState(0),
    [spinning, setSpinning] = useState(false),
    [lock, setLock] = useState(false),
    [wrong, setWrong] = useState({ n: 0, key: 0 }),
    [pickWrong, setPickWrong] = useState({ n: 0, key: 0 }),
    [nudge, setNudge] = useState(0),
    [hint, setHint] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const spinnerShake = useShake(nudge);

  const thing = o.pace === "easy" ? "spinner" : o.pace === "medium" ? "die" : "dice";
  const spinKey = o.pace === "easy" ? "reef-race-spin" : o.pace === "medium" ? "reef-race-roll" : "reef-race-roll-dice";
  const seatName = (seat: number) =>
    o.mode === "solo" ? (seat === 0 ? "You" : "Island friend") : session.names?.[seat] ?? `Player ${seat + 1}`;
  const tokens: Token[] =
    o.mode === "together"
      ? [
          { kind: "teal", at: r.positions[0], label: "Our turtle", active: r.phase !== "done" },
          { kind: "tide", at: r.positions[1], label: "The tide", active: false },
        ]
      : [
          { kind: "teal", at: r.positions[0], label: o.mode === "solo" ? "Your turtle" : seatName(0), active: r.phase !== "done" && r.turn === 0 },
          { kind: "coral", at: r.positions[1], label: o.mode === "solo" ? "Island friend" : seatName(1), active: r.phase !== "done" && r.turn === 1 },
        ];
  const specials = useMemo(() => {
    const out: Record<number, Special> = {};
    for (const n of shellStops(s)) if (n < end) out[n] = "shell";
    for (const [n, step] of Object.entries(currents)) if (Number(n) < end) out[Number(n)] = step > 0 ? "wave" : "crab";
    return out;
  }, [s, end]);

  const moving = r.phase === "move" || r.phase === "current";
  const nextN = moving ? nextStone(r, o) : null;
  const focus = nextN ?? (r.phase === "done" ? r.positions[r.winner ?? 0] : r.positions[mover]);
  const section = sectionOf(focus, end);
  const [first, last] = sectionRange(section, end);
  const multi = end > 30;

  const outcomeKey =
    r.phase !== "done"
      ? null
      : o.mode === "together"
      ? r.winner === 0
        ? "reef-race-team-win"
        : "reef-race-tide-finish"
      : o.mode === "solo"
      ? r.winner === 0
        ? "reef-race-win"
        : "reef-race-friend-win"
      : "reef-race-finish";
  const phaseAudio =
    r.phase === "roll"
      ? spinKey
      : r.phase === "bonus"
      ? `reef-race-bonus-${end}-${r.positions[mover]}`
      : r.phase === "current"
      ? r.direction > 0
        ? "reef-race-forward"
        : "reef-race-back"
      : r.phase === "done"
      ? outcomeKey!
      : "reef-race-step";

  // Spoken cue at the start of each human turn (the frame's intro covers the very first one).
  const turnKey = `${r.phase}-${r.rollIndex}-${r.turn}`;
  useEffect(() => {
    if (!active || computer || r.phase !== "roll" || s.history.length === 0) return;
    const t = setTimeout(() => sound(spinKey, true), 1300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, turnKey]);
  // The finish: repeat the last number after the frame's chime, then say who reached the island.
  useEffect(() => {
    if (!active || !outcomeKey) return;
    const t = setTimeout(() => sound(outcomeKey, true), 1900);
    return () => clearTimeout(t);
  }, [active, outcomeKey, sound]);

  /** Speak what a landing means (wave, crab or shell) once the counted number is heard. */
  const announce = useCallback(
    (next: ReefState, landed: number) => {
      const after = reefRound(next, o);
      if (after.phase === "current") later(() => sound(after.direction > 0 ? "reef-race-forward" : "reef-race-back", true), 750);
      else if (after.phase === "bonus") later(() => sound(`reef-race-bonus-${end}-${landed}`, true), 750);
      return after;
    },
    [o, end, later, sound]
  );

  // The island friend takes the same turns, one visible hop at a time.
  useEffect(() => {
    if (!active || !computer || spinning) return;
    const last = s.history[s.history.length - 1];
    const delay =
      r.phase === "roll"
        ? 1500
        : r.phase === "bonus"
        ? 2600
        : last === "roll"
        ? 1700
        : r.phase === "current" && before?.phase === "move"
        ? 2300
        : 850;
    const t = setTimeout(() => {
      if (r.phase === "roll") {
        sound("tap");
        setSpinning(true);
        setSpin((k) => k + 1);
        update(reefMove(s, o, "roll"));
        return;
      }
      if (r.phase === "bonus") {
        const big = Math.max(...r.bonus!);
        sound(`reef-race-number-${big}`, true);
        update(reefMove(s, o, big));
        return;
      }
      const n = nextStone(r, o);
      sound(`reef-race-number-${n}`, true);
      const next = reefMove(s, o, n);
      announce(next, n);
      update(next);
    }, delay);
    return () => clearTimeout(t);
  }, [active, computer, spinning, r, s, o, before, sound, update, announce]);

  const onLanded = useCallback(() => {
    setSpinning(false);
    const total = r.dice.reduce((a, b) => a + b, 0);
    if (total > 0) sound(`reef-race-roll-${Math.min(12, total)}`, true);
  }, [r.dice, sound]);

  function onSpin() {
    if (!active) return;
    if (computer || spinning) return;
    if (r.phase !== "roll") {
      setNudge((k) => k + 1);
      return;
    }
    const next = reefMove(s, o, "roll");
    if (next === s) return;
    sound("tap");
    setHint(null);
    setSpinning(true);
    setSpin((k) => k + 1);
    update(next);
  }
  function onStone(n: number) {
    if (!active || computer || spinning || lock || r.phase === "done") return;
    if (r.phase === "roll") {
      setNudge((k) => k + 1);
      sound(spinKey, true);
      return;
    }
    if (r.phase === "bonus") {
      sound(`reef-race-bonus-${end}-${r.positions[mover]}`, true);
      return;
    }
    const next = reefMove(s, o, n);
    practice("num.count-on", next !== s);
    if (r.phase === "move" && r.remaining === 1)
      practice(o.pace === "hard" ? "num.add-within-20" : "num.add-within-10", next !== s);
    if (next === s) {
      setWrong((w) => ({ n, key: w.key + 1 }));
      setHint(r.direction < 0 ? "Hop back to the stone behind." : "Hop to the very next stone.");
      sound(r.direction < 0 ? "reef-race-try-back" : "reef-race-try", true);
      return;
    }
    practice("num.number-line", true);
    if (coach.active) coach.done();
    setHint(null);
    sound(`reef-race-number-${n}`, true);
    setLock(true);
    later(() => setLock(false), 420);
    const after = announce(next, n);
    // A finished move feels good; the frame celebrates the finish itself. Wait for the spoken
    // number (up to about a second for numbers like 77) so the tone doesn't cut it off.
    if (after.phase === "roll") later(() => cheer(), 1000);
    update(next);
  }
  function pick(n: number) {
    if (!active || computer || r.phase !== "bonus") return;
    const next = reefMove(s, o, n);
    practice("num.compare", next !== s);
    if (next === s) {
      setPickWrong((w) => ({ n, key: w.key + 1 }));
      sound("reef-race-bonus-try", true);
      return;
    }
    cheer();
    later(() => sound(`reef-race-number-${n}`, true), 450);
    update(next);
  }

  const who = seatName(r.turn);
  const prompt =
    r.phase === "done"
      ? o.mode === "together"
        ? r.winner === 0
          ? "Our turtle reached the island!"
          : "The tide got there first!"
        : o.mode === "solo"
        ? r.winner === 0
          ? "You reached the island!"
          : "Island friend got there first!"
        : `${seatName(r.winner!)} reached the island!`
      : hint && !computer
      ? hint
      : r.phase === "roll"
      ? computer
        ? "Island friend's turn…"
        : o.mode === "solo"
        ? `Your turn! Tap the ${thing}.`
        : `${who}'s turn! Tap the ${thing}.`
      : spinning
      ? computer
        ? "Island friend spins…"
        : "Spinning…"
      : r.phase === "bonus"
      ? computer
        ? "Island friend picks the bigger one."
        : "A shell! Which is bigger?"
      : r.phase === "current"
      ? r.direction > 0
        ? `A wave! Hop ${r.remaining} more.`
        : `A crab! Hop back ${r.remaining}.`
      : computer
      ? `Island friend hops ${r.remaining}.`
      : `Hop ${r.remaining} ${r.remaining === 1 ? "stone" : "stones"}!`;
  const promptIcon =
    r.phase === "current" ? specialIcon(r.direction > 0 ? "wave" : "crab", 34) : r.phase === "bonus" ? specialIcon("shell", 34) : null;

  // Leave room so the prompt, the whole path and the spinner fit on one phone screen.
  const reserved = 372 + (multi ? 40 : 0) + (session.match ? 66 : 0);
  const pathH = Math.round(Math.max(260, Math.min(width * (width > 600 ? 0.62 : 1.45), height - reserved)));
  const side = useBoardColumns();
  const geometry = useBoardGeometry('reef-race', pathH, SCHOOL_BOARD_MIN['reef-race']);
  const humanRoll = r.phase === "roll" && !computer && !spinning;
  const showCoach = coach.active && !computer;
  const spinnerSize = width > 600 ? 108 : 92;
  const spinner = (
    <Animated.View style={{ transform: [{ translateX: spinnerShake }] }}>
      <Spinner
        kind={thing === "spinner" ? "spinner" : thing}
        values={r.dice}
        spin={spin}
        rolling={spinning}
        onLanded={onLanded}
        onPress={onSpin}
        disabled={!active || computer || spinning}
        size={spinnerSize}
        label={humanRoll ? `Spin! Tap the ${thing}` : r.dice.length ? `The ${thing} shows ${r.dice.join(" and ")}` : `The ${thing}`}
      />
    </Animated.View>
  );
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {tokens.map((t, i) => (
          <PlayerChip key={i} token={t} toGo={end - t.at} narrow={width < 340} width={(width - 6) / 2} />
        ))}
      </View>
      {multi && <RaceBar end={end} tokens={tokens} width={width} />}
      <BoardColumns legacyDrawingLast drawing={<View testID={geometry.testID} onLayout={geometry.onLayout}><ReefBoard
        width={side ? width * .46 : width}
        height={geometry.height}
        first={first}
        last={last}
        end={end}
        section={section}
        tokens={tokens}
        specials={specials}
        next={!spinning && !computer ? nextN : null}
        wrong={wrong}
        disabled={!active || computer || spinning}
        onStone={onStone}
        coach={showCoach && moving}
      /></View>}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 46 }}>
        {promptIcon}
        <Text accessibilityLiveRegion="polite" style={{ flex: 1, fontSize: 20, fontWeight: "900", color: ink }}>
          {prompt}
        </Text>
        <IconButton icon="sound-on" label="Hear it again" onPress={() => sound(phaseAudio)} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, minHeight: spinnerSize + 4 }}>
        {r.phase === "bonus" && !computer ? (
          r.bonus!.map((n) => (
            <BiggerCard key={n} n={n} onPress={() => pick(n)} disabled={!active} wrong={pickWrong.n === n ? pickWrong.key : 0} />
          ))
        ) : (
          <>
            <CoachSpot active={showCoach && humanRoll}>{spinner}</CoachSpot>
            <View style={{ minWidth: 120, alignItems: "flex-start", gap: 4 }}>
              {humanRoll ? (
                <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 30, fontWeight: "900", color: C.teal }}>{thing === "spinner" ? "Spin!" : "Roll!"}</Text>
              ) : moving && !spinning ? (
                <>
                  <Text maxFontSizeMultiplier={1.5} style={{ fontSize: 30, fontWeight: "900", color: r.direction < 0 ? C.coral : C.teal }}>
                    {r.direction < 0 ? "Back " : ""}
                    {r.remaining}
                  </Text>
                  <Hops count={r.remaining} back={r.direction < 0} />
                </>
              ) : r.phase === "done" ? (
                <IslandCheer />
              ) : null}
            </View>
          </>
        )}
      </View>

      </BoardColumns>
    </View>
  );
}

function IslandCheer() {
  return (
    <Svg width={84} height={56} viewBox="0 0 84 56" accessible={false}>
      <Ellipse cx="42" cy="46" rx="38" ry="9" fill="#E9C98A" />
      <Path d="M54 44 Q58 22 52 8" stroke="#8A5F3A" strokeWidth="4" fill="none" strokeLinecap="round" />
      <Path d="M52 8 q-12 -2 -16 8 M52 8 q12 -4 16 6 M52 8 q-2 -9 -10 -8" stroke="#4E8F5B" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Path d="M22 44 V14 M23 14 h14 l-4 5 l4 5 h-14 Z" stroke={C.ink} strokeWidth="2.5" fill={C.coral} strokeLinejoin="round" />
    </Svg>
  );
}

export function Art({ size }: { size: number }) {
  return (
    <View
      style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}
      accessibilityLabel="A green turtle hopping along numbered stones to an island"
    >
      <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false}>
        <Ellipse cx="60" cy="69" rx="54" ry="33" fill="#BFE3E6" />
        <Path d="M14 92Q30 70 52 80T104 50" stroke="#F5E6C4" strokeWidth="16" fill="none" strokeLinecap="round" />
        {[
          [20, 88],
          [44, 79],
          [70, 76],
          [94, 58],
        ].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r="8" fill={C.cream} stroke="#7C9C93" strokeWidth="2" />
        ))}
        <Ellipse cx="104" cy="44" rx="14" ry="8" fill="#E9C98A" />
        <Path d="M100 44 V24 M101 24 h10 l-3 4 l3 4 h-10 Z" stroke={C.ink} strokeWidth="2" fill={C.coral} />
      </Svg>
      <View style={{ position: "absolute", top: size * 0.3, left: size * 0.12 }}>
        <Turtle size={size * 0.5} />
      </View>
    </View>
  );
}
