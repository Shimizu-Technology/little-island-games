import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { Button, C, Chip, Copy, Heading, PressableScale, styles } from "../../../components/ui";
import type { BoardProps } from "../../types";
import { chamoruWord } from "../../content/chamoru";
import { chooseActivity, IslandState, islandProgress, tapItem } from "./engine";
import { WordPicture } from "./pictures";
export const wordAudioKey = (id: string) => `hafa-adai-word-${id.replaceAll(".", "-").replaceAll("_", "-")}`;
export function Board({ session, update, practice, sound, soundOn, active, width }: BoardProps<IslandState>) {
  const s = session.state, p = islandProgress(s), options = session.options;
  const [selected, setSelected] = useState<string | null>(null), [english, setEnglish] = useState(false);
  const target = chamoruWord(s.items[p.cursor]), shown = chamoruWord(selected ?? s.taps.at(-1) ?? "");
  const spy = s.activity === "spy", gentle = options.pace === "easy";
  const columns = width >= 600 ? 4 : 3, tileWidth = (width - 24 - (columns - 1) * 6) / columns;
  const pictureSize = Math.max(38, Math.min(78, tileWidth - 12));
  const promptKey = p.done ? "hafa-adai-done" : !spy ? "hafa-adai-explore" : gentle && target ? `hafa-adai-find-${target.id.replaceAll(".", "-").replaceAll("_", "-")}` : "hafa-adai-spy";
  useEffect(() => {
    // Web reloads have no user activation yet. The visible directions button remains
    // available; only auto-play after a gesture, so browsers never reject initial speech.
    const canAutoPlay = Platform.OS !== "web" || (typeof navigator !== "undefined" && navigator.userActivation?.hasBeenActive);
    if (active && soundOn && canAutoPlay) sound(promptKey);
  }, [active, soundOn, sound, promptKey]);
  function select(id: string) {
    if (!active) return;
    setSelected(id);
    const correct = !spy || id === target?.id;
    const next = tapItem(s, id);
    if (next !== s) {
      // Exploring is browsing, not an answer: only I spy finds count as practice.
      if (spy) practice(chamoruWord(target!.id)!.skill, correct);
      update(next);
    }
    sound(spy && !correct ? "hafa-adai-compare" : wordAudioKey(id));
    if (correct && spy) { setEnglish(false); setSelected(null); }
  }
  return <View style={{ gap: 10 }}>
    {options.mode === "solo" && <View style={[styles.row, { flexWrap: "wrap" }]}>
      {(["explore", "spy"] as const).map(activity => <Chip key={activity} selected={s.activity === activity} onPress={() => { update(chooseActivity(s, activity, options)); setSelected(null); setEnglish(false); }}>{activity === "explore" ? "Explore" : "I spy"}</Chip>)}
    </View>}
    <View style={{ backgroundColor: C.paper, borderRadius: 16, padding: 12, gap: 4 }} accessibilityLiveRegion="polite">
      {p.done ? <><Heading style={{ fontSize: 20 }}>{options.mode === "versus" ? (p.scores[0] === p.scores[1] ? "A good tie!" : `${session.names?.[p.scores[0] > p.scores[1] ? 0 : 1] ?? "Player"} wins!`) : "You explored the whole picnic!"}</Heading><Copy>Every word has a picture friend.</Copy></> : spy && target ? <>
        <Copy style={{ fontSize: 13 }}>{options.mode === "versus" ? `${session.names?.[p.player] ?? ("Player " + (p.player + 1))}’s turn · ` : ""}Find this word in the scene</Copy>
        <Heading style={{ fontSize: 25 }}>{target.term}</Heading>
        {(gentle || english) && <Copy style={{ fontSize: 13 }}>{target.english}</Copy>}
        {!gentle && <Button quiet compact onPress={() => { setEnglish(!english); if (!english) sound(wordAudioKey(target.id)); }}>{english ? "Hide English" : "Show English"}</Button>}
      </> : <><Heading style={{ fontSize: 20 }}>Welcome to our picnic</Heading><Copy>Tap a picture to discover its words.</Copy></>}
    </View>
    {/* One calm island scene: flags over a market table, picnic blanket, shells and friends. */}
    <View style={{ backgroundColor: "#F5E5BB", borderRadius: 20, padding: 10, gap: 6, borderWidth: 1, borderColor: "#DCC895", overflow: "hidden" }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none"><Svg width="100%" height="100%" viewBox="0 0 300 300" preserveAspectRatio="none"><Rect width={300} height={85} fill="#D6E9E8" /><Path d="M0 70q75-15 150 0t150 0v40H0z" fill="#8DC5C7" /><Path d="M0 100q150-25 300 0v200H0z" fill="#F5E5BB" /></Svg></View>
      <View style={{ height: 22 }}><Svg width="100%" height={22} viewBox="0 0 300 22"><Path d="M0 4q150 25 300 0" fill="none" stroke="#8E9F83" strokeWidth={2} />{[35,80,125,170,215,260].map((x,i)=><Path key={x} d={`M${x} 10l18 2-9 10z`} fill={["#C56D50","#72A5B6","#E1B251"][i%3]} />)}</Svg></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {[...s.items].sort().map(id => {
          const word = chamoruWord(id)!, visited = p.visited.has(id), found = spy && s.items.indexOf(id) < p.cursor;
          return <PressableScale key={id} accessibilityRole="button" accessibilityLabel={`Find picture: ${word.english}${found ? ", found" : ""}`} onPress={() => select(id)} amount={0.98}
            style={{ width: tileWidth, minHeight: 85, padding: 4, borderRadius: 12, backgroundColor: word.category === "family" ? "#EFD2BECC" : "#FFF9E7C9", borderWidth: 2, borderColor: found || (!spy && visited) ? "#67947B" : "transparent", alignItems: "center", justifyContent: "center" }}>
            <WordPicture word={word} size={pictureSize} />
            <Copy style={{ fontSize: 11, lineHeight: 14, textAlign: "center" }}>{word.english.split(" / ")[0]}</Copy>
          </PressableScale>;
        })}
      </View>
    </View>
    {shown && (!spy || ((selected && selected !== target?.id) || p.missed)) && <View style={{ backgroundColor: C.paper, borderRadius: 14, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityLiveRegion="polite">
      <WordPicture word={shown} size={54} /><View style={{ flex: 1 }}><Heading style={{ fontSize: 20 }}>{shown.term}</Heading><Copy style={{ fontSize: 13 }}>{shown.english}</Copy>{spy && !p.done && <Copy style={{ fontSize: 13 }}>That is {shown.english.split(" / ")[0].toLowerCase()}. Compare its word with the card above and try again.</Copy>}</View>
    </View>}
    <View style={[styles.row, { flexWrap: "wrap" }]}><Button quiet compact icon="sound-on" disabled={!soundOn} onPress={() => sound(promptKey)}>Hear the directions</Button></View>
    <Copy style={{ fontSize: 11, lineHeight: 15 }}>CHamoru words are text only. English directions can be heard.</Copy>
    {options.mode === "versus" && <Copy style={{ fontSize: 13 }}>{session.names?.[0]}: {p.scores[0]} finds · {session.names?.[1]}: {p.scores[1]} finds. Pass after each word.</Copy>}
  </View>;
}
export function Art({ size }: { size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Circle cx={50} cy={50} r={44} fill="#F6DBA7" /><Path d="M10 25q40 17 80 0" fill="none" stroke="#477D72" strokeWidth={2} /><Path d="M23 30h15l-7 14zM48 33h15l-7 14zM72 30h15l-7 14z" fill="#C56D50" /><Rect x={20} y={62} width={60} height={10} rx={3} fill="#AF794D" /><Path d="M26 72v15M74 72v15" stroke="#AF794D" strokeWidth={5} /><EllipseMango /><Path d="M57 50q12-22 23 0-11 18-23 0" fill="#72A5B6" /><Circle cx={62} cy={48} r={1.5} fill="#244F48" /></Svg>;
}
function EllipseMango() { return <><Path d="M39 43q16-5 11 10T34 62q-13-6 5-19" fill="#E1B251" /><Path d="M42 43q1-10 12-8-2 9-12 8" fill="#67947B" /></>; }
