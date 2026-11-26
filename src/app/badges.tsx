import React from "react";
import { useLocalSearchParams } from "expo-router";
import { HomeRoute } from "../home/HomeRoute";

export default function BadgesRoute() {
  const params = useLocalSearchParams<{ badge?: string | string[] }>();
  return <HomeRoute initialSheet="badges" badge={params.badge} loadingText="Opening your badges…" />;
}
