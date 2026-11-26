import React from "react";
import { useLocalSearchParams } from "expo-router";
import { HomeRoute } from "../home/HomeRoute";

export default function LockerRoute() {
  const params = useLocalSearchParams<{ item?: string | string[] }>();
  return <HomeRoute initialSheet="closet" closetItem={params.item} loadingText="Opening your Closet…" />;
}
