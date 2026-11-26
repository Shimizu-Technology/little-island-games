import React, { useEffect, useMemo, useState } from "react";
import { Modal, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../components/motion";
import { useSheetPresence } from "../components/sheetPresence";
import { IconButton } from "./IconButton";
import { X } from "./icons";
import { theme } from "./theme";

/** `dim`: start sheet, about 55% and dimmed. `small`: in-game sheet, at most 40% and undimmed so play can continue. */
export type SheetMode = "dim" | "small";

const EXIT_MS = 180;
const REDUCED_MS = 120;

/** Sheet height in points: a share of the window, so a sheet never grows past its detent. */
export const sheetHeight = (windowHeight: number, mode: SheetMode) =>
  Math.floor(windowHeight * (mode === "dim" ? theme.sheet.start : theme.sheet.small));

/** A swipe down closes the sheet when it went far enough or flicked fast enough. */
export const shouldDismiss = (dy: number, vy: number) => dy > theme.sheet.dismissDistance || vy > theme.sheet.dismissVelocity;

/**
 * Swipe-down bottom sheet. `dim` presents in a modal with a scrim; `small` is not a modal at all, it draws over the
 * bottom of its screen with the rest left touchable, so mount it as the last child of a full-screen view. Wide
 * windows get a centered bottom card. Reduce Motion fades instead of sliding. Close is a labelled button, a swipe
 * down, a scrim tap (dim) and the VoiceOver escape gesture.
 */
export function Sheet({ visible, onClose, mode = "dim", closeLabel = "Close", children }: {
  visible: boolean;
  onClose: () => void;
  mode?: SheetMode;
  closeLabel?: string;
  children: React.ReactNode;
}) {
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const dim = mode === "dim";
  const height = sheetHeight(windowHeight, mode);

  const [shown, setShown] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const drag = useSharedValue(0);
  useSheetPresence(shown && dim);

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Keeps the sheet mounted while its exit plays.
      setShown(true);
      drag.set(0);
      progress.set(reduced
        ? withTiming(1, { duration: REDUCED_MS, reduceMotion: ReduceMotion.System })
        : withSpring(1, { ...theme.motion.spring, reduceMotion: ReduceMotion.System }));
      return;
    }
    progress.set(withTiming(0, { duration: reduced ? REDUCED_MS : EXIT_MS, reduceMotion: ReduceMotion.System }));
    const timer = setTimeout(() => setShown(false), reduced ? REDUCED_MS : EXIT_MS);
    return () => clearTimeout(timer);
  }, [visible, reduced, progress, drag]);

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => drag.set(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (shouldDismiss(g.dy, g.vy)) onClose();
      else drag.set(withSpring(0, { ...theme.motion.spring, reduceMotion: ReduceMotion.System }));
    },
    onPanResponderTerminate: () => drag.set(withSpring(0, { ...theme.motion.spring, reduceMotion: ReduceMotion.System })),
  }), [drag, onClose]);

  const scrim = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panel = useAnimatedStyle(() => reduced
    ? { opacity: progress.get(), transform: [{ translateY: drag.get() }] }
    : { transform: [{ translateY: (1 - progress.get()) * (height + insets.bottom) + drag.get() }] });

  if (!shown) return null;

  const body = (
    <View pointerEvents="box-none" style={styles.fill}>
      {dim && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
          <Pressable accessible={false} importantForAccessibility="no" tabIndex={-1} style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
      )}
      <View pointerEvents="box-none" style={styles.dock}>
        <Animated.View
          testID="sheet"
          accessibilityViewIsModal={dim}
          onAccessibilityEscape={onClose}
          style={[styles.panel, theme.shadow, { maxHeight: height, width: Math.min(width, theme.sheet.maxWidth) }, panel]}
        >
          <View {...pan.panHandlers} style={styles.top}>
            <View testID="sheet-grabber" style={styles.grabber} />
            <View style={styles.closeRow}>
              <IconButton glyph={X} accessibilityLabel={closeLabel} onPress={onClose} />
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: theme.space.lg + insets.bottom }]}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );

  return dim
    ? <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>{body}</Modal>
    : <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{body}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { backgroundColor: theme.colors.scrim },
  dock: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  panel: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    overflow: "hidden",
  },
  top: { paddingTop: theme.space.sm, alignItems: "center" },
  grabber: { width: 40, height: 5, borderRadius: theme.radius.full, backgroundColor: theme.colors.hairline },
  closeRow: { alignSelf: "stretch", alignItems: "flex-end", paddingHorizontal: theme.space.sm },
  content: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.sm, gap: theme.space.lg },
});
