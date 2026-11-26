import { stickerSections } from "./presentation";
import React from "react";
import { View } from "react-native";
import { Button, Copy, Heading } from "../components/ui";
import { useNunitoLoaded } from "../ui/fonts";
import { theme } from "../ui/theme";
import { ArcadeArt, StickerArt, stickerNames } from "./Art";
import { type ArcadeLearner, gameProgress, outfitIds, outfitNames, outfitStars, stickerIds, type OutfitId } from "./progress";
import type { ArcadeGame } from "./types";

const INK = theme.colors.frame;
const SUBTLE_INK = "#6A5246";
const PAPER = "#FFFDF8";
const CREAM = "#FFF8EC";
const BORDER = "#E8D8BE";
const CORAL = theme.colors.coral;

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
  const nunitoLoaded = useNunitoLoaded();
  const headingFace = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
    : ({ fontWeight: "800" } as const);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Heading style={{ ...headingFace, fontSize: 26, color: INK }}>My island friends</Heading>
        <Copy style={{ color: SUBTLE_INK }}>
          {person.stickers.length} of {stickerIds.length} friends found. Every chest shows its sticker. Collect them in any game.
        </Copy>
      </View>
      {stickerSections(person).map(chapter => (
        <View key={chapter.name} style={{ gap: 10 }}>
          <Heading style={{ ...headingFace, fontSize: 19, color: INK }}>{chapter.name}</Heading>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {chapter.stickers.map(id => {
              const found = person.stickers.includes(id);
              return (
                <View
                  key={id}
                  accessibilityLabel={`${stickerNames[id]}, ${found ? "collected" : "waiting in a chest"}`}
                  style={{
                    width: 138,
                    minHeight: 158,
                    padding: 12,
                    alignItems: "center",
                    gap: 8,
                    backgroundColor: found ? PAPER : "#F4EDE0",
                    borderRadius: 24,
                    borderWidth: found ? 2 : 1.5,
                    borderColor: found ? "#E5BA5C" : BORDER,
                    transform: [{ rotate: found ? "-2deg" : "1.5deg" }],
                    boxShadow: found ? "0 4px 0 rgba(212, 168, 72, 0.25)" : "0 2px 0 rgba(61, 43, 36, 0.08)",
                  }}
                >
                  <View
                    style={{
                      opacity: found ? 1 : 0.32,
                      padding: 3,
                      borderRadius: 50,
                      backgroundColor: found ? "#FFF6DF" : CREAM,
                    }}
                  >
                    <StickerArt id={id} size={84} />
                  </View>
                  <Copy style={{ fontSize: 14, lineHeight: 18, fontWeight: "700", textAlign: "center", color: found ? INK : SUBTLE_INK }}>
                    {stickerNames[id]}
                  </Copy>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export function OutfitCloset({ game, person, onSelect }: { game: ArcadeGame; person: ArcadeLearner; onSelect: (outfit: OutfitId) => void }) {
  const nunitoLoaded = useNunitoLoaded();
  const headingFace = nunitoLoaded
    ? ({ fontFamily: theme.fontFamily["800"], fontWeight: "normal" } as const)
    : ({ fontWeight: "800" } as const);
  const p = gameProgress(person, game.id);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Heading style={{ ...headingFace, fontSize: 26, color: INK }}>Dress {game.hero.split(" the ")[0]}</Heading>
        <Copy style={{ color: SUBTLE_INK }}>Outfits open with your stars. They are just for fun. Helper earns the same stars.</Copy>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
        {outfitIds.map(id => {
          const unlocked = p.unlockedOutfits.includes(id);
          const wearing = p.outfit === id;
          return (
            <View
              key={id}
              style={{
                width: 148,
                alignItems: "center",
                gap: 10,
                padding: 14,
                backgroundColor: wearing ? "#FFF3E8" : PAPER,
                borderRadius: 24,
                borderWidth: wearing ? 2.5 : 1.5,
                borderColor: wearing ? CORAL : BORDER,
                boxShadow: "0 3px 0 rgba(61, 43, 36, 0.1)",
              }}
            >
              <ArcadeArt game={game.id} size={96} outfit={id} />
              <Copy style={{ fontSize: 15, lineHeight: 20, fontWeight: "800", textAlign: "center", color: INK }}>{outfitNames[id]}</Copy>
              <Button
                quiet
                compact
                selected={wearing}
                disabled={!unlocked}
                label={`${outfitNames[id]}, ${unlocked ? (wearing ? "wearing" : "choose outfit") : `opens at ${outfitStars[id]} stars`}`}
                onPress={() => onSelect(id)}
                style={{
                  width: "100%",
                  borderRadius: 999,
                  minHeight: 44,
                  backgroundColor: wearing ? CORAL : unlocked ? CREAM : "#F4EDE0",
                  borderWidth: 1.5,
                  borderColor: wearing ? "#D95D42" : BORDER,
                }}
                textStyle={{ color: INK, fontSize: 14, fontWeight: "800" }}
              >
                {unlocked ? (wearing ? "Wearing" : "Wear it") : `${outfitStars[id]} stars`}
              </Button>
            </View>
          );
        })}
      </View>
    </View>
  );
}
