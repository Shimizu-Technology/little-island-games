import { C as BaseC, Heading as BaseHeading, Copy as BaseCopy , PressableScale } from "../components/ui";
import { useNunitoLoaded } from "../ui/fonts";

import React from "react";
import { View, useWindowDimensions } from "react-native";
import { LARGE_TEXT, wordFitMultiplier } from "../components/wordFit";
import { levelInfo, levelNumbers, levelTitle, type LearningLevel } from "./levels";
import type { SchoolProgress } from "./schoolProgress";
import type { LearnId } from "./types";

/** Five beach stones, all reachable. Selection never replaces a round until Start. */
export function LevelPath({ game, level, onChoose, progress = {} }: { game: LearnId; level: LearningLevel; onChoose: (level: LearningLevel) => void; progress?: SchoolProgress }) {
  // At accessibility sizes the headings stop where their words still fit (2x at most), and each stone's star and
  // number stop at 1.5x, so five stones still fit one row without clipping. The path sits in a sheet or the page,
  // inside 22-pt padding and its own 16-pt padding.
  const { width, fontScale } = useWindowDimensions(), large = fontScale >= LARGE_TEXT;
  const line = (width >= 600 ? Math.min(560, width - 48) : width) - 44 - 32;
  const fit = (text: string, size: number) => large ? wordFitMultiplier(text, size, line, 2) : undefined;
  const title = levelTitle(game, level);
  return <View style={{ gap: 12, alignSelf: "stretch", backgroundColor: "#FFFDF8", padding: 16, borderRadius: 25, borderWidth: 1, borderColor: "#E8D8BE" }}>
    <Heading maxFontSizeMultiplier={fit("Your island path", 22)} style={{ fontSize: 22 }}>Your island path</Heading>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 3 }} accessibilityRole="radiogroup" accessibilityLabel="Choose a learning level">
      <View pointerEvents="none" style={{ position: "absolute", left: 12, right: 12, top: 26, height: 5, borderRadius: 4, backgroundColor: "#D6C7A7" }}/>
      {levelNumbers.map(n => <PressableScale key={n} accessibilityRole="radio" accessibilityLabel={`Choose ${levelTitle(game, n)}, ${progress[game]?.[n] ? `${progress[game]![n]!.stars} earned stars, completed` : "not completed yet"}`} accessibilityState={{ checked: level === n }} aria-checked={level === n} onPress={() => onChoose(n)} style={{ minWidth: 45, minHeight: 72, flex: 1, maxWidth: 76, borderRadius: 22, borderWidth: level === n ? 3 : 2, borderColor: level === n ? C.ink : C.line, backgroundColor: level === n ? "#FFE4A3" : C.paper, alignItems: "center", justifyContent: "center", shadowColor: "#6A5A3A", shadowOpacity: 0.16, shadowOffset: { width: 0, height: 4 }, shadowRadius: 1, elevation: 3 }}>
        <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 15, lineHeight: 20, color: "#3D2B24" }}>{progress[game]?.[n] ? "★".repeat(progress[game]![n]!.stars) : "☆"}</Copy>
        <Copy maxFontSizeMultiplier={1.5} style={{ fontSize: 20, lineHeight: 24, fontWeight: "900", color: C.ink }}>{n}</Copy>
      </PressableScale>)}
    </View>
    <Heading maxFontSizeMultiplier={fit(title, 19)} style={{ fontSize: 19 }}>{title}</Heading>
    <Copy>{levelInfo(game, level).description}</Copy>
    <Copy maxFontSizeMultiplier={large ? 2 : undefined} style={{ fontSize: 15 }}>Every stone is open. Choose where to play.</Copy>
    <Copy maxFontSizeMultiplier={large ? 2 : undefined} style={{ fontSize: 15 }}>1 star: finish. 2: work it out independently. 3: independent rounds on two different days. Help is always welcome. Take your time.</Copy>
  </View>;
}

const C = { ...BaseC, cream: '#FFF6E5', paper: '#FFFDF8', line: '#E8D8BE', ink: '#3D2B24', muted: '#665247', teal: '#9A641A', soft: '#FFF0D2', coral: '#FF7A5C' };
function Heading(props: React.ComponentProps<typeof BaseHeading>) {
 const loaded = useNunitoLoaded();
 return <BaseHeading {...props} style={[{ color: '#3D2B24' }, props.style, loaded ? {fontFamily: 'Nunito_800ExtraBold', fontWeight: 'normal'} : {fontWeight: '800'}]}/>;
}
function Copy(props: React.ComponentProps<typeof BaseCopy>) {
 const loaded = useNunitoLoaded();
 return <BaseCopy {...props} style={[{ color: '#665247' }, props.style, loaded && {fontFamily: 'Nunito_600SemiBold', fontWeight: 'normal'}]}/>;
}
