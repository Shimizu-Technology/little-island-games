import type { NativeStackNavigationOptions } from "expo-router";
import { theme } from "./theme";

/** `start` about 55% and dimmed, `small` 40% and undimmed, `large` full height. */
export type NativeSheetSize = "start" | "small" | "large";

const detents: Record<NativeSheetSize, number[]> = { start: [theme.sheet.start], small: [theme.sheet.small], large: [1] };

/**
 * Stack screen options for an iPhone route sheet (docs/LITTLE_ISLAND_4_DESIGN.md, Sheets by platform): a native
 * `formSheet` with a system grabber, one detent, and a corner radius that matches the overlay `Sheet`. Spread it into
 * the sheet route's `<Stack.Screen options>`. Web, iPad and landscape use the overlay `Sheet` instead, since Expo
 * Router's Web build treats `formSheet` as an ordinary stack screen.
 *
 * Back dismissal: the swipe and the system close dismiss the route, and the sheet route should declare its parent as
 * the router anchor (`unstable_settings.anchor`) so a cold link opens the parent with the sheet on top and Back
 * closes the sheet first.
 */
export const nativeFormSheetOptions = (size: NativeSheetSize = "start"): NativeStackNavigationOptions => ({
  presentation: "formSheet",
  headerShown: false,
  gestureEnabled: true,
  sheetAllowedDetents: detents[size],
  sheetInitialDetentIndex: 0,
  sheetGrabberVisible: true,
  sheetCornerRadius: theme.radius.sheet,
  sheetExpandsWhenScrolledToEdge: false,
});
