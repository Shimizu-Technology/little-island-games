import React, { useEffect } from "react";
import { Pressable, Text as PlainText, View } from "react-native";
import { router, type ErrorBoundaryProps } from "expo-router";
import { noteLaunch } from "../state/launchLog";

/** Plain views only: this must not depend on the providers or components that may have failed. */
function LaunchErrorView({ onRetry, onMap }: { onRetry: () => void; onMap: () => void }) {
  return (
    <View accessibilityRole="alert" style={{ flex: 1, backgroundColor: "#FCFAF4", justifyContent: "center", padding: 28, gap: 18 }}>
      <PlainText style={{ fontSize: 26, fontWeight: "800", color: "#183F39" }}>Little Island needs another try.</PlainText>
      <PlainText style={{ fontSize: 18, lineHeight: 26, color: "#183F39" }}>Something stopped this screen from opening. Your saved work is kept.</PlainText>
      <Pressable accessibilityRole="button" onPress={onRetry} style={{ minHeight: 52, borderRadius: 26, backgroundColor: "#246858", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        <PlainText style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>Try again</PlainText>
      </Pressable>
      {/* A screen that keeps failing needs a way out. */}
      <Pressable accessibilityRole="button" onPress={onMap} style={{ minHeight: 52, borderRadius: 26, borderWidth: 2, borderColor: "#246858", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        <PlainText style={{ fontSize: 18, fontWeight: "700", color: "#183F39" }}>Back to the map</PlainText>
      </Pressable>
    </View>
  );
}

/**
 * The root route's error boundary (exported from app/_layout as ErrorBoundary), for failures above the
 * screens: the providers, the Store itself or the navigator. Try again remounts all of them; the Store
 * hands its accepted work to the new one (see `retired` in state/Store).
 */
export function LaunchError({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { noteLaunch("render", error); }, [error]);
  return <LaunchErrorView onRetry={() => void retry()} onMap={() => { try { router.replace("/"); } catch { /* navigation itself may be down; retry still runs */ } void retry(); }} />;
}

/**
 * Wraps each screen inside the Stack (its `screenLayout`), below the Store. A failing screen shows this
 * instead, and Try again renders only that screen again: the Store, its accepted state and its write
 * queue are never unmounted, so nothing waiting to be saved can be lost.
 */
export class ScreenBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  componentDidCatch(error: unknown) { noteLaunch("screen", error); }
  render() {
    if (this.state.error === null) return this.props.children;
    return <LaunchErrorView onRetry={() => this.setState({ error: null })} onMap={() => {
      try { router.dismissTo("/"); } catch { /* the map may be this screen; trying again still runs */ }
      this.setState({ error: null });
    }} />;
  }
}
