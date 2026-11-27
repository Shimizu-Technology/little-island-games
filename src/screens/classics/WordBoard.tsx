import { Status, C, Button, Copy } from "../../board/WarmUI";

import { Text } from "../../components/Text";
import React, { useEffect, useRef, useState } from "react";
import { Animated, View, useWindowDimensions } from "react-native";

import { WordState, wordTiles, wordRules, wordStatus, wrongLetters } from "../../games/words";
import { HangmanFigure } from "../../components/HangmanFigure";

import { Controls, font } from "../../components/ui";

import { feel } from "../../components/feel";
import { nativeDriver, useReducedMotion } from "../../components/motion";

import { type Props, Cell, BoardArea, BoardLayout } from "./shared";
function LetterKey({
  letter,
  used,
  correct,
  done,
  onPress,
  size,
  fontScale,
}: {
  letter: string;
  used: boolean;
  correct: boolean;
  done: boolean;
  onPress: () => void;
  size: number;
  fontScale: number;
}) {
  const reduced = useReducedMotion(),
    [shake] = useState(() => new Animated.Value(0));
  const previous = useRef(used);
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    if (used && !previous.current && !correct && !reduced) {
      animation = Animated.sequence(
        [2, -3, 2, 0].map((toValue) =>
          Animated.timing(shake, { toValue, duration: 45, useNativeDriver: nativeDriver })
        )
      );
      animation.start();
    }
    previous.current = used;
    return () => animation?.stop();
  }, [used, correct, reduced, shake]);
  return (
    <Animated.View style={{ transform: [{ translateX: shake }] }}>
      <Cell
        label={`Letter ${letter}${used ? (correct ? ", found in word" : ", already tried") : ""}`}
        disabled={used || done}
        onPress={onPress}
        style={{
          width: size,
          height: Math.max(44, 19 * fontScale + 16),
          borderWidth: 1,
          borderColor: used ? "transparent" : C.line,
          borderRadius: 12,
          backgroundColor: correct ? C.success : used ? "#EEEDE6" : C.paper,
        }}
      >
        <Text
          style={{
            fontFamily: font,
            fontSize: 19,
            fontWeight: "800",
            color: used && !correct ? C.muted : C.ink,
          }}
        >
          {letter}
        </Text>
      </Cell>
    </Animated.View>
  );
}
export function WordBoard({
  state: s,
  width,
  sound,
  guess,
  reveal,
}: Props<WordState> & { guess: (letter: string) => void; reveal: () => void }) {
  const { fontScale } = useWindowDimensions();
  const status = wordStatus(s),
    done = status !== "playing",
    won = status === "won",
    lost = status === "lost";
  const challenge = wordRules(s) === "challenge",
    mistakes = wrongLetters(s),
    remaining = 6 - mistakes.length;
  const letters = [...new Set(s.word)],
    found = letters.filter((l) => s.guessed.includes(l)).length;
  const tiles = wordTiles(s.word.length, width, fontScale);
  const keySize = Math.max(44, 19 * fontScale + 16);
  const hintAvailable = !done && (!challenge || s.hints === 0);
  return (
    <BoardLayout clueFirst>
      <Status
        title={won ? "You solved the word!" : lost ? "No guesses left" : s.category}
        detail={
          won
            ? `${s.word}. ${s.hints ? "Solved with a hint. " : ""}${s.clue}`
            : lost
              ? `The word was ${s.word}. ${s.clue} Try a fresh round when you’re ready.`
              : s.clue
        }
        success={won}
      />
      <BoardArea>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={challenge ? "Wrong guesses" : "Letters found in practice"}
          accessibilityValue={
            challenge
              ? {
                  min: 0,
                  max: 6,
                  now: mistakes.length,
                  text: `${mistakes.length} of 6 wrong guesses. ${remaining} left.`,
                }
              : {
                  min: 0,
                  max: letters.length,
                  now: found,
                  text: `${found} of ${letters.length} different letters found`,
                }
          }
          style={{
            flexDirection: "row",
            alignSelf: "center",
            alignItems: "center",
            gap: 14,
            marginBottom: 4,
            paddingHorizontal: 16,
            paddingVertical: 4,
            borderRadius: 22,
            backgroundColor: "#F5EFE3",
            maxWidth: "100%",
          }}
        >
          <HangmanFigure mistakes={challenge ? mistakes.length : 0} won={won} />
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontFamily: font, fontSize: 17, fontWeight: "700", color: C.ink }}>
              {challenge
                ? won
                  ? "Word found!"
                  : lost
                    ? "Round finished"
                    : `${remaining} ${remaining === 1 ? "guess" : "guesses"} left`
                : won
                  ? "Word found!"
                  : "Practice · keep guessing"}
            </Text>
            <Copy style={{ fontSize: 13, lineHeight: 20, marginTop: 4 }}>
              {found} of {letters.length} different letters found
            </Copy>
            <Copy style={{ fontSize: 12, lineHeight: 18 }}>
              {challenge ? "Challenge · six wrong guesses" : "Practice · unlimited attempts"}
            </Copy>
            {challenge && (
              <View accessible={false} style={{ flexDirection: "row", gap: 5, marginTop: 10 }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: i < mistakes.length ? C.coral : C.paper,
                      borderColor: i < mistakes.length ? C.coral : "#B7BAAF",
                      borderWidth: 1,
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={{ gap: tiles.gap, marginBottom: 8 }}>
          {tiles.sizes.map((count, r) => (
            <View key={r} style={{ flexDirection: "row", justifyContent: "center", gap: tiles.gap }}>
              {[...s.word]
                .slice(
                  tiles.sizes.slice(0, r).reduce((a, b) => a + b, 0),
                  tiles.sizes.slice(0, r).reduce((a, b) => a + b, 0) + count
                )
                .map((letter, c) => {
                  const i = tiles.sizes.slice(0, r).reduce((a, b) => a + b, 0) + c,
                    guessed = s.guessed.includes(letter),
                    visible = guessed || lost;
                  return (
                    <View
                      key={i}
                      accessible
                      accessibilityLabel={`Letter ${i + 1} of ${s.word.length}: ${guessed ? letter : lost ? `${letter}, revealed answer` : "not found"}`}
                      style={{
                        width: tiles.tile,
                        height: tiles.tile * 1.12,
                        borderRadius: 8,
                        borderBottomWidth: 3,
                        borderColor: guessed ? C.teal : lost ? C.coral : C.line,
                        backgroundColor: C.paper,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {visible && (
                        <Text
                          accessible={false}
                          style={{
                            textAlign: "center",
                            fontSize: (tiles.tile * 0.55) / fontScale,
                            fontWeight: "800",
                            color: guessed ? C.ink : C.coral,
                          }}
                        >
                          {letter}
                        </Text>
                      )}
                    </View>
                  );
                })}
            </View>
          ))}
        </View>
        <View
          accessibilityLabel="Choose a letter"
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 5,
            width: Math.min(width, 540),
          }}
        >
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
            <LetterKey
              key={letter}
              letter={letter}
              used={s.guessed.includes(letter)}
              correct={s.guessed.includes(letter) && s.word.includes(letter)}
              done={done}
              size={keySize}
              fontScale={fontScale}
              onPress={() => {
                guess(letter);
                sound(s.word.includes(letter) ? "match" : "tap");
                if (!s.word.includes(letter)) feel("warning");
              }}
            />
          ))}
        </View>
      </BoardArea>
      {mistakes.length > 0 && (
        <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 12 }}>
          Wrong letters: {mistakes.join(" · ")}
        </Copy>
      )}
      {lost && (
        <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 8 }}>
          The coral letters show the answer you had not found.
        </Copy>
      )}
      <Controls>
        {!done && !s.custom && (
          <Button quiet onPress={() => sound(`clue-${s.word.toLowerCase()}`)}>
            Hear the clue
          </Button>
        )}
        {!done && (
          <Button
            quiet
            disabled={!hintAvailable}
            onPress={() => {
              reveal();
              sound("match");
            }}
          >
            {challenge ? (s.hints ? "Hint used" : "Reveal a letter · 1 hint") : "Reveal a letter"}
          </Button>
        )}
        {done && !s.custom && (
          <Button quiet onPress={() => sound(s.word.toLowerCase())}>
            Hear the word
          </Button>
        )}
      </Controls>
      {!done && (
        <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 14 }}>
          {challenge
            ? s.hints
              ? "This round used a hint. Assisted wins have their own record."
              : "Find every letter before your six wrong guesses run out."
            : "Take your time. Every letter is a chance to discover."}
        </Copy>
      )}
    </BoardLayout>
  );
}
