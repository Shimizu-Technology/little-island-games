import React from "react";
import { AccessibilityInfo, Pressable, Text } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const ink = "#284F4B";

/** F3: a room swept back to its start, and an Undo arrow that can't reach back past it.
 * Without `restored`, only the crossed-out arrow: Undo couldn't keep this change. */
export function UndoGonePicture({ size = 96, restored = true }: { size?: number; restored?: boolean }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox={restored ? "0 -3 64 48" : "34 10 32 32"} accessible={false}>
      {restored && <>
      <Path d="M3 17L19 5L35 17V41H3Z" fill="#FFF8E9" stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
      {/* The restored room: just its own furniture again. */}
      <Rect x={7} y={31} width={10} height={8} rx={1.5} fill="#E8B07A" stroke={ink} strokeWidth={1.2} />
      <Rect x={22} y={27} width={8} height={12} rx={1.5} fill="#8CC4E8" stroke={ink} strokeWidth={1.2} />
      {/* Sparkles: fresh and tidy. */}
      <Path d="M12 20v6M9 23h6M27 15v4M25 17h4" stroke="#C99A2E" strokeWidth={1.4} strokeLinecap="round" />
      </>}
      {/* The Undo arrow, crossed out. */}
      <Circle cx={50} cy={26} r={12.5} fill="#FFF8E9" stroke={ink} strokeWidth={2.2} />
      <Path d="M44 22.5A7 7 0 1 1 46 31.5" fill="none" stroke="#477D60" strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M41.5 18.5L44 23l4.5-2" fill="none" stroke="#477D60" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M41 35L59 17" stroke="#C4553F" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

/** F3: what a restore cost Undo, or why an edit was refused, as a visible note. It stays until
 * the next message or a tap, because reading is never timed, and a screen reader hears the same words. */
export function UndoNote({ message, restored, bottom, onDismiss }: { message: string; restored: boolean; bottom: number; onDismiss: () => void }) {
  React.useEffect(() => { AccessibilityInfo.announceForAccessibility?.(message); }, [message]);
  return (
    <Pressable
      testID="undo-note"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      accessibilityHint="Tap to close."
      onPress={onDismiss}
      style={{
        position: "absolute",
        bottom,
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: "#FFF8E9",
        borderWidth: 2,
        borderColor: "#D7C29A",
        zIndex: 46,
      }}
    >
      <UndoGonePicture size={72} restored={restored} />
      <Text maxFontSizeMultiplier={1.4} style={{ color: ink, fontSize: 15, fontWeight: "600", maxWidth: 190 }}>
        {message}
      </Text>
    </Pressable>
  );
}
