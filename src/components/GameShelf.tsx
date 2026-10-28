import { GameIcon as ShelfArt } from "./GameIcon";
import { isBoardId } from "../board";
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Text } from "./Text";
import { C, Copy, Heading, IconButton, PressableScale, font } from "./ui";
import { GameId, gameIds } from "../games";
import { LearnId, learnIds } from "../learn/types";
import { ongoing, shelfLevel, ShelfGame, ShelfId } from "../learn/home";
import { useStore } from "../state/Store";
export function openShelfGame(id: ShelfId) {
  router.push({ pathname: isBoardId(id) ? "/board" : learnIds.includes(id as LearnId) ? "/learn" : gameIds.includes(id as GameId) ? "/play" : "/activity", params: { game: id } });
}
// Compatibility name for existing shelves; all listings share the same tile.
export { GameIcon as ShelfArt } from "./GameIcon";
export function GameCards({ games, width }: { games: ShelfGame[]; width: number }) {
  const store = useStore();
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
    {games.map(g => {
      const live = ongoing(store.save, g.id), favorite = (store.save.favoriteGames ?? []).includes(g.id);
      const level = learnIds.includes(g.id as LearnId) ? shelfLevel(store.save, g.id as LearnId) : undefined;
      return <View key={g.id} style={{ width, borderRadius: 20, overflow: "hidden", backgroundColor: C.paper, borderWidth: 1, borderColor: C.line }}>
        <PressableScale accessibilityRole="button" accessibilityLabel={`Play ${g.name}${level ? `, Level ${level} of 5` : ""}${live ? ", saved round available" : ""}`} onPress={() => openShelfGame(g.id)} amount={0.98} style={{ flex: 1 }}>
          <View style={{ height: 88, paddingRight: width < 200 ? 24 : 0, backgroundColor: g.surface, alignItems: "center", justifyContent: "center" }}><ShelfArt id={g.id} size={74} /></View>
          <View style={{ padding: 12, gap: 5, flex: 1 }}>
            <Heading style={{ fontSize: 20 }}>{g.name}</Heading>
            {level && <Copy style={{ fontSize: 14, fontWeight: "800", color: C.teal }}>Level {level} of 5</Copy>}
            <Copy style={{ fontSize: 12, lineHeight: 18, color: C.teal }}>{g.players}</Copy>
            <Copy style={{ fontSize: 13, lineHeight: 19 }}>{g.description}</Copy>
            <Text style={{ color: C.teal, fontFamily: font, fontWeight: "700", fontSize: 14, marginTop: "auto", paddingTop: 5 }}>{live ? "Continue →" : "Let’s play →"}</Text>
          </View>
        </PressableScale>
        <View style={{ position: "absolute", top: 8, right: 8 }}><IconButton icon={favorite ? "star-filled" : "star"} selected={favorite} size={44} label={`${favorite ? "Remove favorite" : "Favorite"} ${g.name}`} onPress={() => store.toggleGameFavorite(g.id)} /></View>
      </View>;
    })}
  </View>;
}
