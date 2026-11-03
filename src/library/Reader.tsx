import React, { useMemo } from "react";
import { Image, Modal, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Text } from "../components/Text";
import { libraryAssets } from "./assets.generated";
import type { LibraryItem, Sentence } from "./schema";
import { Action, LibraryIcon, palette, s } from "./ui";
import { isPageSwipe, swipeTarget } from "./swipe";
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
  const words = [...new Set(sentence.text.split(/\s+/).filter(word => /[a-z0-9]/i.test(word)))];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Replay sentence: ${sentence.text}`}
      accessibilityActions={onWord ? words.map((word, i) => ({ name: `word-${i}`, label: `Hear word: ${word}` })) : undefined}
      onAccessibilityAction={onWord ? (event) => {
        const index = Number(event.nativeEvent.actionName.replace(/^word-/, ""));
        if (event.nativeEvent.actionName === `word-${index}` && words[index]) onWord(words[index]);
      } : undefined}
      onPress={onSentence}
      style={{
        paddingVertical: 5,
        paddingHorizontal: 2,
        minHeight: 44,
        borderRadius: 10,
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
            onWord && /[a-z0-9]/i.test(word) ? (
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
        onMoveShouldSetPanResponder: (_, g) => isPageSwipe(g.dx, g.dy),
        onPanResponderRelease: (_, g) => {
          const next = swipeTarget(g.dx, index, count);
          if (next !== undefined) onPage(next);
        },
      }),
    [count, index, onPage]
  );
  const source = libraryAssets[current.image.path];
  const resolved = source
    ? Image.resolveAssetSource
      ? Image.resolveAssetSource(source)
      : typeof source === "object"
        ? (source as { width?: number; height?: number })
        : undefined
    : undefined;
  // Fit the complete illustration into a viewport-sized stage. The image itself,
  // rather than a flex child with only a minimum height, owns its aspect ratio.
  const ratio = resolved?.width && resolved?.height ? resolved.width / resolved.height : 1.5;
  const stage = landscape ? Math.max(280, height - 245) : width / ratio;
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFBEF" }}>
      <ScrollView key={index} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* One swipe surface for the whole page (art, text band and the paper below it). Word and
            sentence taps stay taps, and a mostly vertical drag still scrolls a long text band. */}
        <View testID="reader-swipe-surface" {...gesture.panHandlers} style={{ flexGrow: 1 }}>
          <View
            accessibilityLabel={`Book art, page ${index + 1}. Swipe left or use Next page.`}
            style={{
              width: "100%",
              height: stage,
              alignItems: "center",
              justifyContent: "center",
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
                style={{ width: "100%", height: Math.min(stage, width / ratio) }}
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
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s.small}>
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
      <Text maxFontSizeMultiplier={1.6} style={s.heading}>{book.title}</Text>
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
