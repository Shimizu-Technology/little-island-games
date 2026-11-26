import { learningGroups } from '../learn/generated/ids';
import type { LearnId } from '../learn/types';
import React, { useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Button, Chip, Copy, IconButton, Heading, styles } from "../components/ui";
import { Text, TextFit, entryRegion } from "../components/Text";
import { LARGE_TEXT, wordFitMultiplier } from "../components/wordFit";
import { GameCards } from "../components/GameShelf";
import { SaveStatus } from "../components/SaveStatus";
import { Recovery } from "../components/Recovery";
import { useStore } from "../state/Store";
import { islandNames, shelfGames } from "../learn/home";
import { theme } from "../ui/theme";
import { useNunitoLoaded } from "../ui/fonts";
const classicFilters = ["All games", "Play alone", "Play together", "Favorites", "Words & numbers", "Think & explore"];
export default function Shelf() {
  const { island } = useLocalSearchParams<{ island?: string }>();
  if (!island || !["reading", "numbers", "science", "thinking", "coding", "classic"].includes(island)) return <Redirect href="/" />;
  return <IslandShelf key={island} island={island as Exclude<keyof typeof islandNames, "explore">} />;
}
function IslandShelf({ island }: { island: Exclude<keyof typeof islandNames, "explore"> }) {
  const loaded = useNunitoLoaded();
  const bold = loaded ? { fontFamily: theme.fontFamily["800"], fontWeight: "normal" as const } : { fontWeight: "800" as const };
  const store = useStore(), insets = useSafeAreaInsets(), { width, fontScale } = useWindowDimensions();
  const [filter, setFilter] = useState("All games");
  const available = width - insets.left - insets.right;
  const columns = fontScale > 1.3 || available < 350 ? 1 : available >= 900 ? 3 : 2;
  const cardWidth = (Math.min(available, 1080) - 40 - 12 * (columns - 1)) / columns;
  const choices = shelfGames.filter(g => g.island === island && (filter === "All games" || (filter === "Favorites" ? store.save.favoriteGames?.includes(g.id) : g.filters.includes(filter))));
  if (!store.ready) return <SafeAreaView style={[styles.page, { backgroundColor: "#FFF6E5" }]}><Heading>Getting your island ready…</Heading></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={[styles.page, { backgroundColor: "#FFF6E5" }]}><Recovery /></SafeAreaView>;
  // At accessibility sizes the island's title wraps between words beside an icon Back, and the chips and headings stop at 1.5x.
  const wrapTitle = fontScale > 1.3 && available < 350;
  const large = fontScale >= LARGE_TEXT, line = Math.min(available, 1080) - 40;
  return <TextFit.Provider value={entryRegion(fontScale, line)}><SafeAreaView style={[styles.page, { backgroundColor: "#FFF6E5" }]}><ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: 20, gap: 14 }]}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
      {large || wrapTitle ? <IconButton icon="back" label="Back to islands" onPress={() => router.canGoBack() ? router.back() : router.replace("/")} /> : <Button compact quiet icon="back" label="Back to islands" onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>Islands</Button>}
      <Text accessibilityRole="header" numberOfLines={large || wrapTitle ? 2 : 1} adjustsFontSizeToFit={!large && !wrapTitle} minimumFontScale={0.75} maxFontSizeMultiplier={large ? wordFitMultiplier(islandNames[island], 21, line - 56, 1.5) : undefined} style={{ flex: 1, fontSize: 21, color: "#3D2B24", ...bold }}>{islandNames[island]}</Text>
    </View>
    <SaveStatus />
    <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]} accessible={false} importantForAccessibility="no">
      {(island === "classic" ? classicFilters : ["All games", "Play alone", "Play together", "Favorites"]).map(f => <Chip key={f} selected={f === filter} onPress={() => setFilter(f)}>{f}</Chip>)}
    </View>
    {!choices.length && <Copy>{filter === "Favorites" ? "Tap the star on a game to keep it close by." : "Try another way to play on this island."}</Copy>}
    {island === 'thinking' ? (['levels','originals'] as const).map(group=>{const games=choices.filter(g=>learningGroups[g.id as LearnId]===group);return games.length ? <View key={group} style={{gap:12}}><Heading style={{fontSize:23}}>{group==='levels'?'Levels':'Island originals'}</Heading><GameCards games={games} width={cardWidth}/></View>:null;}) : <GameCards games={choices} width={cardWidth} />}
    <Copy style={{ fontSize: 12, textAlign: "center", paddingVertical: 10 }}>Offline · No ads · Made for little moments together.</Copy>
  </ScrollView></SafeAreaView></TextFit.Provider>;
}
