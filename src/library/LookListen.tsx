import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, View } from "react-native";
import { Text } from "../components/Text";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
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
  const nunitoLoaded = useNunitoLoaded();
  const displayBold = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
    : ({ fontWeight: "800" } as const);
  const bodyFont = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["600"], fontWeight: "normal" } as const)
    : undefined;
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
    <View style={[s.page, { backgroundColor: "#FFF6E5" }]} {...gesture.panHandlers}>
      {record ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Hear ${word}`} onPress={hear} style={{ flex: 1 }}>
          <View style={{ flex: 1, minHeight: 0 }}>
            <ItemPicture record={record} large scene pictureHeight={undefined} fill />
          </View>
          <View
            style={{
              paddingHorizontal: 22,
              paddingVertical: 20,
              gap: 10,
              alignItems: "center",
              backgroundColor: "#FFFDF8",
              borderTopWidth: 2,
              borderColor: "#E8D8BE",
            }}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={[s.title, displayBold, { textAlign: "center", fontSize: 42, lineHeight: 52, color: "#3D2B24" }]}
            >
              {word}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: "#FFF6E5",
                borderWidth: 1,
                borderColor: "#E8D8BE",
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <LibraryIcon name="sound" size={26} />
              <Text style={[s.small, bodyFont, { color: "#665247" }]}>
                {heard ? "Tap to hear again" : "Tap to hear · swipe to explore"}
              </Text>
            </View>
            {!!hint && <Text style={[s.small, bodyFont, { textAlign: "center", color: "#665247" }]}>{hint}</Text>}
          </View>
        </Pressable>
      ) : (
        <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
          <View
            style={{
              backgroundColor: "#FFFDF8",
              borderWidth: 1.5,
              borderColor: "#E8D8BE",
              borderRadius: 24,
              padding: 20,
            }}
          >
            <Text style={[s.body, bodyFont, { color: "#3D2B24", textAlign: "center" }]}>
              A grown-up can choose some pictures in Library settings.
            </Text>
          </View>
        </View>
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
            minWidth: 48,
            minHeight: 48,
            borderRadius: 24,
            backgroundColor: "#FFFDF8",
            borderColor: "#E8D8BE",
            borderWidth: 1.5,
            borderBottomWidth: 3,
            borderBottomColor: "rgba(61, 43, 36, 0.16)",
          },
        ]}
      >
        <LibraryIcon name="lock" size={24} />
      </Pressable>
    </View>
  );
}
