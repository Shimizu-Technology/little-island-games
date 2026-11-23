import React from 'react';
import { View } from 'react-native';
import type { BoardProps } from '../../types';
import { useStepReveal } from '../../stepReveal';
import { Copy } from '../../../components/ui';
import { programAt, type LabState, type ModernState } from './engine';
import { Board as LegacyBoard } from './LegacyBoard';
import { initialAttempt, step, type Action } from './attempt';
import { ProgramPanel } from './ProgramPanel';
export { Art } from './LegacyBoard';
export function Board(props: BoardProps<LabState>) {
  if (props.session.state.version === 1) return <LegacyBoard {...props as BoardProps<import('./legacy').LabState>} />;
  return <ModernBoard {...props as BoardProps<ModernState>} />;
}
function ModernBoard({ session, update, active, width, sound, cheer, practice, assistance, coach }: BoardProps<ModernState>) {
  const s = session.state, d = programAt(s);
  useStepReveal(`${session.id}-${s.index}`);
  const send = (action: Action) => {
    const next = step(s.attempt, action, d); if (!next) return;
    if (action[0] === 'h') assistance?.();
    update({ ...s, attempt: next, helped: s.helped || next.failed || next.help > 0 });
    coach.done(); sound('tap', true);
    if (action[0] === 'c') { practice('think.code-debug', next.won); if (next.won) cheer('right'); }
  };
  return <View style={{ gap: 8 }}>
    <Copy maxFontSizeMultiplier={1.5}>Program {Math.min(4, s.index + 1)} of 4</Copy>
    <ProgramPanel key={`${session.id}-${s.index}`} d={d} state={s.attempt} send={send} active={active} width={width} onNext={() => update(s.index < 3 ? { ...s, index: s.index + 1, attempt: initialAttempt(programAt({ ...s, index: s.index + 1 })) } : { ...s, index: 4 })} />
  </View>;
}
