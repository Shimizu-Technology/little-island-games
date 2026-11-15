import React, { type ReactNode } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button, C, Copy, IconButton, PressableScale } from "../../../components/ui";
import { TapWords } from "../../reading/TapWords";
import { hasSilentE, firstMisfit, nextNeeded, type BuildTask } from "../../reading/build";
import { tileLabel } from "../../reading/graphemes";
import { glow, ink, letterFit } from "./shared";

/**
 * One word on the boat, built from pieces and settled with Check. The School board (Levels 4-5) and the Challenge
 * replay both draw this, so a puzzle looks the same wherever it is opened. Nothing is marked right or wrong until
 * Check; a miss leaves the word where it was. Nothing on this surface is timed.
 */
export type BuildBoatProps = {
  task: BuildTask;
  draft: readonly number[];
  helped: boolean;
  solved: boolean;
  /** The last Check was a miss and the word has not changed since. */
  missed: boolean;
  canCheck: boolean;
  onAdd: (at: number) => void;
  onRemove: (at: number) => void;
  onCheck: () => void;
  onHelp: () => void;
  onReset: () => void;
  onHear: () => void;
  sound: (key: string) => void;
  soundOn: boolean;
  /** Print the word even with sound on: an own-read dare asks the child to read it. */
  showWord?: boolean;
  /** Tapping a word of the finished sentence to hear it is a read-aloud act. */
  onHeard?: (word: string) => void;
  width: number;
  compact?: boolean;
  /** Shown once solved: the Sail on button on the School board, nothing in a Challenge. */
  done?: ReactNode;
  /** A short line above the boat. */
  prompt: string;
};
export function BuildBoat(p: BuildBoatProps) {
  const { task, draft, helped, solved } = p;
  const size = p.compact ? 24 : 28, room = Math.min(p.width, 420) - 40;
  const misfit = helped && !solved ? firstMisfit(task, draft) : null;
  const need = helped && !solved ? nextNeeded(task, draft) : null;
  const letters = task.level <= 3;
  const piece = (i: number) => (letters ? tileLabel(task.tray[i]) : task.tray[i]);
  const cue = task.cue;
  return (
    <View style={{ gap: p.compact ? 8 : 12, alignItems: "center", alignSelf: "stretch" }}>
      <Copy maxFontSizeMultiplier={1.4} style={{ color: ink, fontSize: 19, fontWeight: "600", textAlign: "center" }}>{p.prompt}</Copy>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {/* Own read: the printed word is there to read. Hearing it is still possible, and it ends the own-read mark. */}
        {(!p.soundOn || p.showWord) && (
          <Copy accessibilityLabel={`The word is ${task.word}`} style={{ color: ink, fontWeight: "800", fontSize: 28, lineHeight: 34 }} maxFontSizeMultiplier={letterFit(task.word, 28, room, Infinity)}>
            {task.word}
          </Copy>
        )}
        {p.soundOn && (
          <IconButton icon="sound-on" label={p.showWord ? "Hear the word. This ends your own read" : "Hear the word again"} onPress={p.onHear} size={56} />
        )}
        {cue && (
          <View accessible accessibilityLabel={cue.prefix ? `${cue.affix} plus ${cue.base}` : `${cue.base} plus ${cue.affix}`} style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
            {(cue.prefix ? [cue.affix, cue.base] : [cue.base, cue.affix]).flatMap((part, i) => [
              i ? <Copy key="plus" maxFontSizeMultiplier={1.3} style={{ fontSize: 24, lineHeight: 30, color: C.muted }}>+</Copy> : null,
              <Copy key={part} maxFontSizeMultiplier={letterFit(part, 24, room / 2.5, Infinity)} style={{ fontSize: 24, lineHeight: 30, color: ink, fontWeight: "700" }}>{part}</Copy>,
            ])}
          </View>
        )}
      </View>
      <View style={{ alignSelf: "stretch", alignItems: "center", backgroundColor: "#D1E8EF", borderRadius: 22, paddingTop: 10, paddingHorizontal: 8 }}>
        {/* Not one accessibility element: each box is its own button, so VoiceOver can reach and remove a chosen piece. */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {task.tiles.map((_, i) => {
            const at = draft[i];
            const text = at === undefined ? "" : piece(at);
            const now = i === draft.length && !solved;
            return (
              <PressableScale
                key={i}
                accessibilityRole="button"
                accessibilityLabel={at === undefined ? `Box ${i + 1}, empty${now ? ", the next piece goes here" : ""}` : `Box ${i + 1}, ${text}${misfit === i ? ", this piece does not fit yet" : ""}`}
                accessibilityHint={at === undefined || solved ? undefined : "Tap to take this piece out"}
                disabled={at === undefined || solved}
                onPress={() => p.onRemove(i)}
                style={{
                  minWidth: size * 1.9,
                  minHeight: size * 2.1,
                  paddingHorizontal: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  borderWidth: now || misfit === i ? 4 : 2,
                  borderColor: misfit === i ? C.coral : now ? C.gold : ink,
                  backgroundColor: solved ? C.success : now ? glow : C.paper,
                }}
              >
                <Copy maxFontSizeMultiplier={letterFit(text || "m", size, room - 28, Infinity)} style={{ fontSize: size, lineHeight: size * 1.25, color: ink, fontWeight: "700" }}>{text}</Copy>
              </PressableScale>
            );
          })}
          {hasSilentE(task) && (
            <View accessible accessibilityLabel="silent e" style={{ minWidth: size * 1.2, minHeight: size * 2.1, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 2, borderStyle: "dashed", borderColor: C.muted, backgroundColor: "#EEF3F6" }}>
              <Copy maxFontSizeMultiplier={1.3} style={{ fontSize: size, lineHeight: size * 1.25, color: C.muted, fontWeight: "700" }}>e</Copy>
            </View>
          )}
        </View>
        <Svg width={Math.min(p.width - 18, 330)} height="30" viewBox="0 0 310 30">
          <Path d="M7 2 L303 2 L273 24 L37 24 Z" fill="#B8875C" stroke={ink} strokeWidth="2" />
          <Path d="M0 28 Q24 18 48 28 T96 28 T144 28 T192 28 T240 28 T310 28" fill="none" stroke="#5B9ABA" strokeWidth="2" />
        </Svg>
      </View>
      {solved ? (
        <View style={{ alignItems: "center", gap: 10, alignSelf: "stretch" }}>
          <TapWords text={`${task.word}!`} sound={p.sound} soundOn={p.soundOn} onHeard={p.onHeard} />
          {cue && (
            <Copy maxFontSizeMultiplier={1.4} style={{ color: ink, textAlign: "center", fontSize: 18 }}>
              {cue.prefix ? `${cue.affix}- : ${cue.gloss}` : `-${cue.affix} : ${cue.gloss}`}
            </Copy>
          )}
          {p.done}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 420 }}>
            {task.tray.map((_, i) => {
              const used = draft.includes(i), lit = need === i;
              return (
                <PressableScale
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`Piece ${piece(i)}${used ? ", already on the boat" : lit ? ", try this one" : ""}`}
                  accessibilityState={{ disabled: used }}
                  disabled={used}
                  onPress={() => p.onAdd(i)}
                  style={{
                    minWidth: 64,
                    minHeight: 56,
                    paddingHorizontal: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    borderWidth: lit ? 4 : 2,
                    borderColor: lit ? C.gold : ink,
                    backgroundColor: lit ? glow : C.paper,
                    opacity: used ? 0.28 : 1,
                    shadowColor: ink,
                    shadowOpacity: used ? 0 : 0.18,
                    shadowRadius: 0,
                    shadowOffset: { width: 0, height: 3 },
                  }}
                >
                  <Copy maxFontSizeMultiplier={letterFit(piece(i), size, room - 36, Infinity)} style={{ fontSize: size, lineHeight: size * 1.25, color: ink, fontWeight: "700" }}>{piece(i)}</Copy>
                </PressableScale>
              );
            })}
          </View>
          {/* The same words and testID as the shared whole-answer controls, with text that stops growing at the largest sizes. */}
          <View style={{ gap: 10, alignItems: "center" }} testID="whole-answer-controls">
            {p.missed && <Copy accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.4} style={{ textAlign: "center" }}>Not quite yet. Your answer is still here.</Copy>}
            <Button disabled={!p.canCheck} onPress={p.onCheck}>Check</Button>
          </View>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Button compact quiet icon="help" disabled={helped} label="Help: show the next piece" onPress={p.onHelp}>Help</Button>
            <Button compact quiet disabled={!draft.length} label="Start this word over" onPress={p.onReset}>Start over</Button>
          </View>
        </>
      )}
    </View>
  );
}
