import React, { useState } from "react";
import { View } from "react-native";
import { useStore } from "../state/Store";
import { selectedOwner } from "../state/challengeDrafts";
import { infoFor } from "../cove/catalog";
import { Button, Copy } from "./ui";

/** One plain line for paused puzzles this build couldn't open at launch. The original save is preserved. */
export function setAsideLine(games: readonly string[]) {
  const names = [...new Set(games)].map(game => infoFor(game).name);
  const what = names.length === 0 ? "Some puzzle marks from another version of the app" : names.length === 1 ? `Your paused ${names[0]} puzzle` : `Your paused ${names.slice(0, -1).join(", ")} and ${names.at(-1)} puzzles`;
  return names.length === 0
    ? `${what} couldn’t be opened, so they were set aside. Your other marks and stars are kept.`
    : `${what} couldn’t be resumed, so ${names.length === 1 ? "it was" : "they were"} set aside. Your marks and stars are kept. You can start fresh any time.`;
}

export function SaveStatus() {
  const store = useStore();
  const [retrying, setRetrying] = useState(false);
  const owner = selectedOwner(store.save), aside = store.setAside.find(a => a.owner === owner);
  if (!store.error && !aside) return null;
  return (
    <>
      {aside && (
        <View accessibilityLiveRegion="polite" style={{ padding: 14, backgroundColor: "#FFF4D6", borderRadius: 16, gap: 8, marginBottom: 12 }}>
          <Copy>{setAsideLine(aside.games)}</Copy>
          <Button quiet onPress={() => store.dismissSetAside(owner)}>OK</Button>
        </View>
      )}
      {store.error && (
        <View accessibilityRole="alert" style={{ padding: 14, backgroundColor: "#FBE8DE", borderRadius: 16, gap: 8, marginBottom: 12 }}>
          <Copy>{store.error}</Copy>
          <Button quiet disabled={retrying} onPress={() => {
            setRetrying(true);
            void store.retry().finally(() => setRetrying(false));
          }}>{retrying ? "Trying to save…" : "Try saving again"}</Button>
        </View>
      )}
    </>
  );
}
