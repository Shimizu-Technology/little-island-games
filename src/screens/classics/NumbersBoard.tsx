
import { Text } from "../../components/Text";
import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";

import { NumbersState, numberGoal, numberResultDetail, numberAdvice, remainingTotal, needsPracticeRoll, closeNumbers, numberChoices, numberLimit, numberTarget, numbersStatus, rollNumbers, selectNumber, undoNumbers } from "../../games/numbers";
import { Button, C, Controls, Copy, Status } from "../../components/ui";

import { type Props, Cell, BoardArea, BoardLayout } from "./shared";
function Die({ value, size = 72 }: { value: number; size?: number }) {
  const dots: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <View
      accessibilityLabel={`Die showing ${value}`}
      style={{
        width: size,
        height: size,
        backgroundColor: C.paper,
        borderWidth: 2,
        borderColor: C.line,
        borderRadius: 18,
        flexDirection: "row",
        flexWrap: "wrap",
        padding: 12,
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <View
          key={i}
          style={{ width: "33.33%", height: "33.33%", alignItems: "center", justifyContent: "center" }}
        >
          {dots[value]?.includes(i) && (
            <View
              style={{ width: size * 0.105, height: size * 0.105, borderRadius: 10, backgroundColor: C.teal }}
            />
          )}
        </View>
      ))}
    </View>
  );
}
export function NumbersBoard({ state: s, commit, width, sound, personalBest }: Props<NumbersState> & { personalBest?: number }) {
  const [compare, setCompare] = useState(false);
  const { fontScale } = useWindowDimensions();
  const status = numbersStatus(s),
    target = numberTarget(s),
    sum = s.selected.reduce((a, b) => a + b, 0),
    max = numberLimit(s);
  return (
    <BoardLayout>
      <Status
        title={
          status === "won"
            ? "Your island is clear!"
            : status === "stuck"
              ? "That’s this round!"
              : needsPracticeRoll(s)
                ? "Try a new roll"
                : s.dice.length
                ? `Can you make ${target}?`
                : "Ready to roll?"
        }
        detail={
          status !== "playing" ? numberResultDetail(s) : "Close one number or a group that adds up to your roll."
        }
        success={status === "won"}
      />
      <Copy style={{ textAlign: "center", color: C.ink }}>{numberGoal(s)}</Copy>
      <BoardArea>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginVertical: 12 }}>
          {s.dice.length ? (
            s.dice.map((d, i) => <Die key={i} value={d} size={56} />)
          ) : (
            <View style={{ alignItems: "center", height: 56, justifyContent: "center" }}>
              <Copy>Your dice are waiting.</Copy>
            </View>
          )}
        </View>
        <View
          style={{
            alignSelf: "center",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 9,
            maxWidth: Math.min(width, 420),
            marginTop: 18,
          }}
        >
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
            const available = s.available.includes(n),
              selected = s.selected.includes(n);
            return (
              <Cell
                key={n}
                label={`Number ${n}, ${!available ? "closed" : selected ? "selected" : "open"}`}
                disabled={!available || !s.dice.length || status !== "playing"}
                selected={selected}
                onPress={() => commit(selectNumber(s, n))}
                style={{
                  width: Math.min(96, (width - 30) / 3),
                  height: Math.max(max > 9 ? 60 : 72, 38 * fontScale + 12),
                  borderRadius: 17,
                  borderWidth: 2,
                  borderColor: selected ? C.teal : available ? C.line : "transparent",
                  backgroundColor: selected ? "#D7E8D5" : available ? C.paper : "#E8EBE2",
                }}
              >
                <Text style={{ fontSize: 31, fontWeight: "800", color: available ? C.ink : "#7A897E" }}>
                  {available ? n : "✓"}
                </Text>
              </Cell>
            );
          })}
        </View>
      </BoardArea>
      <Copy style={{ textAlign: "center" }}>Remaining total: {remainingTotal(s)} · {personalBest === undefined ? "Finish a round to set your best" : `Your best on 1–${max}: ${personalBest}`} (lower is better)</Copy>
      {compare && !!s.dice.length && <View accessibilityLiveRegion="polite" style={{ gap: 8 }}><Copy>{numberAdvice(s).text}</Copy>{numberAdvice(s).choices.map(choice => <Button quiet key={choice.join()} onPress={() => commit({ ...s, selected: choice })}>Choose {choice.join(" + ")}</Button>)}</View>}
      {s.gentlePractice && <Copy>Keep small numbers for flexible combinations. If no combination fits, roll again and keep practicing.</Copy>}
      {needsPracticeRoll(s) && <Copy>No open numbers make {target}. Try a new roll; your closed numbers stay closed.</Copy>}
      {s.dice.length > 0 && status === "playing" && !needsPracticeRoll(s) && (
        <Copy style={{ textAlign: "center", marginTop: 18, color: C.ink }}>
          {s.selected.length ? `${s.selected.join(" + ")} = ${sum}` : "Tap numbers to build your total."}
        </Copy>
      )}
      <Controls>
        {(!s.dice.length || needsPracticeRoll(s)) && status === "playing" ? (
          <Button
            onPress={() => {
              commit(rollNumbers(s));
              sound("tap");
            }}
          >
            Roll {max === 6 ? "the die" : "the dice"}
          </Button>
        ) : status === "playing" ? (
          <Button
            disabled={sum !== target || !s.selected.length}
            onPress={() => {
              commit(closeNumbers(s));
              sound("match");
            }}
          >
            Close these numbers
          </Button>
        ) : null}
        <Button
          quiet
          disabled={!s.dice.length || status !== "playing" || needsPracticeRoll(s)}
          onPress={() => {
            const choice = numberChoices(s.available, target)[0];
            if (choice) commit({ ...s, selected: choice });
          }}
        >
          Show a combination
        </Button>
        <Button quiet disabled={!s.dice.length || status !== "playing" || needsPracticeRoll(s)} onPress={() => setCompare(v => !v)}>{compare ? "Hide choices" : "Compare combinations"}</Button>
        <Button quiet disabled={!s.history.length} onPress={() => commit(undoNumbers(s))}>
          Undo my turn
        </Button>
      </Controls>
    </BoardLayout>
  );
}
