import React, { useEffect, useState } from "react";
import { MemoryState, closeMismatch, flipCard, memoryDone, memoryResult, memoryUndo } from "../../games/memory";
import { Button, Controls, Copy, Status } from "../../components/ui";
import { Scoreboard } from "../../components/Match";
import { newMatch } from "../../games/match";
import { type Props, BoardArea, BoardLayout } from "./shared";
import { MemoryCards } from "./MemoryCards";
export function MemoryBoard({ state: s, commit, width, sound }: Props<MemoryState>) {
  const [peek, setPeek] = useState(false);
  const [grownUpOptions, setGrownUpOptions] = useState(false);
  const [showEnglish, setShowEnglish] = useState(true);
  useEffect(() => {
    // Picture-only rounds retain their existing brief peek. Reading has no deadline.
    if (!peek || s.pack && s.pack !== "pictures") return;
    const timer = setTimeout(() => setPeek(false), 1800);
    return () => clearTimeout(timer);
  }, [peek, s.pack]);
  const done = memoryDone(s);
  const names = s.match?.names ?? ["Player 1", "Player 2"];
  const mismatch = s.open.length === 2;
  return (
    <BoardLayout>
      {s.pack === "words" && <Copy style={{ textAlign: "center" }}>Match each picture with its English word. Read at your own pace.</Copy>}
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
        {peek && s.pack && s.pack !== "pictures" && <><Copy style={{ textAlign: "center" }}>Reading peek · scroll and look as long as you like.</Copy><Button onPress={() => setPeek(false)}>Hide cards and play</Button></>}
        {s.options.mode === "together" && (
          <Scoreboard
            match={s.match ?? newMatch()}
            result={memoryResult(s)}
            active={done ? null : s.player}
          />
        )}
        <MemoryCards cards={s.cards} pack={s.pack} matched={s.matched} open={s.open} peek={peek} width={width} disabled={mismatch} showEnglish={showEnglish} onFlip={i => {
          const next = flipCard(s, i); commit(next); sound(next.matched.length > s.matched.length ? "match" : "tap");
        }}/>
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
