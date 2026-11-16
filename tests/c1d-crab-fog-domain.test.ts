import { describe, expect, it, vi } from 'vitest';
import deepWater from '../src/learn/games/crab-commands/deep-content.json';
import { challengeEngine, type Descriptor, type State } from '../src/learn/games/crab-commands/challenge-engine';
import { decodeProgram, type PackedProgram } from '../src/learn/program/codec';
import { nodeCost, validProgram, type Node, type Program } from '../src/learn/program/model';
import { programOperations } from '../src/learn/program/operations';
vi.mock('../src/challenge/registry.generated', () => ({ challengeEntries: [] }));

/** An independent enumeration, ported from the round-2 reviewer's raw-grid solver (review2-fog.py). It imports none of the
 * app's search, proof or bake code: every program of up to five blocks the editor can build (Walk, Turn left, Turn right,
 * Repeat at 2/3/4/6/8 with a non-empty body, If blocked with either branch empty or not), run on each raw grid. */
type P = readonly [0, number] | readonly [2, number, Body] | readonly [4, Body, Body];
type Body = readonly P[];
const COUNTS = [2, 3, 4, 6, 8];
const listsOf: Body[][] = [[[]]], nodesOf: P[][] = [[]];
for (let cost = 1; cost <= 5; cost++) {
  const nodes: P[] = cost === 1 ? [[0, 4], [0, 5], [0, 6]] : [];
  if (cost > 1) {
    for (const body of listsOf[cost - 1]) for (const n of COUNTS) nodes.push([2, n, body]);
    for (let y = 0; y < cost; y++) for (const a of listsOf[y]) for (const b of listsOf[cost - 1 - y]) nodes.push([4, a, b]);
  }
  nodesOf.push(nodes);
  const lists: Body[] = [];
  for (let k = 1; k <= cost; k++) for (const n of nodesOf[k]) for (const tail of listsOf[cost - k]) lists.push([n, ...tail]);
  listsOf.push(lists);
}
const programs = listsOf.slice(1).flatMap((lists, i) => lists.map(body => ({ body, cost: i + 1 })));
function machine(rows: string[], facing: number) {
  const cells = rows.join(''), shells = new Map([...cells].flatMap((c, i) => (c === 'S' ? [i] : [])).map((p, i) => [p, 1 << i])), all = (1 << shells.size) - 1;
  type S = readonly [number, number, number] | null;
  const done = (s: S) => !!s && cells[s[0]] === 'H' && s[2] === all;
  const move = (s: S, c: number): S => {
    if (!s || done(s)) return s;
    const [p, d, m] = s;
    if (c === 5 || c === 6) return [p, (d + (c === 5 ? 3 : 1)) % 4, m];
    const x = (p % 5) + [0, 1, 0, -1][d], y = Math.floor(p / 5) + [-1, 0, 1, 0][d];
    if (x < 0 || x > 4 || y < 0 || y > 4 || cells[y * 5 + x] === '#') return null;
    return [y * 5 + x, d, m | (shells.get(y * 5 + x) ?? 0)];
  };
  const run = (body: Body, s: S): S => {
    for (const n of body) {
      if (!s || done(s)) break;
      if (n[0] === 0) s = move(s, n[1]);
      else if (n[0] === 2) for (let i = 0; i < n[1] && s && !done(s); i++) s = run(n[2], s);
      else s = run(move(s, 4) === null ? n[1] : n[2], s);
    }
    return s;
  };
  const start: S = [cells.indexOf('C'), facing, 0];
  return (body: Body) => done(run(body, start));
}
const toNodes = (body: Body): Node[] => body.map(n => n[0] === 0 ? { kind: 'command', command: n[1] } : n[0] === 2 ? { kind: 'repeat', times: n[1], body: toNodes(n[2]) } : { kind: 'if', condition: { kind: 'blocked' }, yes: toNodes(n[1]), no: toNodes(n[2]) });
const toProgram = (body: Body): Program => ({ version: 1, body: toNodes(body), songs: [] });
const empty: Program = { version: 1, body: [], songs: [] };
/** The real Challenge engine: the plan goes in as one editor edit (with the descriptor's admission), then Go. A program the
 * K7 model rejects (too deeply nested, say) cannot be built in the editor, so it cannot win. */
function appWins(d: Descriptor, program: Program) {
  if (!validProgram(program)) return false;
  const s0: State = challengeEngine.create(d, { version: 1 }, { supportOff: false, ownRead: false });
  const edited = challengeEngine.step(s0, ['e', programOperations(empty, program)], d);
  return !!edited && !!challengeEngine.step(edited.state, ['g'], d)?.state.won;
}
const ifInRepeat = (nodes: Node[], inside = false): boolean => nodes.some(n => n.kind === 'if' ? inside || ifInRepeat([...n.yes, ...n.no], inside) : n.kind === 'repeat' ? ifInRepeat(n.body, true) : false);

type Entry = { role: string; descriptor: Descriptor; witness: PackedProgram };
const fog = (deepWater as unknown as { fog: Entry[] }).fog;
const rungs = fog.map(e => {
  const d = e.descriptor, beaches = [d.level.rows, ...d.fog!.map(f => f.rows)].map(rows => machine(rows, d.level.facing));
  const grid = programs.filter(p => beaches.every(won => won(p.body)));
  const app = grid.filter(p => appWins(d, toProgram(p.body)));
  const least = Math.min(...app.map(p => p.cost));
  return { e, d, grid, app, least, tray: d.tray! };
});

describe('C1d fix round 2 P2-2b: Foggy beach rises by program, checked by exhaustive enumeration in the palette domain', () => {
  it('enumerates the whole domain: 77,736 five-block programs, the reviewer\'s independent count', () => {
    expect(listsOf[1].length).toBe(3);
    expect(listsOf[2].length).toBe(30);
    expect(listsOf[5].length).toBe(77736);
  });
  it('fewest blocks, measured in the domain a child can build: 4 / 5 / 5 / 5 / 4, and the witness is one of them', () => {
    expect(rungs.map(r => r.least)).toEqual([4, 5, 5, 5, 4]);
    for (const r of rungs) {
      const witness = decodeProgram(r.e.witness)!;
      expect(nodeCost(witness), r.e.role).toBe(r.least);
      expect(appWins(r.d, witness), r.e.role).toBe(true);
    }
  });
  it('no spare block on the three hard rungs (Tight tray included); one spare on teach and the easy finish', () => {
    expect(rungs.map(r => r.tray - r.least)).toEqual([1, 0, 0, 0, 1]);
    expect(fog[3].descriptor.lesson).toMatch(/no spare block/);
  });
  it('each hard rung is won by no fewest-block winner of an earlier rung (grid winners, the stricter set)', () => {
    for (const k of [1, 2, 3]) for (let j = 0; j < k; j++) {
      const earlier = new Set(rungs[j].grid.filter(p => p.cost <= rungs[j].least).map(p => JSON.stringify(p.body)));
      const shared = rungs[k].grid.filter(p => earlier.has(JSON.stringify(p.body)));
      expect(shared.map(p => JSON.stringify(toProgram(p.body).body)), `${rungs[k].e.role} won by a shortest ${rungs[j].e.role} plan`).toEqual([]);
    }
  });
  it('Tight tray really changes the program: no Develop or Twist winner, and no shortest Teach plan, wins it', () => {
    const tight = new Set(rungs[3].grid.map(p => JSON.stringify(p.body)));
    for (const j of [1, 2]) expect(rungs[j].grid.filter(p => p.cost <= rungs[j].tray && tight.has(JSON.stringify(p.body))), rungs[j].e.role).toEqual([]);
    expect(rungs[0].grid.filter(p => p.cost === rungs[0].least && tight.has(JSON.stringify(p.body)))).toEqual([]);
    expect(fog[3].descriptor.lesson).toMatch(/shortest plans from the last beaches will not work here/);
  });
  it('the reviewer\'s shared program no longer wins two hard rungs', () => {
    const shared: Program = { version: 1, body: [{ kind: 'command', command: 6 }, { kind: 'repeat', times: 8, body: [{ kind: 'if', condition: { kind: 'blocked' }, yes: [{ kind: 'command', command: 5 }], no: [] }, { kind: 'command', command: 4 }] }], songs: [] };
    expect([1, 2, 3].filter(k => appWins(rungs[k].d, shared)).length).toBeLessThanOrEqual(1);
  });
  it('every winner within each tray uses If blocked inside a Repeat, as the teaching lesson says', () => {
    for (const r of rungs) expect(r.app.filter(p => p.cost <= r.tray).every(p => ifInRepeat(toProgram(p.body).body)), r.e.role).toBe(true);
  });
  it('the app wins nothing the enumeration misses: a sample of grid losers also lose on the engine', () => {
    for (const r of rungs) {
      const winners = new Set(r.grid.map(p => p.body));
      const losers = programs.filter((p, i) => i % 97 === 0 && !winners.has(p.body));
      expect(losers.length).toBeGreaterThan(500);
      expect(losers.filter(p => appWins(r.d, toProgram(p.body))).map(p => JSON.stringify(p.body)), r.e.role).toEqual([]);
    }
  });
});
