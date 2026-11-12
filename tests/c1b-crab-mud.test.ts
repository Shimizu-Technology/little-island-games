import { describe, expect, it } from 'vitest';
import content from '../src/learn/games/crab-commands/challenge-content.json';
import legacyMud2 from '../src/learn/games/crab-commands/legacy-mud-2.json';
import catalog from '../src/state/save-catalog.json';
import { crabPuzzles } from '../src/learn/games/crab-commands/challenge-content';
import { cardCodes, execute, type Descriptor } from '../src/learn/games/crab-commands/challenge-engine';
import type { Command } from '../src/learn/games/crab-commands/engine';
import { registration } from '../src/challenge/registrations/crab-commands';
import { emptyChallenge, validChallengeSession } from '../src/state/challenge';
import { sha256Hex } from '../src/puzzles/sha256';

/** Independent of the app's engine and solver: Walk / Turn left / Turn right on the 5×5 rows,
 * sand costs 1, mud 2, turns 0; a sandcastle or the edge stops the plan; the plan ends on
 * reaching home with every shell. Breadth first by cards, keeping every walking cost. */
type Rows = readonly string[];
function independent(rows: Rows, budget: number | null) {
  const cells = rows.join(''), shells = [...cells].flatMap((c, i) => (c === 'S' ? [i] : [])), all = (1 << shells.length) - 1;
  let layer = new Map<string, { pos: number; facing: number; mask: number; cost: number }>([[`${cells.indexOf('C')}/1/0/0`, { pos: cells.indexOf('C'), facing: 1, mask: 0, cost: 0 }]]);
  for (let cards = 1; cards <= 30; cards++) {
    const next = new Map<string, { pos: number; facing: number; mask: number; cost: number }>(), goals: number[] = [];
    for (const s of layer.values()) for (const card of ['forward', 'turn-left', 'turn-right']) {
      let { pos, facing, mask, cost } = s;
      if (card === 'turn-left') facing = (facing + 3) % 4;
      else if (card === 'turn-right') facing = (facing + 1) % 4;
      else {
        const x = (pos % 5) + [0, 1, 0, -1][facing], y = Math.floor(pos / 5) + [-1, 0, 1, 0][facing];
        if (x < 0 || x > 4 || y < 0 || y > 4 || cells[y * 5 + x] === '#') continue;
        pos = y * 5 + x;cost += cells[pos] === 'm' ? 2 : 1;
        if (shells.includes(pos)) mask |= 1 << shells.indexOf(pos);
      }
      if (budget !== null && cost > budget) continue;
      if (cells[pos] === 'H' && mask === all) { goals.push(cost); continue; }
      next.set(`${pos}/${facing}/${mask}/${cost}`, { pos, facing, mask, cost });
    }
    if (goals.length) return { cards, cheapestAtFewestCards: Math.min(...goals) };
    layer = next;
  }
  return null;
}
/** Cheapest walking cost of any route (Dijkstra on squares; turns are free). */
function cheapest(rows: Rows) {
  const cells = rows.join(''), shells = [...cells].flatMap((c, i) => (c === 'S' ? [i] : [])), all = (1 << shells.length) - 1;
  const queue = [{ pos: cells.indexOf('C'), mask: 0, cost: 0 }], seen = new Set<string>();
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);const s = queue.shift()!, k = `${s.pos}/${s.mask}`;
    if (seen.has(k)) continue;seen.add(k);
    if (cells[s.pos] === 'H' && s.mask === all) return s.cost;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = (s.pos % 5) + dx, y = Math.floor(s.pos / 5) + dy, pos = y * 5 + x;
      if (x < 0 || x > 4 || y < 0 || y > 4 || cells[pos] === '#') continue;
      queue.push({ pos, mask: s.mask | (shells.includes(pos) ? 1 << shells.indexOf(pos) : 0), cost: s.cost + (cells[pos] === 'm' ? 2 : 1) });
    }
  }
  return null;
}
const mud = content.mud;
const active = (title: string) => crabPuzzles.find((p) => p.title.startsWith(title) && !p.retired)!;

describe('C1b Mud pacing (REVIEW-3 P3-1)', () => {
  it('Mud 3 stays a Tide 2 development: fewer cards than Mud 5 and Mud 6, and no more than Mud 2', () => {
    const cards = mud.map((p) => independent(p.descriptor.level.rows, p.descriptor.budget)!.cards);
    expect(active('Mud 3').tier).toBe(2);
    expect(cards[2]).toBeLessThan(cards[4]);expect(cards[2]).toBeLessThan(cards[5]);
    expect(cards[2]).toBeLessThanOrEqual(cards[1]);
  });

  it('independent proofs: every Mud puzzle\'s certified fewest cards and cheapest walk match a separate search', () => {
    for (const p of mud) {
      const d = p.descriptor, proof = independent(d.level.rows, d.budget)!;
      expect(proof.cards, d.level.id).toBe(p.cards);
      expect(cheapest(d.level.rows), d.level.id).toBe(p.minimumSteps);
      expect(p.minimumSteps, d.level.id).toBeLessThanOrEqual(d.budget!);
      expect(execute(d as Descriptor, p.witness as Command[])).toMatchObject({ won: true, cost: p.steps });
    }
  });

  it('new Mud 3: 8 cards within an exact 5-step budget, while the 7-card muddy plan costs 7', () => {
    const d = mud[2].descriptor;
    expect(d.level.rows).toEqual(['C.S##', 'Hmm##', '#####', '#####', '#####']);
    expect(d.budget).toBe(5);expect(cheapest(d.level.rows)).toBe(5);
    expect(independent(d.level.rows, 5)!.cards).toBe(8);
    expect(independent(d.level.rows, null)).toEqual({ cards: 7, cheapestAtFewestCards: 7 });
    const muddy: Command[] = ['forward', 'forward', 'turn-right', 'forward', 'turn-right', 'forward', 'forward'];
    expect(execute({ ...d, budget: null } as Descriptor, muddy)).toMatchObject({ won: true, cost: 7 });
    expect(execute(d as Descriptor, muddy).won).toBe(false);
    expect(d.lesson).toBe('The shell sits in a little pocket. Visit it, then find a dry way home.');
  });

  it('new Mud 6: the lesson asks a question and leaves the card-for-steps trade to discover; its numbers are true', () => {
    const d = mud[5].descriptor;
    expect(d.lesson).toBe('The plan with the fewest cards costs 9 steps. You have 8. Can you find another way to the shell and home?');
    expect(d.lesson.endsWith('?')).toBe(true);
    expect(d.lesson).not.toMatch(/extra card|avoid|muddy step/i);
    // "The plan with the fewest cards costs 9 steps. You have 8." checked independently: every
    // fewest-card plan costs at least 9, so the budget really does need another way.
    expect(independent(d.level.rows, null)!.cheapestAtFewestCards).toBe(9);
    expect(d.budget).toBe(8);
    expect(independent(d.level.rows, 8)!.cards).toBe(independent(d.level.rows, null)!.cards + 1);
    // Only the lesson changed from the C1 entry.
    expect({ ...d, lesson: '' }).toEqual({ ...legacyMud2[1].descriptor, lesson: '' });
  });
});

describe('C1b Mud catalog: append-only, earlier entries retired', () => {
  const banks = (catalog as { banks: { slot: number; entries?: { ordinal: number; hash: string }[] }[] }).banks;
  it('new Mud 3 and Mud 6 live in bank 11; bank 10 (C1) and bank 9 (pre-fix) stay resolvable but retired', () => {
    expect(active('Mud 3').ref).toMatchObject({ bank: 11, puzzle: 0 });expect(active('Mud 6').ref).toMatchObject({ bank: 11, puzzle: 1 });
    for (const [bank, puzzle] of [[9, 2], [9, 5], [10, 0], [10, 1]]) {
      const p = crabPuzzles.find((p) => p.ref.bank === bank && p.ref.puzzle === puzzle)!;
      expect(p.retired, `${bank}/${puzzle}`).toBe(true);
      expect(banks.find((b) => b.slot === bank)!.entries!.find((e) => e.ordinal === bank * 1024 + puzzle)!.hash).toBe(p.ref.hash);
      expect(p.ref.hash).toBe(sha256Hex(JSON.stringify(p.descriptor)));
    }
    for (const [j, p] of legacyMud2.entries()) {
      const retired = crabPuzzles.find((q) => q.ref.bank === 10 && q.ref.puzzle === j)!;
      expect(retired.descriptor).toEqual(p.descriptor);
      expect(retired.par).toEqual({ metric: 'steps', lower: p.minimumSteps, upper: p.minimumSteps });
    }
    for (const p of crabPuzzles.filter((p) => p.ref.bank === 11)) expect(banks.find((b) => b.slot === 11)!.entries!.find((e) => e.ordinal === 11 * 1024 + p.ref.puzzle)!.hash).toBe(p.ref.hash);
    // New selection sees exactly one card per Mud title.
    const titles = crabPuzzles.filter((p) => !p.retired && p.title.startsWith('Mud')).map((p) => p.title.split(' · ')[0]);
    expect(titles.sort()).toEqual(['Mud 1 of 7', 'Mud 2 of 7', 'Mud 3 of 7', 'Mud 4 of 7', 'Mud 5 of 7', 'Mud 6 of 7', 'Mud 7 of 7']);
  });

  it('an attempt paused on the C1 Mud 3 (bank 10) still loads and finishes with its own board and budget', () => {
    const old = crabPuzzles.find((p) => p.ref.bank === 10 && p.ref.puzzle === 0)!, witness = legacyMud2[0].witness as Command[];
    const options = { supportOff: false, ownRead: false };
    let s = registration.start(old.ref, 'a', 'c1-mud3', emptyChallenge(), options, []);
    for (const c of witness.slice(0, 3)) s = registration.move(s, ['a', cardCodes.indexOf(c)])!;
    const saved = JSON.stringify(s), restored = JSON.parse(saved);
    expect(validChallengeSession(restored, 'a', registration.catalog)).toBe(true);
    let next = restored;
    for (const c of witness.slice(3)) next = registration.move(next, ['a', cardCodes.indexOf(c)])!;
    next = registration.move(next, ['g'])!;
    expect(next.result?.event).toBe('independent');
    expect(JSON.stringify(restored)).toBe(saved);
  });
});
