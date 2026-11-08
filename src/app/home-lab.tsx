import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { HomeScreen } from "../home/HomeScreen";
import { labHome } from "../home/runtime/lab";

/** Deliberately opt-in: excluded from the ordinary navigation and public build. */
export default function HomeLabRoute() {
  const { fixture } = useLocalSearchParams<{ fixture?: string }>();
  if (!__DEV__ && process.env.EXPO_PUBLIC_HOME_LAB !== "1") return <Redirect href="/" />;
  return <HomeScreen key={fixture ?? "lab"} initialState={labHome(fixture)} lab />;
}
