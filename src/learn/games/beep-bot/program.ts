import { fromFlat, validProgram, type Program } from '../../program/model';
import { decodeProgram, encodeProgram } from '../../program/codec';
import { interpret } from '../../program/interpreter';
import { cardEffect, type Arrow, type Puzzle } from './movement';
export const programCodes: Arrow[] = ['up', 'right', 'down', 'left', 'repeat2', 'repeat3'];
export const beepProgram = (plan: readonly Arrow[]): Program => fromFlat(plan.map(c => programCodes.indexOf(c)));
export function projectBeep(program: Program, puzzle: Puzzle) {
  if (!validProgram(program, code => code < programCodes.length)) return null;
  const result = interpret(program, { pos: puzzle.start, previous: null as Arrow | null, bump: false }, {
    step: (state, code) => {
      const card = programCodes[code], next = state.bump ? state : cardEffect(puzzle, state.pos, card, state.previous);
      return { ...next, previous: card.startsWith('repeat') ? state.previous : card };
    },
    // Beep's one condition looks north, the arrow drawn on the condition card.
    blocked: state => cardEffect(puzzle, state.pos, 'up', null).bump,
  });
  return result ? { ...result, plan: result.frames.map(frame => programCodes[frame.command]) } : null;
}
export function readBeepDraft(draft: unknown, puzzle: Puzzle, level: number) {
  const program = decodeProgram(draft, code => code < (level === 5 ? 6 : 4));
  if (!program) return null;
  const result = projectBeep(program, puzzle);
  return result && result.plan.length <= 32 ? { program, ...result } : null;
}
export const packBeep = (program: Program) => encodeProgram(program);
