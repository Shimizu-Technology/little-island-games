import React, { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";
import { Button, C, Copy, Heading, PressableScale } from "../../../components/ui";
import { nativeDriver, useReducedMotion } from "../../../components/motion";
import type { BoardProps } from "../../types";
import { ObjectGlyph, PictureObject } from "../../art/Objects";
import { boatMove, boatSlots, boatTurn, boatWord, missingSlots, type BoatAction, type BoatState } from "./engine";
import { pictureFor } from "../../content/reading/clues";
import { wordAudio } from "../../kit/reading";

const tileStyle = {
  minWidth: 44,
  minHeight: 48,
  paddingHorizontal: 10,
  justifyContent: "center" as const,
  alignItems: "center" as const,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: C.ink,
  backgroundColor: C.paper,
};
function Clue({ word, size }: { word: string; size: number }) {
  const picture = pictureFor(word);
  return picture ? (
    <PictureObject name={picture} size={size} />
  ) : (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Listen for the word">
      <Path d="M41 80 Q31 62 44 48 Q62 25 75 43 Q84 57 65 68 L60 82" fill="none" stroke={C.ink} strokeWidth="7" />
      <Path d="M18 27 Q1 51 18 73 M28 37 Q18 51 28 64" fill="none" stroke={C.blue} strokeWidth="5" />
    </Svg>
  );
}
export function Board({ session, update, practice, sound, soundOn, width, height, active }: BoardProps<BoatState>) {
  const s = session.state,
    word = boatWord(s),
    compact = height < 730,
    reduced = useReducedMotion();
  const [rock] = useState(() => new Animated.Value(0));
  // A restored round waits for a listening tap; later word/stage changes follow play.
  const last = useRef(`${s.index}-${s.stage}`);
  useEffect(() => {
    const key = `${s.index}-${s.stage}`;
    if (active && key !== last.current && s.stage !== "done") {
      last.current = key;
      sound(
        s.stage === "count" ? wordAudio(word.word) : s.stage === "letters" ? "sound-boat-letters" : "sound-boat-sail"
      );
    }
  }, [active, s.index, s.stage, sound, word.word]);
  useEffect(() => {
    if (!active || reduced) {
      rock.stopAnimation();
      rock.setValue(0);
    }
    return () => rock.stopAnimation();
  }, [active, reduced, rock]);
  function move(a: BoatAction) {
    if (!active) return;
    const next = boatMove(s, a);
    if (next === s) return;
    if (a.type === "letter" || a.type === "count") {
      const good = next.feedback === "none";
      practice(word.skill, good);
      sound(good ? "match" : `sound-boat-segment-${word.word}`);
      if (!good && !reduced) {
        rock.setValue(0);
        Animated.sequence([
          Animated.timing(rock, { toValue: 1, duration: 100, useNativeDriver: nativeDriver }),
          Animated.timing(rock, { toValue: -1, duration: 160, useNativeDriver: nativeDriver }),
          Animated.timing(rock, { toValue: 0, duration: 120, useNativeDriver: nativeDriver }),
        ]).start();
      }
    }
    if (a.type === "hint") sound(`sound-boat-segment-${word.word}`);
    if (a.type === "add") sound("tap");
    update(next);
  }
  if (s.stage === "done")
    return (
      <View style={{ alignItems: "center", gap: 12, padding: 16 }}>
        <PictureObject name="boat" size={120} />
        <Heading>The boat reached the island.</Heading>
        <Copy>Ten words, one sound at a time.</Copy>
      </View>
    );
  const base = boatSlots(s),
    missing = missingSlots(s),
    current = missing[s.loaded];
  const tileChoices = [...new Set([...word.tiles, "a", "e", "i", "o", "u", "s", "t", "p", "sh"])].slice(0, 10).sort();
  const loaded = base.map((t, i) => t || (missing.indexOf(i) < s.loaded ? word.tiles[i] : ""));
  const who = session.names?.[boatTurn(s, session.options)] ?? `Player ${boatTurn(s, session.options) + 1}`;
  return (
    <View style={{ gap: compact ? 5 : 10, alignItems: "center" }}>
      <Copy style={{ fontSize: 13 }}>
        Word {s.index + 1} of 10{s.index >= 2 ? ` · ladder ${s.index < 6 ? 1 : 2}` : " · sound warm-up"}
      </Copy>
      {!compact && (
        <Svg
          width={Math.min(width, 350)}
          height="32"
          viewBox="0 0 350 32"
          accessibilityLabel={`${s.index} words sailed toward the island`}
        >
          <Path d="M10 25 L330 25" stroke="#91C6D3" strokeWidth="3" />
          <Ellipse cx="331" cy="25" rx="18" ry="6" fill="#E6D3AC" />
          <Path
            d="M330 22 L330 5 M330 5 Q313 0 317 10 M330 5 Q345 0 345 11"
            stroke={C.teal}
            fill="none"
            strokeWidth="3"
          />
          <Path d={`M${8 + s.index * 31} 12 l25 0 l-6 9 l-13 0 Z`} fill="#B8875C" stroke={C.ink} strokeWidth="2" />
        </Svg>
      )}
      {session.options.mode !== "solo" && (
        <Copy style={{ color: C.teal, fontWeight: "700", textAlign: "center" }}>
          {who}:{" "}
          {session.options.mode === "together"
            ? s.stage === "count"
              ? "say and count the sounds"
              : "pick the letters"
            : "build this word"}
        </Copy>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
        <Clue word={word.word} size={compact ? 48 : 82} />
        {!soundOn && <Copy style={{ color: C.ink, fontWeight: "700", fontSize: 20 }}>{word.word}</Copy>}
        <Button
          compact
          quiet
          icon="sound-on"
          disabled={!soundOn}
          label="Hear the picture word"
          onPress={() => sound(wordAudio(word.word))}
        >
          Hear word
        </Button>
      </View>
      <Copy style={{ color: C.ink, fontSize: 16, textAlign: "center", lineHeight: 22 }}>
        {s.stage === "count"
          ? "One box for each sound you hear."
          : s.stage === "letters"
            ? s.index > 2 && s.index !== 6
              ? "Change one sound. Keep the others."
              : "Load the letters for each sound."
            : `You built ${word.word}!`}
      </Copy>
      <Animated.View
        style={{
          transform: [{ rotate: rock.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-3deg", "0deg", "3deg"] }) }],
          alignSelf: "stretch",
          alignItems: "center",
          backgroundColor: "#D1E8EF",
          borderRadius: 22,
          padding: 10,
          paddingBottom: 5,
        }}
      >
        <View style={{ flexDirection: "row", gap: 5, justifyContent: "center", minHeight: 48 }}>
          {s.stage === "count"
            ? Array.from({ length: s.count }, (_, i) => (
                <View
                  key={i}
                  accessibilityLabel={`Sound box ${i + 1}`}
                  style={[tileStyle, { width: Math.min(46, (width - 65) / 6), minWidth: 32, paddingHorizontal: 0 }]}
                >
                  <Copy style={{ color: C.ink }}>●</Copy>
                </View>
              ))
            : loaded.map((t, i) => (
                <View
                  key={i}
                  style={[
                    tileStyle,
                    {
                      minWidth: Math.max(44, Math.min(58, (width - 65) / 5)),
                      paddingHorizontal: 5,
                      backgroundColor: i === current ? "#F9EDC9" : t ? C.success : C.paper,
                    },
                  ]}
                >
                  <Copy style={{ fontSize: 22, color: C.ink, fontWeight: "700" }}>{t || "·"}</Copy>
                </View>
              ))}
        </View>
        <Svg width={Math.min(width - 18, 310)} height="30" viewBox="0 0 310 30">
          <Path d="M7 2 L303 2 L273 24 L37 24 Z" fill="#B8875C" stroke={C.ink} strokeWidth="2" />
          <Path
            d="M0 28 Q24 18 48 28 T96 28 T144 28 T192 28 T240 28 T310 28"
            fill="none"
            stroke="#5B9ABA"
            strokeWidth="2"
          />
        </Svg>
      </Animated.View>
      <View accessibilityLiveRegion="polite" style={{ minHeight: 22 }}>
        <Copy
          style={{ color: s.feedback === "none" ? C.muted : C.ink, textAlign: "center", fontSize: 14, lineHeight: 20 }}
        >
          {s.feedback === "count"
            ? "Say it slowly. Does each sound have a box?"
            : s.feedback === "letter"
              ? "That letter makes a different sound. Listen and try again."
              : s.feedback === "hint"
                ? word.tiles.join(" · ").replaceAll("_", "…")
                : s.stage === "count" && s.index > 2 && s.index !== 6
                  ? "The next word changes just one sound."
                  : ""}
        </Copy>
      </View>
      {s.stage === "count" ? (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              compact
              quiet
              disabled={s.count === 0}
              label="Remove a sound box"
              onPress={() => move({ type: "remove" })}
            >
              − box
            </Button>
            <Button compact label="Add a sound box" disabled={s.count === 6} onPress={() => move({ type: "add" })}>
              + sound
            </Button>
          </View>
          <Button compact onPress={() => move({ type: "count" })}>
            Load letters
          </Button>
        </>
      ) : s.stage === "letters" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 420 }}>
          {tileChoices.map((tile) => (
            <PressableScale
              key={tile}
              accessibilityRole="button"
              accessibilityLabel={`Letter tile ${tile.replace("_", " silent ")}`}
              onPress={() => move({ type: "letter", tile })}
              style={[
                tileStyle,
                { backgroundColor: s.feedback === "hint" && tile === word.tiles[current] ? "#F9EDC9" : C.paper },
              ]}
            >
              <Copy style={{ fontSize: 22, lineHeight: 28, color: C.ink }}>{tile.replace("_", "…")}</Copy>
            </PressableScale>
          ))}
        </View>
      ) : (
        <Button compact onPress={() => move({ type: "next" })}>
          {s.index === 9 ? "Sail to the island" : "Sail to the next word"}
        </Button>
      )}
      {s.stage !== "sail" && (
        <Button compact quiet icon="help" onPress={() => move({ type: "hint" })}>
          Help me hear the sounds
        </Button>
      )}
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx="50" cy="77" rx="48" ry="17" fill="#91C6D3" />
      <ObjectGlyph name="boat" size={92} x={4} />
    </Svg>
  );
}
