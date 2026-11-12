import React from "react";
import { View } from "react-native";
import { Button, C, Copy } from "../../components/ui";
import type { ChallengeViewProps } from "../../challenge/types";
import type { Action, State } from "../../games/classics/memoryDares";
import { MemoryCards } from "./MemoryCards";
export function MemoryDareBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  const preview = s.phase === "preview", offer = s.phase === "offer", mismatch = s.round.open.length === 2;
  return <View style={{ gap: 12 }}>
    <Copy style={{ color: C.ink }}>{offer ? "Would you like to preview this deal? Look as long as you like. The preview target needs a preview." : preview ? "Look and read as long as you like. Hide the cards when you are ready." : "Match the pairs. A turn is two cards; there is no timer."}</Copy>
    {offer && <><Button disabled={!active} onPress={() => dispatch(["p"])}>Preview this deal</Button><Button quiet disabled={!active} onPress={() => dispatch(["g"])}>Play without preview</Button></>}
    {preview && <Button disabled={!active} onPress={() => dispatch(["g"])}>Hide cards and play</Button>}
    <Copy style={{ color: C.ink }}>Turns used: {s.spent} · Pairs: {s.round.matched.length / 2} of {s.round.cards.length / 2}. Undo and Start again keep turns used.</Copy>
    <MemoryCards cards={s.round.cards} pack={s.round.pack} matched={s.round.matched} open={s.round.open} peek={preview} width={Math.min(width, 680)} disabled={!active || s.phase !== "play" || mismatch} hint={s.hint ?? []} onFlip={i => dispatch(["f", i])}/>
    {mismatch && <Button disabled={!active} onPress={() => dispatch(["n"])}>Turn them over</Button>}
    {s.phase === "play" && <Button quiet disabled={!active || !s.round.history?.length} onPress={() => dispatch(["u"])}>Undo my turn</Button>}
    {s.hint !== null && !s.hint.length && <Copy accessibilityLiveRegion="polite" style={{ color: C.ink }}>No remembered pair yet. Turn a face-down card and notice where it is.</Copy>}
    {!!s.hint?.length && <Copy accessibilityLiveRegion="polite" style={{ color: C.ink }}>You have seen a pair at cards {s.hint.map(i => i + 1).join(" and ")}.</Copy>}
    <Copy style={{ color: C.ink }}>Targets are suggested, not a proved best score. Help uses only cards already shown. Finishing always counts, even if you go past the target.</Copy>
  </View>;
}
