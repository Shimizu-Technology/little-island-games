import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Copy } from '../../../components/ui';
import type { BoardProps } from '../../types';
import { Board as LegacyBoard } from './legacy-view';
import { boardAt, enter, hint, move, taskAt, revealStep, type LatinState, type LogicState } from './engine';
import { LagoonGrid } from './grid';
import { ScaleGlyph } from '../thinkingArt';
export { Art } from './legacy-view';

function LatinBoard({ session, update, practice, assistance, cheer, coach, active, width, sound }: BoardProps<LogicState> & { session: BoardProps<LogicState>['session'] & { state: LatinState } }) {
  const s = session.state, task = taskAt(s), [feedback, setFeedback] = useState({ index: -1, text: '' });
  const send: Parameters<typeof LagoonGrid>[0]['dispatch'] = action => {
    if (!active) return;
    const next = move(s, action);
    if (next === s) return;
    if (task.kind === 'grid' && action.type === 'write' && !boardAt(s, task.puzzle!).pencil && action.value > 0) {
      const right = action.cells.every(i => task.solution[i] === action.value);
      practice('think.logic', right);
      setFeedback({ index: s.index, text: right ? '' : 'Not quite. Look at the clues and try another value.' });
      if (right) { cheer(next.index > s.index ? 'big' : 'right'); coach.done(); } else sound('tap');
    } else if (!['select', 'tool', 'pencil'].includes(action.type)) sound('tap');
    update(next);
  };
  if (task.kind === 'balance') return <View style={{ gap: 10 }}><Copy maxFontSizeMultiplier={1.3}>PUZZLE {s.index + 1} OF 4 · Shell scales</Copy><ScaleGlyph/><Copy>The left holds {task.left} shells. The right holds {task.right} shells and a mystery bag.</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Array.from({ length: 10 }, (_, i) => <Button key={i} compact disabled={!active} onPress={() => { const right = i + 1 === task.answer; practice('think.balance', right); update(enter(s, 0, i + 1)); setFeedback({ index: s.index, text: right ? '' : 'The scales are still uneven.' }); if (right) cheer('big'); }}>{i + 1}</Button>)}</View>{feedback.index === s.index && <Copy>{feedback.text}</Copy>}<Button quiet disabled={!active} onPress={() => { assistance?.(); const h = hint(s); update(h.state); setFeedback({ index: s.index, text: h.reason }); }}>Hint</Button></View>;
  const p = task.puzzle!, grid = boardAt(s, p);
  const markHelp = () => { assistance?.(); update({ ...s, helped: true }); };
  return <LagoonGrid key={s.index} puzzle={p} state={grid} dispatch={send} title={`PUZZLE ${s.index + 1} OF 4`} active={active} width={width} pictures={task.symbols[0] === 'shell' ? task.symbols : undefined} message={feedback.index === s.index ? feedback.text : ''}
    help={markHelp} reveal={() => { assistance?.(); update(revealStep(s)); sound('tap'); }}
    check={() => { const wrong = grid.values.filter((v, i) => v !== task.solution[i]).length; setFeedback({ index: s.index, text: wrong ? `${wrong} squares still need a change.` : 'Every clue fits.' }); }}/ >;
}
export function Board(props: BoardProps<LogicState>) {
  return props.session.state.version === 1 ? <LegacyBoard {...props as BoardProps<Extract<LogicState, { version: 1 }>>}/> : <LatinBoard {...props as Parameters<typeof LatinBoard>[0]}/>;
}
