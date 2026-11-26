import React from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { ArcadeGameScreen, ArcadeLobby } from "../arcade/ArcadeScreen";
import { FLIGHT_CHROME_TINT } from "../arcade/games/fruit-bat-flight/presentation";
import { RenderSpike } from "../arcade/RenderSpike";
import { arcadeGames } from "../arcade";
import { useStore } from "../state/Store";
import { Recovery } from "../components/Recovery";
import { Heading, styles } from "../components/ui";
import { useNunitoLoaded } from "../ui/fonts";
export default function Arcade() {
  const params = useLocalSearchParams<{ game?: string; spike?: string; budget?: string }>(), store = useStore();
  const nunitoLoaded = useNunitoLoaded();
  const game = arcadeGames.find(g => g.id === params.game);
  const backgroundColor = !game ? "#FFF4DE" : game.id === "fruit-bat-flight" ? FLIGHT_CHROME_TINT : game.id === "shell-song" ? "#222958" : "#077C91";
  const lagoonScreen = game?.id === "lagoon-run" && store.ready && !store.recovery && params.spike !== "1";
  return <SafeAreaView edges={lagoonScreen ? [] : undefined} style={[styles.page, { backgroundColor }]}>{!store.ready ? <View style={styles.content}><Heading>Getting the arcade ready…</Heading></View> : store.recovery ? <Recovery/> : params.spike === "1" ? <ScrollView><RenderSpike/></ScrollView> : game ? <ArcadeGameScreen key={game.id} game={game} debug={params.budget === "1"}/> : <ArcadeLobby nunitoLoaded={nunitoLoaded}/>}</SafeAreaView>;
}
