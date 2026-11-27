import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import { PictureObject } from "../../art/Objects";
import { useStepReveal } from "../../stepReveal";
import type { BoardProps } from "../../types";
import { admittedReading } from "../../reading/admit";
import { ReadingRefused } from "../../kit/ReadingRefused";
import type { ReadingQuestion } from "../../reading/provenance";
import { Voyage, glow, ink, letterFit } from "./shared";
import {
  VOYAGE_PARTS_COUNT,
  expectedPieces,
  orderedChoices,
  voyagePartsDone,
  voyagePartsHint,
  voyagePartsMove,
  voyagePartsTurn,
  type VoyagePartsAction,
  type VoyagePartsState,
} from "./voyage-parts";

function Finished() {
  return (
    <View style={{ alignItems: "center", gap: 10, padding: 12 }}>
      <Voyage step={VOYAGE_PARTS_COUNT} total={VOYAGE_PARTS_COUNT} width={320} />
      <PictureObject name="boat" size={110} />
      <Heading style={{ textAlign: "center" }}>The boat reached the island!</Heading>
      <Copy style={{ color: ink, textAlign: "center" }}>Six word-part voyages complete.</Copy>
    </View>
  );
}

/**
 * Native Sound Boat Levels 4 & 5 playfield (word parts, syllables, endings, spelling changes,
 * and word families right on the wooden boat). Completely untimed — zero timers.
 */
export function VoyagePartsBoard({
  session,
  question,
  update,
  practice,
  assistance,
  sound,
  width,
  height,
  active,
  cheer,
}: BoardProps<VoyagePartsState> & { question: ReadingQuestion | undefined }) {
  const s = session.state;
  const done = voyagePartsDone(s);
  useStepReveal(s.index);

  if (done) return <Finished />;
  if (!admittedReading(question, "Sound Boat's word-parts board")) return <ReadingRefused />;

  const q = question as ReadingQuestion;
  const compact = height < 730;
  const isBuild = !!q.tiles;
  const pieces = expectedPieces(q);
  const hint = s.helped && !s.solved ? voyagePartsHint(q, s.draft) : null;
  const choices = isBuild ? [] : orderedChoices(q);
  const canCheck = !s.solved && !s.missed && s.draft.length === (isBuild ? pieces.length : 1);
  const turn = voyagePartsTurn(s);
  const who = session.names?.[turn] ?? `Player ${turn + 1}`;
  const last = s.index === s.ids.length - 1;
  const room = Math.min(width, 420) - 36;
  const pieceSize = compact ? 22 : 26;

  function act(a: VoyagePartsAction) {
    if (!active) return;
    const next = voyagePartsMove(s, a, q);
    if (next === s) return;
    if (a.type === "add" || a.type === "remove" || a.type === "pick" || a.type === "reset") {
      sound("tap");
    }
    if (a.type === "help") {
      assistance?.();
      sound("tap");
    }
    if (a.type === "check") {
      if (next.solved) {
        practice(q.skill, next.misses === 0 && !next.helped);
        cheer(last ? "big" : "right");
      } else {
        assistance?.();
        sound("tap");
      }
    }
    update(next);
  }

  return (
    <View style={{ gap: compact ? 8 : 12, alignItems: "center", alignSelf: "stretch" }}>
      {session.options.mode !== "solo" && (
        <Copy style={{ color: C.teal, fontWeight: "800", fontSize: 20, textAlign: "center" }}>{who}’s turn</Copy>
      )}
      <Voyage step={s.index + (s.solved ? 1 : 0)} total={s.ids.length} width={width} />

      {/* Warm storybook clue card */}
      <View
        style={{
          alignSelf: "stretch",
          backgroundColor: C.cream,
          borderRadius: 18,
          borderWidth: 2,
          borderColor: C.line,
          padding: 14,
          gap: 6,
        }}
      >
        <Copy style={{ fontSize: 13, fontWeight: "800", color: C.coral, textTransform: "uppercase" }}>
          {s.level === 4 ? "Word Parts" : "Spelling & Word Families"} · {q.skillLabel}
        </Copy>
        {q.context && (
          <Copy style={{ fontSize: 17, lineHeight: 23, color: ink, fontWeight: "600" }}>{q.context}</Copy>
        )}
        <Copy style={{ fontSize: 18, lineHeight: 24, color: ink, fontWeight: "800" }}>{q.prompt}</Copy>
      </View>

      {/* The wooden Sound Boat cargo deck */}
      <View
        style={{
          alignSelf: "stretch",
          alignItems: "center",
          backgroundColor: "#D8ECEF",
          borderRadius: 22,
          borderWidth: 2,
          borderColor: "#A5CED6",
          paddingTop: 12,
          paddingHorizontal: 10,
          gap: 4,
        }}
      >
        {isBuild ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {pieces.map((_, i) => {
              const tileIndex = s.draft[i];
              const text = tileIndex === undefined ? "" : q.tiles![tileIndex];
              const now = i === s.draft.length && !s.solved;
              const isMisfit = hint?.misfitBox === i;
              return (
                <PressableScale
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={
                    tileIndex === undefined
                      ? `Boat box ${i + 1}, empty`
                      : `Boat box ${i + 1}, ${text}${isMisfit ? ", does not fit yet" : ""}`
                  }
                  accessibilityHint={tileIndex === undefined || s.solved ? undefined : "Tap to remove this piece"}
                  disabled={tileIndex === undefined || s.solved || !active}
                  onPress={() => act({ type: "remove", at: i })}
                  style={{
                    minWidth: 92,
                    minHeight: 58,
                    paddingHorizontal: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    borderWidth: now || isMisfit ? 3 : 2,
                    borderColor: isMisfit ? C.coral : now ? C.gold : ink,
                    backgroundColor: s.solved ? C.success : now ? glow : C.paper,
                  }}
                >
                  <Copy
                    maxFontSizeMultiplier={letterFit(text || "part", pieceSize, room - 32, Infinity)}
                    style={{ fontSize: pieceSize, lineHeight: pieceSize * 1.25, color: ink, fontWeight: "800" }}
                  >
                    {text || "?"}
                  </Copy>
                </PressableScale>
              );
            })}
          </View>
        ) : (
          <View
            accessible
            accessibilityLabel={
              s.draft.length === 1
                ? `Selected word on sail: ${q.choices[s.draft[0]]?.label ?? ""}`
                : "Empty sail: choose a word card below"
            }
            style={{
              minWidth: 168,
              minHeight: 58,
              paddingHorizontal: 18,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              borderWidth: s.solved ? 3 : 2,
              borderColor: s.solved ? C.teal : s.draft.length ? C.gold : ink,
              backgroundColor: s.solved ? C.success : s.draft.length ? glow : C.paper,
            }}
          >
            <Copy style={{ fontSize: pieceSize, fontWeight: "800", color: ink }}>
              {s.draft.length === 1 ? q.choices[s.draft[0]]?.label : "Pick a word sail"}
            </Copy>
          </View>
        )}
        <Svg width={Math.min(width - 24, 330)} height="30" viewBox="0 0 310 30">
          <Path d="M7 2 L303 2 L273 24 L37 24 Z" fill="#B8875C" stroke={ink} strokeWidth="2" />
          <Path
            d="M0 28 Q24 18 48 28 T96 28 T144 28 T192 28 T240 28 T310 28"
            fill="none"
            stroke="#5B9ABA"
            strokeWidth="2"
          />
        </Svg>
      </View>

      {/* Opt-in hint banner (never shown until child asks for Help) */}
      {hint && !s.solved && (
        <View
          accessibilityLiveRegion="polite"
          style={{
            alignSelf: "stretch",
            backgroundColor: C.soft,
            borderRadius: 14,
            borderWidth: 2,
            borderColor: C.gold,
            padding: 10,
          }}
        >
          <Copy style={{ color: ink, fontSize: 15, fontWeight: "700", textAlign: "center" }}>{hint.clueText}</Copy>
        </View>
      )}

      {s.solved ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            alignSelf: "stretch",
            alignItems: "center",
            gap: 10,
            backgroundColor: C.success,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: C.teal,
            padding: 14,
          }}
        >
          <Heading style={{ fontSize: 24, color: ink, textAlign: "center" }}>
            {isBuild ? pieces.join("") : q.answer}!
          </Heading>
          <Copy style={{ color: ink, fontSize: 16, textAlign: "center" }}>{q.explanation}</Copy>
          <Button onPress={() => act({ type: "next" })} style={{ minHeight: 52, minWidth: 200 }}>
            {last ? "Reach the island" : "Sail on"}
          </Button>
        </View>
      ) : (
        <>
          {isBuild ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 420 }}>
              {q.tiles!.map((piece, i) => {
                const used = s.draft.includes(i);
                const lit = hint?.nextTrayTile === i;
                return (
                  <PressableScale
                    key={`${s.index}-${i}-${piece}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Word part ${piece}${used ? ", on the boat" : lit ? ", try this piece" : ""}`}
                    accessibilityState={{ disabled: used }}
                    disabled={used || !active}
                    onPress={() => act({ type: "add", tile: i })}
                    style={{
                      minWidth: 74,
                      minHeight: 56,
                      paddingHorizontal: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 14,
                      borderWidth: lit ? 4 : 2,
                      borderColor: lit ? C.gold : ink,
                      backgroundColor: lit ? glow : C.paper,
                      opacity: used ? 0.3 : 1,
                      shadowColor: ink,
                      shadowOpacity: used ? 0 : 0.14,
                      shadowRadius: 0,
                      shadowOffset: { width: 0, height: 3 },
                    }}
                  >
                    <Copy style={{ fontSize: pieceSize, color: ink, fontWeight: "800" }}>{piece}</Copy>
                  </PressableScale>
                );
              })}
            </View>
          ) : (
            <View style={{ alignSelf: "stretch", gap: 8 }}>
              {choices.map((c) => {
                const selected = s.draft[0] === c.originalIndex;
                return (
                  <PressableScale
                    key={c.value}
                    accessibilityRole="button"
                    accessibilityLabel={c.label}
                    accessibilityState={{ selected }}
                    disabled={!active}
                    onPress={() => act({ type: "pick", choice: c.originalIndex })}
                    style={{
                      minHeight: 54,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 16,
                      borderWidth: selected ? 3 : 2,
                      borderColor: selected ? C.coral : C.line,
                      backgroundColor: selected ? C.soft : C.paper,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Copy style={{ fontSize: 20, fontWeight: "800", color: ink }}>{c.label}</Copy>
                  </PressableScale>
                );
              })}
            </View>
          )}

          {s.missed && (
            <Copy accessibilityLiveRegion="polite" style={{ color: C.coral, fontSize: 16, fontWeight: "700", textAlign: "center" }}>
              Not quite yet! Adjust the pieces on the boat and check again.
            </Copy>
          )}

          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Button disabled={!canCheck} onPress={() => act({ type: "check" })} style={{ minHeight: 52, minWidth: 132 }}>
              Check
            </Button>
            <Button
              compact
              quiet
              icon="help"
              disabled={s.helped}
              label="Help: show a clue"
              onPress={() => act({ type: "help" })}
            >
              Help
            </Button>
            {isBuild && (
              <Button
                compact
                quiet
                disabled={s.draft.length === 0}
                label="Start this word over"
                onPress={() => act({ type: "reset" })}
              >
                Start over
              </Button>
            )}
          </View>
        </>
      )}
    </View>
  );
}
