import React, { useEffect, useState } from "react";
import { Animated, View, useWindowDimensions } from "react-native";
import { Text } from "../../components/Text";
import { C } from "../../components/ui";
import { Symbol } from "../../components/Art";
import { easeOut, nativeDriver, useReducedMotion } from "../../components/motion";
import { chamoruCard, englishCard, type MemoryPack } from "../../games/memory";
import { WordPicture } from "../../learn/games/hafa-adai/pictures";
import { admittedReading } from "../../learn/reading/admit";
import { ReadingRefused } from "../../learn/kit/ReadingRefused";
import { Cell } from "./shared";
import { wordFitMultiplier } from "../../components/wordFit";
function MemoryFace({ open, children }: { open: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion(), [value] = useState(() => new Animated.Value(open ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(value, { toValue: open ? 1 : 0, duration: reduced ? 0 : 200, easing: easeOut, useNativeDriver: nativeDriver });
    animation.start(); return () => animation.stop();
  }, [open, reduced, value]);
  return <Animated.View style={{ transform: reduced ? [] : [{ perspective: 700 }, { rotateY: value.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", "90deg", "0deg"] }) }] }}>{children}</Animated.View>;
}
/** Shared card faces for free play and replayed dares. Face-down accessibility never leaks content. */
export function MemoryCards({ cards, pack = "pictures", matched, open, peek = false, width, disabled, showEnglish = true, hint = [], onFlip }: {
  cards: readonly string[]; pack?: MemoryPack; matched: readonly number[]; open: readonly number[]; peek?: boolean; width: number; disabled: boolean; showEnglish?: boolean; hint?: readonly number[]; onFlip: (i: number) => void;
}) {
  const { fontScale } = useWindowDimensions(), reading = pack !== "pictures";
  const columns = reading ? fontScale > 1.3 ? 2 : width >= 600 ? 6 : 4 : width >= 460 ? 6 : 4;
  const gap = 9, cardSize = Math.min(reading && fontScale > 1.3 ? 140 : 88, (width - gap * (columns - 1)) / columns);
  // The CHamoru pack is reading content as data: every CHamoru card must be a branded record from the snapshot.
  if (!cards.every((card) => { const ch = chamoruCard(card); return !ch || admittedReading(ch.word, "Memory's CHamoru cards"); })) return <ReadingRefused />;
  return <View style={{ width: columns * cardSize + gap * (columns - 1), flexDirection: "row", flexWrap: "wrap", gap, alignSelf: "center" }}>
    {cards.map((card, i) => {
      const found = matched.includes(i), visible = found || open.includes(i) || peek;
      const ch = chamoruCard(card), en = englishCard(card);
      const label = ch ? ch.face === "picture" ? `picture of ${ch.word.english}` : `${ch.word.term}${showEnglish ? `, ${ch.word.english}` : ""}` : en ? en.face === "picture" ? `picture of ${en.symbol}` : `word ${en.symbol}` : card;
      return <Cell key={i} label={`Card ${i + 1}, ${visible ? label : "face down"}${found ? ", matched" : ""}${hint.includes(i) ? ", remembered pair" : ""}`} disabled={disabled || found || open.includes(i) || peek} onPress={() => onFlip(i)} style={{ width: cardSize, minHeight: cardSize * (reading ? 1.35 : 1.06), paddingVertical: 5, borderRadius: 16, borderWidth: hint.includes(i) ? 3 : 2, borderColor: hint.includes(i) ? C.ink : found ? "#BED3B7" : visible ? "#D5CBDD" : "#74719B", backgroundColor: visible ? found ? "#E6F0DD" : C.paper : "#817BA6" }}>
        <MemoryFace open={visible}>{visible ? ch ? ch.face === "picture" ? <WordPicture word={ch.word} size={cardSize * 0.8}/> : <View style={{ width: cardSize - 4, padding: 4, gap: 3 }}><Text maxFontSizeMultiplier={wordFitMultiplier(ch.word.term, 14, cardSize - 12)} style={{ fontSize: 14, lineHeight: 17, fontWeight: "700", color: C.ink, textAlign: "center" }}>{ch.word.term}</Text>{showEnglish && <Text maxFontSizeMultiplier={wordFitMultiplier(ch.word.english.split(" / ")[0], 10, cardSize - 12)} style={{ fontSize: 10, lineHeight: 12, color: C.ink, textAlign: "center" }}>{ch.word.english.split(" / ")[0]}</Text>}</View> : en?.face === "word" ? <Text maxFontSizeMultiplier={wordFitMultiplier(en.symbol, 16, cardSize - 12)} style={{ width: cardSize - 4, padding: 4, fontSize: 16, lineHeight: 20, fontWeight: "700", color: C.ink, textAlign: "center" }}>{en.symbol}</Text> : <Symbol name={en?.symbol ?? card} size={cardSize * 0.68}/> : <Text style={{ color: "#FFF8DE", fontSize: 29, fontWeight: "700" }}>?</Text>}</MemoryFace>
      </Cell>;
    })}
  </View>;
}
