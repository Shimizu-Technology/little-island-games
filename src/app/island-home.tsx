import React from "react";
import { useLocalSearchParams } from "expo-router";
import { HomeRoute } from "../home/HomeRoute";

export default function IslandHomeRoute() {
  const params = useLocalSearchParams<{ item?: string | string[]; room?: string | string[] }>();
  return <HomeRoute item={params.item} room={params.room} loadingText="Opening your home…" />;
}
