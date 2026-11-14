import { expect, it } from 'vitest';
import { emptyProgram, fromFlat, nodeCost, validProgram, type Node, type Program } from '../src/learn/program/model';
import { decodeProgram, encodeProgram, sessionBytes } from '../src/learn/program/codec';
import { interpret } from '../src/learn/program/interpreter';
import { compress, solvePrograms } from '../src/learn/program/solver';
import { insertNode, main, moveNode, projectionEdits, removeNode, replaceNode } from '../src/learn/program/edit';
const c = (command: number): Node => ({ kind: 'command', command });
const program = (body: Node[], songs: Node[][] = []): Program => ({ version: 1, body, songs });
const machine = { step: (n: number, code: number) => n + code, blocked: (n: number) => n % 2 === 0 };
const freeze = <T>(value: T): T => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };

it('K7 traces nested repeats, songs, sequences and the chosen condition against current state', () => {
  const p = program([{ kind: 'repeat', times: 2, body: [{ kind: 'call', song: 0 }, { kind: 'if', yes: [c(4)], no: [c(2)] }] }], [[{ kind: 'sequence', body: [c(1)] }]]);
  const result = interpret(freeze(p), 0, machine)!;
  expect(result.state).toBe(8);
  expect(result.frames.map(f => [f.command, f.path, f.iteration])).toEqual([[1, 'song0.0.body.0', [0]], [2, 'main.0.body.1.no.0', [0]], [1, 'song0.0.body.0', [1]], [4, 'main.0.body.1.yes.0', [1]]]);
  expect(nodeCost(p)).toBe(8);
  expect(decodeProgram(encodeProgram(p))).toEqual(p);
});

it('K7 counts every definition and branch and caps effective call depth and work, even if unreachable', () => {
  expect(validProgram(fromFlat(Array(80).fill(0)))).toBe(true);
  expect(validProgram(fromFlat(Array(81).fill(0)))).toBe(false);
  expect(validProgram(program([], [Array(80).fill(c(0))]))).toBe(false);
  const nest = (depth: number): Node => depth ? { kind: 'repeat', times: 2, body: [nest(depth - 1)] } : c(1);
  expect(validProgram(program([nest(3)]))).toBe(true);
  expect(validProgram(program([nest(4)]))).toBe(false);
  const max = program([{ kind: 'repeat', times: 16, body: [{ kind: 'repeat', times: 16, body: [c(1), c(2)] }] }]);
  expect(interpret(max, 0, machine)?.frames).toHaveLength(512);
  expect(validProgram(program([...max.body, c(1)]))).toBe(false);
  expect(validProgram(program([], [[{ kind: 'call', song: 0 }]]))).toBe(false);
  expect(validProgram(program([], [[{ kind: 'call', song: 1 }], [{ kind: 'call', song: 0 }]]))).toBe(false);
  expect(validProgram(program([{ kind: 'call', song: 0 }], [[{ kind: 'call', song: 1 }], [{ kind: 'call', song: 2 }], [{ kind: 'repeat', times: 2, body: [c(1)] }]]))).toBe(false);
});

it('K7 rejects malformed, sparse, cyclic, aliased-schema and forged command encodings', () => {
  const cyclic: unknown[] = []; cyclic.push([2, 2, cyclic]);
  for (const raw of [null, {}, [2, [], []], [1, [[0, 256]], []], [1, [[2, 1, []]], []], [1, [[2, 2.5, []]], []], [1, [[0, 1, 4]], []], [1, [[3, 0]], []], [1, Array(3), []], [1, cyclic, []], [1, [[4, [], [[0, -1]]]], []]]) expect(decodeProgram(raw)).toBeNull();
  const bad = program([c(0)]); (bad.body[0] as unknown as Record<string, unknown>).extra = true;
  expect(validProgram(bad)).toBe(false);
  expect(decodeProgram([1, [[0, 4]], []], code => code < 4)).toBeNull();
  const tree = program([]); tree.body.push({ kind: 'repeat', times: 2, body: tree.body }); expect(validProgram(tree)).toBe(false);
});

it('K7 conversion and every edit preserve frozen originals; moves cannot contain themselves', () => {
  const original = freeze([1, 2, 1, 2]), p = freeze(fromFlat(original)), snapshot = JSON.stringify(p);
  const repeat: Node = { kind: 'repeat', times: 2, body: [] };
  const added = insertNode(p, main, 1, repeat)!;
  const moved = moveNode(added, main, 0, { song: null, path: [1, 'body'] }, 0)!;
  expect(moved.body[0]).toEqual({ kind: 'repeat', times: 2, body: [c(1)] });
  expect(moveNode(added, main, 1, { song: null, path: [1, 'body'] }, 0)).toBeNull();
  expect(replaceNode(p, main, 0, c(3))?.body[0]).toEqual(c(3));
  expect(removeNode(p, main, 0)?.body).toHaveLength(3);
  expect(JSON.stringify(p)).toBe(snapshot); expect(original).toEqual([1, 2, 1, 2]);
  const large = encodeProgram(fromFlat(Array(80).fill(255)));
  expect(sessionBytes({ wrapper: 'x'.repeat(700), blockDraft: large })).toBeLessThan(4096);
});

it('K7 bounded solver verifies witnesses on the same machine, costs every block and reports exhaustion', () => {
  const p = compress([1, 2, 1, 2, 1, 2])!;
  expect(nodeCost(p)).toBe(3); expect(interpret(p, 0, machine)?.state).toBe(9);
  const finish = <T>(work: Generator<void, T>) => { let r = work.next(); while (!r.done) r = work.next(); return r.value; };
  expect(finish(solvePrograms([emptyProgram(), p], 0, machine, n => n === 9))).toEqual({ status: 'solved', program: p, cost: 3 });
  expect(finish(solvePrograms([p], 0, machine, () => false, 0))).toEqual({ status: 'budget-exhausted' });
  expect(finish(solvePrograms([p], 0, machine, () => false))).toEqual({ status: 'unsolved' });
});

it('K7 whole-draft replay edits cannot hide several card repairs inside one action', () => {
  expect(projectionEdits(['left', 'up'], ['right', 'down'])).toBe(2);
  expect(projectionEdits(['left'], ['right'])).toBe(1);
  expect(projectionEdits(['right'], ['right'])).toBe(1);
});
