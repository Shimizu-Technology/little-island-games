import { gameDestination } from '../learn/destinations';
import { GameIcon as ShelfArt } from "./GameIcon";
import React from "react";
import { View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Text, TextFit, entryRegion } from "./Text";
import { C, Copy, Heading, IconButton, PressableScale } from "./ui";
import { LearnId, learnIds } from "../learn/types";
import { ongoing, shelfLevel, ShelfGame, ShelfId } from "../learn/home";
import { subjectTheme } from "../learn/LearnChrome";
import { learningCardArt } from "./learningCardArt";
import { useStore } from "../state/Store";
import { theme as islandTheme } from "../ui/theme";
import { useNunitoLoaded } from "../ui/fonts";
export function openShelfGame(id: ShelfId) {
  router.push(gameDestination(id));
}
// Compatibility name for existing shelves; all listings share the same tile.
export { GameIcon as ShelfArt } from "./GameIcon";
export function GameCards({ games, width }: { games: ShelfGame[]; width: number }) {
  const loaded = useNunitoLoaded();
  const bold = loaded ? { fontFamily: islandTheme.fontFamily["800"], fontWeight: "normal" as const } : { fontWeight: "800" as const };
  const store = useStore(), { fontScale } = useWindowDimensions();
  // A card's words stop at 1.5x at accessibility sizes and fit the card's text column (12-pt padding each side, 2-pt border).
  const region = entryRegion(fontScale, width - 28);
  return <TextFit.Provider value={region}><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
    {games.map(g => {
      const live = ongoing(store.save, g.id), favorite = (store.save.favoriteGames ?? []).includes(g.id);
      const level = learnIds.includes(g.id as LearnId) ? shelfLevel(store.save, g.id as LearnId) : undefined;
      const learning = !!level;
      const theme = learning && g.id === "hafa-adai" ? { sky: "#FFE4D9", land: "#F5BCA6", accent: "#A44E3A", ink: "#65382D" } : learning ? subjectTheme[g.island as keyof typeof subjectTheme] : undefined;
      return <View key={g.id} style={{ width, borderRadius: learning ? 24 : 20, overflow: "hidden", backgroundColor: "#FFFDF8", borderWidth: learning ? 2 : 1, borderColor: theme?.accent ?? "#E8D8BE", shadowColor: "#3D2B24", shadowOpacity: learning ? 0.13 : 0.08, shadowOffset: { width: 0, height: 5 }, shadowRadius: 8, elevation: 3 }}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Play ${g.name}${level ? `, Level ${level} of 5` : ""}${g.ages ? `, ${g.ages}` : ""}${live ? ", saved round available" : ""}`} onPress={() => openShelfGame(g.id)} amount={0.98} style={{ flex: 1 }}>
          <View style={{ height: learning ? learningCardArt.height : 88, paddingRight: width < 200 ? 24 : 0, backgroundColor: theme?.sky ?? g.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {learning && <View pointerEvents="none" style={{ position: "absolute", bottom: learningCardArt.landBottom, width: width * 1.25, height: learningCardArt.landHeight, borderRadius: width, backgroundColor: theme?.land }}/>}
            <View style={{ zIndex: 1 }}><ShelfArt id={g.id} size={learning ? learningCardArt.size : 74} /></View>
          </View>
          <View style={{ padding: 12, gap: 5, flex: 1 }}>
            <Heading style={{ fontSize: 20, color: "#3D2B24", ...bold }}>{g.name}</Heading>
            {level && <><Copy style={{ fontSize: 12, fontWeight: "800", color: theme?.ink }}>Chosen: Level {level} of 5</Copy><View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>{[1,2,3,4,5].map(n => <View key={n} style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: n === level ? theme?.accent : theme?.sky, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 12, fontWeight: "900", color: n === level ? C.paper : theme?.ink }}>{n}</Text></View>)}</View><Copy style={{ fontSize: 12, color: theme?.ink }}>{Object.keys(store.save.school?.[g.id as LearnId] ?? {}).length} of 5 levels completed · {Object.values(store.save.school?.[g.id as LearnId] ?? {}).reduce((total,r) => total + (r?.stars ?? 0),0)} earned stars</Copy></>}
            <Copy style={{ fontSize: 12, lineHeight: 18, color: C.teal }}>{g.ages ? `${g.ages} · ${g.players}` : g.players}</Copy>
            <Copy style={{ fontSize: 13, lineHeight: 19 }}>{g.description}</Copy>
            <Text style={{ color: C.teal, ...bold, fontSize: 15, marginTop: "auto", paddingTop: 5 }}>{live ? "Continue →" : "Let’s play →"}</Text>
          </View>
        </PressableScale>
        <View style={{ position: "absolute", top: 8, right: 8 }}><IconButton icon={favorite ? "star-filled" : "star"} selected={favorite} size={44} label={`${favorite ? "Remove favorite" : "Favorite"} ${g.name}`} onPress={() => store.toggleGameFavorite(g.id)} /></View>
      </View>;
    })}
  </View></TextFit.Provider>;
}
