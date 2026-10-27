import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { Button, Copy, Heading, PressableScale } from "../../../components/ui";
import { Text } from "../../../components/Text";
import { StarDisplay, StickerArt, stickerNames } from "../../Art";
import { type ArcadeLearner, endlessOpen, gameProgress, levelOpen } from "../../progress";
import { starCount, type ArcadeGame, type ArcadeLevel, type LevelId, type WorldId } from "../../types";
import { Bob } from "./Controls";
import { ChestArt, GridBackdrop, GridHero, palettes } from "./Art";
export function GridMap({
  game,
  person,
  levels,
  unlockAll,
  onLevel,
  onOutfits,
  onChest,
  onBook,
}: {
  game: ArcadeGame;
  person: ArcadeLearner;
  levels: readonly ArcadeLevel[];
  unlockAll: boolean;
  onLevel: (id: LevelId | "endless") => void;
  onOutfits: () => void;
  onChest: () => void;
  onBook: () => void;
}) {
  const [world, setWorld] = useState<WorldId>("w1"),
    { width } = useWindowDimensions(),
    size = Math.min(950, width - 24),
    p = gameProgress(person, game.id),
    crab = game.id === "crab-crossing",
    color = palettes[crab ? "crab" : "rail"][{ w1: 0, w2: 1, w3: 2, learn: 3 }[world]],
    own = levels.filter((l) => l.world === world),
    next = own.find((l) => !p.stars[l.id] && levelOpen(p, l.id, unlockAll)),
    current = game.worlds.find((w) => w.id === world)!;
  const positions = [24, 66, 76, 35, 24, 65, 77, 35].map((x, i) => ({
    x: (size * x) / 100,
    y: 180 + Math.floor(i / 2) * 108 + (i % 2) * 32,
  }));
  return (
    <View style={{ alignItems: "center", gap: 14, paddingBottom: 24 }}>
      <View
        style={{ width: size, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <Copy style={{ color: "#FFF0C5", fontSize: 15 }}>
          ★ {starCount(p.stars)} · {person.stickers.length} stickers
        </Copy>
        <Button quiet compact onPress={onOutfits}>
          Dress {game.hero.split(" the ")[0]}
        </Button>
      </View>
      <View style={{ width: size, flexDirection: "row", gap: 5 }}>
        {game.worlds.map((w) => (
          <PressableScale
            key={w.id}
            accessibilityRole="button"
            accessibilityLabel={`${w.name}${!unlockAll && !p.openWorlds.includes(w.id) ? `, opens at ${w.stars} stars` : ""}`}
            accessibilityState={{ selected: world === w.id }}
            onPress={() => setWorld(w.id)}
            style={{
              flex: 1,
              minHeight: 65,
              borderRadius: 17,
              padding: 6,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: world === w.id ? color.accent : "#FFFFFF1A",
              borderWidth: 1,
              borderColor: "#FFFFFF33",
            }}
          >
            <Text
              style={{
                color: world === w.id ? "#334F50" : "#FFF3D7",
                fontSize: 13,
                textAlign: "center",
                fontWeight: "800",
              }}
            >
              {w.name}
            </Text>
            {!unlockAll && !p.openWorlds.includes(w.id) && (
              <Text style={{ color: "#FFF0C5", fontSize: 12 }}>★ {w.stars}</Text>
            )}
          </PressableScale>
        ))}
      </View>
      <View
        style={{
          width: size,
          height: 640,
          borderRadius: 30,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: "#FFFFFF33",
        }}
      >
        <GridBackdrop crab={crab} world={world} width={size} height={640} />
        <View
          style={{
            position: "absolute",
            top: 14,
            left: 20,
            right: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={{ color: color.accent, fontSize: 12, fontWeight: "800", letterSpacing: 2 }}>
              {world === "learn" ? "LEARN & PLAY" : "YOUR NEXT ADVENTURE"}
            </Text>
            <Heading style={{ fontSize: width > 700 ? 34 : 25, color: "#FFF5D9" }}>{current.name}</Heading>
            <Copy style={{ color: "#E6EDCF", fontSize: 14 }}>{current.detail}</Copy>
          </View>
          <Bob>
            <GridHero crab={crab} size={width > 700 ? 145 : 100} outfit={p.outfit} />
          </Bob>
        </View>
        <Svg width={size} height={640} style={{ position: "absolute" }} accessible={false}>
          <Path
            d={`M${positions
              .map((p) => `${p.x} ${p.y}`)
              .join("Q")
              .replace(/Q/g, "L")}`}
            stroke="#163F3F"
            strokeWidth={26}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={`M${positions.map((p) => `${p.x} ${p.y}`).join("L")}`}
            stroke={crab ? "#BBE2C8" : "#C3D897"}
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d={`M${positions.map((p) => `${p.x} ${p.y}`).join("L")}`}
            stroke="#FFF4CF"
            strokeWidth={3}
            strokeDasharray="2 12"
            fill="none"
          />
        </Svg>
        {own.map((l, i) => {
          const open = levelOpen(p, l.id, unlockAll),
            isNext = l.id === next?.id,
            pos = positions[i];
          return (
            <Bob
              key={l.id}
              enabled={isNext}
              style={{ position: "absolute", left: pos.x - 35, top: pos.y - 34, width: 70, alignItems: "center" }}
            >
              <PressableScale
                disabled={!open}
                accessibilityRole="button"
                accessibilityLabel={`${current.name} level ${l.index}${isNext ? ", Next" : ""}${!open ? ", needs earlier stars" : ""}`}
                onPress={() => onLevel(l.id)}
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: open ? 24 : 31,
                  backgroundColor: isNext ? "#FFE3A0" : open ? "#F7EAC6" : "#8AA89A",
                  borderWidth: 3,
                  borderBottomWidth: 7,
                  borderColor: isNext ? "#E9AD51" : "#52766A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {open ? (
                  <Text style={{ color: "#34585A", fontSize: 28, fontWeight: "900" }}>{l.index}</Text>
                ) : (
                  <Svg width={27} height={30} viewBox="0 0 27 30" accessible={false}>
                    <Path d="M7 13V8Q7 0 14 1Q21 1 21 8V13" stroke="#355A55" strokeWidth={3} fill="none" />
                    <Rect x={3} y={12} width={22} height={17} rx={5} fill="#D5E0C4" stroke="#355A55" strokeWidth={2} />
                  </Svg>
                )}
              </PressableScale>
              <StarDisplay stars={p.stars[l.id] ?? 0} size={17} />
              {isNext && (
                <Text
                  style={{
                    color: "#FFF5D0",
                    backgroundColor: "#203F49",
                    paddingHorizontal: 9,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  Next ↑
                </Text>
              )}
            </Bob>
          );
        })}
      </View>
      {endlessOpen(p, unlockAll) && <Button onPress={() => onLevel("endless")}>Free play · your own adventure</Button>}
      {person.chest?.game === game.id && <ChestButton sticker={person.chest.sticker} onPress={onChest} />}
      <Button quiet onPress={onBook}>
        My sticker book
      </Button>
    </View>
  );
}
export function ChestButton({
  sticker,
  onPress,
}: {
  sticker: NonNullable<ArcadeLearner["chest"]>["sticker"];
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Open sticker chest: ${stickerNames[sticker]}`}
      onPress={onPress}
      style={{
        backgroundColor: "#FFF0C8",
        borderRadius: 26,
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
        maxWidth: 500,
        width: "100%",
        gap: 5,
      }}
    >
      <Bob>
        <ChestArt size={90} />
      </Bob>
      <View style={{ flex: 1 }}>
        <Heading style={{ fontSize: 20 }}>A little treasure!</Heading>
        <Copy style={{ fontSize: 13 }}>{stickerNames[sticker]} · optional</Copy>
      </View>
      <StickerArt id={sticker} size={60} />
    </PressableScale>
  );
}
