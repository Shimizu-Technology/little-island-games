import React, { useEffect } from "react";
import { Pressable, Text as PlainText, View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { noteLaunch } from "../state/launchLog";

/**
 * The root route's error boundary (exported from app/_layout as ErrorBoundary).
 * Plain views only: this must not depend on the providers or components that may have failed.
 */
export function LaunchError({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => { noteLaunch("render", error); }, [error]);
  return (
    <View accessibilityRole="alert" style={{ flex: 1, backgroundColor: "#FCFAF4", justifyContent: "center", padding: 28, gap: 18 }}>
      <PlainText style={{ fontSize: 26, fontWeight: "800", color: "#183F39" }}>Little Island needs another try.</PlainText>
      <PlainText style={{ fontSize: 18, lineHeight: 26, color: "#183F39" }}>Something stopped this screen from opening. Your saved work is kept.</PlainText>
      <Pressable accessibilityRole="button" onPress={() => void retry()} style={{ minHeight: 52, borderRadius: 26, backgroundColor: "#246858", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        <PlainText style={{ fontSize: 18, fontWeight: "700", color: "#FFFFFF" }}>Try again</PlainText>
      </Pressable>
    </View>
  );
}
