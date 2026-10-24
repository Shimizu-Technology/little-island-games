import { Text } from "../components/Text";
import React, { useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button, C, Copy, Heading, Label, PressableScale, font, styles } from "../components/ui";
import { Icon } from "../components/Icon";
import { GameArt } from "../components/Art";
import { Settings } from "../components/Settings";
import { Recovery } from "../components/Recovery";
import { SaveStatus } from "../components/SaveStatus";
import { useStore } from "../state/Store";
import { FeatureArt } from "../components/FeatureArt";
import { ShelfArt, openShelfGame } from "../components/GameShelf";
import { dailySuggestions, homeContinue, islandNames, shelfGames } from "../learn/home";
import { LearnArt } from "../learn/LearnArt";
import type { Island } from "../learn/types";
export default function Home() {
  const insets = useSafeAreaInsets(), { width, fontScale } = useWindowDimensions(), store = useStore();
  const [settings, setSettings] = useState(false), [shuffle, setShuffle] = useState(0);
  const available = width - insets.left - insets.right, content = Math.min(available, 1080) - 40;
  const columns = fontScale > 1.3 || available < 350 ? 1 : available >= 900 ? 3 : 2;
  const cardWidth = (content - 12 * (columns - 1)) / columns;
  const suggestions = dailySuggestions(store.save, undefined, shuffle).map(id => shelfGames.find(g => g.id === id)!);
  const resume = homeContinue(store.save), favorites = store.save.favoriteGames ?? [];
  if (!store.ready) return <SafeAreaView style={styles.page}><View style={styles.content}><Heading>Getting your island ready…</Heading></View></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={styles.page}><Recovery /></SafeAreaView>;
  return <SafeAreaView style={styles.page}>
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: 20, gap: 14 }]}>
      <View style={[styles.row, { paddingTop: 12, justifyContent: "space-between", flexWrap: "wrap" }]}>
        <Text style={{ fontFamily: font, fontSize: 22, fontWeight: "800", color: C.ink }}>little island</Text>
        <Button compact quiet onPress={() => setSettings(true)} label="Open sound settings, practice and grown-up backups">Settings</Button>
      </View>
      <SaveStatus />
      <Heading style={{ fontSize: available >= 600 ? 34 : 28 }}>What shall we play?</Heading>
      {resume && <Button onPress={() => openShelfGame(resume)} label={`Continue ${shelfGames.find(g => g.id === resume)?.name}, your saved round`}>Continue {shelfGames.find(g => g.id === resume)?.name}</Button>}
      {!!favorites.length && <View style={{ gap: 8 }}><Label>Your favorites</Label><View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
        {favorites.map(id => <Button key={id} quiet compact onPress={() => openShelfGame(id)} label={`Open favorite ${shelfGames.find(g => g.id === id)?.name}`}>{shelfGames.find(g => g.id === id)?.name}</Button>)}
      </View></View>}
      <View style={[styles.row, { justifyContent: "space-between" }]}><Heading style={{ fontSize: 23 }}>Try today</Heading><Button quiet compact onPress={() => setShuffle(shuffle + 1)} label="Shuffle today's three game suggestions">Shuffle</Button></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {suggestions.map(g => <PressableScale key={g.id} accessibilityRole="button" accessibilityLabel={`Try today: ${g.name}`} onPress={() => openShelfGame(g.id)} amount={0.98}
          style={{ width: fontScale > 1.3 || content < 600 ? content : (content - 20) / 3, backgroundColor: g.surface, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <ShelfArt id={g.id} size={58} /><View style={{ flex: 1 }}><Label>{islandNames[g.island]}</Label><Heading style={{ fontSize: 20 }}>{g.name}</Heading><Copy style={{ fontSize: 13, lineHeight: 18 }}>{g.description}</Copy></View>
        </PressableScale>)}
      </View>
      <Heading style={{ fontSize: 23 }}>Islands</Heading>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {(Object.keys(islandNames) as (keyof typeof islandNames)[]).map(island => <PressableScale key={island} accessibilityRole="button" accessibilityLabel={`Open ${islandNames[island]} island`} amount={0.98} onPress={() => island === "explore" ? router.push("/explore") : router.push({ pathname: "/shelf", params: { island } })}
          style={{ width: cardWidth, backgroundColor: ({ reading: "#E8EFF9", numbers: "#F7EBD0", science: "#DDEFF5", thinking: "#FBE6DC", classic: "#E3EDDC", explore: "#DFEAF0" })[island], borderRadius: 20, padding: 16, minHeight: 158, alignItems: "center", gap: 8 }}>
          {island === "classic" ? <GameArt game="memory" size={76} /> : island === "explore" ? <FeatureArt kind="explore" size={76} /> : <LearnArt island={island as Island} size={76} />}
          <Heading style={{ fontSize: 22, textAlign: "center" }}>{islandNames[island]}</Heading><Icon name="right" size={20} color={C.teal} />
        </PressableScale>)}
      </View>
      <Copy style={{ fontSize: 12, textAlign: "center", paddingVertical: 10 }}>Offline · No ads · Made for little moments together.</Copy>
    </ScrollView><Settings visible={settings} onClose={() => setSettings(false)} />
  </SafeAreaView>;
}
