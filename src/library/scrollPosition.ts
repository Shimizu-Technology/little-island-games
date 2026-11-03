import type { NativeScrollEvent } from "react-native";
/** Bounce/overscroll is presentation, never a saved reading position. */
export function savedScrollPosition(event: Pick<NativeScrollEvent, "contentOffset" | "contentSize" | "layoutMeasurement">): number {
  const max = Math.min(1_000_000, Math.max(0, event.contentSize.height - event.layoutMeasurement.height));
  const y = event.contentOffset.y;
  return Number.isFinite(y) && Number.isFinite(max) ? Math.max(0, Math.min(max, y)) : 0;
}
