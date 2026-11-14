import React, { useContext } from "react";
import { AudioPreferences, useSoundControls } from "../../../components/Audio";
import type { ChallengeViewProps } from "../../../challenge/types";
import { answerMissed, canCheckAnswer } from "../../../puzzles/wholeAnswer";
import { buildRules } from "../../reading/build";
import { wordAudio } from "../../kit/reading";
import { BuildBoat } from "./BuildBoat";
import type { Action, State } from "./challenge-engine";

export function ChallengeBoard({ state: s, dispatch, active, width, header, footer }: ChallengeViewProps<State, Action>) {
  const preferences = useContext(AudioPreferences), { play } = useSoundControls(preferences.sound ?? true);
  const soundOn = preferences.sound !== false;
  const send = (a: Action) => { if (active) dispatch(a); };
  return (
    <>
      {header}
      <BuildBoat
        task={s.task}
        draft={s.answer.draft}
        helped={s.answer.helped}
        solved={s.answer.solved}
        missed={answerMissed(s.answer)}
        canCheck={canCheckAnswer(buildRules, s.task, s.answer)}
        prompt="Build the word. Check when every box is full."
        width={width}
        soundOn={soundOn}
        sound={(key) => play(key)}
        onAdd={(at) => { play("tap", true); send(["a", at]); }}
        onRemove={(at) => { play("tap", true); send(["x", at]); }}
        onCheck={() => send(["k"])}
        onHelp={() => send(["h"])}
        onReset={() => send(["z"])}
        onHear={() => { play(wordAudio(s.task.word)); send(["r"]); }}
        onHeard={() => send(["r"])}
      />
      {footer}
    </>
  );
}
