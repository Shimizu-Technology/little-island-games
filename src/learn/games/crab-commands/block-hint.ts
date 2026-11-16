import { blockPosition } from '../../program/hints';
import { clone, insertNode, listAt, main, removeNode, replaceNode, address, type Location } from '../../program/edit';
import { nodeCost, type Node, type Program } from '../../program/model';

/** One thing a child can do in the block editor, in the editor's own controls. A hint never names anything else. */
export type BlockStep =
  | { kind: 'add'; location: Location; node: Node; songGroup?: true }
  | { kind: 'count'; location: Location; at: number; times: number }
  | { kind: 'replace'; location: Location; at: number; command: number }
  | { kind: 'remove'; location: Location; at: number; room?: true }
  | { kind: 'make-song' };
type Name = (command: number) => string;

const child = (location: Location, at: number, branch: 'body' | 'yes' | 'no'): Location => ({ ...location, path: [...location.path, at, branch] });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** What a palette button puts in the plan: Repeat always arrives as ×2 and empty, an If with both branches empty. */
const fromPalette = (n: Node): Node => n.kind === 'repeat' ? { kind: 'repeat', times: 2, body: [] } : n.kind === 'if' ? { kind: 'if', condition: { kind: 'blocked' }, yes: [], no: [] } : n;

/** The first difference between a list in the child's plan and the same list in the target. Cards are only ever added at
 * the end of a list (where the editor's dashed place adds them); a wrong block is replaced or removed. */
function listStep(list: readonly Node[], target: readonly Node[], location: Location): BlockStep | null {
  for (let at = 0; at < Math.max(list.length, target.length); at++) {
    const a = list[at], b = target[at];
    if (!a) return { kind: 'add', location, node: fromPalette(b) };
    if (!b) return { kind: 'remove', location, at };
    if (a.kind === 'command' && b.kind === 'command') { if (a.command !== b.command) return { kind: 'replace', location, at, command: b.command }; continue; }
    if (a.kind === 'call' && b.kind === 'call' && a.song === b.song) continue;
    if (a.kind === 'repeat' && b.kind === 'repeat') {
      const inner = listStep(a.body, b.body, child(location, at, 'body'));
      if (inner) return inner;
      if (a.times !== b.times) return { kind: 'count', location, at, times: b.times };
      continue;
    }
    if (a.kind === 'if' && b.kind === 'if') {
      const inner = listStep(a.yes, b.yes, child(location, at, 'yes')) ?? listStep(a.no, b.no, child(location, at, 'no'));
      if (inner) return inner;
      continue;
    }
    return { kind: 'remove', location, at };
  }
  return null;
}
/** The next editor action from the child's plan toward one certified winner, or null when the plan already is that winner.
 * A song is built the only way the editor allows: put its cards in the plan, then Make plan a song. */
function freeStep(program: Program, target: Program): BlockStep | null {
  if (target.songs.length && !program.songs.length) {
    if (same(program.body, target.songs[0])) return { kind: 'make-song' };
    const step = listStep(program.body, target.songs[0], main);
    // While the plan is still the song's group, say what the cards are for.
    return step && { ...step, songGroup: true } as BlockStep;
  }
  return listStep(program.body, target.body, main) ?? target.songs.map((song, i) => listStep(program.songs[i] ?? [], song, { song: i, path: [] })).find(Boolean) ?? null;
}
/** Every block the child could remove, as the editor addresses it. */
function removals(program: Program): BlockStep[] {
  const out: BlockStep[] = [];
  const walk = (list: readonly Node[], location: Location) => list.forEach((n, at) => {
    out.push({ kind: 'remove', location, at, room: true });
    if (n.kind === 'repeat') walk(n.body, child(location, at, 'body'));
    if (n.kind === 'if') { walk(n.yes, child(location, at, 'yes')); walk(n.no, child(location, at, 'no')); }
  });
  walk(program.body, main); program.songs.forEach((song, i) => walk(song, { song: i, path: [] }));
  return out;
}
const freeSteps = (program: Program, target: Program) => {
  let p: Program | null = program, n = 0;
  for (let step = p && freeStep(p, target); step && p && n < 200; step = p && freeStep(p, target)) { p = applyStep(p, step); n++; }
  return p ? n : Infinity;
};
/** The next action the editor will accept. When the next card would not fit the tray, the hint makes room first:
 * it removes the block whose removal leaves the shortest way to the winner (a stray card, not one the winner needs). */
export function nextStep(program: Program, target: Program, tray?: number): BlockStep | null {
  const step = freeStep(program, target);
  if (!step || tray === undefined) return step;
  const next = applyStep(program, step);
  if (next && nodeCost(next) <= tray) return step;
  let best: { step: BlockStep; steps: number } | null = null;
  for (const remove of removals(program)) {
    const left = applyStep(program, remove), steps = left ? freeSteps(left, target) : Infinity;
    // Ties go to the later block: stray cards usually sit at the end of the plan.
    if (steps <= (best?.steps ?? Infinity)) best = { step: remove, steps };
  }
  return best && best.steps < Infinity ? best.step : step;
}
/** The same pure edits the editor makes for these controls. */
export function applyStep(program: Program, step: BlockStep): Program | null {
  if (step.kind === 'make-song') { const next = clone(program), song = next.songs.length; next.songs.push(next.body); next.body = [{ kind: 'call', song }]; return next; }
  if (step.kind === 'add') { const list = listAt(program, step.location); return list ? insertNode(program, step.location, list.length, step.node) : null; }
  if (step.kind === 'remove') return removeNode(program, step.location, step.at);
  const node = listAt(program, step.location)?.[step.at];
  if (!node) return null;
  if (step.kind === 'count') return node.kind === 'repeat' ? replaceNode(program, step.location, step.at, { ...node, times: step.times }) : null;
  return replaceNode(program, step.location, step.at, { kind: 'command', command: step.command });
}
const paletteLabel = (n: Node, name: Name) => n.kind === 'command' ? name(n.command) : n.kind === 'repeat' ? '↻ Repeat ×2' : n.kind === 'if' ? '? If blocked' : n.kind === 'call' ? `♫ Song ${n.song + 1}` : 'a block';
const blockName = (n: Node | undefined, name: Name) => !n ? 'block' : n.kind === 'command' ? name(n.command) : n.kind === 'repeat' ? `Repeat ${n.times}` : n.kind === 'if' ? 'If blocked' : n.kind === 'call' ? `Song ${n.song + 1}` : 'block';
/** The dashed place to tap first, named as the editor names it. */
function place(location: Location): string {
  if (!location.path.length) return location.song === null ? '“＋ End of plan”' : `“＋ Inside Song ${location.song + 1}”`;
  const branch = location.path.at(-1), owner = blockPosition(address({ ...location, path: location.path.slice(0, -2) }, location.path.at(-2) as number));
  return branch === 'yes' ? `“＋ When blocked” in the If at ${owner}` : branch === 'no' ? `“＋ Otherwise” in the If at ${owner}` : `“＋ Inside repeat” in ${owner}`;
}
/** One step in words, each naming a real control. */
export function describeStep(step: BlockStep, program: Program, name: Name): string {
  if (step.kind === 'make-song') return 'Your group of cards is ready. Tap “Make plan a song”: the group becomes Song 1, and the plan calls it once.';
  if (step.kind === 'add') {
    const then = step.node.kind === 'repeat' ? ' The Repeat starts at ×2.' : step.node.kind === 'if' ? ' Its two branches start empty.' : '';
    return `${step.songGroup ? 'Build the group for Song 1 in the plan first. ' : ''}Tap ${place(step.location)}, then tap ${paletteLabel(step.node, name)}.${then}`;
  }
  const at = blockPosition(address(step.location, step.at)), here = blockName(listAt(program, step.location)?.[step.at], name);
  if (step.kind === 'count') return `Tap the Repeat at ${at}, then tap ×${step.times}.`;
  if (step.kind === 'replace') return `Tap ${at} (${here}), then tap ${name(step.command)} to replace it.`;
  return `${step.kind === 'remove' && step.room ? 'The tray is full, so make room first. ' : ''}Tap ${at} (${here}), then tap Remove block.`;
}
/** The whole plan in words for the last help step, with every branch and the song spelled out. */
export function describeProgram(program: Program, name: Name): string {
  const say = (nodes: Node[]): string => nodes.map(n => n.kind === 'command' ? name(n.command) : n.kind === 'repeat' ? `Repeat ${n.times} times [${say(n.body)}]` : n.kind === 'call' ? `♫ Song ${n.song + 1}` : n.kind === 'if' ? `If blocked [${say(n.yes) || 'nothing'}] otherwise [${say(n.no) || 'nothing'}]` : say(n.body)).join(', ');
  const songs = program.songs.map((song, i) => `Song ${i + 1} is [${say(song)}]`).join('. ');
  return `${songs ? `${songs}. Plan: ` : ''}${say(program.body)}`;
}
const stepsTo = (program: Program, target: Program, tray?: number) => {
  let p: Program | null = program, n = 0;
  for (let step = p && nextStep(p, target, tray); step && p && n < 200; step = p && nextStep(p, target, tray)) { p = applyStep(p, step); n++; }
  return p && n < 200 ? n : Infinity;
};
/** The certified winner the fewest accepted editor actions away, and the first action toward it. Ties keep the cheaper winner. */
export function nearestBlocks(program: Program, solutions: readonly Program[], tray?: number): { target: Program; first: BlockStep | null; steps: number } | null {
  let best: { target: Program; first: BlockStep | null; steps: number } | null = null;
  for (const target of solutions) {
    const steps = stepsTo(program, target, tray);
    if (steps < (best?.steps ?? Infinity)) best = { target, first: nextStep(program, target, tray), steps };
  }
  return best;
}
