import React from 'react';
import type { ChallengeViewProps } from '../../../challenge/types';
import { LagoonGrid } from './grid';
import { toAction, type State, type Action } from './challenge-engine';
export function ChallengeBoard({ state: s, dispatch, active, width }: ChallengeViewProps<State, Action>) {
  return <LagoonGrid puzzle={s.descriptor.puzzle} state={s.grid} title={s.descriptor.title} assisted={s.helps > 0} pictures={s.descriptor.symbols} dispatch={a => dispatch(toAction(a))} active={active} width={width} help={() => dispatch(['h'])} reveal={() => dispatch(['v'])} check={() => dispatch(['c'])} message={s.wrong === null ? '' : s.wrong ? `${s.wrong} squares need a change.` : 'Every clue fits.'}/>;
}
