import { Text } from "../components/Text";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, C, Copy, Heading, Label } from "../components/ui";
import { COURSES, CourseId, raceCourse } from "./courses";
import {
  advanceRace,
  createRaceSession,
  pauseRace,
  racePlacement,
  raceRecord,
  RaceMode,
  RaceRecord,
  RaceRecords,
  RaceSession,
  startRace,
  validRaceSession,
} from "./engine";
import { RaceScene, RaceSceneHandle } from "./RaceScene";
export type RaceScreenProps = {
  session?: RaceSession | null;
  records?: RaceRecords;
  onSave: (session: RaceSession, record: RaceRecord | null) => void;
  onExit?: () => void;
  active?: boolean;
};
export const raceTime = (ticks: number) =>
  `${Math.floor(ticks / 3600)}:${((ticks / 60) % 60).toFixed(1).padStart(4, "0")}`;
/** Parent persists onSave transactionally. Remount after external backup replacement. */
export function RaceScreen({ session, records = {}, onSave, onExit, active = true }: RaceScreenProps) {
  const viewport = useWindowDimensions();
  const shortLandscape = viewport.width > viewport.height && viewport.height < 520;
  const previousLayout = useRef(shortLandscape);
  const [initial] = useState(() => (session && validRaceSession(session) ? pauseRace(session) : createRaceSession()));
  const current = useRef(initial),
    saveCallback = useRef(onSave),
    scene = useRef<RaceSceneHandle>(null);
  React.useLayoutEffect(() => {
    saveCallback.current = onSave;
  }, [onSave]);
  const [snapshot, setSnapshot] = useState(initial),
    [choosing, setChoosing] = useState(!session),
    [hasRound, setHasRound] = useState(!!session),
    [mode, setMode] = useState<RaceMode>("race");
  const [autoRunning, setAutoRunning] = useState(false);
  const [width, setWidth] = useState(340),
    [help, setHelp] = useState(false),
    [message, setMessage] = useState("");
  const jumpFromPressIn = useRef(false);
  const held = useRef({ left: false, right: false, jump: false, toggle: false, nudge: 0 });
  const clear = useCallback(() => {
    setAutoRunning(false);
    jumpFromPressIn.current = false;
    held.current = { left: false, right: false, jump: false, toggle: false, nudge: 0 };
  }, []);
  const persist = useCallback((next: RaceSession) => {
    saveCallback.current(next, raceRecord(next));
  }, []);
  const pause = useCallback(
    (reason = "") => {
      clear();
      current.current = pauseRace(current.current);
      persist(current.current);
      setSnapshot(current.current);
      if (reason) setMessage(reason);
    },
    [clear, persist]
  );
  useEffect(() => {
    if (previousLayout.current !== shortLandscape) {
      previousLayout.current = shortLandscape;
      pause("Paused after turning your device. Resume when ready.");
    }
  }, [shortLandscape, pause]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") pause("Paused while you were away. Resume when you are ready.");
    });
    return () => {
      subscription.remove();
      clear();
      persist(pauseRace(current.current));
    };
  }, [clear, pause, persist]);
  // Route visibility is an external suspension signal; pause must save immediately.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!active || choosing || help) pause();
  }, [active, choosing, help, pause]);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const visibility = () => {
      if (document.hidden) pause("Paused while you were away.");
    };
    const blur = () => pause("Paused after changing windows.");
    const keydown = (e: KeyboardEvent) => {
      if (
        !active ||
        choosing ||
        help ||
        current.current.status !== "running" ||
        (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
      )
        return;
      if (["ArrowLeft", "ArrowRight", " ", "ArrowUp"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft") held.current.left = true;
      if (e.key === "ArrowRight") held.current.right = true;
      if ((e.key === " " || e.key === "ArrowUp") && !e.repeat) held.current.jump = true;
      if (e.key === "Escape") pause();
    };
    const keyup = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") held.current.left = false;
      if (e.key === "ArrowRight") held.current.right = false;
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    };
  }, [active, choosing, help, pause]);
  useEffect(() => {
    if (!active || choosing || help || snapshot.status !== "running") {
      scene.current?.draw(current.current);
      return;
    }
    let frame = 0,
      previous = 0,
      remainder = 0,
      lastHud = -1,
      lastSaved = current.current.tick;
    const update = (time: number) => {
      const elapsed = previous ? (time - previous) / 1000 : 0;
      previous = time;
      if (current.current.status === "running") {
        if (elapsed > 0.5) {
          pause("Paused after an interruption. Resume to continue.");
          remainder = 0;
        } else {
          const input = held.current,
            before = current.current;
          const direction = input.left ? -1 : input.right || input.toggle || input.nudge > 0 ? 1 : 0;
          const result = advanceRace(before, { direction, jump: input.jump }, elapsed, remainder);
          remainder = result.remainder;
          if (result.session.tick !== before.tick) {
            input.jump = false;
            input.nudge = Math.max(0, input.nudge - (result.session.tick - before.tick));
          }
          current.current = result.session;
          const checkpoint = before.runners[0].checkpoint !== result.session.runners[0].checkpoint;
          if (result.session.status !== "running" || checkpoint || result.session.tick - lastSaved >= 120) {
            persist(result.session);
            lastSaved = result.session.tick;
          }
          if (result.session.status !== before.status) clear();
        }
      }
      scene.current?.draw(current.current);
      if (time - lastHud > 200 || current.current.status !== "running") {
        setSnapshot(current.current);
        lastHud = time;
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [active, choosing, help, snapshot.status, clear, pause, persist]);
  const begin = useCallback(
    (course: CourseId, selectedMode = mode) => {
      clear();
      const next = createRaceSession(
        course,
        course === "training" ? "practice" : selectedMode,
        Math.floor(Math.random() * 0xffffffff)
      );
      current.current = next;
      persist(next);
      setSnapshot(next);
      setChoosing(false);
      setHasRound(true);
      setMessage("");
    },
    [clear, persist, mode]
  );
  const resume = () => {
    clear();
    current.current = startRace(current.current);
    setSnapshot(current.current);
    persist(current.current);
    setMessage("");
  };
  const toggleRun = () => {
    held.current.toggle = !held.current.toggle;
    setAutoRunning(held.current.toggle);
    setMessage(held.current.toggle ? "Running forward. Tap Stop running to stop." : "Stopped running.");
  };
  if (choosing)
    return (
      <View style={s.root}>
        <Label>Little Island races</Label>
        <Heading>Ready, set, island!</Heading>
        <Copy>Leap over coral, race rolling coconuts and find your next checkpoint. Everything plays offline.</Copy>
        {hasRound && (
          <Button quiet onPress={() => setChoosing(false)}>
            Return to saved course
          </Button>
        )}
        <View style={s.row}>
          <Button compact quiet selected={mode === "race"} onPress={() => setMode("race")}>
            Race · 4 runners
          </Button>
          <Button compact quiet selected={mode === "practice"} onPress={() => setMode("practice")}>
            Practice · just you
          </Button>
        </View>
        {COURSES.map((course, i) => (
          <Pressable
            key={course.id}
            accessibilityRole="button"
            accessibilityLabel={`${course.name}. ${course.subtitle}. ${course.id === "training" ? "Practice" : mode}`}
            onPress={() => begin(course.id)}
            style={({ pressed }) => [s.course, { backgroundColor: course.sky, opacity: pressed ? 0.75 : 1 }]}
          >
            <View style={[s.number, { backgroundColor: course.edge }]}>
              <Text style={s.numberText}>{i === 0 ? "GO" : String(i)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.courseTitle}>{course.name}</Text>
              <Copy style={{ fontSize: 14 }}>{course.subtitle}</Copy>
              {records[`${course.id}:${course.id === "training" ? "practice" : mode}`] && (
                <Text style={s.small}>
                  Best {raceTime(records[`${course.id}:${course.id === "training" ? "practice" : mode}`]!.ticks)}
                </Text>
              )}
            </View>
            <Text style={s.arrow}>›</Text>
          </Pressable>
        ))}
        <Copy style={s.small}>
          Training is always solo. Race opponents run, jump and collide on the same course as you. No network or other
          people are involved.
        </Copy>
      </View>
    );
  const course = raceCourse(snapshot.course),
    player = snapshot.runners[0],
    running = snapshot.status === "running",
    terminal = snapshot.status === "finished" || snapshot.status === "timedout";
  const sceneHeight = shortLandscape ? 170 : width > 650 ? 260 : 255;
  const best = records[`${snapshot.course}:${snapshot.mode}`];
  return (
    <View style={s.root}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Label>
            {snapshot.mode === "race" && snapshot.course !== "training" ? "Race · computer runners" : "Solo practice"}
          </Label>
          <Heading style={{ fontSize: shortLandscape ? 21 : 26 }}>{course.name}</Heading>
        </View>
        <Button
          compact
          quiet
          onPress={() => {
            pause();
            setHelp((v) => !v);
          }}
        >
          {help ? "Close help" : "How to race"}
        </Button>
      </View>
      {help && (
        <View style={s.panel}>
          <Copy>{course.lesson}</Copy>
          <Copy>
            Hold the left or right arrow, and tap Jump with your other finger. Or use Start running and Jump, which work
            with one tap at a time. Take a step moves a short distance. Keyboard: Left / Right and Space. Escape pauses.
          </Copy>
          <Copy>
            Touching an obstacle or falling sends you to your last flag. The timer continues through that recovery. A
            race has a three-minute limit. Pausing stops every runner and the clock. The app also pauses after an
            interruption.
          </Copy>
          <Copy>
            Ranks compare actual runner progress. Finish placement counts computer runners that crossed before you.
            Practice has no opponents. Best times are separate for each course and mode.
          </Copy>
        </View>
      )}
      <View style={s.scoreRow} accessibilityLiveRegion="none">
        <Text style={s.metric}>Time {raceTime(snapshot.tick)}</Text>
        <Text style={s.metric}>
          {snapshot.runners.length > 1 ? `${racePlacement(snapshot)} / ${snapshot.runners.length}` : "Practice"}
        </Text>
        <Text style={s.metric}>
          Flag {player.checkpoint + 1}/{course.checkpoints.length}
        </Text>
      </View>
      <View style={shortLandscape ? { flexDirection: "row", gap: 16, alignItems: "flex-start" } : { gap: 12 }}>
        <View style={shortLandscape ? { flex: 1, gap: 8 } : { gap: 12 }}>
          <View onLayout={(e) => setWidth(Math.max(260, e.nativeEvent.layout.width))}>
            <RaceScene
              key={snapshot.id}
              ref={scene}
              initial={snapshot}
              width={width}
              height={sceneHeight}
              reducedMotion={true}
            />
          </View>
          <View
            accessible
            accessibilityLabel={`Course progress ${Math.round((player.x / course.length) * 100)} percent. ${player.falls} recoveries.`}
            style={s.progress}
          >
            <View
              style={[s.progressFill, { width: `${Math.max(0, Math.min(100, (player.x / course.length) * 100))}%` }]}
            />
          </View>
        </View>
        <View style={shortLandscape ? { width: 260, gap: 8 } : { gap: 12 }}>
          {terminal ? (
            <View style={s.panel} accessibilityLiveRegion="polite">
              <Heading style={{ fontSize: 25 }}>
                {snapshot.status === "finished"
                  ? snapshot.runners.length > 1
                    ? `Finished ${["", "1st", "2nd", "3rd", "4th"][racePlacement(snapshot)]}!`
                    : "You reached the finish!"
                  : "Time for another try"}
              </Heading>
              <Copy>
                {snapshot.status === "finished"
                  ? `${raceTime(player.finishTick!)} · ${player.falls} ${player.falls === 1 ? "recovery" : "recoveries"}. ${best ? `Your best: ${raceTime(best.ticks)}.` : "Your time is saved on this device."}`
                  : "The three-minute race ended. Try Practice to learn the jumps, or race again."}
              </Copy>
              {snapshot.runners.length > 1 &&
                snapshot.runners.map((r) => (
                  <Text key={r.id} style={s.small}>
                    {r.name}:{" "}
                    {r.finishTick !== null
                      ? raceTime(r.finishTick)
                      : `still on course (${Math.round((r.x / course.length) * 100)}%)`}
                  </Text>
                ))}
              <View style={s.row}>
                <Button onPress={() => begin(snapshot.course, snapshot.mode)}>Race again</Button>
                <Button quiet onPress={() => setChoosing(true)}>
                  Choose a course
                </Button>
              </View>
            </View>
          ) : (
            <>
              {!running && (
                <View style={s.panel}>
                  <Text accessibilityRole="header" style={s.courseTitle}>
                    {snapshot.status === "ready" ? "At the starting line" : "Paused · your place is saved"}
                  </Text>
                  {!shortLandscape && (
                    <Copy>
                      {snapshot.status === "ready"
                        ? course.lesson
                        : "Every runner and the timer will continue from this moment. Held controls have been cleared."}
                    </Copy>
                  )}
                  <Button disabled={!active || help} onPress={resume}>
                    {snapshot.status === "ready" ? "Start" : "Resume"}
                  </Button>
                </View>
              )}
              {shortLandscape && !running && (
                <Button
                  compact
                  quiet
                  onPress={() => {
                    pause();
                    setChoosing(true);
                  }}
                >
                  Choose a course
                </Button>
              )}
              {(!shortLandscape || running) && (
                <>
                  <View style={s.controls}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Hold to run left"
                      accessibilityState={{ disabled: !running }}
                      disabled={!running}
                      onPressIn={() => {
                        held.current.left = true;
                      }}
                      onPressOut={() => {
                        held.current.left = false;
                      }}
                      style={({ pressed }) => [s.pad, !running && s.disabled, pressed && s.pressed]}
                    >
                      <Text style={s.padText}>←</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Hold to run right"
                      accessibilityState={{ disabled: !running }}
                      disabled={!running}
                      onPressIn={() => {
                        held.current.right = true;
                      }}
                      onPressOut={() => {
                        held.current.right = false;
                      }}
                      style={({ pressed }) => [s.pad, !running && s.disabled, pressed && s.pressed]}
                    >
                      <Text style={s.padText}>→</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Jump"
                      accessibilityState={{ disabled: !running }}
                      disabled={!running}
                      onPressIn={() => {
                        jumpFromPressIn.current = true;
                        held.current.jump = true;
                      }}
                      onPress={() => {
                        if (!jumpFromPressIn.current) held.current.jump = true;
                        jumpFromPressIn.current = false;
                      }}
                      onAccessibilityTap={() => {
                        held.current.jump = true;
                      }}
                      style={({ pressed }) => [s.pad, s.jump, !running && s.disabled, pressed && s.pressed]}
                    >
                      <Text style={[s.padText, { color: C.paper, fontSize: 20 }]}>Jump ↑</Text>
                    </Pressable>
                  </View>
                  <View style={s.row}>
                    <Button compact quiet disabled={!running} onPress={toggleRun}>
                      {autoRunning ? "Stop running" : "Start running"}
                    </Button>
                    <Button
                      compact
                      quiet
                      disabled={!running}
                      onPress={() => {
                        held.current.nudge = Math.min(60, held.current.nudge + 18);
                      }}
                    >
                      Take a step
                    </Button>
                    {running && (
                      <Button compact quiet onPress={() => pause()}>
                        Pause
                      </Button>
                    )}
                    {shortLandscape && (
                      <Button
                        compact
                        quiet
                        onPress={() => {
                          pause();
                          setChoosing(true);
                        }}
                        label="Choose a course"
                      >
                        Courses
                      </Button>
                    )}
                  </View>
                </>
              )}
              {!shortLandscape && (
                <Copy style={s.small}>
                  {message ||
                    (player.recovery > 0
                      ? "Back to your flag. Ready to try again!"
                      : "Hold a direction + tap Jump, or use Start running for one-tap controls.")}
                </Copy>
              )}
              {!shortLandscape && (
                <Button
                  compact
                  quiet
                  onPress={() => {
                    pause();
                    setChoosing(true);
                  }}
                >
                  Choose a course
                </Button>
              )}
            </>
          )}
        </View>
      </View>
      {onExit && (
        <Button
          compact
          quiet
          onPress={() => {
            pause();
            onExit();
          }}
        >
          Back to games
        </Button>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  root: { gap: 12, width: "100%" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  course: {
    padding: 16,
    gap: 14,
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderColor: C.line,
    borderWidth: 1,
  },
  number: { width: 44, height: 44, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  numberText: { color: "white", fontWeight: "800", fontSize: 18 },
  courseTitle: { color: C.ink, fontSize: 20, fontWeight: "800" },
  arrow: { color: C.teal, fontSize: 34 },
  small: { color: C.muted, fontSize: 13, lineHeight: 20 },
  panel: { gap: 10, backgroundColor: C.soft, padding: 16, borderRadius: 20 },
  scoreRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  metric: { color: C.ink, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", gap: 10 },
  pad: {
    minWidth: 64,
    minHeight: 64,
    flex: 1,
    backgroundColor: "#E4EDE0",
    borderColor: "#BCCFBC",
    borderWidth: 2,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
  },
  jump: { flex: 1.6, backgroundColor: C.teal, borderColor: C.teal },
  padText: { color: C.ink, fontSize: 30, fontWeight: "800" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  progress: { height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: "#DAE5D8" },
  progressFill: { height: 8, backgroundColor: C.teal, borderRadius: 4 },
});
