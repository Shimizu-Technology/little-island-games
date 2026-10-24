import React, { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { Button, C, Copy, Heading, IconButton, PressableScale } from "../../../components/ui";
import { nativeDriver, useReducedMotion } from "../../../components/motion";
import type { BoardProps } from "../../types";
import { Scene, PictureObject } from "../../art/Objects";
import { ReadingText } from "../../kit/ReadingText";
import { sceneLabel, tokens, wordAudio } from "../../kit/reading";
import {
  pageComplete,
  tale,
  taleAnswer,
  taleModel,
  taleNext,
  talePage,
  talePick,
  taleTap,
  taleTurn,
  type TaleState,
} from "./engine";

export function Board({ session, update, practice, sound, soundOn, width, height, active }: BoardProps<TaleState>) {
  const s = session.state,
    t = tale(s),
    reduced = useReducedMotion();
  const [glow] = useState(() => new Animated.Value(1));
  const complete = s.page < t.pages.length && pageComplete(s);
  useEffect(() => {
    glow.stopAnimation();
    glow.setValue(1);
    if (complete && active && !reduced) {
      Animated.sequence([
        Animated.timing(glow, { toValue: 1.06, duration: 240, useNativeDriver: nativeDriver }),
        Animated.timing(glow, { toValue: 1, duration: 300, useNativeDriver: nativeDriver }),
      ]).start();
    }
    return () => glow.stopAnimation();
  }, [complete, active, reduced, glow]);
  if (s.done)
    return (
      <View style={{ alignItems: "center", gap: 12, padding: 16 }}>
        <PictureObject name="turtle" size={100} />
        <Heading>You read {t.title.toLowerCase()}.</Heading>
        <Copy>The turtle took every step with you.</Copy>
      </View>
    );
  if (s.page === t.pages.length) {
    const q = t.questions[s.question],
      correct = q.scenes[0],
      wrong = s.wrong === null ? null : q.scenes[s.orders[s.question][s.wrong]],
      key = wrong ? (["subject", "object", "relation"] as const).find((k) => wrong[k] !== correct[k]) : undefined;
    const cw = Math.min(208, (width - 14) / 3);
    return (
      <View style={{ alignItems: "center", gap: 12 }}>
        <Copy>Picture {s.question + 1} of 2 · Look back in your mind.</Copy>
        <ReadingText
          text={q.prompt}
          highlight={key === "relation" ? "where" : key === "object" ? "what" : key ? correct[key] : undefined}
          onWord={(_, w) => active && sound(wordAudio(w))}
        />
        <Button
          compact
          quiet
          icon="sound-on"
          disabled={!soundOn}
          onPress={() => sound(`turtle-tales-${t.id}-question-${s.question}`)}
        >
          Hear the words
        </Button>
        <View style={{ flexDirection: "row", gap: 7 }}>
          {s.orders[s.question].map((n, i) => (
            <PressableScale
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Story picture ${i + 1}: ${sceneLabel(q.scenes[n])}`}
              accessibilityState={{ selected: s.solved && i === taleAnswer(s), disabled: s.solved }}
              disabled={s.solved || !active}
              onPress={() => {
                const next = talePick(s, i);
                practice("read.meaning", next.solved);
                // The story's phonics skill is credited only by understanding it on the first try.
                if (s.wrong === null) practice(t.skill, next.solved);
                sound(next.solved ? "match" : "turtle-tales-look");
                update(next);
              }}
              style={{
                width: cw,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: s.wrong === i ? C.coral : s.solved && i === taleAnswer(s) ? C.teal : C.line,
                backgroundColor: C.paper,
                alignItems: "center",
                overflow: "hidden",
                paddingVertical: 8,
              }}
            >
              <Scene scene={q.scenes[n]} width={cw - 6} height={108} />
              <Copy>
                {i + 1}
                {s.solved && i === taleAnswer(s) ? " ✓" : ""}
              </Copy>
            </PressableScale>
          ))}
        </View>
        <Copy style={{ textAlign: "center", color: C.ink }}>
          {s.solved
            ? "That is the picture from the story."
            : s.wrong !== null
              ? "One word changed. Look at that word and try again."
              : "Which picture was in your tale?"}
        </Copy>
        {s.solved && (
          <Button compact onPress={() => active && update(taleNext(s))}>
            {s.question === 1 ? "Finish the tale" : "One more picture"}
          </Button>
        )}
      </View>
    );
  }
  const page = t.pages[s.page],
    words = tokens(page.text),
    small = height < 730;
  return (
    <View style={{ alignItems: "center", gap: small ? 6 : 10 }}>
      <Copy style={{ fontSize: 13, textAlign: "center" }}>
        {t.title} · {s.page + 1} / {t.pages.length}
      </Copy>
      {session.options.mode === "together" && (
        <Copy style={{ color: C.teal, fontWeight: "700" }}>
          {session.names?.[taleTurn(s)] ?? `Player ${taleTurn(s) + 1}`} reads this sentence
        </Copy>
      )}
      <Animated.View style={{ transform: [{ scale: glow }] }}>
        <Scene scene={page.scene} width={Math.min(width, 300)} height={small ? 88 : 118} />
      </Animated.View>
      <View style={{ width: Math.min(width, 390), height: 46, justifyContent: "flex-end" }}>
        <View
          style={{
            position: "absolute",
            left: Math.min(s.word / words.length, 1) * (Math.min(width, 390) - 36),
            bottom: 5,
          }}
        >
          <PictureObject name="turtle" size={36} />
        </View>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {words.map((_, i) => (
            <View
              key={i}
              accessibilityLabel={`Stone ${i + 1}${i < s.word ? ", reached" : ""}`}
              style={{
                height: i === s.word ? 12 : 8,
                flex: 1,
                borderRadius: 9,
                backgroundColor: i < s.word ? C.teal : i === s.word ? C.gold : "#C6D3C5",
              }}
            />
          ))}
        </View>
      </View>
      <ReadingText
        text={page.text}
        current={s.word}
        compact={small}
        onWord={(i, w) => {
          if (!active) return;
          if (i < s.word) {
            sound(wordAudio(w));
            return;
          }
          const next = taleTap(s, i);
          if (!complete) {
            practice("read.careful-reading", i === s.word);
            if (i === s.word) sound("tap");
            else sound("turtle-tales-next-word");
            update(next);
          }
        }}
      />
      {complete ? (
        <>
          <Copy style={{ color: C.teal, fontSize: 14 }}>Every word read. The picture comes alive.</Copy>
          <Button compact onPress={() => active && update(talePage(s))}>
            {s.page === t.pages.length - 1 ? "Look for the story pictures" : "Turn the page"}
          </Button>
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Copy style={{ fontSize: 14, color: C.ink }}>
              {s.pointed ? `Next is “${words[s.word]}”. Try that stone.` : "Read and tap the next warm word."}
            </Copy>
            <IconButton
              icon="sound-on"
              label={`Hear the next word: ${words[s.word]}`}
              disabled={!soundOn}
              onPress={() => sound(wordAudio(words[s.word]))}
            />
          </View>
          <Button
            compact
            quiet
            icon="sound-on"
            disabled={!soundOn || s.modelPages.includes(s.page)}
            onPress={() => {
              if (active) {
                update(taleModel(s));
                sound(`turtle-tales-${t.id}-page-${s.page}`);
              }
            }}
          >
            {s.modelPages.includes(s.page) ? "Page model heard" : "Read it to me first"}
          </Button>
        </>
      )}
    </View>
  );
}
export function Art({ size }: { size: number }) {
  return <PictureObject name="turtle" size={size} />;
}
