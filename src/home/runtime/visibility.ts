import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";

/** Anything but a known inactive state counts as on screen; iOS can report "unknown" at launch. */
const activeState = (state: string | null | undefined) => state !== "background" && state !== "inactive";
const pageVisible = () => typeof document === "undefined" || !document.hidden;

/**
 * R3: whether Island Home is actually on screen. The app is in the foreground (or the browser page
 * is visible) and the Home route has focus. Quiet timers (life, hints) run only while this is true.
 */
export function useHomeVisible(): boolean {
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(() => (Platform.OS === "web" ? pageVisible() : activeState(AppState.currentState)));
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setForeground(activeState(state)));
    const web = Platform.OS === "web" && typeof document !== "undefined";
    const visibility = () => setForeground(pageVisible());
    if (web) document.addEventListener("visibilitychange", visibility);
    return () => {
      sub.remove();
      if (web) document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return focused && foreground;
}
