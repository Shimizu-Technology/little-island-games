import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TextLayoutProvider } from "../components/Text";
import { useReducedMotion } from "../components/motion";
import { StoreProvider } from "../state/Store";
import { ScreenBoundary, UIBoundary } from "../components/LaunchError";
import { NunitoProvider } from "../ui/fonts";
type LibraryParams = { place?: string; id?: string } | undefined;
/** No interactive pop where a stray swipe would cost a child their drawing or let a baby out. */
export function libraryGestureEnabled(params: object | undefined) {
  const { place, id } = (params ?? {}) as NonNullable<LibraryParams>;
  return !((place === "make" && !!id) || place === "little");
}
/**
 * Only a failure of the Store or the providers around it lands here: a plain restart screen that never
 * mounts another Store. Anything under the Store is caught by UIBoundary below it.
 */
export { StoreFailure as ErrorBoundary } from "../components/LaunchError";
/** A screen's own render error stays inside that screen, so the Store above it keeps its accepted work. */
export function screenLayout({ children }: { children: React.ReactElement }) {
  return <ScreenBoundary>{children}</ScreenBoundary>;
}
export default function Layout() {
  // The platform push shows where a screen came from; Reduce Motion swaps it for a short fade.
  const reduced = useReducedMotion();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
      <TextLayoutProvider>
        {/* Nunito loads in the background; text shows in the system font until it arrives, so boot and Recovery never wait. */}
        <NunitoProvider>
        <StoreProvider>
          {/* Try again here remounts only the navigator and screens. The Store and its writes stay mounted. */}
          <UIBoundary>
          <StatusBar style="dark" />
          <Stack
            // A navigator mounted again after an error starts on the map, not the first declared screen.
            initialRouteName="index"
            screenLayout={screenLayout}
            screenOptions={{
              headerShown: false,
              animation: reduced ? "fade" : "default",
              contentStyle: { backgroundColor: "#FCFAF4" },
              // iOS 26 turns an unspecified full-screen swipe on, so a sideways swipe
              // anywhere pops the screen: it closed books instead of turning back a page,
              // left the Library from Wonder, and let a baby swipe out of Look & Listen.
              // Keep the pre-iOS 26 behavior: only the left edge goes back.
              fullScreenGestureEnabled: false,
            }}
          >
            {/* The drawing editor and baby Look & Listen allow no back gesture at all;
                their explicit Back button / hold-to-exit lock still work. */}
            <Stack.Screen name="library" options={({ route }) => ({ gestureEnabled: libraryGestureEnabled(route.params) })} />
          </Stack>
          </UIBoundary>
        </StoreProvider>
        </NunitoProvider>
      </TextLayoutProvider>
    </SafeAreaProvider></GestureHandlerRootView>
  );
}
