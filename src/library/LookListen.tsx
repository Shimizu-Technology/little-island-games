import React, { useEffect, useMemo, useState } from "react";
import { PanResponder, Pressable, View, useWindowDimensions } from "react-native";
import { Text } from "../components/Text";
import { ItemPicture, LibraryIcon, s } from "./ui";
import { namingLabel, recordLabelSpeech, type CatalogItem } from "./catalog";
import type { Sentence } from "./schema";
export function LookListen({
  items,
  speak,
  stop,
  onExit,
}: {
  items: CatalogItem[];
  speak: (key: string, sentence?: Sentence) => void;
  stop: () => void;
  onExit: () => void;
}) {
  const { height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  useEffect(() => () => stop(), [stop]);
  const gesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, state) =>
          Math.abs(state.dx) > 24 && Math.abs(state.dx) > Math.abs(state.dy) * 1.5,
        onPanResponderRelease: (_, state) => {
          if (Math.abs(state.dx) > 50 && items.length) {
            stop();
            setIndex((position) => (position + (state.dx < 0 ? 1 : -1) + items.length) % items.length);
          }
        },
      }),
    [items.length, stop]
  );
  const record = items[index % Math.max(1, items.length)];
  const word = record ? namingLabel(record) : "";
  const [hint, setHint] = useState("");
  return (
    <View style={[s.page, { justifyContent: "center", backgroundColor: "#D9EAE0" }]} {...gesture.panHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Grown-up exit. Hold to exit."
        delayLongPress={1200}
        onLongPress={onExit}
        onPress={() => setHint("Hold the grown-up exit for a moment.")}
        style={[
          s.action,
          { position: "absolute", top: 12, right: 12, zIndex: 2, borderRadius: 24, backgroundColor: "#FFFBEF" },
        ]}
      >
        <LibraryIcon name="lock" size={24} />
      </Pressable>
      {record ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hear ${word}`}
          onPress={() => {
            const line = recordLabelSpeech(record);
            speak(line.key, line.sentence);
          }}
          style={{ flex: 1, justifyContent: "center", gap: 16 }}
        >
          <ItemPicture record={record} large pictureHeight={Math.max(230, height * 0.76)} />
          <Text style={[s.title, { textAlign: "center", fontSize: 38, paddingHorizontal: 16 }]}>{word}</Text>
          <Text style={[s.small, { textAlign: "center", paddingBottom: 14 }]}>
            Tap to hear · swipe for the next picture
          </Text>
        </Pressable>
      ) : (
        <Text style={s.body}>A grown-up can choose some pictures in Library settings.</Text>
      )}
      {!!hint && <Text style={s.small}>{hint}</Text>}
    </View>
  );
}
