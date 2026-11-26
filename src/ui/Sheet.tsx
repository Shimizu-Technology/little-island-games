import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, PanResponder, Platform, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "../components/motion";
import { useSheetPresence } from "../components/sheetPresence";
import { IconButton } from "./IconButton";
import { Text } from "./Text";
import { X } from "./icons";
import { theme } from "./theme";

/**
 * `dim`: start sheet, about 55% and dimmed. `small`: in-game sheet, at most 40% and undimmed so play can continue.
 * `large`: a dimmed, nearly full-height sheet whose child fills it and scrolls itself (a long virtualized list).
 */
export type SheetMode = "dim" | "small" | "large";
const LARGE = 0.92;

const EXIT_MS = 180;
const REDUCED_MS = 120;

/** Sheet height in points: a share of the window, so a sheet never grows past its detent. */
export const sheetHeight = (windowHeight: number, mode: SheetMode) =>
  Math.floor(windowHeight * (mode === "large" ? LARGE : mode === "dim" ? theme.sheet.start : theme.sheet.small));

/** A swipe down closes the sheet when it went far enough or flicked fast enough. */
export const shouldDismiss = (dy: number, vy: number) => dy > theme.sheet.dismissDistance || vy > theme.sheet.dismissVelocity;

/**
 * Swipe-down bottom sheet. `dim` presents in a modal with a scrim; `small` is not a modal at all, it draws over the
 * bottom of its screen with the rest left touchable, so mount it as the last child of a full-screen view. Wide
 * windows get a centered bottom card. Reduce Motion fades instead of sliding, and a swipe only decides whether to
 * close; it never moves the panel. Close is a labelled button, a swipe down, a scrim tap (dim), the VoiceOver escape
 * gesture and Escape on Web.
 *
 * Web focus: opening moves focus to the title (or the sheet when it has none), closing returns it to the control that
 * opened the sheet. The scrim is not a tab stop. A dim sheet's Modal traps Tab; the in-game sheet does not, so the
 * board stays reachable by keyboard. iPhone start sheets use the native route presentation instead
 * (`nativeFormSheetOptions`).
 */
export function Sheet({ visible, onClose, mode = "dim", heightRatio, scroll, compactHeader = false, onTitleRef, headerAction, topOverlay, title, closeLabel = "Close", children }: {
  visible: boolean;
  onClose: () => void;
  mode?: SheetMode;
  /** Optional share of windowHeight (e.g. 0.45 for the undimmed Closet sheet). */
  heightRatio?: number;
  /** Whether the sheet wraps children in its own ScrollView. Defaults to `mode !== "large"`. */
  scroll?: boolean;
  /** Tighter grabber and title header for short / landscape phone viewports. */
  compactHeader?: boolean;
  /** Optional callback receiving the title (or sheet) host node for native accessibility focus. */
  onTitleRef?: (node: unknown) => void;
  /** Optional compact action rendered in the header row between the title and Close button. */
  headerAction?: React.ReactNode;
  /** Optional overlay rendered inside the sheet root (and inside Modal for dimmed sheets) above the panel. */
  topOverlay?: React.ReactNode;
  /** Spoken and shown first; it takes focus when the sheet opens on Web. */
  title?: string;
  closeLabel?: string;
  children: React.ReactNode;
}) {
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const dim = mode !== "small", large = mode === "large";
  const scrolls = scroll ?? !large;
  const height = heightRatio != null ? Math.floor(windowHeight * heightRatio) : sheetHeight(windowHeight, mode);

  const [shown, setShown] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const drag = useSharedValue(0);
  useSheetPresence(shown && dim);

  const web = Platform.OS === "web";
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const onTitleRefRef = useRef(onTitleRef);
  useEffect(() => { onTitleRefRef.current = onTitleRef; }, [onTitleRef]);
  const opener = useRef<HTMLElement | null>(null);
  // The ref callback runs before the sheet takes focus, so the opener is whatever held focus when the sheet mounted.
  const focusOnMount = useCallback((node: unknown) => {
    onTitleRefRef.current?.(node);
    if (!web || !node) return;
    if (!opener.current && typeof document !== "undefined") opener.current = document.activeElement as HTMLElement | null;
    (node as { focus?: () => void }).focus?.();
  }, [web]);
  const restoreFocus = useCallback(() => {
    const target = opener.current;
    opener.current = null;
    if (target?.isConnected) target.focus?.();
  }, []);

  useEffect(() => {
    if (!web || !visible || typeof document === "undefined") return;
    // Capture phase, so one Escape closes the sheet once even though a Modal also listens for it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
    };
  }, [web, visible]);

  // Give focus back only once the exit has finished and a dim Modal has unmounted; before that it still traps focus.
  useEffect(() => {
    if (!shown) restoreFocus();
  }, [shown, restoreFocus]);
  useEffect(() => restoreFocus, [restoreFocus]);

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
    onPanResponderMove: (_, g) => { if (!reduced) drag.set(Math.max(0, g.dy)); },
    onPanResponderRelease: (_, g) => {
      if (shouldDismiss(g.dy, g.vy)) onClose();
      else if (!reduced) drag.set(withSpring(0, { ...theme.motion.spring, reduceMotion: ReduceMotion.System }));
    },
    onPanResponderTerminate: () => { if (!reduced) drag.set(withSpring(0, { ...theme.motion.spring, reduceMotion: ReduceMotion.System })); },
  }), [drag, onClose, reduced]);

  const scrim = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panel = useAnimatedStyle(() => reduced
    ? { opacity: progress.get() }
    : { transform: [{ translateY: (1 - progress.get()) * (height + insets.bottom) + drag.get() }] });

  if (!shown) return null;

  const body = (
    <View pointerEvents="box-none" style={styles.fill}>
      {dim && (
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrim]}>
          <View
            testID="sheet-backdrop"
            accessible={false}
            importantForAccessibility="no"
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={() => true}
            onResponderRelease={onClose}
          />
        </Animated.View>
      )}
      <View pointerEvents="box-none" style={styles.dock}>
        <Animated.View
          ref={title ? undefined : focusOnMount}
          testID="sheet"
          tabIndex={-1}
          accessibilityViewIsModal={dim}
          onAccessibilityEscape={onClose}
          style={[styles.panel, theme.shadow, large ? { height, width: Math.min(width, 960) } : scrolls ? { maxHeight: height, width: Math.min(width, theme.sheet.maxWidth) } : { height, width: Math.min(width, theme.sheet.maxWidth) }, panel]}
        >
          <View {...pan.panHandlers} style={[styles.top, compactHeader && styles.topCompact]}>
            <View testID="sheet-grabber" style={styles.grabber} />
            <View style={[styles.closeRow, compactHeader && styles.closeRowCompact]}>
              {title ? (
                <View
                  ref={focusOnMount}
                  testID="sheet-title"
                  tabIndex={-1}
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={title}
                  style={styles.title}
                >
                  <Text variant={compactHeader ? "body" : "section"}>{title}</Text>
                </View>
              ) : (
                <View style={styles.title} />
              )}
              {headerAction}
              <IconButton glyph={X} accessibilityLabel={closeLabel} onPress={onClose} />
            </View>
          </View>
          {!scrolls
            ? <View style={[styles.fill, { paddingBottom: insets.bottom }]}>{children}</View>
            : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: theme.space.lg + insets.bottom }]}>
              {children}
            </ScrollView>}
        </Animated.View>
      </View>
      {topOverlay}
    </View>
  );

  return dim
    ? <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>{body}</Modal>
    : <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.undimmedOverlay]}>{body}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  undimmedOverlay: { zIndex: 50 },
  scrim: { backgroundColor: theme.colors.scrim },
  dock: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  panel: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    overflow: "hidden",
  },
  top: { paddingTop: theme.space.sm, alignItems: "center" },
  topCompact: { paddingTop: 4 },
  grabber: { width: 40, height: 5, borderRadius: theme.radius.full, backgroundColor: theme.colors.hairline },
  closeRow: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: theme.space.xs, paddingLeft: theme.space.xl, paddingRight: theme.space.sm },
  closeRowCompact: { paddingLeft: theme.space.lg, paddingRight: theme.space.xs, minHeight: theme.target.adult },
  title: { flex: 1 },
  content: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.sm, gap: theme.space.lg },
});
