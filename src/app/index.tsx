import { Text } from "../components/Text";
import React, { useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { GameId, gameIds, games, isFinished } from "../games";
import { Button, C, Chip, Copy, Heading, IconButton, Label, PressableScale, font, styles } from "../components/ui";
import { Icon } from "../components/Icon";
import { GameArt } from "../components/Art";
import { Settings } from "../components/Settings";
import { Recovery } from "../components/Recovery";
import { SaveStatus } from "../components/SaveStatus";
import { useStore } from "../state/Store";
import { ActivityId, activityFinished } from "../state/activities";
import { FeatureArt } from "../components/FeatureArt";
const extraGames: { id: ActivityId; name: string; description: string; surface: string; players: string; filters: string[] }[] = [
  {
    id: "go-fish",
    name: "Go Fish",
    players: "1 or 2 players",
    description: "Collect matching families of cards.",
    surface: "#DEEDF2",
    filters: ["Words & numbers", "Play together"],
  },
  {
    id: "crazy-eights",
    name: "Crazy Eights",
    players: "1 or 2 players",
    description: "Match a suit. Change it with an eight.",
    surface: "#F4E8CB",
    filters: ["Think & explore", "Play together"],
  },
  {
    id: "racer",
    name: "Island Dash",
    players: "1 player",
    description: "Run, jump, and race island trails.",
    surface: "#DDECD7",
    filters: ["Think & explore"],
  },
  {
    id: "island-mystery",
    name: "Picnic Mystery",
    players: "Solo or 3–8 devices",
    description: "Do island jobs. Find the mischief maker.",
    surface: "#E5E9D5",
    filters: ["Think & explore", "Play together"],
  },
  {
    id: "word-imposter",
    name: "Secret Word",
    players: "3–8 players",
    description: "One secret. One Imposter. Play together.",
    surface: "#E8E1F3",
    filters: ["Words & numbers", "Play together"],
  },
];
type ShelfId = GameId | ActivityId;
const shelf = [
  ...gameIds.map((id) => ({ id: id as ShelfId, ...games[id],
    players: id === "maze" || id === "numbers" ? "Alone or together" : id === "word-rescue" ? "Word packs or family word" : "1 or 2 players",
    filters: ["Play alone", "Play together", ...(["word-rescue", "numbers"].includes(id) ? ["Words & numbers"] : ["Think & explore"])],
  })),
  ...extraGames.map((g) => ({ ...g, filters: [...g.filters, ...(g.id === "word-imposter" ? [] : ["Play alone"])] })),
];
const filters = ["All games", "Play alone", "Play together", "Favorites", "Words & numbers", "Think & explore"];
export default function Home() {
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions(), store = useStore();
  const [settings, setSettings] = useState(false), [filter, setFilter] = useState("All games");
  const availableWidth = width - insets.left - insets.right;
  const columns = fontScale > 1.3 || availableWidth < 350 ? 1 : availableWidth >= 900 ? 3 : 2;
  const cardWidth = (Math.min(availableWidth, 1080) - 40 - 12 * (columns - 1)) / columns;
  const favorites = store.save.favoriteGames ?? [];
  const recent = store.save.recent && store.save.sessions[store.save.recent];
  const recentActivity = store.save.recentActivity && store.save.activities?.[store.save.recentActivity];
  const resumeId: ShelfId | null = recentActivity && !activityFinished(recentActivity) ? store.save.recentActivity! : recent && !isFinished(recent) ? recent.game : null;
  const choices = shelf.filter((g) => filter === "All games" || (filter === "Favorites" ? favorites.includes(g.id) : g.filters.includes(filter)));
  function open(id: ShelfId) {
    if (gameIds.includes(id as GameId)) router.push({ pathname: "/play", params: { game: id } });
    else router.push({ pathname: "/activity", params: { game: id } });
  }
  function ongoing(id: ShelfId) {
    const original = store.save.sessions[id as GameId], activity = store.save.activities?.[id as ActivityId];
    return original ? !isFinished(original) : activity ? !activityFinished(activity) : false;
  }
  if (!store.ready) return <SafeAreaView style={styles.page}><View style={styles.content}><Heading>Getting your island ready…</Heading></View></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={styles.page}><Recovery /></SafeAreaView>;
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: 20, gap: 14 }]}>
        <View style={[styles.row, { paddingTop: 12, justifyContent: "space-between", flexWrap: "wrap" }]}>
          <Text style={{ fontFamily: font, fontSize: 22, fontWeight: "800", color: C.ink }}>little island</Text>
          <Button compact quiet onPress={() => setSettings(true)} label="Open sound settings and grown-up backups">Settings</Button>
        </View>
        <SaveStatus />
        <Heading style={{ fontSize: availableWidth >= 600 ? 34 : 28 }}>What shall we play?</Heading>
        {resumeId && <Button onPress={() => open(resumeId)} label={`Continue ${shelf.find((g) => g.id === resumeId)?.name}, your saved round`}>Continue {shelf.find((g) => g.id === resumeId)?.name}</Button>}
        {favorites.length > 0 && <View style={{ gap: 8 }}>
          <Label>Your favorites</Label>
          <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
            {favorites.map((id) => <Button key={id} quiet compact onPress={() => open(id)} label={`Open favorite ${shelf.find((g) => g.id === id)?.name}`}>{shelf.find((g) => g.id === id)?.name}</Button>)}
          </View>
        </View>}
        <PressableScale accessibilityRole="button" accessibilityLabel="Explore and learn, fifty offline discoveries" onPress={() => router.push("/explore")}
          amount={0.98} style={{ backgroundColor: "#DFEAF0", borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <FeatureArt kind="explore" size={44} />
          <View style={{ flex: 1 }}><Heading style={{ fontSize: 20 }}>Explore & learn</Heading><Copy style={{ fontSize: 13 }}>Listen, discover, and try an experiment.</Copy></View>
          <Icon name="right" size={24} color={C.teal} />
        </PressableScale>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel="Game categories" accessibilityHint="Swipe for favorites, words and numbers, and thinking games." style={{ flexGrow: 0, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 3 }}>
          {filters.map((f) => <Chip key={f} selected={f === filter} onPress={() => setFilter(f)}>{f}</Chip>)}
        </ScrollView>
        {filter === "Favorites" && choices.length === 0 && <Copy>Tap the star on a game to keep it close by.</Copy>}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {choices.map((g) => {
            const original = gameIds.includes(g.id as GameId), live = ongoing(g.id), favorite = favorites.includes(g.id);
            return <View key={g.id} style={{ width: cardWidth, borderRadius: 20, overflow: "hidden", backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
              <PressableScale accessibilityRole="button" accessibilityLabel={`Play ${g.name}${live ? ", saved round available" : ""}`} onPress={() => open(g.id)} amount={0.98} style={{ flex: 1 }}>
                <View style={{ height: 88, backgroundColor: g.surface, alignItems: "center", justifyContent: "center" }}>
                  {original ? <GameArt game={g.id as GameId} size={74} /> : <FeatureArt kind={g.id as ActivityId} size={74} />}
                </View>
                <View style={{ padding: 12, gap: 5, flex: 1 }}>
                  <Heading style={{ fontSize: 20 }}>{g.name}</Heading>
                  <Copy style={{ fontSize: 12, lineHeight: 18, color: C.teal }}>{g.players}</Copy>
                  <Copy style={{ fontSize: 13, lineHeight: 19 }}>{g.description}</Copy>
                  <Text style={{ color: C.teal, fontFamily: font, fontWeight: "700", fontSize: 14, marginTop: "auto", paddingTop: 5 }}>{live ? "Continue →" : "Let’s play →"}</Text>
                </View>
              </PressableScale>
              <View style={{ position: "absolute", top: 8, right: 8 }}>
                <IconButton icon={favorite ? "star-filled" : "star"} selected={favorite} size={40} label={`${favorite ? "Remove favorite" : "Favorite"} ${g.name}`} onPress={() => store.toggleGameFavorite(g.id)} />
              </View>
            </View>;
          })}
        </View>
        <Copy style={{ fontSize: 12, textAlign: "center", paddingVertical: 10 }}>Offline · No ads · Made for little moments together.</Copy>
      </ScrollView>
      <Settings visible={settings} onClose={() => setSettings(false)} />
    </SafeAreaView>
  );
}
