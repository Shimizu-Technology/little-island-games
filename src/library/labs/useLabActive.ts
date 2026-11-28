import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * Tracks whether a Discovery Lab is currently visible and in the foreground.
 * Combines navigation focus with AppState (native) and document.visibilityState (web)
 * so animation loops and rhythm playback pause immediately on blur or backgrounding.
 */
export function useLabActive(focused = true): boolean {
  const [appActive, setAppActive] = useState(() => {
    const state = AppState?.currentState;
    return !state || state === "active";
  });
  const [pageVisible, setPageVisible] = useState(() => {
    if (typeof document === "undefined") return true;
    return !document.hidden;
  });

  useEffect(() => {
    const sub =
      typeof AppState?.addEventListener === "function"
        ? AppState.addEventListener("change", (next) => {
            setAppActive(next === "active");
          })
        : null;

    const onVisibility = () => {
      if (typeof document !== "undefined") setPageVisible(!document.hidden);
    };
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      sub?.remove?.();
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, []);

  return focused && appActive && pageVisible;
}
