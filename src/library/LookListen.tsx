import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
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
  const [index, setIndex] = useState(0);
  const suppressTap = useRef(false);
  const [hint, setHint] = useState("");
  const [heard, setHeard] = useState(false);
  useEffect(() => () => stop(), [stop]);
  const gesture = useMemo(
    () =>
      // PanResponder stores callbacks; it does not read their refs during render.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, state) =>
          Math.abs(state.dx) > 24 && Math.abs(state.dx) > Math.abs(state.dy) * 1.5,
        onPanResponderRelease: (_, state) => {
          if (Math.abs(state.dx) > 50 && items.length) {
            suppressTap.current = true;
            setTimeout(() => {
              suppressTap.current = false;
            }, 0);
            const next = (index + (state.dx < 0 ? 1 : -1) + items.length) % items.length;
            stop();
            setIndex(next);
            setHeard(true);
            const line = recordLabelSpeech(items[next]);
            speak(line.key, line.sentence);
          }
        },
      }),
    [items, index, stop, speak]
  );
  const record = items[index % Math.max(1, items.length)];
  const word = record ? namingLabel(record) : "";
  const hear = () => {
    if (!record || suppressTap.current) return;
    const line = recordLabelSpeech(record);
    speak(line.key, line.sentence);
    setHeard(true);
  };
  return (
    <View style={s.page} {...gesture.panHandlers}>
      {record ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Hear ${word}`} onPress={hear} style={{ flex: 1 }}>
          <View style={{ flex: 1, minHeight: 0 }}>
            <ItemPicture record={record} large scene pictureHeight={undefined} fill />
          </View>
          <View
            style={{
              padding: 22,
              gap: 12,
              alignItems: "center",
              backgroundColor: "#FFF3D4",
              borderTopWidth: 3,
              borderColor: "#D9C491",
            }}
          >
            <Text style={[s.title, { textAlign: "center", fontSize: 44, lineHeight: 54 }]}>{word}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <LibraryIcon name="sound" size={30} />
              <Text style={s.small}>{heard ? "Tap to hear again" : "Tap to hear · swipe to explore"}</Text>
            </View>
            {!!hint && <Text style={[s.small, { textAlign: "center" }]}>{hint}</Text>}
          </View>
        </Pressable>
      ) : (
        <Text style={s.body}>A grown-up can choose some pictures in Library settings.</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Grown-up exit. Hold to exit."
        delayLongPress={1200}
        onLongPress={onExit}
        onPress={() => {
          hear();
          setHint("Hold the lock to leave.");
        }}
        style={[
          s.action,
          {
            position: "absolute",
            top: 12,
            right: 12,
            borderRadius: 26,
            backgroundColor: "#FFF5DC",
            borderColor: "#577E69",
            borderWidth: 2,
          },
        ]}
      >
        <LibraryIcon name="lock" size={24} />
      </Pressable>
    </View>
  );
}
