import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Modal, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Text } from "../components/Text";
import { libraryAssets } from "./assets.generated";
import type { CatalogItem } from "./catalog";
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
  const words = [...new Set(sentence.text.split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)))];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Replay sentence: ${sentence.text}`}
      accessibilityActions={onWord ? words.map((word, i) => ({ name: `word-${i}`, label: `Hear word: ${word}` })) : undefined}
      onAccessibilityAction={
        onWord
          ? (event) => {
              const index = Number(event.nativeEvent.actionName.replace(/^word-/, ""));
              if (event.nativeEvent.actionName === `word-${index}` && words[index]) onWord(words[index]);
            }
          : undefined
      }
      onPress={onSentence}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 6,
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: selected ? "#D9EBC8" : "transparent",
        borderLeftWidth: 4,
        borderColor: selected ? (palette?.ink ?? "#3D2B24") : "transparent",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ paddingTop: 5, opacity: selected ? 1 : 0.65 }}>
          <LibraryIcon name="sound" size={22} />
        </View>
        <Text style={[s?.body, { flex: 1 }]}>
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
  readingPage,
  onReadPage,
  onStopReading,
  onDrawAbout,
  relatedBooks = [],
  onOpenBook,
}: {
  book: Extract<LibraryItem, { type: "book" }>;
  page: number;
  onPage: (page: number) => void;
  selected: string;
  speak: (sentence: Sentence) => void;
  word: (word: string) => void;
  showInfo?: boolean;
  onCloseInfo?: () => void;
  readingPage?: boolean;
  onReadPage?: (sentences: Sentence[]) => void;
  onStopReading?: () => void;
  onDrawAbout?: () => void;
  relatedBooks?: CatalogItem[];
  onOpenBook?: (id: string) => void;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const landscape = width > 800 && width > height && fontScale < 1.5;
  const index = Math.min(Math.max(0, page), book.pages.length - 1);
  const current = book.pages[index];
  const count = book.pages.length;
  const progressPercent = Math.round(((index + 1) / Math.max(1, count)) * 100);
  const isLastPage = index === count - 1;

  // Standalone user-driven active highlight when Reader is rendered without parent sequencing.
  // Never uses reading timers.
  const currentPageKey = `${book.id ?? book.title}:${index}`;
  const [localState, setLocalState] = useState<{ pageKey: string; active: boolean; sentenceId: string }>({
    pageKey: "",
    active: false,
    sentenceId: "",
  });

  const stopLocalReading = useCallback(() => {
    setLocalState({ pageKey: "", active: false, sentenceId: "" });
  }, []);

  const stopAllReading = useCallback(() => {
    stopLocalReading();
    onStopReading?.();
  }, [stopLocalReading, onStopReading]);

  useEffect(() => {
    return () => {
      onStopReading?.();
    };
  }, [onStopReading]);

  const localReading = localState.pageKey === currentPageKey && localState.active;
  const localSelected = localState.pageKey === currentPageKey ? localState.sentenceId : "";
  const isReadingPage = onReadPage ? !!readingPage : localReading;
  const activeSentenceId = selected || localSelected;

  const toggleReadPage = useCallback(() => {
    if (!current.sentences.length) return;
    if (isReadingPage) {
      stopAllReading();
      return;
    }
    if (onReadPage) {
      onReadPage(current.sentences);
      return;
    }
    const first = current.sentences[0];
    setLocalState({ pageKey: currentPageKey, active: true, sentenceId: first.id });
    speak(first);
  }, [current.sentences, currentPageKey, isReadingPage, onReadPage, speak, stopAllReading]);

  const turnPage = useCallback(
    (nextPage: number) => {
      stopAllReading();
      onPage(nextPage);
    },
    [onPage, stopAllReading]
  );

  const gesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => isPageSwipe(g.dx, g.dy),
        onPanResponderRelease: (_, g) => {
          const next = swipeTarget(g.dx, index, count);
          if (next !== undefined) {
            onStopReading?.();
            onPage(next);
          }
        },
      }),
    [count, index, onPage, onStopReading]
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
  const stage = landscape ? Math.max(280, height - 265) : width / ratio;
  const ink = palette?.ink ?? "#3D2B24";
  const muted = palette?.muted ?? "#665247";
  const border = palette?.border ?? "#E8D8BE";
  const paper = palette?.paper ?? "#FFFDF8";
  const lagoon = palette?.lagoon ?? "#DDF1EE";
  const lagoonInk = palette?.lagoonInk ?? "#1E6B66";

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFBEF" }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 8,
          paddingBottom: 6,
          backgroundColor: "#FFFBEF",
          borderBottomWidth: 1,
          borderColor: "#EFE3CE",
          gap: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View
            testID="reader-progress-bar"
            accessibilityRole="progressbar"
            accessibilityLabel={`Reading progress: page ${index + 1} of ${count}`}
            accessibilityValue={{ min: 1, max: count, now: index + 1 }}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 999,
              backgroundColor: "#EFE2C8",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                borderRadius: 999,
                backgroundColor: lagoonInk,
              }}
            />
          </View>
          <Text
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            style={[s?.small, { color: muted, fontWeight: "700", fontSize: 13 }]}
          >
            Page {index + 1} of {count}
          </Text>
        </View>
      </View>

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
              borderBottomWidth: 1,
              borderColor: "#EFE3CE",
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
              paddingHorizontal: width < 650 ? 10 : 32,
              paddingVertical: 14,
              gap: 6,
              backgroundColor: "#FFFBEF",
            }}
          >
            {current.sentences.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", marginBottom: 4 }}>
                <Pressable
                  testID="reader-read-page"
                  accessibilityRole="button"
                  accessibilityLabel={isReadingPage ? "Stop reading" : "Read page"}
                  accessibilityState={{ selected: isReadingPage }}
                  onPress={toggleReadPage}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 48,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: isReadingPage ? lagoon : paper,
                    borderWidth: 1.5,
                    borderColor: isReadingPage ? lagoonInk : border,
                    borderBottomWidth: 3,
                    borderBottomColor: isReadingPage ? lagoonInk : "rgba(61, 43, 36, 0.16)",
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <LibraryIcon name={isReadingPage ? "stop" : "play"} size={20} />
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={{
                      fontSize: 15.5,
                      fontWeight: "700",
                      color: isReadingPage ? lagoonInk : ink,
                    }}
                  >
                    {isReadingPage ? "Stop reading" : "Read page"}
                  </Text>
                </Pressable>
              </View>
            )}

            {current.sentences.map((sentence) => (
              <SentenceLine
                key={sentence.id}
                sentence={sentence}
                selected={activeSentenceId === sentence.id}
                onSentence={() => {
                  stopLocalReading();
                  speak(sentence);
                }}
                onWord={(spokenWord) => {
                  stopLocalReading();
                  word(spokenWord);
                }}
              />
            ))}
            {!current.sentences.length && (
              <Text style={[s?.body, { textAlign: "center" }]}>A picture to look at together.</Text>
            )}

            {isLastPage && (
              <View
                testID="reader-end-of-book"
                style={{
                  marginTop: 14,
                  padding: 18,
                  borderRadius: 24,
                  backgroundColor: paper,
                  borderWidth: 1.5,
                  borderColor: border,
                  borderBottomWidth: 3.5,
                  borderBottomColor: "rgba(61, 43, 36, 0.16)",
                  gap: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <LibraryIcon name="sparkles" size={28} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      maxFontSizeMultiplier={1.4}
                      style={[s?.heading, { marginTop: 0, fontSize: 21, lineHeight: 27, color: ink }]}
                    >
                      You finished {book.title}!
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={[s?.small, { color: muted }]}>
                      Great reading! Pick what you want to do next.
                    </Text>
                  </View>
                </View>

                <View style={[s?.row, { flexDirection: "row", flexWrap: "wrap", gap: 10 }]}>
                  <Action testID="reader-read-again" label="Read Again" onPress={() => turnPage(0)}>
                    Read Again
                  </Action>
                  {onDrawAbout && (
                    <Action testID="reader-draw-about" label="Draw About It" onPress={onDrawAbout}>
                      Draw About It
                    </Action>
                  )}
                </View>

                {relatedBooks.length > 0 && onOpenBook && (
                  <View style={{ gap: 8, paddingTop: 4 }}>
                    <Text
                      maxFontSizeMultiplier={1.3}
                      style={[s?.small, { fontWeight: "700", color: ink, fontSize: 15 }]}
                    >
                      More to Read
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                      {relatedBooks.slice(0, 2).map((related) => (
                        <Pressable
                          key={related.id}
                          testID={`reader-related-${related.id}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Read ${related.title}`}
                          onPress={() => {
                            stopAllReading();
                            onOpenBook(related.id);
                          }}
                          style={({ pressed }) => ({
                            flexGrow: 1,
                            flexBasis: 160,
                            minHeight: 54,
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 18,
                            backgroundColor: "#FFF6E5",
                            borderWidth: 1.5,
                            borderColor: border,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            opacity: pressed ? 0.8 : 1,
                          })}
                        >
                          <LibraryIcon name="books" size={24} />
                          <Text
                            maxFontSizeMultiplier={1.3}
                            numberOfLines={2}
                            style={{ flex: 1, fontSize: 15.5, fontWeight: "700", color: ink }}
                          >
                            {related.title}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {(index === 0 || isLastPage) && <BookCredits book={book} />}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          s?.row,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 8,
            borderTopWidth: 1,
            borderColor: "#E5DCC6",
            backgroundColor: "#FFFBEF",
          },
        ]}
      >
        <Action label="Previous page" disabled={index === 0} onPress={() => turnPage(index - 1)}>
          <LibraryIcon name="back" size={32} />
        </Action>
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={s?.small}>
          Page {index + 1} of {count}
        </Text>
        <Action label="Next page" disabled={isLastPage} onPress={() => turnPage(index + 1)}>
          <LibraryIcon name="next" size={32} />
        </Action>
      </View>

      <Modal visible={showInfo} transparent animationType="none" onRequestClose={onCloseInfo}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#254E4B66" }}>
          <View
            accessibilityViewIsModal
            style={{
              backgroundColor: paper,
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
              <Text style={[s?.body, { marginVertical: 16 }]}>
                Tap a word to hear it. Tap a sentence or Read page to listen along. Swipe the picture or use the arrows
                to turn the page.
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
      <Text maxFontSizeMultiplier={1.6} style={s?.heading}>
        {book.title}
      </Text>
      {rights.map((right, i) => (
        <View key={i} style={{ gap: 3 }}>
          <Text style={s?.small}>{right.credit}</Text>
          <Text selectable style={s?.small}>
            {right.license} · {right.creator}
          </Text>
          {!!right.changes && <Text style={s?.small}>{right.changes}</Text>}
          <Text selectable style={s?.small}>
            {right.sourceUrl}
          </Text>
        </View>
      ))}
    </View>
  );
}
