
import { Text } from "../../components/Text";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { checkersResultSeat, CheckersState, CheckersMove, checkersChoice, checkersRules, checkersLesson, checkersMoves, checkersMove, checkersUndo, finishCheckersLessons, LESSONS, row, col } from "../../games/checkers";

import { Button, C, Controls, Copy, Status } from "../../components/ui";
import { Scoreboard } from "../../components/Match";
import { newMatch } from "../../games/match";

import { type Props, coords, Cell, BoardArea, BoardLayout } from "./shared";
import { rivalFor } from "../../playPolicies/rivals";
import { reviewCheckers, type CheckersMoment } from "../../playPolicies/checkersReview";
const strengthOf = { easy: "gentle", medium: "growing", hard: "challenge" } as const;
function Piece({ red = false }: { red?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: red ? "#F0BE97" : "#86B1C2",
        backgroundColor: red ? "#A64F37" : "#315D79",
      }}
    />
  );
}
export function CheckersBoard({ state: s, commit, width, sound, help, active }: Props<CheckersState>) {
  const [from, setFrom] = useState<number | null>(null),
    [path, setPath] = useState<number[]>([]),
    [hint, setHint] = useState<CheckersMove | null>(null),
    [review, setReview] = useState<CheckersMoment | "none" | null>(null);
  const rules = checkersRules(s);
  const rival = s.options.mode === "solo" && s.lesson === null ? rivalFor("checkers", strengthOf[s.options.difficulty]) : null,
    moment = review && review !== "none" && s.position.outcome ? review : null;
  const moves = useMemo(() => checkersMoves(s.position, rules), [s.position, rules]),
    lesson = s.lesson === null ? null : LESSONS[s.lesson];
  const computer =
    s.lesson === null && s.options.mode === "solo" && s.position.turn === -1 && !s.position.outcome;
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
    displayBoard = [...(moment ? moment.before.board : s.position.board)];
  if (from !== null && path.length) {
    const route = candidates[0];
    displayBoard[from] = 0;
    if (route) route.captured.slice(0, path.length).forEach((i) => (displayBoard[i] = 0));
    displayBoard[path[path.length - 1]] = s.position.board[from];
  }
  const size = Math.min(width + 24, 560),
    cellSize = (size - 16) / 8,
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
          ? `${rival?.name ?? "Your island friend"} is thinking…`
          : `${s.position.turn === 1 ? "Red" : "Blue"} to move`;
  return (
    <BoardLayout>
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
                  ? rules === "friendly"
                    ? "A jump is available. You can jump or choose another move."
                    : "A jump is available. Classic rules: take a jump."
                  : "Tap a piece, then tap its next square."
        }
        success={!!outcome || lessonComplete}
      />
      {rival && !outcome && (
        <Copy style={{ fontSize: 14, textAlign: "center" }}>
          {rival.name} is {rival.who}. {rival.plays}
        </Copy>
      )}
      {rival && s.options.checkersHeadStart === 1 && (
        <Copy style={{ fontSize: 14, color: C.ink, padding: 10, backgroundColor: "#FFF4D6", borderRadius: 12, textAlign: "center" }}>
          Head start for you: {rival.name} starts with one piece fewer. {rival.name} still plays its best.
        </Copy>
      )}
      {outcome && s.lesson === null && review === null && (
        <Controls>
          <Button
            quiet
            onPress={() => {
              const side = s.options.mode === "solo" ? 1 : outcome === "red" ? 1 : outcome === "blue" ? -1 : 1;
              setReview(reviewCheckers(s, side) ?? "none");
              sound("tap");
            }}
          >
            See the best move
          </Button>
        </Controls>
      )}
      {outcome && review !== null && (
        <View accessibilityLiveRegion="polite" style={{ gap: 8, padding: 12, backgroundColor: C.paper, borderRadius: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 19, fontWeight: "800", color: C.ink }}>
            {moment ? moment.title : "No single turning point"}
          </Text>
          <Copy style={{ color: C.ink }}>
            {moment
              ? `${moment.text} The board below shows the moment before; the gold squares mark the move.`
              : "The look-back didn’t find one move that clearly changed this game. Play again, or try a head start."}
          </Copy>
          <Button quiet compact onPress={() => setReview(null)}>
            Back to the final board
          </Button>
        </View>
      )}
      <BoardArea>
        {s.options.mode === "together" && s.lesson === null && (
          <Scoreboard
            match={s.match ?? newMatch()}
            result={checkersResultSeat(s)}
            active={
              outcome ? null : s.position.turn === 1 ? (s.starter ?? 0) : (s.starter ?? 0) === 0 ? 1 : 0
            }
            marks={
              (s.starter ?? 0) === 0
                ? [<Piece key="r" red />, <Piece key="b" />]
                : [<Piece key="b" />, <Piece key="r" red />]
            }
          />
        )}
        <View
          style={{
            alignSelf: "center",
            width: size,
            marginHorizontal: -12,
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 2,
            borderColor: "#466859",
            backgroundColor: "#547565",
            padding: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              width: size - 16,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: 64 }, (_, rendered) => {
              const i = s.options.mode === "solo" ? 63 - rendered : rendered,
                piece = displayBoard[i];
              const dark = (row(i) + col(i)) % 2 === 1,
                canMove = moves.some((m) => m.from === i),
                destination = destinations.includes(i),
                shownHint = moment ? moment.show : hint,
                suggested = shownHint && (i === shownHint.from || shownHint.path.includes(i));
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
                    backgroundColor: suggested
                      ? "#E9CB7D"
                      : destination
                        ? "#C9DBA1"
                        : dark
                          ? "#A7C3B0"
                          : "#F3E8D1",
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
                        <Text style={{ fontSize: cellSize * 0.38, fontWeight: "900", color: "#FFF6DB" }}>
                          K
                        </Text>
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
                  ) : null}
                  {help && canMove && from === null && !computer && !outcome && (
                    <View
                      style={{
                        position: "absolute",
                        bottom: 2,
                        right: 2,
                        width: 11,
                        height: 11,
                        borderRadius: 6,
                        backgroundColor: C.ink,
                        borderWidth: 1,
                        borderColor: C.paper,
                      }}
                    />
                  )}
                </Cell>
              );
            })}
          </View>
        </View>
      </BoardArea>
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
                const m = [...moves].sort((a, b) => b.captured.length - a.captured.length)[0];
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
      {hint && !computer && !outcome && (
        <Copy style={{ textAlign: "center", fontSize: 13, marginTop: 10 }}>
          {hint.captured.length
            ? `Jump from ${coords(hint.from)} to ${coords(hint.path[0])} to capture. Finish each jump in the chain.`
            : `Move from ${coords(hint.from)} to ${coords(hint.path[0])}. Ordinary pieces travel diagonally toward the far row to become kings.`}
        </Copy>
      )}
      {lesson ? (
        <Controls>
          <Button
            onPress={() =>
              commit(s.lesson! < 3 ? checkersLesson(s, s.lesson! + 1) : finishCheckersLessons(s))
            }
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
        Kings have a K.{" "}
        {s.options.mode === "solo"
          ? "Your red pieces start at the bottom and move up."
          : "Red starts at the top and moves down."}{" "}
        A jump chain saves when the whole turn is complete.
      </Copy>
    </BoardLayout>
  );
}
