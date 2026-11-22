/** Build-time only. Generates and certifies C1d School beaches with the app's own engine:
 * 30 more Level 1–3 beaches, Level 4 beaches with one planted bug, Level 5 beaches whose tray is
 * below every flat plan. Run: node --import ./scripts/puzzles/register.mjs src/learn/games/crab-commands/bake-school.ts */
import { writeFileSync } from 'node:fs';
import { createRng } from '../../../puzzles/rng';
import { encodeProgram } from '../../program/codec';
import { nodeCost, type Node, type Program } from '../../program/model';
import { commands, levels, solve, type Command, type Level } from './engine';
import { execute, nextHint } from './challenge-engine';
import { blockBest, runNodes } from './search';
import { codes, crabSim, decoys, gradeLoops } from './proofs';
import { readCrabDraft } from './program';

const rng = createRng(0xc1d0c4ab);
const pick = <T,>(items: readonly T[]) => items[rng.below(items.length)];
const authored = levels.filter(l => !l.stage && !/^n[emh]\d/.test(l.id));
const seen = new Set(authored.map(l => l.rows.join('/')));
const blank = () => Array.from({ length: 25 }, () => '.');
const rowsOf = (cells: string[]) => [0, 1, 2, 3, 4].map(r => cells.slice(r * 5, r * 5 + 5).join(''));
const level = (id: string, pace: Level['pace'], tier: 0 | 1 | 2, rows: string[], extra: Partial<Level> = {}): Level => ({
  id, rows, tier, pace, facing: 1, skill: extra.stage === 'stretch' ? 'think.debug' : extra.stage === 'deep' || pace === 'hard' ? 'think.loops' : 'think.sequence', ...extra,
});
const fresh = (rows: string[]) => { const k = rows.join('/'); if (seen.has(k)) return false; seen.add(k); return true; };
/** Random beach: crab, 1–3 shells, home, a few sandcastles. */
function randomBeach(shells: number, castles: number) {
  const cells = blank(), free = () => { for (;;) { const i = rng.below(25); if (cells[i] === '.') return i; } };
  cells[free()] = 'C';
  for (let i = 0; i < shells; i++) cells[free()] = 'S';
  cells[free()] = 'H';
  for (let i = 0; i < castles; i++) cells[free()] = '#';
  return rowsOf(cells);
}
/** A sandcastle earns its place only when removing it makes the best plan shorter. */
const castlesMatter = (l: Level, cards: number) => l.rows.join('').split('').some((c, i) => c === '#' && solve({ ...l, rows: rowsOf(l.rows.join('').split('').map((x, j) => (j === i ? '.' : x))) }).length < cards);

// ---- 30 more Level 1–3 beaches -------------------------------------------------------------
const tierOf = (cards: number) => (cards <= 3 ? 0 : cards <= 6 ? 1 : 2) as 0 | 1 | 2;
const wanted: Record<Level['pace'], number[]> = { easy: [2, 3, 5], medium: [3, 4, 3], hard: [3, 4, 3] };
const extra: Level[] = [];
for (const pace of ['easy', 'medium', 'hard'] as const) {
  const count = [0, 0, 0], prefix = { easy: 'ne', medium: 'nm', hard: 'nh' }[pace];
  for (let tries = 0; count.some((n, t) => n < wanted[pace][t]) && tries < 400000; tries++) {
    const target = count.findIndex((n, t) => n < wanted[pace][t]);
    const rows = randomBeach(target === 0 ? 1 : 1 + rng.below(target === 2 ? 3 : 2), target === 0 ? rng.below(2) : 1 + rng.below(4));
    const l = level('x', pace, target as 0 | 1 | 2, rows), plan = solve(l);
    if (!plan.length || tierOf(plan.length) !== target || plan.length > 13) continue;
    if (target > 0 && l.rows.join('').includes('#') && !castlesMatter(l, plan.length)) continue;
    if (pace === 'hard') {
      const saved = solve({ ...l, pace: 'medium' }).length - plan.length;
      if (saved < (target === 2 ? 2 : 1) || !plan.includes('repeat')) continue;
    }
    if (pace !== 'easy' && target === 0 && plan[0] !== 'forward' && pace === 'medium') continue;
    if (!fresh(rows)) continue;
    count[target]++;
    extra.push({ ...l, id: `${prefix}${extra.filter(e => e.pace === pace).length + 1}` });
  }
}

// ---- Level 4: one planted bug ---------------------------------------------------------------
type Bug = { starter: Command[]; bug: 'step' | 'turn' | 'loop'; at: number };
function plant(plan: Command[], kind: Bug['bug']): Bug | null {
  const broken = [...plan], turns = plan.flatMap((c, i) => (c.startsWith('turn') ? [i] : [])), walks = plan.flatMap((c, i) => (c === 'forward' ? [i] : []));
  if (kind === 'turn') { if (!turns.length) return null; const at = pick(turns); broken[at] = plan[at] === 'turn-left' ? 'turn-right' : 'turn-left'; return { starter: broken, bug: kind, at }; }
  if (kind === 'step') {
    if (rng.below(2) && walks.length > 1) { const at = pick(walks); broken.splice(at, 1); return { starter: broken, bug: kind, at }; }
    const at = 1 + rng.below(plan.length - 1); broken.splice(at, 0, 'forward'); return { starter: broken, bug: kind, at };
  }
  const agains = plan.flatMap((c, i) => (c === 'repeat' ? [i] : [])), pairs = plan.flatMap((c, i) => (c === 'forward' && plan[i - 1] === 'forward' && plan[i - 2] !== 'forward' ? [i] : []));
  if (agains.length && (rng.below(2) || !pairs.length)) { const at = pick(agains); broken[at] = 'forward'; return { starter: broken, bug: kind, at }; }
  if (!pairs.length) return null;
  const at = pick(pairs); broken[at] = 'repeat'; return { starter: broken, bug: kind, at };
}
const debugDescriptor = (l: Level) => ({ level: l, budget: null, starter: [], lesson: '' });
const stretch: Level[] = [], stretchProof: Record<string, unknown> = {};
const bugMix: Bug['bug'][][] = [['turn', 'step', 'loop'], ['loop', 'turn', 'step'], ['step', 'loop', 'turn']];
for (let tier = 0 as 0 | 1 | 2; tier <= 2; tier = (tier + 1) as 0 | 1 | 2) {
  const [lo, hi] = [[5, 7], [7, 10], [10, 13]][tier];
  let made = 0;
  for (let tries = 0; made < 8 && tries < 400000; tries++) {
    const rows = randomBeach(1 + rng.below(tier === 0 ? 2 : 3), 2 + rng.below(4));
    const l = level('x', 'hard', tier, rows, { stage: 'stretch' }), plan = solve(l);
    if (plan.length < lo || plan.length > hi || !castlesMatter(l, plan.length)) continue;
    const kind = bugMix[tier][made % 3], bug = plant(plan, kind);
    if (!bug || bug.starter.length > 14 || execute(debugDescriptor(l), bug.starter).won) continue;
    // The engine's own debugger must find a one-edit repair to a shortest plan.
    const hint = nextHint(debugDescriptor(l), bug.starter);
    if (!hint.edit || hint.plan.length !== plan.length) continue;
    const repaired = [...bug.starter];
    if (hint.edit.op === 'change') repaired[hint.edit.at] = hint.edit.card!;
    else if (hint.edit.op === 'insert') repaired.splice(hint.edit.at, 0, hint.edit.card!);
    else repaired.splice(hint.edit.at, 1);
    if (!execute(debugDescriptor(l), repaired).won) continue;
    const trail = execute(debugDescriptor(l), bug.starter), symptom = trail.walker.bump ? trail.cursor - 1 : bug.starter.length;
    const delay = symptom - bug.at;
    if (tier === 0 && (delay > 2 || bug.at === 0)) continue;
    if (tier === 2 && delay < 3) continue;
    if (!fresh(rows)) continue;
    const id = `bug${stretch.length + 1}`;
    stretch.push({ ...l, id, starter: bug.starter, bug: bug.bug });
    stretchProof[id] = { cards: plan.length, at: bug.at, delay, witness: plan };
    made++;
  }
}

// ---- Level 5: block loops below the flat optimum -------------------------------------------
const W = codes(commands('medium'));
const cmd = (c: number): Node => ({ kind: 'command', command: c });
const randomBody = (size: number) => { for (;;) { const b = Array.from({ length: size }, () => pick(W)); if (b.includes(4) && b.filter(c => c !== 4).length <= size - 1) return b.map(cmd); } };
/** Work backward from a loop plan: walk it on open sand, then put shells, home and castles along it. */
function loopBeach(tier: 0 | 1 | 2): Level | null {
  const body = randomBody(tier === 0 ? 2 + rng.below(3) : 2 + rng.below(4));
  let program: Node[] = [{ kind: 'repeat', times: pick([2, 3, 4]), body }];
  if (tier === 1) program = [...Array.from({ length: rng.below(3) }, () => cmd(pick(W))), ...program, ...Array.from({ length: 1 + rng.below(2) }, () => cmd(pick(W)))];
  if (tier === 2) program = [...Array.from({ length: rng.below(2) }, () => cmd(pick(W))), { kind: 'repeat', times: pick([2, 3]), body: [...randomBody(1 + rng.below(3)), { kind: 'repeat', times: pick([2, 3]), body: rng.below(2) ? [cmd(4)] : randomBody(2) }, ...(rng.below(2) ? [cmd(pick(W))] : [])] }, ...Array.from({ length: rng.below(2) }, () => cmd(pick(W)))];
  const cells = blank(), startAt = rng.below(25);
  cells[startAt] = 'C';
  const open = level('x', 'medium', tier, rowsOf(cells), { stage: 'deep', blockEditor: true });
  const route: number[] = [startAt];
  const sim = crabSim(open), trace: typeof sim = { ...sim, step: (w, c) => { const n = sim.step(w, c); if (n && n.pos !== w.pos) route.push(n.pos); return n; }, won: () => false };
  const r = runNodes(trace, sim.start, program);
  if (!r || route.length < 7 || new Set(route).size !== route.length) return null;
  const end = route.at(-1)!, inner = route.slice(1, -1);
  cells[end] = 'H';
  const shellCount = 1 + rng.below(3);
  for (const at of rng.shuffle(inner).slice(0, shellCount)) cells[at] = 'S';
  const near = [...new Set(route.flatMap(p => [p - 5, p + 5, p % 5 ? p - 1 : -1, p % 5 < 4 ? p + 1 : -1]))].filter(p => p >= 0 && p < 25 && !route.includes(p));
  for (const at of rng.shuffle(near).slice(0, 2 + rng.below(6))) cells[at] = '#';
  return level('x', 'medium', tier, rowsOf(cells), { stage: 'deep', blockEditor: true });
}
const deep: Level[] = [], deepProof: Record<string, unknown> = {};
for (let tier = 0 as 0 | 1 | 2; tier <= 2; tier = (tier + 1) as 0 | 1 | 2) {
  let made = 0;
  for (let tries = 0; made < 8 && tries < 400000; tries++) {
    const l = loopBeach(tier);
    if (!l) continue;
    const g = gradeLoops(l);
    if (g.flat === null || g.again === null || g.blocks === null || !g.witness || g.exhausted) continue;
    const slack = tier === 2 ? 0 : 1, tray = g.blocks + slack;
    if (g.flat - g.blocks < 3 || tray >= Math.min(g.flat, g.again)) continue;
    if (tier === 0 && (g.blocks > 5 || g.depth !== 1 || g.flat > 11)) continue;
    if (tier === 1 && (g.blocks < 6 || g.blocks > 7 || g.flat < 10)) continue;
    // Top rung: a Repeat inside a Repeat is needed, because no single-level plan fits the tray.
    if (tier === 2 && (g.depth !== 2 || g.blocks < 6 || g.flat < 12 || blockBest(crabSim(l), W, tray, { nest: 1 }).best !== null)) continue;
    if (!fresh(l.rows)) continue;
    const id = `loop${deep.length + 1}`, done = { ...l, id, tray };
    const kept = blockBest(crabSim(done), W, tray, { keep: 6, work: 1_500_000 });
    // Only winners the board can actually save: K7 drafts expand to at most 80 cards.
    const solutions = [g.witness, ...kept.solutions.filter(p => JSON.stringify(p.body) !== JSON.stringify(g.witness!.body))].filter(p => !!readCrabDraft(encodeProgram(p), done)).slice(0, 6) as Program[];
    if (JSON.stringify(solutions[0]) !== JSON.stringify(g.witness)) throw new Error(`Level 5 witness ${id} cannot be saved`);
    if (solutions.some(p => nodeCost(p) > tray || !runNodes(crabSim(done), crabSim(done).start, p.body)?.won)) throw new Error(`Bad Level 5 witness ${id}`);
    deep.push(done);
    deepProof[id] = { flat: g.flat, again: g.again, blocks: g.blocks, depth: g.depth, decoys: decoys(done, g.witness), solutions: solutions.map(encodeProgram) };
    made++;
  }
}
const counts = [extra.length, stretch.length, deep.length];
if (counts.join() !== '30,24,24') throw new Error(`Short bake: ${counts.join(', ')}`);
const proof = { ...stretchProof, ...deepProof };
writeFileSync(new URL('./school-content.json', import.meta.url), JSON.stringify({ version: 1, extra, stretch, deep, proof }) + '\n');
console.log(`extra ${extra.length}, Level 4 ${stretch.length}, Level 5 ${deep.length}`);
for (const l of [...stretch, ...deep]) console.log(l.id, l.tier, l.rows.join('/'), JSON.stringify(proof[l.id as keyof typeof proof]).slice(0, 160));
