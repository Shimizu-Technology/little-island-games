import { fromFlat, validProgram, type Node, type Program } from '../../program/model';
import { REPEAT_COUNTS } from './search';
import { decodeProgram, encodeProgram, type PackedProgram } from '../../program/codec';
import { interpret } from '../../program/interpreter';
import { commands, start, step, type CrabState, type Command, type Level } from './engine';

export const programCodes: Command[] = ['up', 'right', 'down', 'left', 'forward', 'turn-left', 'turn-right', 'repeat'];
/** Crab's tray puzzles admit only the Repeat counts the editor's buttons set. The K7 codec still reads 2–16, so old saves decode. */
export function paletteRepeats(program: Program): boolean {
  const ok = (nodes: readonly Node[]): boolean => nodes.every(n => n.kind === 'repeat' ? (REPEAT_COUNTS as readonly number[]).includes(n.times) && ok(n.body) : n.kind === 'if' ? ok(n.yes) && ok(n.no) : n.kind === 'sequence' ? ok(n.body) : true);
  return ok(program.body) && program.songs.every(ok);
}
export const crabProgram = (plan: readonly Command[]): Program => fromFlat(plan.map(c => programCodes.indexOf(c)));
export function projectCrab(program: Program, level: Level) {
  if (!validProgram(program, code => code < programCodes.length)) return null;
  const result = interpret(program, start(level), {
    step: (walker, command) => step(level, walker, programCodes[command]),
    blocked: walker => step(level, walker, 'forward').bump,
  });
  return result ? { ...result, plan: result.frames.map(frame => programCodes[frame.command]) } : null;
}
export function readCrabDraft(draft: unknown, level: Level) {
  const program = decodeProgram(draft, code => commands(level.pace).includes(programCodes[code]));
  if (!program) return null;
  const result = projectCrab(program, level);
  return result && result.plan.length <= 80 ? { program, ...result } : null;
}
export function withCrabProgram(state: CrabState, program: Program, level: Level): (CrabState & { blockDraft: PackedProgram }) | null {
  const blockDraft = encodeProgram(program), result = readCrabDraft(blockDraft, level);
  if(!result)return null;
  const minimum=Math.max(state.cards+1,result.plan.length+state.completed.reduce((sum,p)=>sum+p.length,0));
  // Retain the legacy executable-card floor while advancing exactly one seat per edit.
  const cards=minimum+(minimum-state.cards-1)%2;
  return cards<=1000000?{...state,program:result.plan,cursor:0,running:false,blockDraft,cards}:null;
}
