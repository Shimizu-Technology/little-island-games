import React from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button, C, Copy, Heading, PressableScale } from "../components/ui";
import { Text } from "../components/Text";
import { ArcadeArt, StarDisplay } from "./Art";
import { type ArcadeGame, type ArcadeLevel, type LevelId, starCount } from "./types";
import { type ArcadeLearner, gameProgress, levelOpen, endlessOpen } from "./progress";
export function LevelMap({ game, person, levels, unlockAll, onLevel, onOutfits, onChest }: { game: ArcadeGame; person: ArcadeLearner; levels: readonly ArcadeLevel[]; unlockAll: boolean; onLevel: (id: LevelId | "endless") => void; onOutfits: () => void; onChest: () => void }) {
  const p = gameProgress(person, game.id), { width } = useWindowDimensions(), pathWidth = Math.min(480, width - 64), unit = pathWidth / 4;
  return <View style={{ gap: 22 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 26, backgroundColor: game.surface }}>
      <ArcadeArt game={game.id} size={100} outfit={p.outfit}/><View style={{ flex: 1, gap: 8 }}><Heading style={{ fontSize: 25 }}>{game.name}</Heading><Copy>{starCount(p.stars)} stars · {person.stickers.length} stickers</Copy><Button quiet compact onPress={onOutfits}>Dress {game.hero.split(" the ")[0]}</Button></View>
    </View>
    {person.chest?.game === game.id && <Button quiet onPress={onChest}>Your sticker chest is waiting</Button>}
    <Copy>Follow the path, or visit the learning world. Helper earns the same stars. Replay any open level.</Copy>
    {game.worlds.map(world => {
      const open = unlockAll || p.openWorlds.includes(world.id), own = levels.filter(l => l.world === world.id);
      return <View key={world.id} style={{ gap: 10, paddingVertical: 14, paddingHorizontal: 8, backgroundColor: world.learning ? "#FFF5DE" : C.paper, borderRadius: 26, borderWidth: 1, borderColor: C.line }}>
        <View style={{ paddingHorizontal: 10, gap: 5 }}><Heading style={{ fontSize: 23 }}>{world.name}</Heading><Copy>{world.detail}</Copy>{!open && <Copy style={{ color: C.teal }}>Opens at {world.stars} stars · you have {starCount(p.stars)}</Copy>}</View>
        <View style={{ width: pathWidth, height: 218, alignSelf: "center" }}>
          <Svg width={pathWidth} height={210} style={{ position: "absolute" }} accessible={false}><Path d={`M${unit / 2} 46H${pathWidth - unit / 2}Q${pathWidth + 12} 46 ${pathWidth - unit / 2} 153H${unit / 2}`} fill="none" stroke={world.learning ? "#E4CF9F" : "#D5E6DC"} strokeWidth={10} strokeLinecap="round" strokeDasharray="2 17"/></Svg>
          {own.map((level, i) => {
            const col = i < 4 ? i : 7 - i, row = i < 4 ? 0 : 1, available = levelOpen(p, level.id, unlockAll), stars = p.stars[level.id] ?? 0;
            return <View key={level.id} style={{ position: "absolute", left: col * unit, top: row * 108, width: unit, alignItems: "center", gap: 2 }}>
              <PressableScale disabled={!available} accessibilityRole="button" accessibilityLabel={`${world.name}, level ${level.index}, ${level.name}, ${stars} stars${available ? "" : ", locked"}`} accessibilityState={{ disabled: !available }} onPress={() => onLevel(level.id)} style={{ width: 62, height: 62, borderRadius: 24, justifyContent: "center", alignItems: "center", backgroundColor: available ? stars ? game.color : "#FFF9E8" : "#EBEEE8", borderWidth: 2, borderColor: available ? game.color : "#BBC7BF", marginTop: 12 }}>
                {available ? <Text style={{ color: stars ? "#FFF9EA" : game.color, fontSize: 25, fontWeight: "800" }}>{level.index}</Text> : <Text style={{ fontSize: 12, color: C.muted }}>Locked</Text>}
              </PressableScale><StarDisplay stars={stars} size={19}/>
            </View>;
          })}
        </View>
      </View>;
    })}
    <View style={{ padding: 20, backgroundColor: game.surface, borderRadius: 24, gap: 10 }}><Heading style={{ fontSize: 24 }}>Free play</Heading><Copy>{endlessOpen(p, unlockAll) ? "Make a reef or a song as long as you like. Finish whenever you’re ready." : "Clear all eight levels in the first world to open free play."}</Copy><Copy>Personal best: {p.best} points</Copy><Button disabled={!endlessOpen(p, unlockAll)} onPress={() => onLevel("endless")}>Play freely</Button></View>
  </View>;
}
