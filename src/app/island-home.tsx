import React from "react";
import { useLocalSearchParams } from "expo-router";
import { HomeRoute } from "../home/HomeRoute";

export default function IslandHomeRoute() {
  const params = useLocalSearchParams<{ item?: string | string[] }>();
  return <HomeRoute item={params.item} loadingText="Opening your home…" />;
}
