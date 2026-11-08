import { WordPicture } from "../../learn/games/hafa-adai/pictures";
import { Text } from "../../components/Text";
import React, { useEffect, useState } from "react";
import { Animated, View, useWindowDimensions } from "react-native";

import { MemoryState, chamoruCard, closeMismatch, flipCard, memoryDone, memoryResult, memoryUndo } from "../../games/memory";

import { Button, C, Controls, Copy, Status } from "../../components/ui";
import { Scoreboard } from "../../components/Match";
import { newMatch } from "../../games/match";

import { easeOut, nativeDriver, useReducedMotion } from "../../components/motion";
import { Symbol } from "../../components/Art";
import { type Props, Cell, BoardArea, BoardLayout } from "./shared";
function MemoryFace({ open, children }: { open: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion(),
    [value] = useState(() => new Animated.Value(open ? 1 : 0));
  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: open ? 1 : 0,
      duration: reduced ? 0 : 200,
      easing: easeOut,
      useNativeDriver: nativeDriver,
    });
    animation.start();
    return () => animation.stop();
  }, [open, reduced, value]);
  return (
    <Animated.View
      style={{
        transform: reduced
          ? []
          : [
              { perspective: 700 },
              {
                rotateY: value.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ["0deg", "90deg", "0deg"],
                }),
              },
            ],
      }}
    >
      {children}
    </Animated.View>
  );
}
export function MemoryBoard({ state: s, commit, width, sound }: Props<MemoryState>) {
  const { fontScale } = useWindowDimensions();
  const [peek, setPeek] = useState(false);
  const [grownUpOptions, setGrownUpOptions] = useState(false);
  const [showEnglish, setShowEnglish] = useState(true);
  useEffect(() => {
    // Picture-only rounds retain their existing brief peek. Reading has no deadline.
    if (!peek || s.pack === "chamoru") return;
    const timer = setTimeout(() => setPeek(false), 1800);
    return () => clearTimeout(timer);
  }, [peek, s.pack]);
  const done = memoryDone(s),
    columns = s.pack === "chamoru" ? (fontScale > 1.3 ? 2 : width >= 600 ? 6 : 4) : width >= 460 ? 6 : 4,
    gap = 9,
    cardSize = Math.min(s.pack === "chamoru" && fontScale > 1.3 ? 140 : 88, (width - gap * (columns - 1)) / columns);
  const names = s.match?.names ?? ["Player 1", "Player 2"];
  const mismatch = s.open.length === 2;
  return (
    <BoardLayout>
      {s.pack === "chamoru" && <><Copy style={{ textAlign: "center", fontSize: 13 }}>Match a picture with its CHamoru word. Read at your own pace. English hints start on.</Copy><Button quiet compact onPress={() => sound("hafa-adai-memory")}>Hear the card directions</Button></>}
      {s.pack === "chamoru" && <>
        <Button quiet compact onPress={() => setGrownUpOptions(!grownUpOptions)}>Grown-up reading options</Button>
        {grownUpOptions && <Button quiet compact label={showEnglish ? "Hide English translations" : "Show English translations"}
          onPress={() => setShowEnglish(!showEnglish)}>{showEnglish ? "Hide English translations" : "Show English translations"}</Button>}
        {grownUpOptions && <Copy style={{ textAlign: "center", fontSize: 13 }}>For this visit: hide English when the words feel familiar. You can show it again any time.</Copy>}
      </>}
      <Status
        title={
          done
            ? s.options.mode === "together"
              ? s.scores[0] === s.scores[1]
                ? "It’s a tie!"
                : `${names[s.scores[0] > s.scores[1] ? 0 : 1]} wins!`
              : "Every picture found its pair!"
            : s.options.mode === "together"
              ? `${names[s.player]}’s turn`
              : "Find two that belong together"
        }
        detail={
          done
            ? `${s.turns} turns of noticing and remembering.${s.options.mode === "together" ? ` ${names[0]}: ${s.scores[0]} pairs. ${names[1]}: ${s.scores[1]} pairs.` : ""}`
            : s.options.mode === "together"
              ? `Pairs · ${names[0]}: ${s.scores[0]}   ${names[1]}: ${s.scores[1]}`
              : `${s.matched.length / 2} of ${s.cards.length / 2} pairs found`
        }
        success={done}
      />
      <BoardArea>
        {peek && s.pack === "chamoru" && <><Copy style={{ textAlign: "center" }}>Reading peek · scroll and look as long as you like.</Copy><Button onPress={() => setPeek(false)}>Hide cards and play</Button></>}
        {s.options.mode === "together" && (
          <Scoreboard
            match={s.match ?? newMatch()}
            result={memoryResult(s)}
            active={done ? null : s.player}
          />
        )}
        <View
          style={{
            width: columns * cardSize + gap * (columns - 1),
            flexDirection: "row",
            flexWrap: "wrap",
            gap,
            alignSelf: "center",
          }}
        >
          {s.cards.map((symbol, i) => {
            const matched = s.matched.includes(i),
              open = matched || s.open.includes(i) || peek;
            const ch = s.pack === "chamoru" ? chamoruCard(symbol) : null;
            const faceLabel = ch ? (ch.face === "picture" ? `picture of ${ch.word.english}` : `${ch.word.term}${showEnglish ? `, ${ch.word.english}` : ""}`) : symbol;
            return (
              <Cell
                key={i}
                label={`Card ${i + 1}, ${open ? faceLabel : "face down"}${matched ? ", matched" : ""}`}
                disabled={matched || s.open.includes(i) || mismatch || peek}
                onPress={() => {
                  const next = flipCard(s, i);
                  commit(next);
                  sound(next.matched.length > s.matched.length ? "match" : "tap");
                }}
                style={{
                  width: cardSize,
                  height: cardSize * (s.pack === "chamoru" ? 1.35 : 1.06),
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: matched ? "#BED3B7" : open ? "#D5CBDD" : "#74719B",
                  backgroundColor: open ? (matched ? "#E6F0DD" : C.paper) : "#817BA6",
                }}
              >
                <MemoryFace open={open}>
                  {open ? (
                    ch ? ch.face === "picture" ? <WordPicture word={ch.word} size={cardSize * 0.8} /> : <View style={{ padding: 4, gap: 3 }}><Text style={{ fontSize: 14, lineHeight: 17, fontWeight: "700", color: C.ink, textAlign: "center" }}>{ch.word.term}</Text>{showEnglish && <Text style={{ fontSize: 10, lineHeight: 12, color: C.muted, textAlign: "center" }}>{ch.word.english.split(" / ")[0]}</Text>}</View> : <Symbol name={symbol} size={cardSize * 0.68} />
                  ) : (
                    <Text style={{ color: "#FFF8DE", fontSize: 29, fontWeight: "700" }}>?</Text>
                  )}
                </MemoryFace>
              </Cell>
            );
          })}
        </View>
      </BoardArea>
      <Controls>
        {peek ? <Button onPress={() => setPeek(false)}>Hide cards and play</Button> : mismatch ? (
          <Button onPress={() => commit(closeMismatch(s))}>Turn them over</Button>
        ) : s.options.mode === "solo" ? (
          <Button quiet disabled={done || peek || s.open.length > 0} onPress={() => setPeek(true)}>
            Take a little peek
          </Button>
        ) : null}
        <Button quiet disabled={peek || !s.history?.length} onPress={() => commit(memoryUndo(s))}>
          Undo my turn
        </Button>
      </Controls>
      <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 14 }}>
        {mismatch
          ? "Look as long as you like. Turn them over when you’re ready."
          : "A match earns another turn. No rush."}
      </Copy>
    </BoardLayout>
  );
}
/** Scoreboard mark that matches the board's own pieces. */
