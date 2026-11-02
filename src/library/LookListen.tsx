import React, { useEffect, useMemo, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import { Text } from "../components/Text";
import { ItemPicture, s } from "./ui";
import { recordSpeech, type CatalogItem } from "./catalog";
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
  const word = record?.item?.label.text ?? record?.legacy?.illustration.replace(/-/g, " ") ?? "";
  const [hint, setHint] = useState("");
  return (
    <View style={[s.page, { justifyContent: "center", padding: 24 }]} {...gesture.panHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Grown-up exit. Hold to exit."
        delayLongPress={1200}
        onLongPress={onExit}
        onPress={() => setHint("Hold the grown-up exit for a moment.")}
        style={[s.action, { alignSelf: "flex-end", marginBottom: 18 }]}
      >
        <Text style={s.small}>Grown-up exit · hold</Text>
      </Pressable>
      {record ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hear ${word}`}
          onPress={() => {
            const line = recordSpeech(record);
            speak(line.key, line.sentence);
          }}
          style={{ flex: 1, justifyContent: "center", gap: 30 }}
        >
          <ItemPicture record={record} large />
          <Text style={[s.title, { textAlign: "center", fontSize: 38 }]}>{word}</Text>
          <Text style={[s.small, { textAlign: "center" }]}>Tap to hear · swipe for the next picture</Text>
        </Pressable>
      ) : (
        <Text style={s.body}>A grown-up can choose some pictures in Library settings.</Text>
      )}
      {!!hint && <Text style={s.small}>{hint}</Text>}
    </View>
  );
}
