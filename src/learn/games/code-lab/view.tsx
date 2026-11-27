import React from 'react';
import { View } from 'react-native';
import type { BoardProps } from '../../types';
import { SpeakButton } from '../../SpeakButton';
import { useSpokenPrompt } from '../../voice';
import { useStepReveal } from '../../stepReveal';
import { Copy } from '../../../components/ui';
import { engine, programAt, type LabState, type ModernState } from './engine';
import { Board as LegacyBoard } from './LegacyBoard';
import { hint, initialAttempt, step, type Action } from './attempt';
import { ProgramPanel } from './ProgramPanel';
export { Art } from './LegacyBoard';
export function Board(props: BoardProps<LabState>) {
  if (props.session.state.version === 1) return <LegacyBoard {...props as BoardProps<import('./legacy').LabState>} />;
  return <ModernBoard {...props as BoardProps<ModernState>} />;
}
function ModernBoard({ session, update, active, width, sound, soundOn, cheer, practice, assistance, coach }: BoardProps<ModernState>) {
  const s = session.state, d = programAt(s);
  useStepReveal(`${session.id}-${s.index}`);
  const promptSpeech = s.index < 4
    ? `${s.index === 0 && session.revision === 0 && engine.spokenIntro ? `${engine.spokenIntro} ` : ''}${d.idea}. ${d.mode === 'predict' ? 'Read the program and choose what it prints before you check.' : 'Fill every blank line to match the goal output, then run your code.'}`
    : null;
  const { replay, speak } = useSpokenPrompt(promptSpeech, `${session.id}:${s.index}`, { soundOn, active: active && s.index < 4 });
  const send = (action: Action) => {
    const next = step(s.attempt, action, d); if (!next) return;
    if (action[0] === 'h') {
      assistance?.();
      speak(hint(d, next));
    }
    update({ ...s, attempt: next, helped: s.helped || next.failed || next.help > 0 });
    coach.done(); sound('tap', true);
    if (action[0] === 'c') {
      practice(s.level === 1 ? 'think.code-sequence' : s.level === 3 ? 'think.code-functions' : s.level === 4 ? 'think.code-debug' : 'think.code-variables', next.won);
      if (next.won) cheer('right');
      else speak('Not yet. Your work is kept. Change a choice and try again.');
    }
  };
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Copy maxFontSizeMultiplier={1.5}>Program {Math.min(4, s.index + 1)} of 4</Copy>
      {s.index < 4 && <SpeakButton testID="code-lab-speak" label="Hear program prompt" disabled={!soundOn || !active} onPress={replay} />}
    </View>
    <ProgramPanel key={`${session.id}-${s.index}`} d={d} state={s.attempt} send={send} active={active} coaching={coach.active} width={width} onNext={() => update(s.index < 3 ? { ...s, index: s.index + 1, attempt: initialAttempt(programAt({ ...s, index: s.index + 1 })) } : { ...s, index: 4 })} />
  </View>;
}
