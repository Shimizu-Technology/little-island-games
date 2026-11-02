import React from "react";
import { Pressable } from "react-native";
import { LibraryGlyph } from "./LibraryGlyph";
import { s } from "./ui";
/** An icon alone must still announce whether sound is on or off. */
export function SoundSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Library sound"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      onPress={onToggle}
      style={({ pressed }) => [s.action, pressed && { opacity: 0.7 }]}
    >
      <LibraryGlyph name={on ? "sound" : "muted"} size={24} />
    </Pressable>
  );
}
