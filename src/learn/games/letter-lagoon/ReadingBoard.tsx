import { BoardTouchView } from '../../../gestures/BoardPan';
import React, { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Polyline, Text as SvgText } from "react-native-svg";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import { CoachSpot } from "../../Coach";
import { PictureObject } from "../../art/Objects";
import type { BoardProps } from "../../types";
import { ReadingRefused } from "../../kit/ReadingRefused";
import { admittedReading } from "../../reading/admit";
import { choices, complete, current, move, type Action, type Bank, type State, type Task } from "./puzzle";

const INK = "#3D2B24";
const ACCENT = "#B84E5A";
const CORAL = "#FF7A5C";
const SAND_BORDER = "#E8D8BE";
const WARM_CARD = "#FFFDF8";
const WARM_WELL = "#FFF6E5";

export function Creature({ size, letter = "a", kind = "lagoon" }: { size: number; letter?: string; kind?: string }) {
  const body = kind === "workshop" ? "#F5C96B" : kind === "studio" ? "#FFA488" : "#96D0B4";
  const belly = kind === "workshop" ? "#FFF2CC" : kind === "studio" ? "#FFE4D8" : "#E4F5EC";
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`${letter} lagoon friend`}>
      <Ellipse cx="50" cy="88" rx="34" ry="6" fill="#DFCAA8" opacity={0.65} />
      <Path
        d={
          kind === "studio"
            ? "M18 22Q18 14 28 14h44Q82 14 82 22v56Q82 84 72 84H28Q18 84 18 78Z"
            : kind === "workshop"
              ? "M16 36Q50 10 84 36v42Q84 84 76 84H24Q16 84 16 78Z"
              : "M22 74Q8 46 28 24Q50 8 72 24Q92 46 78 74Q66 86 50 85Q34 86 22 74Z"
        }
        fill={body}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Ellipse cx="50" cy="64" rx="22" ry="17" fill={belly} opacity={0.85} />
      <Circle cx="36" cy="34" r="5" fill="#FFFDF8" stroke={INK} strokeWidth="2" />
      <Circle cx="64" cy="34" r="5" fill="#FFFDF8" stroke={INK} strokeWidth="2" />
      <Circle cx="37" cy="34" r="2.5" fill={INK} />
      <Circle cx="65" cy="34" r="2.5" fill={INK} />
      <Circle cx="28" cy="42" r="4" fill="#FF7A5C" opacity={0.45} />
      <Circle cx="72" cy="42" r="4" fill="#FF7A5C" opacity={0.45} />
      <Path d="M43 42q7 7 14 0" stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <SvgText x="50" y="72" textAnchor="middle" fontSize="30" fontWeight="900" fill={INK}>
        {letter}
      </SvgText>
    </Svg>
  );
}
/** Local original drawings for picture words outside the existing shared object kit. */
function ReadingPicture({ name, size }: { name: string; size: number }) {
  const shapes: Record<string, string> = {
    book: "M15 22Q35 12 50 25Q65 12 85 22V80Q65 70 50 82Q35 70 15 80ZM50 25V82",
    flower:
      "M50 90V50M50 70Q20 50 25 75Q40 85 50 70M50 65Q80 40 78 66Q65 80 50 65M50 20C20 0 12 40 35 43C5 65 44 83 50 55C65 88 95 57 70 43C95 20 60 0 50 20Z",
    map: "M12 25 37 15 63 25 88 15V75L63 85 37 75 12 85ZM37 15V75M63 25V85M20 62 30 45 47 55 75 37",
    fan: "M45 85V58Q10 75 15 48Q18 25 43 40Q20 5 50 12Q76 17 60 40Q95 20 88 50Q80 74 58 57V85Z",
    pen: "M25 78 35 55 72 18 84 30 47 67ZM35 55 47 67M25 78 47 67",
    mop: "M65 12 40 62M40 62Q12 58 15 87L65 87Q70 62 40 62ZM25 68V85M40 67V85M55 68V85",
    web: "M50 12V88M12 50H88M22 22 78 78M22 78 78 22M50 25 68 32 75 50 68 68 50 75 32 68 25 50 32 32Z",
    lip: "M15 48Q35 25 50 36Q65 25 85 48Q65 78 50 70Q35 78 15 48ZM15 48Q50 60 85 48",
    bat: "M50 40 38 23 35 43Q15 28 7 55Q28 48 35 70L50 60 65 70Q72 48 93 55Q85 28 65 43L62 23Z",
  };
  return shapes[name] ? (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={name}>
      <Path d={shapes[name]} stroke={INK} strokeWidth="3" fill="#F5C96B" strokeLinejoin="round" />
    </Svg>
  ) : (
    <PictureObject name={name} size={size} />
  );
}
function Trace({ task, onTrace, done }: { task: Task; onTrace: (points: [number, number][]) => void; done: boolean }) {
  const points = useRef<[number, number][]>([]),
    [trail, setTrail] = useState<[number, number][]>([]),
    [step, setStep] = useState(0);
  const path = task.trace!;
  const size = 256;
  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <BoardTouchView enabled={!done}
        accessibilityLabel={`Trace ${task.answer[0]} from the numbered start`}
        style={{
          ...(Platform.OS === 'web' ? { touchAction: 'none' as const } : {}),
          width: size,
          height: size,
          borderRadius: 26,
          backgroundColor: WARM_CARD,
          borderWidth: 2,
          borderBottomWidth: 4,
          borderColor: SAND_BORDER,
        }}
        onStartShouldSetResponder={() => !done}
        onMoveShouldSetResponder={() => !done}
        onResponderGrant={(e) => {
          points.current = [[(e.nativeEvent.locationX / size) * 100, (e.nativeEvent.locationY / size) * 100]];
          setTrail([...points.current]);
        }}
        onResponderMove={(e) => {
          if (points.current.length < 1200)
            points.current.push([(e.nativeEvent.locationX / size) * 100, (e.nativeEvent.locationY / size) * 100]);
          setTrail([...points.current]);
        }}
        onResponderRelease={() => {
          onTrace(points.current);
          setTrail([]);
        }}
        onResponderTerminationRequest={() => false}
        onResponderTerminate={() => {
          points.current = [];
          setTrail([]);
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100" pointerEvents="none">
          <Polyline
            points={path.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="#F2DFBA"
            strokeWidth="15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points={path.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="#C47A1E"
            strokeWidth="1.4"
            strokeDasharray="2.5 3.5"
          />
          {path.map(([x, y], i) => {
            if (path.slice(0, i).some(([px, py]) => px === x && py === y)) return null;
            const nums = path.flatMap(([px, py], n) => (px === x && py === y ? [n + 1] : []));
            const activeStop = !done && nums.includes(step + 1);
            const passed = done || nums.every((n) => n <= step);
            return (
              <React.Fragment key={i}>
                <Circle
                  cx={x}
                  cy={y}
                  r={activeStop ? "8" : "7"}
                  fill={passed ? "#96D0B4" : activeStop ? "#FFE4A3" : WARM_CARD}
                  stroke={activeStop ? CORAL : INK}
                  strokeWidth={activeStop ? "1.6" : "1.1"}
                />
                <SvgText
                  x={x}
                  y={y + 2.6}
                  fontSize={nums.length > 1 ? "6" : "7.5"}
                  fontWeight="900"
                  fill={INK}
                  textAnchor="middle"
                >
                  {nums.join("·")}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Polyline
            points={trail.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke={CORAL}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </BoardTouchView>
      <Copy style={{ fontSize: 14, textAlign: "center" }}>Finger trail, or use the numbered stops below.</Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: 320 }}>
        {path.map((_, i) => (
          <Button
            key={i}
            compact
            quiet
            disabled={done || i !== step}
            label={`Trace stop ${i + 1}`}
            onPress={() => {
              if (i === path.length - 1) {
                onTrace(path);
                setStep(0);
              } else setStep(i + 1);
            }}
          >
            {i + 1}
          </Button>
        ))}
      </View>
    </View>
  );
}
export function ReadingBoard(p: BoardProps<State> & { bank: Bank; kind: string }) {
  const { session, bank, kind, active, soundOn, sound } = p,
    s = session.state,
    t = current(s, bank),
    finished = s.index === s.ids.length,
    // The task is the pinned inherited record at this saved index. Anything else is refused before a card, a clue or a
    // picture is shown, spoken or credited.
    admitted = finished || admittedReading(t, "The reading board"),
    done = admitted && !finished && complete(s, bank);
  useEffect(() => {
    if (admitted && kind !== "studio" && active && soundOn && t.audio && s.index < s.ids.length) {
      if (t.audio.startsWith("letter-")) sound("tap");
      sound(t.audio, true);
    }
  }, [admitted, t?.audio, s.index, s.ids.length, active, soundOn, sound, kind]);
  if (finished) return <Copy>Your creations are ready!</Copy>;
  if (!admitted) return <ReadingRefused />;
  const expected = t.answer[s.placed.length];
  function act(a: Action) {
    if (!p.active) return;
    const next = move(s, a, bank);
    if (a.type === "help" || a.type === "listen" || next.miss) p.assistance?.();
    if (a.type === "tile" || a.type === "trace") {
      const right = next.placed.length > s.placed.length;
      p.practice(`read.${session.game}-level-${s.level}`, right);
      if (right) {
        p.cheer("right");
        p.coach.done();
      } else p.sound("tap");
    }
    if (a.type === "next") p.cheer("big");
    p.update(next);
  }
  return (
    <View
      style={{ alignItems: "stretch", gap: 16, width: "100%", maxWidth: 640, alignSelf: "center", paddingBottom: 12 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Creature
          size={66}
          kind={kind}
          letter={kind === "lagoon" ? (t.picture ? t.picture[0] : t.answer[0]) : kind === "studio" ? "Aa" : "+"}
        />
        <View style={{ flex: 1 }}>
          <Copy style={{ fontWeight: "800", fontSize: 13, color: ACCENT }}>
            CREATION {s.index + 1} OF 4 · TAKE YOUR TIME
          </Copy>
          <Heading style={{ fontSize: s.level === 1 ? 26 : 21 }}>{t.prompt}</Heading>
        </View>
      </View>
      {t.picture && (
        <View style={{ alignItems: "center" }}>
          <ReadingPicture name={t.picture} size={s.level <= 3 ? 100 : 72} />
        </View>
      )}
      {t.audio && (
        <Button
          quiet
          compact
          label="Listen again"
          disabled={!soundOn || !active}
          onPress={() => {
            if (kind === "studio") act({ type: "listen" });
            p.sound(t.audio!.startsWith("letter-") ? "tap" : t.audio!);
            if (t.audio!.startsWith("letter-")) p.sound(t.audio!);
          }}
        >
          Listen
        </Button>
      )}
      {t.trace ? (
        <Trace key={s.ids[s.index]} task={t} done={done} onTrace={(points) => act({ type: "trace", points })} />
      ) : (
        <>
          <View
            style={{
              backgroundColor: WARM_CARD,
              borderRadius: 22,
              borderWidth: 1.5,
              borderBottomWidth: 3,
              borderColor: SAND_BORDER,
              padding: 14,
              gap: 10,
            }}
          >
            <Copy style={{ fontSize: 12, fontWeight: "900", color: ACCENT, letterSpacing: 0.6 }}>
              {kind === "studio" ? "YOUR STUDIO" : kind === "workshop" ? "WORD WORKBENCH" : "LETTER LANDING"}
            </Copy>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {t.answer.map((_, i) => (
                <View
                  key={i}
                  accessibilityLabel={`${t.slots?.[i] ?? `Space ${i + 1}`}: ${s.placed[i] ?? "empty"}`}
                  style={{
                    minWidth: t.answer.length === 1 ? 104 : 64,
                    minHeight: 66,
                    flexGrow: t.slots ? 1 : 0,
                    padding: 10,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderStyle: i === s.placed.length ? "dashed" : "solid",
                    borderColor: i === s.placed.length ? CORAL : SAND_BORDER,
                    backgroundColor: s.placed[i] ? WARM_WELL : i === s.placed.length ? "#FFEBB8" : "#FAF3E4",
                    justifyContent: "center",
                    alignItems: "center",
                    maxWidth: "100%",
                  }}
                >
                  {t.slots && <Copy style={{ fontSize: 11, color: C.muted, fontWeight: "800" }}>{t.slots[i]}</Copy>}
                  <Copy
                    style={{
                      fontSize: s.level === 1 && kind === "lagoon" ? 36 : 19,
                      fontWeight: "800",
                      color: INK,
                      textAlign: "center",
                    }}
                  >
                    {s.placed[i] ?? "·"}
                  </Copy>
                </View>
              ))}
            </View>
          </View>
          {!done && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
              {choices(s, bank).map((value) => (
                <CoachSpot key={value} active={p.coach.active && value === expected}>
                  <View style={{ alignItems: "center", gap: 6 }}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Place ${value}${s.hint && value === expected ? ", try this one" : ""}`}
                    onPress={() => act({ type: "tile", value })}
                    style={{
                      minWidth: 64,
                      minHeight: 64,
                      maxWidth: Math.min(p.width - 40, 580),
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 18,
                      borderWidth: s.hint && value === expected ? 3 : 1.5,
                      borderBottomWidth: 4,
                      borderColor: s.hint && value === expected ? "#C47A1E" : SAND_BORDER,
                      backgroundColor: s.hint && value === expected ? "#FFE4A3" : C.paper,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {kind === "lagoon" && s.level === 3 ? (
                      <>
                        <ReadingPicture name={value} size={64} />
                        <Copy style={{ fontSize: 13, color: INK }}>{value}</Copy>
                      </>
                    ) : kind === "lagoon" && s.level <= 2 ? (
                      <Creature size={72} letter={value} />
                    ) : (
                      <View style={{ alignItems: "center", gap: 6 }}>
                        {t.panels && t.answer.indexOf(value) >= 0 && t.answer.indexOf(value) < 3 && (
                          <ReadingPicture name={t.panels[t.answer.indexOf(value)]} size={70} />
                        )}
                        <Copy style={{ fontSize: kind === "lagoon" ? 30 : 18, fontWeight: "800", color: INK, textAlign: "center" }}>
                          {value}
                        </Copy>
                      </View>
                    )}
                  </PressableScale>
                  {t.cardAudio?.[value] && <Button quiet compact label={`Hear card: ${value}`} disabled={!soundOn || !active}
                    onPress={() => { act({ type: "listen" }); p.sound(t.cardAudio![value]); }}>Hear card</Button>}
                  </View>
                </CoachSpot>
              ))}
            </View>
          )}
        </>
      )}
      {done && t.completedWord && <View style={{ alignItems: "center", gap: 8 }}>
        <Copy style={{ textAlign: "center" }}>{t.answer.slice(0, 2).join(" + ")} →</Copy>
        <Heading style={{ textAlign: "center" }}>{t.completedWord}</Heading>
        <Button quiet compact disabled={!soundOn || !active} label={`Hear completed word: ${t.completedWord}`}
          onPress={() => p.sound(t.completedAudio!)}>Hear the word</Button>
      </View>}
      <View accessibilityLiveRegion="polite">
        <Copy style={{ textAlign: "center", fontWeight: "700", color: INK }}>
          {done
            ? "You made it! Your creation is ready."
            : s.miss
              ? "Let’s try again. Read the clue, then fill the glowing space."
              : s.hint
                ? `Try ${t.trace ? "following the trail from 1" : expected}.`
                : t.trace
                  ? "Start at 1. Follow the letter trail."
                  : "Tap a card into the glowing space."}
        </Copy>
      </View>
      {(s.hint || s.miss || s.level > 2) && (
        <Copy style={{ fontSize: 15, textAlign: "center", color: C.muted }}>{t.clue}</Copy>
      )}
      {done ? (
        <Button onPress={() => act({ type: "next" })}>
          {s.index === 3 ? "Finish creation book" : "Next creation"}
        </Button>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
          <Button quiet compact label="Help: show the next part" onPress={() => act({ type: "help" })}>
            Help
          </Button>
          {!!s.placed.length && (
            <Button quiet compact onPress={() => act({ type: "undo" })}>
              Undo last
            </Button>
          )}
        </View>
      )}
    </View>
  );
}
