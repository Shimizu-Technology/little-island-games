import React, { useMemo } from "react";
import { Image, Modal, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Text } from "../components/Text";
import { libraryAssets } from "./assets.generated";
import type { LibraryItem, Sentence } from "./schema";
import { Action, LibraryIcon, palette, s } from "./ui";
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
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ paddingTop: 5, opacity: 0.65 }}>
          <LibraryIcon name="sound" size={22} />
        </View>
        <Text style={[s.body, { flex: 1 }]}>
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
      </View>
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
  showInfo = false,
  onCloseInfo = () => {},
}: {
  book: Extract<LibraryItem, { type: "book" }>;
  page: number;
  onPage: (page: number) => void;
  selected: string;
  speak: (sentence: Sentence) => void;
  word: (word: string) => void;
  showInfo?: boolean;
  onCloseInfo?: () => void;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const landscape = width > 800 && width > height && fontScale < 1.5;
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
    <View style={{ flex: 1, backgroundColor: "#FFFBEF" }}>
      <ScrollView key={index} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View
          {...gesture.panHandlers}
          accessibilityLabel={`Book art, page ${index + 1}. Swipe left or use Next page.`}
          style={{
            width: "100%",
            flex: 1,
            minHeight: landscape ? Math.max(280, height - 245) : width * 0.67,
            backgroundColor: "white",
          }}
        >
          {source && (
            <Image
              key={current.image.path}
              source={source}
              resizeMode="contain"
              fadeDuration={0}
              accessibilityLabel={current.image.alt}
              style={{ width: "100%", flex: 1, minHeight: landscape ? Math.max(280, height - 245) : width * 0.67 }}
            />
          )}
        </View>
        <View
          style={{
            width: "100%",
            paddingHorizontal: width < 650 ? 8 : 32,
            paddingVertical: 12,
            gap: 4,
            backgroundColor: "#FFFBEF",
          }}
        >
          {current.sentences.map((sentence) => (
            <SentenceLine
              key={sentence.id}
              sentence={sentence}
              selected={selected === sentence.id}
              onSentence={() => speak(sentence)}
              onWord={word}
            />
          ))}
          {!current.sentences.length && (
            <Text style={[s.body, { textAlign: "center" }]}>A picture to look at together.</Text>
          )}
          {(index === 0 || index === count - 1) && <BookCredits book={book} />}
        </View>
      </ScrollView>
      <View
        style={[
          s.row,
          {
            justifyContent: "space-between",
            padding: 8,
            borderTopWidth: 1,
            borderColor: "#E5DCC6",
            backgroundColor: "#FFFBEF",
          },
        ]}
      >
        <Action label="Previous page" disabled={index === 0} onPress={() => onPage(index - 1)}>
          <LibraryIcon name="back" size={32} />
        </Action>
        <Text style={s.small}>
          Page {index + 1} of {count}
        </Text>
        <Action label="Next page" disabled={index === count - 1} onPress={() => onPage(index + 1)}>
          <LibraryIcon name="next" size={32} />
        </Action>
      </View>
      <Modal visible={showInfo} transparent animationType="none" onRequestClose={onCloseInfo}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#254E4B66" }}>
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: palette.paper,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "85%",
              padding: 22,
              gap: 14,
            }}
          >
            <Action label="Close book information" onPress={onCloseInfo}>
              Back to my book
            </Action>
            <ScrollView>
              <BookCredits book={book} />
              <Text style={[s.body, { marginVertical: 16 }]}>
                Tap a word to hear it. Tap a sentence or its speaker to hear the sentence. Swipe the picture or use the
                arrows to turn the page.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** One deduplicated credit list, on the title/end pages and in the information sheet. */
export function BookCredits({ book }: { book: Extract<LibraryItem, { type: "book" }> }) {
  const rights = [
    ...new Map(
      [book.edition.rights, book.rights, ...book.pages.map((page) => page.image.rights)]
        .reverse()
        .map((right) => [`${right.credit}:${right.license}`, right])
    ).values(),
  ];
  return (
    <View style={{ gap: 8, padding: 16 }}>
      <Text style={s.heading}>{book.title}</Text>
      {rights.map((right, i) => (
        <View key={i} style={{ gap: 3 }}>
          <Text style={s.small}>{right.credit}</Text>
          <Text selectable style={s.small}>
            {right.license} · {right.creator}
          </Text>
          {!!right.changes && <Text style={s.small}>{right.changes}</Text>}
          <Text selectable style={s.small}>
            {right.sourceUrl}
          </Text>
        </View>
      ))}
    </View>
  );
}
