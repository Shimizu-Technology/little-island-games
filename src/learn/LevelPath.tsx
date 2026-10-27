import React from "react";
import { View } from "react-native";
import { C, Copy, Heading, PressableScale } from "../components/ui";
import { levelInfo, levelNumbers, levelTitle, type LearningLevel } from "./levels";
import type { LearnId } from "./types";

/** Five beach stones, all reachable. Selection never replaces a round until Start. */
export function LevelPath({ game, level, onChoose }: { game: LearnId; level: LearningLevel; onChoose: (level: LearningLevel) => void }) {
  return <View style={{ gap: 12, alignSelf: "stretch" }}>
    <Heading style={{ fontSize: 22 }}>{levelTitle(game, level)}</Heading>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Choose a learning level">
      {levelNumbers.map(n => <PressableScale key={n} accessibilityRole="radio" accessibilityLabel={`Choose ${levelTitle(game, n)}`} accessibilityState={{ checked: level === n }} aria-checked={level === n} onPress={() => onChoose(n)} style={{ minWidth: 44, minHeight: 48, flexGrow: 1, flexBasis: 44, maxWidth: 90, borderRadius: n % 2 ? 20 : 16, borderWidth: level === n ? 3 : 1, borderColor: level === n ? C.teal : C.line, backgroundColor: level === n ? C.teal : C.paper, alignItems: "center", justifyContent: "center", padding: 8 }}>
        <Copy style={{ fontSize: 20, fontWeight: "800", color: level === n ? C.paper : C.ink }}>{n}</Copy>
      </PressableScale>)}
    </View>
    <Copy>{levelInfo(game, level).description}</Copy>
    <Copy style={{ fontSize: 13 }}>Choose any stone. Help is welcome at every level.</Copy>
  </View>;
}
