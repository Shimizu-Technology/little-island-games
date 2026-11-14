import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { Button, C, Copy, Heading } from "../../../components/ui";
import { PictureObject } from "../../art/Objects";
import { useStepReveal } from "../../stepReveal";
import type { BoardProps } from "../../types";
import { canCheckAnswer, answerMissed } from "../../../puzzles/wholeAnswer";
import { buildRules } from "../../reading/build";
import { wordAudio } from "../../kit/reading";
import { BuildBoat } from "./BuildBoat";
import {
  PARTS_PER_ROUND,
  partsAssisted,
  partsDone,
  partsMove,
  partsTask,
  type PartsAction,
  type PartsState,
  type PartsTasks,
} from "./parts";
import { Voyage, ink } from "./shared";

function Finished() {
  return (
    <View style={{ alignItems: "center", gap: 10, padding: 12 }}>
      <Voyage step={PARTS_PER_ROUND} total={PARTS_PER_ROUND} width={320} />
      <PictureObject name="boat" size={110} />
      <Heading style={{ textAlign: "center" }}>The boat reached the island!</Heading>
      <Copy style={{ color: ink, textAlign: "center" }}>Six words, built from their pieces.</Copy>
    </View>
  );
}

/**
 * Levels 4 and 5. Build the word you hear from its pieces, tap Check, then sail on when you are ready. The child sets
 * the pace: nothing advances by itself and nothing here keeps time.
 */
export function PartsBoard({
  session,
  update,
  practice,
  assistance,
  sound,
  soundOn,
  width,
  height,
  active,
  cheer,
  tasks,
}: BoardProps<PartsState> & { tasks: PartsTasks }) {
  const s = session.state;
  const done = partsDone(s);
  useStepReveal(s.index);
  const task = done ? null : partsTask(s, tasks);

  // Say each new word. A fresh round waits for the spoken goal first; a restored round waits a moment.
  const spoken = useRef<string | null>(session.revision > 0 ? `${session.id}-${s.index}` : null);
  useEffect(() => {
    if (done || !active || !soundOn || !task) return;
    const key = `${session.id}-${s.index}`;
    if (spoken.current === key) return;
    const timer = setTimeout(() => {
      spoken.current = key;
      sound(wordAudio(task.word), true);
    }, session.revision === 0 ? 2900 : 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Speaks once per word; later renders must not repeat it.
  }, [active, soundOn, s.index, session.id, done]);

  if (done || !task) return <Finished />;

  function act(a: PartsAction) {
    if (!active || !task) return;
    const next = partsMove(s, a, tasks);
    if (next === s) return;
    if (a.type === "edit") sound("tap");
    if (a.type === "check") {
      if (next.answer.solved) {
        practice(task.skill, next.answer.misses === 0 && !next.answer.helped);
        cheer(s.index === PARTS_PER_ROUND - 1 ? "big" : "right", "sound-boat-parts-built");
      } else sound(wordAudio(task.word), true);
    }
    if (a.type === "hear") sound(wordAudio(task.word));
    if (partsAssisted(next)) assistance?.();
    update(next);
  }

  const who = session.names?.[(s.starter + s.index) % 2] ?? `Player ${((s.starter + s.index) % 2) + 1}`;
  const last = s.index === PARTS_PER_ROUND - 1;
  return (
    <View style={{ gap: 10, alignItems: "center" }}>
      {session.options.mode !== "solo" && <Copy style={{ color: C.teal, fontWeight: "800", fontSize: 22, textAlign: "center" }}>{who}’s turn</Copy>}
      <Voyage step={s.index} total={PARTS_PER_ROUND} width={width} />
      <BuildBoat
        task={task}
        draft={s.answer.draft}
        helped={s.answer.helped}
        solved={s.answer.solved}
        missed={answerMissed(s.answer)}
        canCheck={canCheckAnswer(buildRules, task, s.answer)}
        prompt={s.answer.solved ? "You built it!" : task.cue ? "Hear the word. Build it from its pieces." : "Hear the word. Tap the pieces in order."}
        width={width}
        compact={height < 730}
        soundOn={soundOn}
        sound={sound}
        onAdd={(at) => act({ type: "edit", edit: ["a", at] })}
        onRemove={(at) => act({ type: "edit", edit: ["x", at] })}
        onCheck={() => act({ type: "check" })}
        onHelp={() => act({ type: "help" })}
        onReset={() => act({ type: "reset" })}
        onHear={() => act({ type: "hear" })}
        done={<Button onPress={() => act({ type: "next" })}>{last ? "Reach the island" : "Sail on"}</Button>}
      />
    </View>
  );
}
