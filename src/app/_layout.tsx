import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TextLayoutProvider } from "../components/Text";
import { StoreProvider } from "../state/Store";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <TextLayoutProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: "#FCFAF4" } }}
          />
        </StoreProvider>
      </TextLayoutProvider>
    </SafeAreaProvider>
  );
}
