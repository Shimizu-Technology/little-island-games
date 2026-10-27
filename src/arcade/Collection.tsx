import React from "react";
import { View } from "react-native";
import { Button, C, Copy, Heading } from "../components/ui";
import { ArcadeArt, StickerArt, stickerNames } from "./Art";
import { type ArcadeLearner, gameProgress, outfitIds, outfitNames, outfitStars, stickerIds, type OutfitId } from "./progress";
import type { ArcadeGame } from "./types";
export function StickerBook({ person }: { person: ArcadeLearner }) {
  return <View style={{ gap: 14 }}><Heading>My island friends</Heading><Copy>{person.stickers.length} of {stickerIds.length} friends found. Keep discovering. Your friends stay here.</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>{stickerIds.map(id => {
      const found = person.stickers.includes(id);
      return <View key={id} accessibilityLabel={`${stickerNames[id]}, ${found ? "collected" : "not collected yet"}`} style={{ width: 136, minHeight: 156, padding: 12, alignItems: "center", gap: 6, backgroundColor: found ? "#FFF1CD" : "#E9E0CF", borderRadius: 26, borderWidth: 3, borderColor: found ? "#D4AA55" : "#D0C6B3", transform: [{ rotate: found ? "-3deg" : "2deg" }], boxShadow: "0 3px 0 #C9B993" }}>
        <View style={{ opacity: found ? 1 : .2, backgroundColor: "#FFF9E9", borderRadius: 48, borderWidth: 3, borderColor: "#FFFDF5" }}><StickerArt id={id} size={86}/></View><Copy style={{ fontSize: 14, textAlign: "center", color: C.ink }}>{found ? stickerNames[id] : stickerNames[id]}</Copy>
      </View>;
    })}</View>
  </View>;
}
export function OutfitCloset({ game, person, onSelect }: { game: ArcadeGame; person: ArcadeLearner; onSelect: (outfit: OutfitId) => void }) {
  const p = gameProgress(person, game.id);
  return <View style={{ gap: 14 }}><Heading>Dress {game.hero.split(" the ")[0]}</Heading><Copy>Outfits open with your stars. They are just for fun. Helper earns the same stars.</Copy>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>{outfitIds.map(id => {
      const unlocked = p.unlockedOutfits.includes(id);
      return <View key={id} style={{ width: 140, alignItems: "center", gap: 8, padding: 10, backgroundColor: p.outfit === id ? game.surface : C.paper, borderRadius: 20 }}><ArcadeArt game={game.id} size={110} outfit={id}/><Copy style={{ fontSize: 14, textAlign: "center" }}>{outfitNames[id]}</Copy><Button quiet compact selected={p.outfit === id} disabled={!unlocked} label={`${outfitNames[id]}, ${unlocked ? p.outfit === id ? "wearing" : "choose outfit" : `opens at ${outfitStars[id]} stars`}`} onPress={() => onSelect(id)}>{unlocked ? p.outfit === id ? "Wearing" : "Wear it" : `${outfitStars[id]} stars`}</Button></View>;
    })}</View>
  </View>;
}
