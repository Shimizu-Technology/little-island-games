import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GameState } from "../games";
import { TicState, ticChoice, ticMove, ticOutcome, ticTurn, ticUndo, lines } from "../games/tic";
import { WordState, guessLetter, wordDone, wordHint } from "../games/words";
import { MemoryState, closeMismatch, flipCard, memoryDone } from "../games/memory";
import {
  CheckersState,
  CheckersMove,
  checkersChoice,
  checkersLesson,
  checkersMoves,
  checkersMove,
  checkersUndo,
  finishCheckersLessons,
  LESSONS,
  row,
  col,
} from "../games/checkers";
import { MazeState, directions, mazeDone, mazeMove, mazeRoute } from "../games/maze";
import {
  NumbersState,
  closeNumbers,
  numberChoices,
  numberTarget,
  numbersStatus,
  rollNumbers,
  selectNumber,
  undoNumbers,
} from "../games/numbers";
import { Button, C, Controls, Copy, Status, font } from "../components/ui";
import { GameArt, Symbol } from "../components/Art";
export type Sound = (key: string) => void;
type Props<S extends GameState> = {
  state: S;
  commit: (next: S) => void;
  width: number;
  sound: Sound;
  help: boolean;
  active: boolean;
};
const coords = (i: number) => `${String.fromCharCode(65 + col(i))}${8 - row(i)}`;
function Cell({
  label,
  onPress,
  children,
  style,
  disabled = false,
  selected = false,
}: {
  label: string;
  onPress: () => void;
  children?: React.ReactNode;
  style?: object;
  disabled?: boolean;
  selected?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        S.cell,
        style,
        pressed && { opacity: 0.65 },
        focused && { outlineWidth: 3, outlineColor: C.blue, outlineOffset: -3 },
      ]}
    >
      {children}
    </Pressable>
  );
}
export function TicBoard({ state: s, commit, width, sound, active }: Props<TicState>) {
  const outcome = ticOutcome(s.board),
    turn = ticTurn(s.board),
    computer = s.options.mode === "solo" && turn !== s.human && !outcome;
  const [hint, setHint] = useState<number | null>(null);
  useEffect(() => {
    if (!computer || !active) return;
    const timer = setTimeout(() => {
      const index = ticChoice(s);
      if (index !== null) commit(ticMove(s, index));
    }, 400);
    return () => clearTimeout(timer);
  }, [s, computer, commit, active]);
  const winning = lines.find(([a, b, c]) => s.board[a] && s.board[a] === s.board[b] && s.board[a] === s.board[c]) ?? [];
  const size = Math.min(width, 370);
  const title =
    outcome === "draw"
      ? "A good draw!"
      : outcome
        ? `${outcome} made a line!`
        : computer
          ? "Your island friend is thinking…"
          : s.options.mode === "solo"
            ? `Your turn · ${s.human}`
            : `${turn}’s turn`;
  return (
    <>
      <Status
        title={title}
        detail={
          outcome
            ? "Try another round, or choose a different game."
            : "Make three in a row, across, down, or diagonally."
        }
        success={!!outcome}
      />
      <View style={[S.tic, { width: size, height: size }]}>
        {s.board.map((mark, i) => (
          <Cell
            key={i}
            label={`Square ${i + 1}, ${mark ?? "empty"}${hint === i ? ", suggested move" : ""}`}
            disabled={!!mark || computer || !!outcome}
            onPress={() => {
              commit(ticMove(s, i));
              sound("tap");
            }}
            style={{
              width: "32%",
              height: "32%",
              borderRadius: 20,
              backgroundColor: winning.includes(i) ? "#D8E9CD" : hint === i ? "#FBE7B3" : C.paper,
            }}
          >
            <Text
              style={{
                fontFamily: font,
                fontSize: size / 6,
                fontWeight: "800",
                color: mark === "X" ? C.coral : C.teal,
              }}
            >
              {mark}
            </Text>
          </Cell>
        ))}
      </View>
      <Controls>
        <Button quiet onPress={() => setHint(ticChoice(s, () => 0.5, true))} disabled={computer || !!outcome}>
          Show a hint
        </Button>
        <Button
          quiet
          onPress={() => commit(ticUndo(s))}
          disabled={!s.history.length || (s.options.mode === "solo" && s.human === "O" && s.history.length < 2)}
        >
          Undo my turn
        </Button>
      </Controls>
    </>
  );
}
export function WordBoard({ state: s, commit, width, sound }: Props<WordState>) {
  const done = wordDone(s),
    letters = [...new Set(s.word)],
    found = letters.filter((l) => s.guessed.includes(l)).length;
  return (
    <>
      <Status
        title={done ? "Ready for lift-off!" : s.category}
        detail={done ? `You found ${s.word.toLowerCase()}. ${s.clue}` : s.clue}
        success={done}
      />
      <View style={{ alignItems: "center", marginBottom: 14 }}>
        <GameArt game="word-rescue" size={105} />
        <Copy style={{ fontSize: 13 }}>
          {found} of {letters.length} different letters found
        </Copy>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
        {[...s.word].map((l, i) => (
          <View
            key={i}
            style={{
              width: Math.min(48, (width - 30) / Math.min(s.word.length, 6)),
              height: 54,
              borderRadius: 10,
              borderBottomWidth: 3,
              borderColor: C.teal,
              backgroundColor: C.paper,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: "800", color: C.ink }}>{s.guessed.includes(l) ? l : ""}</Text>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 7,
          alignSelf: "center",
          maxWidth: 540,
        }}
      >
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => {
          const used = s.guessed.includes(l),
            correct = used && s.word.includes(l);
          return (
            <Cell
              key={l}
              label={`Letter ${l}${used ? (correct ? ", found in word" : ", already tried") : ""}`}
              disabled={used || done}
              onPress={() => {
                commit(guessLetter(s, l));
                sound(s.word.includes(l) ? "match" : "tap");
              }}
              style={{
                width: 44,
                height: 48,
                borderWidth: 1,
                borderColor: used ? "transparent" : C.line,
                borderRadius: 12,
                backgroundColor: correct ? "#D9EAD5" : used ? "#EEEDE6" : C.paper,
              }}
            >
              <Text
                style={{
                  fontFamily: font,
                  fontSize: 19,
                  fontWeight: "800",
                  color: used && !correct ? "#7C817B" : C.ink,
                }}
              >
                {l}
              </Text>
            </Cell>
          );
        })}
      </View>
      <Controls>
        {!done && !s.custom && (
          <Button quiet onPress={() => sound(`clue-${s.word.toLowerCase()}`)}>
            Hear the clue
          </Button>
        )}
        <Button
          quiet
          disabled={done}
          onPress={() => {
            commit(wordHint(s));
            sound("match");
          }}
        >
          Reveal a letter
        </Button>
        {done && !s.custom && (
          <Button quiet onPress={() => sound(s.word.toLowerCase())}>
            Hear the word
          </Button>
        )}
      </Controls>
      <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 16 }}>
        Take your time. Every letter is a chance to discover.
      </Copy>
    </>
  );
}
export function MemoryBoard({ state: s, commit, width, sound }: Props<MemoryState>) {
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    if (!peek) return;
    const timer = setTimeout(() => setPeek(false), 1800);
    return () => clearTimeout(timer);
  }, [peek]);
  const done = memoryDone(s),
    columns = 4,
    gap = 9,
    cardSize = Math.min(88, (width - gap * (columns - 1)) / columns);
  const mismatch = s.open.length === 2;
  return (
    <>
      <Status
        title={
          done
            ? "Every picture found its pair!"
            : s.options.mode === "together"
              ? `Player ${s.player + 1}’s turn`
              : "Find two that belong together"
        }
        detail={
          done
            ? `${s.turns} turns of noticing and remembering.${s.options.mode === "together" ? ` Player 1: ${s.scores[0]} pairs. Player 2: ${s.scores[1]} pairs.` : ""}`
            : s.options.mode === "together"
              ? `Pairs · Player 1: ${s.scores[0]}   Player 2: ${s.scores[1]}`
              : `${s.matched.length / 2} of ${s.cards.length / 2} pairs found`
        }
        success={done}
      />
      <View
        style={{
          width: columns * cardSize + gap * 3,
          flexDirection: "row",
          flexWrap: "wrap",
          gap,
          alignSelf: "center",
        }}
      >
        {s.cards.map((symbol, i) => {
          const matched = s.matched.includes(i),
            open = matched || s.open.includes(i) || peek;
          return (
            <Cell
              key={i}
              label={`Card ${i + 1}, ${open ? symbol : "face down"}${matched ? ", matched" : ""}`}
              disabled={matched || s.open.includes(i) || mismatch || peek}
              onPress={() => {
                const next = flipCard(s, i);
                commit(next);
                sound(next.matched.length > s.matched.length ? "match" : "tap");
              }}
              style={{
                width: cardSize,
                height: cardSize * 1.06,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: matched ? "#BED3B7" : open ? "#D5CBDD" : "#74719B",
                backgroundColor: open ? (matched ? "#E6F0DD" : C.paper) : "#817BA6",
              }}
            >
              {open ? (
                <Symbol name={symbol} size={cardSize * 0.68} />
              ) : (
                <Text style={{ color: "#FFF8DE", fontSize: 29, fontWeight: "700" }}>?</Text>
              )}
            </Cell>
          );
        })}
      </View>
      <Controls>
        {mismatch ? (
          <Button onPress={() => commit(closeMismatch(s))}>Turn them over</Button>
        ) : (
          <Button quiet disabled={done || peek || s.open.length > 0} onPress={() => setPeek(true)}>
            Take a little peek
          </Button>
        )}
      </Controls>
      <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 14 }}>
        {mismatch
          ? "Look as long as you like. Turn them over when you’re ready."
          : "A match earns another turn. No rush."}
      </Copy>
    </>
  );
}
export function CheckersBoard({ state: s, commit, width, sound, help, active }: Props<CheckersState>) {
  const [from, setFrom] = useState<number | null>(null),
    [path, setPath] = useState<number[]>([]),
    [hint, setHint] = useState<CheckersMove | null>(null);
  const moves = useMemo(() => checkersMoves(s.position), [s.position]),
    lesson = s.lesson === null ? null : LESSONS[s.lesson];
  const computer = s.lesson === null && s.options.mode === "solo" && s.position.turn === -1 && !s.position.outcome;
  useEffect(() => {
    if (!computer || !active) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void checkersChoice(s, () => cancelled).then((move) => {
        if (move && !cancelled) commit(checkersMove(s, move));
      });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [s, computer, commit, active]);
  const candidates = moves.filter((m) => m.from === from && path.every((v, i) => m.path[i] === v));
  const destinations = candidates.map((m) => m.path[path.length]);
  const locked = path.length > 0,
    displayBoard = [...s.position.board];
  if (from !== null && path.length) {
    const route = candidates[0];
    displayBoard[from] = 0;
    if (route) route.captured.slice(0, path.length).forEach((i) => (displayBoard[i] = 0));
    displayBoard[path[path.length - 1]] = s.position.board[from];
  }
  const size = Math.min(width, 512),
    cellSize = size / 8,
    outcome = s.position.outcome;
  const lessonComplete = s.lesson !== null && s.history.length > 0;
  function select(i: number) {
    if (computer || outcome || lessonComplete) return;
    if (destinations.includes(i) && from !== null) {
      const nextPath = [...path, i],
        complete = candidates.find(
          (m) => m.path.length === nextPath.length && m.path.every((v, j) => v === nextPath[j])
        );
      if (complete) {
        commit(checkersMove(s, complete));
        sound(complete.captured.length ? "match" : "tap");
      } else {
        setPath(nextPath);
        sound("tap");
      }
      return;
    }
    if (!locked && moves.some((m) => m.from === i)) {
      setFrom(i);
      setPath([]);
      setHint(null);
    }
  }
  const title = lesson
    ? lessonComplete
      ? "You’ve got it!"
      : lesson.title
    : outcome === "draw"
      ? "A well-played draw!"
      : outcome
        ? `${outcome === "red" ? "Red" : "Blue"} wins this round!`
        : computer
          ? "Your island friend is thinking…"
          : `${s.position.turn === 1 ? "Red" : "Blue"} to move`;
  return (
    <>
      <Status
        title={title}
        detail={
          lesson
            ? lesson.text
            : outcome
              ? "Play again whenever you like."
              : locked
                ? "Keep jumping with this same piece."
                : moves.some((m) => m.captured.length)
                  ? "A jump is available. You must take a jump."
                  : "Tap a piece, then tap its next square."
        }
        success={!!outcome || lessonComplete}
      />
      <View
        style={{
          alignSelf: "center",
          width: size,
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 2,
          borderColor: C.ink,
        }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", width: size }}>
          {displayBoard.map((piece, i) => {
            const dark = (row(i) + col(i)) % 2 === 1,
              canMove = moves.some((m) => m.from === i),
              destination = destinations.includes(i),
              suggested = hint && (i === hint.from || hint.path.includes(i));
            return (
              <Cell
                key={i}
                label={`${coords(i)}, ${piece ? `${piece > 0 ? "red" : "blue"} ${Math.abs(piece) === 2 ? "king" : "piece"}` : "empty"}${destination ? ", legal destination" : ""}${canMove ? ", can move" : ""}`}
                disabled={!dark || computer || !!outcome || lessonComplete}
                selected={from === i}
                onPress={() => select(i)}
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: suggested ? "#E9CB7D" : destination ? "#C9DBA1" : dark ? "#A7C3B0" : "#F3E8D1",
                  borderWidth: from === i ? 3 : 0,
                  borderColor: C.gold,
                }}
              >
                {piece ? (
                  <View
                    style={{
                      width: cellSize * 0.75,
                      height: cellSize * 0.75,
                      borderRadius: cellSize,
                      borderWidth: Math.max(2, cellSize * 0.055),
                      borderColor: piece > 0 ? "#F0BE97" : "#86B1C2",
                      backgroundColor: piece > 0 ? "#A64F37" : "#315D79",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {Math.abs(piece) === 2 ? (
                      <Text style={{ fontSize: cellSize * 0.38, fontWeight: "900", color: "#FFF6DB" }}>K</Text>
                    ) : (
                      <View
                        style={{
                          width: cellSize * 0.37,
                          height: cellSize * 0.37,
                          borderRadius: cellSize,
                          borderWidth: 1.5,
                          borderColor: "#F0DFC3",
                        }}
                      />
                    )}
                  </View>
                ) : destination ? (
                  <View style={{ width: 12, height: 12, borderRadius: 8, backgroundColor: C.teal }} />
                ) : help && canMove && !from && dark ? (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 3,
                      right: 3,
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: C.teal,
                    }}
                  />
                ) : null}
              </Cell>
            );
          })}
        </View>
      </View>
      <Controls>
        {locked ? (
          <Button
            quiet
            onPress={() => {
              setPath([]);
              setFrom(null);
            }}
          >
            Start this turn over
          </Button>
        ) : (
          <>
            <Button
              quiet
              disabled={computer || !!outcome || lessonComplete}
              onPress={() => {
                const m = moves[0];
                if (m) {
                  setHint(m);
                  setFrom(m.from);
                }
              }}
            >
              Show a hint
            </Button>
            <Button quiet disabled={!s.history.length} onPress={() => commit(checkersUndo(s))}>
              Undo my turn
            </Button>
          </>
        )}
      </Controls>
      {lesson ? (
        <Controls>
          <Button
            onPress={() => commit(s.lesson! < 3 ? checkersLesson(s, s.lesson! + 1) : finishCheckersLessons(s))}
            disabled={!lessonComplete}
          >
            {s.lesson! < 3 ? "Next little lesson" : "Finish lessons"}
          </Button>
          <Button quiet onPress={() => commit(finishCheckersLessons(s))}>
            Back to my game
          </Button>
        </Controls>
      ) : (
        <Controls>
          <Button quiet onPress={() => commit(checkersLesson(s, 0))}>
            Learn checkers · 4 little lessons
          </Button>
        </Controls>
      )}
      <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 12 }}>
        Kings have a K. Red starts at the top and moves down. A jump chain saves when the whole turn is complete.
      </Copy>
    </>
  );
}
export function MazeBoard({ state: s, commit, width, sound }: Props<MazeState>) {
  const [hint, setHint] = useState<number | null>(null);
  const done = mazeDone(s),
    current = s.path[s.path.length - 1],
    size = Math.min(width, 470),
    cellSize = size / s.size;
  function move(i: number) {
    const next = mazeMove(s, i);
    if (next !== s) {
      commit(next);
      sound("tap");
    }
  }
  return (
    <>
      <Status
        title={done ? "You found your island!" : "Where will your path go?"}
        detail={done ? "A whole little adventure, one step at a time." : "Find your way from the boat to the flag."}
        success={done}
      />
      <View
        style={{ alignSelf: "center", width: size, flexDirection: "row", flexWrap: "wrap", backgroundColor: C.paper }}
      >
        {s.walls.map((wall, i) => {
          const here = current === i,
            visited = s.path.includes(i);
          return (
            <Cell
              key={i}
              label={`Maze row ${Math.floor(i / s.size) + 1}, column ${(i % s.size) + 1}${here ? ", you are here" : ""}${i === s.walls.length - 1 ? ", finish flag" : ""}`}
              disabled={done}
              onPress={() => move(i)}
              style={{
                width: cellSize,
                height: cellSize,
                borderTopWidth: wall & 1 ? 2 : 0,
                borderRightWidth: wall & 2 ? 2 : 0,
                borderBottomWidth: wall & 4 ? 2 : 0,
                borderLeftWidth: wall & 8 ? 2 : 0,
                borderColor: C.teal,
                backgroundColor: hint === i ? "#F4D88D" : visited ? "#E9F0DB" : C.paper,
              }}
            >
              {here ? (
                <Symbol name="boat" size={cellSize * 0.8} />
              ) : i === s.walls.length - 1 ? (
                <Text style={{ fontSize: cellSize * 0.6, color: C.coral, fontWeight: "900" }}>⚑</Text>
              ) : visited ? (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#95B7A0" }} />
              ) : null}
            </Cell>
          );
        })}
      </View>
      <View style={{ alignItems: "center", marginTop: 16, gap: 8 }}>
        <Button quiet disabled={done} label="Move up" onPress={() => move(current - s.size)} style={{ width: 64 }}>
          ↑
        </Button>
        <View style={{ flexDirection: "row", gap: 9 }}>
          {[3, 2, 1].map((d) => (
            <Button
              key={d}
              quiet
              disabled={done}
              label={`Move ${directions[d].name.toLowerCase()}`}
              onPress={() => move(current + directions[d].dr * s.size + directions[d].dc)}
              style={{ width: 64 }}
            >
              {d === 3 ? "←" : d === 2 ? "↓" : "→"}
            </Button>
          ))}
        </View>
      </View>
      <Controls>
        <Button quiet disabled={done} onPress={() => setHint(mazeRoute(s)[1] ?? null)}>
          Show the next step
        </Button>
        <Button quiet disabled={s.path.length < 2} onPress={() => commit({ ...s, path: s.path.slice(0, -1) })}>
          Go back a step
        </Button>
      </Controls>
    </>
  );
}
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
        <View key={i} style={{ width: "33.33%", height: "33.33%", alignItems: "center", justifyContent: "center" }}>
          {dots[value]?.includes(i) && (
            <View style={{ width: size * 0.105, height: size * 0.105, borderRadius: 10, backgroundColor: C.teal }} />
          )}
        </View>
      ))}
    </View>
  );
}
export function NumbersBoard({ state: s, commit, width, sound }: Props<NumbersState>) {
  const status = numbersStatus(s),
    target = numberTarget(s),
    sum = s.selected.reduce((a, b) => a + b, 0),
    max = s.options.difficulty === "easy" ? 6 : 9;
  return (
    <>
      <Status
        title={
          status === "won"
            ? "Your island is clear!"
            : status === "stuck"
              ? "That’s this round!"
              : s.dice.length
                ? `Can you make ${target}?`
                : "Ready to roll?"
        }
        detail={
          status === "won"
            ? "You found a combination for every number."
            : status === "stuck"
              ? `No open numbers can make ${target}. Undo or try a fresh round.`
              : "Close one number or a group that adds up to your roll."
        }
        success={status === "won"}
      />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 14, marginVertical: 12 }}>
        {s.dice.length ? (
          s.dice.map((d, i) => <Die key={i} value={d} />)
        ) : (
          <View style={{ alignItems: "center", height: 80, justifyContent: "center" }}>
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
                height: 80,
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
      {s.dice.length > 0 && status === "playing" && (
        <Copy style={{ textAlign: "center", marginTop: 18, color: C.ink }}>
          {s.selected.length ? `${s.selected.join(" + ")} = ${sum}` : "Tap numbers to build your total."}
        </Copy>
      )}
      <Controls>
        {!s.dice.length && status === "playing" ? (
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
          disabled={!s.dice.length || status !== "playing"}
          onPress={() => {
            const choice = numberChoices(s.available, target)[0];
            if (choice) commit({ ...s, selected: choice });
          }}
        >
          Show a combination
        </Button>
        <Button quiet disabled={!s.history.length} onPress={() => commit(undoNumbers(s))}>
          Undo my turn
        </Button>
      </Controls>
    </>
  );
}
const S = StyleSheet.create({
  cell: { alignItems: "center", justifyContent: "center" },
  tic: {
    alignSelf: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: "2%",
    backgroundColor: "#E7E9DC",
    padding: 0,
    borderRadius: 20,
  },
});
