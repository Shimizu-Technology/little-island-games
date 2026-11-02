import React, { useMemo } from "react";
import { Image, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Text } from "../components/Text";
import { libraryAssets } from "./assets.generated";
import type { LibraryItem, Sentence } from "./schema";
import { Action, palette, s } from "./ui";
export function SentenceLine({
  sentence,
  selected,
  onSentence,
  onWord,
}: {
  sentence: Sentence;
  selected: boolean;
  onSentence: () => void;
  onWord?: (word: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Replay sentence: ${sentence.text}`}
      onPress={onSentence}
      style={{
        padding: 12,
        borderRadius: 14,
        backgroundColor: selected ? "#D9EBC8" : "transparent",
        borderLeftWidth: 4,
        borderColor: selected ? palette.ink : "transparent",
      }}
    >
      <Text style={s.body}>
        <Text accessibilityLabel="Replay sentence" onPress={onSentence}>
          ↺{" "}
        </Text>
        {sentence.text.split(/(\s+)/).map((word, i) =>
          onWord && word.trim() ? (
            <Text
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Hear word: ${word}`}
              onPress={(event) => {
                event.stopPropagation();
                onWord(word);
              }}
              style={{ textDecorationLine: selected ? "underline" : "none" }}
            >
              {word}
            </Text>
          ) : (
            word
          )
        )}
      </Text>
    </Pressable>
  );
}
export function Reader({
  book,
  page,
  onPage,
  selected,
  speak,
  word,
}: {
  book: Extract<LibraryItem, { type: "book" }>;
  page: number;
  onPage: (page: number) => void;
  selected: string;
  speak: (sentence: Sentence) => void;
  word: (word: string) => void;
}) {
  const { width, height } = useWindowDimensions();
  const index = Math.min(Math.max(0, page), book.pages.length - 1);
  const current = book.pages[index];
  const count = book.pages.length;
  const gesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 50) onPage(Math.min(count - 1, Math.max(0, index + (g.dx < 0 ? 1 : -1))));
        },
      }),
    [count, index, onPage]
  );
  const source = libraryAssets[current.image.path];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
      <View
        {...gesture.panHandlers}
        accessibilityLabel={`Book art, page ${index + 1}. Swipe left or use Next page.`}
        style={{ width: "100%", backgroundColor: "#E6DDC7" }}
      >
        {source && (
          <Image
            key={current.image.path}
            source={source}
            resizeMode="contain"
            fadeDuration={0}
            accessibilityLabel={current.image.alt}
            style={{ width: "100%", height: Math.min(width * 0.67, height * 0.62) }}
          />
        )}
      </View>
      <View
        style={{ padding: 14, backgroundColor: "#FFFBEF", maxWidth: 920, width: "100%", alignSelf: "center", gap: 10 }}
      >
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <Action label="Previous page" disabled={index === 0} onPress={() => onPage(index - 1)}>
            ←
          </Action>
          <Text style={s.small}>
            Page {index + 1} of {count}
          </Text>
          <Action label="Next page" disabled={index === count - 1} onPress={() => onPage(index + 1)}>
            →
          </Action>
        </View>
        {current.sentences.map((sentence) => (
          <SentenceLine
            key={sentence.id}
            sentence={sentence}
            selected={selected === sentence.id}
            onSentence={() => speak(sentence)}
            onWord={word}
          />
        ))}
        {!current.sentences.length && <Text style={s.small}>A picture to look at together.</Text>}
        <Text style={s.small}>Tap a word to hear it. Tap ↺ to replay the sentence.</Text>
        <Text style={s.small}>{book.edition.rights.credit}</Text>
        <Text style={s.small}>
          {current.image.rights.credit} · {current.image.rights.license}
        </Text>
      </View>
    </ScrollView>
  );
}
