import { expect, it } from 'vitest';
import { levels, run, solve, start, type Command, type Level, type Walker } from '../src/learn/games/crab-commands/engine';
import { crabProgram, projectCrab } from '../src/learn/games/crab-commands/program';
import { bank, makePuzzle, type Arrow, type Puzzle } from '../src/learn/games/beep-bot/engine';
import { execution as beepExecution } from '../src/learn/games/beep-bot/movement';
import { beepProgram, projectBeep } from '../src/learn/games/beep-bot/program';
import { draw, solves, task, type Block, type Segment } from '../src/learn/games/turtle-draw/engine';
import { turtleProgram, turtleBlocks } from '../src/learn/games/turtle-draw/program';

// Independent reference implementations pinned to ee00725b semantics. These do not call K7.
function oldCrab(l: Level, w: Walker, c: Command): Walker {
  if (w.bump) return w;
  if (c === 'repeat') return !w.previous || w.previous === 'repeat' ? { ...w, bump: true } : oldCrab(l, oldCrab(l, w, w.previous), w.previous);
  if (c === 'turn-left' || c === 'turn-right') return { ...w, facing: (w.facing + (c === 'turn-left' ? 3 : 1)) % 4, previous: c };
  const dir = c === 'forward' ? w.facing : ['up', 'right', 'down', 'left'].indexOf(c), x = w.pos % 5 + [0, 1, 0, -1][dir], y = Math.floor(w.pos / 5) + [-1, 0, 1, 0][dir];
  if (x < 0 || x > 4 || y < 0 || y > 4 || l.rows[y][x] === '#') return { ...w, previous: c, bump: true };
  const pos = y * 5 + x, shells = [...l.rows.join('')].flatMap((v, i) => v === 'S' ? [i] : []), at = shells.indexOf(pos);
  return { pos, facing: dir, shells: w.shells | (at < 0 ? 0 : 1 << at), previous: c, bump: false };
}
function oldBeep(p: Puzzle, plan: Arrow[]) {
  let pos = p.start, previous: Arrow | null = null; const path = [pos];
  for (let i = 0; i < plan.length; i++) {
    const card = plan[i], move: Arrow | null = card.startsWith('repeat') ? previous : card, count = card.startsWith('repeat') ? Number(card.slice(-1)) - 1 : 1;
    if (!move) return { path: [...path, -1], pos, failedCard: i };
    for (let j = 0; j < count; j++) { const dir = ['up', 'right', 'down', 'left'].indexOf(move), x = pos % 5 + [0, 1, 0, -1][dir], y = Math.floor(pos / 5) + [-1, 0, 1, 0][dir]; if (x < 0 || x > 4 || y < 0 || y > 4 || p.rocks.includes(y * 5 + x)) return { path: [...path, -1], pos, failedCard: i }; pos = y * 5 + x; }
    path.push(pos); if (!card.startsWith('repeat')) previous = card;
  }
  return { path, pos, failedCard: null };
}
function oldDraw(blocks: Block[]): Segment[] {
  const flat = (body: Block[]): Exclude<Block, { kind: 'repeat' }>[] => body.flatMap(b => b.kind === 'repeat' ? Array.from({ length: b.times }, () => flat(b.body)).flat() : [b]);
  let x = 100, y = 80, angle = 0, color = 'teal'; const out: Segment[] = [];
  for (const b of flat(blocks)) { if (b.kind === 'turn') angle = (angle + b.angle) % 360; else if (b.kind === 'color') color = b.color; else if (b.kind === 'forward') { const nx = Math.round((x + Math.cos(angle * Math.PI / 180) * b.n) * 100) / 100, ny = Math.round((y + Math.sin(angle * Math.PI / 180) * b.n) * 100) / 100; out.push({ from: { x, y }, to: { x: nx, y: ny }, color }); x = nx; y = ny; } }
  return out;
}

it('K7 preserves every existing Crab beach and every witness prefix, including Again and bumps', () => {
  for (const l of levels) {
    const witness = solve(l);
    for (const plan of [witness, ['repeat'] as Command[], [...witness, 'turn-left', 'forward'] as Command[]]) for (let n = 0; n <= plan.length; n++) {
      const prefix = plan.slice(0, n), expected = prefix.reduce((w, c) => oldCrab(l, w, c), start(l));
      expect(run(l, prefix), `${l.id}/${n}`).toEqual(expected);
      expect(projectCrab(crabProgram(prefix), l)?.state).toEqual(expected);
    }
  }
});

it('K7 preserves every Beep bank map and winning puzzle plus failures and repeat2/repeat3 meanings', () => {
  for (let level = 1; level <= 5; level++) for (let i = 0; i < bank[level - 1].length; i++) {
    const p = makePuzzle(level, i);
    for (const plan of [...bank[level - 1][i].proof.winners, ['repeat2'] as Arrow[], ['right', 'repeat2', 'repeat3', 'up'] as Arrow[], ['left', 'down', 'up'] as Arrow[]]) {
      const expected = oldBeep(p, plan);
      expect(beepExecution(p, plan)).toEqual(expected);
      const shared = projectBeep(beepProgram(plan), p)!;
      expect(shared.state.pos).toBe(expected.pos); expect(shared.plan).toEqual(plan);
    }
  }
});

it('K7 preserves every existing Turtle template (all 10000 seeds per level), loop rules and drawings', () => {
  for (let level = 1; level <= 5; level++) for (let seed = 0; seed < 10000; seed++) {
    const t = task(level, seed), expected = oldDraw(t.target);
    expect(draw(t.target)).toEqual(expected);
    expect(turtleBlocks(turtleProgram(t.target))).toEqual(t.target);
    expect(solves(t, t.target)).toBe(true);
  }
});
