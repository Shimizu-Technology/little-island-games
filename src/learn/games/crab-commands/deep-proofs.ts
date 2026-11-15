import { commands, solve, step, walkerKey, type Command, type Level } from './engine';
import { advanceWorld, execute, fogLevels, startWorld, worldWon, type Descriptor, type World } from './challenge-engine';
import { programCodes } from './program';
import type { Sim } from './search';
import { crabSim } from './proofs';

/** The whole beach as one machine: one crab, two crabs moving together, or every foggy beach in lockstep.
 * A foggy beach that is already home stops there while the others keep walking. */
export function worldSim(d: Descriptor): Sim<World> {
  if (d.fog) {
    const beaches = fogLevels(d).map(crabSim);
    return {
      start: beaches.map(b => b.start),
      step: (world, c) => { const next: World = []; for (let i = 0; i < world.length; i++) { if (beaches[i].won(world[i])) { next.push(world[i]); continue; } const n = beaches[i].step(world[i], c); if (!n) return null; next.push(n); } return next; },
      won: world => world.every((w, i) => beaches[i].won(w)),
      key: world => world.map(walkerKey).join('|'),
    };
  }
  return {
    start: startWorld(d),
    step: (world, c) => { if (d.budget !== null) return null; const n = advanceWorld(d, world, programCodes[c]); return n.bump ? null : n.world; },
    won: world => worldWon(d, world),
    key: world => world.map(walkerKey).join('|'),
  };
}
/** What a dumb player sees: gates as walls, keys and low sand as plain sand. */
const naive = (l: Level): Level => ({ ...l, tide: undefined, rows: l.rows.map(r => r.replace(/G/g, '#').replace(/[K~]/g, '.')) });
/** Walk to the nearest next goal (a shell, then home) on that naive map, again and again. Flat cards only, no
 * loops, songs or conditions. Two crabs: bring the first crab home, then the second. Fog: plan on the first beach. */
export function greedyBot(d: Descriptor): { won: boolean; cards: number } {
  const plan: Command[] = [];
  const goal = (l: Level, from: { pos: number; facing: number; shells: number }): Command[] | null => {
    const cells = l.rows.join(''), want = cells.split('').filter(c => c === 'S').length;
    const queue = [{ w: { ...from, previous: null as Command | null, bump: false }, path: [] as Command[] }], seen = new Set<string>();
    for (let i = 0; i < queue.length && i < 20000; i++) {
      const { w, path } = queue[i];
      const count = (n: number) => n.toString(2).split('1').length - 1;
      if (path.length && (count(w.shells) > count(from.shells) || (count(w.shells) === want && cells[w.pos] === 'H'))) return path;
      for (const c of commands(l.pace)) { const n = step(l, w, c); if (n.bump) continue; const k = walkerKey(n); if (seen.has(k)) continue; seen.add(k); queue.push({ w: n, path: [...path, c] }); }
    }
    return null;
  };
  if (d.crabs === 2) {
    for (let crab = 0; crab < 2; crab++) {
      const now = execute(d, plan).walkers, cells = d.level.rows.join('').split('').map(c => (c === 'C' ? '.' : c));
      if (crab === 1 && cells[now[0].pos] === 'H') cells[now[0].pos] = '#';
      cells[now[crab].pos] = 'C';
      plan.push(...solve({ ...d.level, rows: [0, 1, 2, 3, 4].map(r => cells.slice(r * 5, r * 5 + 5).join('')) }));
    }
    return { won: execute(d, plan).won && (d.tray === undefined || plan.length <= d.tray), cards: plan.length };
  }
  const level = naive(d.level);
  for (let guard = 0; guard < 12 && plan.length < 80; guard++) {
    const real = execute({ ...d, fog: undefined }, plan);
    if (real.won || real.walker.bump || real.cursor < plan.length) break;
    const path = goal(level, real.walker);
    if (!path) break;
    plan.push(...path);
  }
  const won = (d.fog ? fogLevels(d) : [d.level]).every(level => execute({ ...d, fog: undefined, level }, plan).won);
  return { won: won && (d.tray === undefined || plan.length <= d.tray), cards: plan.length };
}
