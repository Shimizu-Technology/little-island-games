import React from "react";
import { View } from "react-native";
import { Button, C, Copy, Heading } from "../components/ui";
import { ArcadeArt, StickerArt, stickerNames } from "./Art";
import { type ArcadeLearner, gameProgress, outfitIds, outfitNames, outfitStars, stickerIds, type OutfitId } from "./progress";
import type { ArcadeGame } from "./types";
/** All sixteen kit stickers, arranged as nine game chapters. Rewards remain shared. */
export const stickerChapters: { name: string; stickers: readonly (typeof stickerIds[number])[] }[] = [
  { name: "Canoe Cargo", stickers: ["moon-canoe"] },
  { name: "Fruit Bat Flight", stickers: ["flying-fox", "jelly-light"] },
  { name: "Lagoon Run", stickers: ["sea-turtle", "lagoon-ray"] },
  { name: "Reef Builder", stickers: ["reef-fish", "rainbow-fish"] },
  { name: "Shell Song", stickers: ["singing-shell", "star-shell"] },
  { name: "Rail Parade", stickers: ["tiny-rail", "island-flower"] },
  { name: "Crab Crossing", stickers: ["little-crab", "hermit-home"] },
  { name: "Palm Patrol", stickers: ["coconut", "sun-coral"] },
  { name: "Beach Ball", stickers: ["sea-star"] },
];
export function StickerBook({ person }: { person: ArcadeLearner }) {
  return <View style={{ gap: 18 }}><Heading>Our island sticker atlas</Heading><Copy>{person.stickers.length} of {stickerIds.length} friends found. Every chest shows its sticker. Collect them in any game.</Copy>
    {stickerChapters.map(chapter => <View key={chapter.name} style={{ gap: 10 }}><Heading style={{ fontSize: 19 }}>{chapter.name}</Heading>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{chapter.stickers.map(id => {
        const found = person.stickers.includes(id);
        return <View key={id} accessibilityLabel={`${stickerNames[id]}, ${found ? "collected" : "waiting in a chest"}`} style={{ flexGrow: 1, flexBasis: 125, maxWidth: 200, minHeight: 143, padding: 10, alignItems: "center", gap: 5, backgroundColor: found ? "#FFF8E4" : C.sand, borderRadius: 22, borderWidth: found ? 2 : 1, borderStyle: found ? "solid" : "dashed", borderColor: found ? "#C59A4D" : C.line }}>
          <View style={{ opacity: found ? 1 : .4 }}><StickerArt id={id} size={82}/></View><Copy style={{ fontSize: 14, textAlign: "center", color: C.ink }}>{stickerNames[id]}</Copy><Copy style={{ fontSize: 12 }}>{found ? "Found ✓" : "In a sticker chest"}</Copy>
        </View>;
      })}</View>
    </View>)}
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
