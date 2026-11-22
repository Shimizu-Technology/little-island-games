import { describe, expect, it } from 'vitest';
import deepContent from '../src/learn/games/turtle-draw/deep-content.json';
import { draw, flatten, solves, validBlock, type Block } from '../src/learn/games/turtle-draw/engine';
import { blockCost, blockDepth, flatCost, formatBlocks, parseBlocks } from '../src/learn/games/turtle-draw/dsl';
import { CANVAS, closes, fits, geometryKey, samePicture } from '../src/learn/games/turtle-draw/picture';
import { DEEP_COUNTS, minimumPrograms, SCHOOL_COUNTS, verifyMinimum } from '../src/learn/games/turtle-draw/mincost';
import { generateSchool } from '../src/learn/games/turtle-draw/generate';
import { DEEP_LENGTHS, DEEP_TURNS, generateDeep, STEPS, type DeepBuild, type DeepPredict } from '../src/learn/games/turtle-draw/deep';
import { LEVEL_TASKS, roundTemplates, schoolTemplates, templateTask, type Template } from '../src/learn/games/turtle-draw/templates';
import { align, applyEdit, editText, nearestEdit } from '../src/learn/games/turtle-draw/distance';

const must = (text: string): Block[] => { const b = parseBlocks(text); if (!b) throw new Error(text); return b; };
const build = deepContent.build as unknown as DeepBuild[][], predict = deepContent.predict as unknown as DeepPredict[][];
const school = schoolTemplates;
const everyLines = () => [
  ...school.flatMap((rows, i) => rows.map(t => draw(must(t.blocks), { x: t.origin[0], y: t.origin[1] })!)),
  ...build.flat().map(p => draw(must(p.target), { x: p.origin[0], y: p.origin[1] })!),
  ...predict.flat().map(p => draw(must(p.program), { x: p.origin[0], y: p.origin[1] })!),
];
const share = (rows: readonly { family: string }[]) => { const n: Record<string, number> = {}; for (const r of rows) n[r.family] = (n[r.family] ?? 0) + 1; return Math.max(...Object.values(n)) / rows.length; };
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('BK-22 certified supply: 320 pictures, every one proved by draw', () => {
  it('ships 40 School pictures per level and 120 Deep Water pictures: 320 in all', () => {
    expect(school.map(l => l.length)).toEqual([40, 40, 40, 40, 40]);
    expect(build.map(b => b.length)).toEqual([12, 12, 12, 12, 12]);
    expect(predict.map(b => b.length)).toEqual([12, 12, 12, 12, 12]);
    expect(school.flat().length + build.flat().length + predict.flat().length).toBe(320);
  });
  it('is exactly what the bake proves today (no hand edits to the JSON)', () => {
    const baked = generateSchool(), deep = generateDeep(baked.lines);
    expect(JSON.parse(JSON.stringify(baked.levels))).toEqual(school);
    expect(JSON.parse(JSON.stringify(deep.steps.map(s => s.build)))).toEqual(build);
    expect(JSON.parse(JSON.stringify(deep.steps.map(s => s.predict)))).toEqual(predict);
  });
  it('closes cleanly and fits the canvas without clipping: every Level 2–5 and Deep Water picture', () => {
    const open: string[] = [];
    school.forEach((rows, i) => rows.forEach(t => {
      const lines = draw(must(t.blocks), { x: t.origin[0], y: t.origin[1] })!;
      expect(fits(lines), `${t.blocks} must fit`).toBe(true);
      if (i === 0) { open.push(t.blocks); expect(closes(lines), `${t.blocks} is a deliberate open line`).toBe(false); }
      else expect(closes(lines), `${t.blocks} must close`).toBe(true);
    }));
    expect(open.length).toBe(40);
    for (const row of [...build.flat(), ...predict.flat()]) {
      const blocks = must(row.kind === 'build' ? row.target : row.program), lines = draw(blocks, { x: row.origin[0], y: row.origin[1] })!;
      expect(fits(lines), formatBlocks(blocks)).toBe(true);
      expect(closes(lines), formatBlocks(blocks)).toBe(true);
      const xs = lines.flatMap(l => [l.from.x, l.to.x]), ys = lines.flatMap(l => [l.from.y, l.to.y]);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(CANVAS.left); expect(Math.max(...ys)).toBeLessThanOrEqual(CANVAS.bottom);
    }
  });
  it('every picture is new to all 320: distinct hashes and no two drawings alike', () => {
    const hashes = [...school.flat().map(t => t.hash), ...build.flat().map(p => p.hash), ...predict.flat().map(p => p.hash)];
    expect(new Set(hashes).size).toBe(320);
    const all = everyLines(), keys = all.map(geometryKey);
    expect(new Set(keys).size).toBe(320);
    const byCount = new Map<number, number[]>();
    all.forEach((lines, i) => { const n = new Set(lines.map(l => `${Math.round(l.from.x)},${Math.round(l.from.y)}`)).size; byCount.set(n, [...(byCount.get(n) ?? []), i]); });
    for (const group of byCount.values()) for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) expect(samePicture(all[group[i]], all[group[j]]), `${group[i]} vs ${group[j]}`).toBe(false);
  });
  it('no family is over 25% of its band (a School level, or a Deep Water step)', () => {
    school.forEach(rows => expect(share(rows)).toBeLessThanOrEqual(0.25));
    STEPS.forEach((_, step) => expect(share([...build[step], ...predict[step]])).toBeLessThanOrEqual(0.25));
    expect(share([...build.flat(), ...predict.flat()])).toBeLessThanOrEqual(0.25);
  });
  it('the written program is the proven fewest blocks, and the limit follows the proof', () => {
    school.forEach((rows, i) => rows.forEach(t => {
      const blocks = must(t.blocks), stream = flatten(blocks)!, minimum = minimumPrograms(stream, SCHOOL_COUNTS)!;
      expect(verifyMinimum(minimum)).toBe(true);
      // Levels 1 and 2 offer no Repeat, so their fewest blocks is the written plan; from Level 3 it is the proven minimum.
      expect(blockCost(blocks), 'the written plan is the stated fewest').toBe(t.min);
      if (i >= 2) { expect(minimum.cost, t.blocks).toBe(t.min); expect(t.alts.map(a => blockCost(must(a))).every(c => c === t.min)).toBe(true); }
      else { expect(t.alts).toEqual([]); expect(minimum.cost).toBeLessThanOrEqual(t.min); }
      expect(t.limit).toBe(i < 2 ? flatCost(blocks) + 4 : t.min + 1);
      if (i >= 2) expect(flatCost(blocks), `${t.blocks}: the flat plan must not fit`).toBeGreaterThan(t.limit);
    }));
    for (const row of build.flat()) {
      const blocks = must(row.target), minimum = minimumPrograms(flatten(blocks)!, DEEP_COUNTS)!;
      expect(minimum.cost).toBe(row.min); expect(blockCost(blocks)).toBe(row.min); expect(row.tray).toBe(row.min + 1);
      expect(row.flat).toBeGreaterThan(row.tray);
    }
  });
  it('School pictures use only the old palette; Deep Water adds the new turns, counts, short sides and Grow +10', () => {
    school.flat().forEach(t => [t.blocks, t.start ?? t.blocks].forEach(text => expect(must(text).every(b => validBlock(b)), text).toBe(true)));
    const kinds = new Set<string>();
    const walk = (list: Block[]) => list.forEach(b => { if (b.kind === 'repeat') { expect(DEEP_COUNTS).toContain(b.times); walk(b.body); } else { kinds.add(b.kind); if (b.kind === 'turn') expect(DEEP_TURNS).toContain(b.angle); if (b.kind === 'forward') expect(DEEP_LENGTHS).toContain(b.n); } });
    [...build.flat().map(p => p.target), ...predict.flat().map(p => p.program)].forEach(text => walk(must(text)));
    expect(kinds.has('grow')).toBe(true);
    const used = (re: RegExp) => [...build.flat().map(p => p.target), ...predict.flat().map(p => p.program)].some(text => re.test(text));
    for (const re of [/t40/, /t72/, /t144/, /r5\(/, /r9\(/, /\bg\b/]) expect(used(re), String(re)).toBe(true);
  });
});

describe('W0-03: Level 4 Angles, then Level 5 Flowers and fixes, in true rising order', () => {
  const costs = school.map(rows => rows.map(t => t.min));
  it('counts every block recursively, so a Repeat never hides its contents', () => {
    expect(blockCost(must('r4(f60 t90)'))).toBe(3);
    expect(blockCost(must('kc r3(r4(f60 t90) t120)'))).toBe(6);
    expect(must('kc r3(r4(f60 t90) t120)').length).toBe(2);
    school.slice(3).flat().forEach(t => expect(blockCost(must(t.blocks))).toBeGreaterThan(must(t.blocks).length));
  });
  it('Level 5 is strictly harder than Level 3 by recursive cost, and Level 4 sits between them', () => {
    expect(Math.min(...costs[4])).toBeGreaterThan(Math.max(...costs[2]));
    expect(Math.min(...costs[3])).toBeGreaterThan(Math.max(...costs[2]));
    expect(Math.min(...costs[4])).toBeGreaterThanOrEqual(Math.max(...costs[3]));
    expect(mean(costs[2])).toBeLessThan(mean(costs[3])); expect(mean(costs[3])).toBeLessThan(mean(costs[4]));
    expect(Math.max(...costs[2])).toBe(4); expect(Math.min(...costs[3])).toBe(5); expect(Math.min(...costs[4])).toBe(6);
  });
  it('Level 5 nests a loop in a loop and half of it fixes a planted bug; Level 4 needs loops that turn twice', () => {
    school[4].forEach(t => expect(blockDepth(must(t.blocks))).toBe(2));
    school[3].forEach(t => expect(blockDepth(must(t.blocks))).toBe(1));
    const families = (rows: Template[]) => [...new Set(rows.map(t => t.family))].sort();
    expect(families(school[4])).toEqual(['fix-count', 'fix-missing', 'fix-turn', 'flower']);
    expect(school[4].filter(t => t.start !== undefined).length).toBe(30);
    expect(families(school[3])).toEqual(['alt-hexagon', 'alt-octagon', 'parallelogram', 'rectangle']);
  });
  it('an under-counting program (colour blocks hidden in a Repeat) no longer fits', () => {
    const task = templateTask(4, 0), bloated = must(`r2(kc kt kc kt ${task.target[0].kind === 'repeat' ? formatBlocks((task.target[0] as Extract<Block, { kind: 'repeat' }>).body) : ''})`);
    expect(bloated.length).toBe(1);
    expect(draw(bloated, task.origin)!.length).toBe(draw(task.target, task.origin)!.length);
    expect(solves(task, task.target)).toBe(true);
    expect(solves(task, bloated)).toBe(false);
    expect(blockCost(bloated)).toBeGreaterThan(task.limit);
  });
  it('Level 2 steps from right angles to slanted sides; every other level also draws more as it climbs', () => {
    const turns = (rows: Template[], tier: number) => new Set(rows.filter(t => t.tier === tier).flatMap(t => must(t.blocks).flatMap(b => b.kind === 'turn' ? [b.angle] : []))) as Set<number>;
    expect([...turns(school[1], 1)]).toEqual([90]);
    expect(turns(school[1], 2).has(90)).toBe(false);
    for (const level of [0, 2, 3, 4]) {
      const first = mean(school[level].filter(t => t.tier === 1).map(t => flatCost(must(t.blocks)))), last = mean(school[level].filter(t => t.tier === 4).map(t => flatCost(must(t.blocks))));
      expect(last, `level ${level + 1}`).toBeGreaterThan(first);
    }
  });
  it('every tier is a real step up inside its level', () => {
    school.forEach(rows => {
      const byTier = [1, 2, 3, 4].map(tier => mean(rows.filter(t => t.tier === tier).map(t => flatCost(must(t.blocks)))));
      for (let i = 1; i < 4; i++) expect(byTier[i]).toBeGreaterThanOrEqual(byTier[i - 1]);
      expect([1, 2, 3, 4].map(tier => rows.filter(t => t.tier === tier).length)).toEqual([10, 10, 10, 10]);
    });
  });
});

describe('School tasks from certified pictures', () => {
  it('rebuilds the same task for the same picture, with the picture\'s own start and a loop where one is needed', () => {
    school.forEach((rows, i) => rows.forEach((t, index) => {
      const a = templateTask(i + 1, index), b = templateTask(i + 1, index);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(a.template).toBe(index); expect(a.requiredLoop).toBe(i + 1 >= 3); expect(a.blockEditor === true).toBe(i + 1 >= 4);
      expect(solves(a, a.target), t.blocks).toBe(true);
      expect(a.debug).toBe(t.start !== undefined);
    }));
  });
  it('a planted bug is exactly one edit from the answer, and the starting program is wrong', () => {
    school[4].filter(t => t.start).forEach(t => {
      const task = templateTask(5, school[4].indexOf(t)), start = task.start!;
      expect(solves(task, start)).toBe(false);
      expect(align(start, task.target).cost).toBe(1);
    });
  });
  it('a round steps through four pictures easiest first, never repeating the last round', () => {
    for (const level of [1, 2, 3, 4, 5]) {
      let seed = level * 7919;
      const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
      const first = roundTemplates(level, rng), second = roundTemplates(level, rng, first);
      expect(first.map(i => school[level - 1][i].tier)).toEqual([1, 2, 3, 4]);
      expect(new Set(first).size).toBe(4);
      expect(second.some(i => first.includes(i))).toBe(false);
    }
    expect(LEVEL_TASKS).toBe(40);
  });
});

describe('the hint engine: the same edits the editor makes, nearest certified program first', () => {
  const walk = (start: Block[], winners: Block[][]) => {
    let program = start, steps = 0, distance = Math.min(...winners.map(w => align(program, w).cost));
    const first = distance;
    while (distance > 0) {
      const hint = nearestEdit(program, winners)!;
      expect(editText(hint.edit, program).length).toBeGreaterThan(10);
      program = applyEdit(program, hint.edit);
      const next = Math.min(...winners.map(w => align(program, w).cost));
      expect(next, `${formatBlocks(program)} after ${hint.edit.op}`).toBe(distance - 1);
      distance = next; steps++;
      if (steps > 40) throw new Error('hints do not converge');
    }
    return { steps, first };
  };
  it('walks every School picture from an empty plan, and every planted bug, to a winning program', () => {
    school.forEach((rows, i) => rows.forEach((t, index) => {
      const task = templateTask(i + 1, index), winners = [task.target, ...t.alts.map(must)];
      const { steps, first } = walk([], winners);
      expect(steps).toBe(first);
      expect(first).toBe(t.min);
      if (t.start) expect(walk(must(t.start), winners).steps).toBe(1);
    }));
  });
  it('walks every Deep Water build puzzle from empty to a winner', () => {
    build.flat().forEach(p => { const { steps } = walk([], [must(p.target), ...p.alts.map(must)]); expect(steps).toBe(p.min); });
  });
  it('speaks in the editor\'s words and names a place', () => {
    const target = must('r4(f60 t90)');
    expect(editText(nearestEdit([], [target])!.edit, [])).toBe('Add Repeat ×4 at the start.');
    expect(editText(nearestEdit(must('r3(f60 t90)'), [target])!.edit, must('r3(f60 t90)'))).toBe('Change block 1 from Repeat ×3 to ×4.');
    expect(editText(nearestEdit(must('r4(f60 t60)'), [target])!.edit, must('r4(f60 t60)'))).toBe('Change block 2 inside block 1 (Turn 60°) to Turn 90°.');
    expect(editText(nearestEdit(must('r4(f60 t90 t90)'), [target])!.edit, must('r4(f60 t90 t90)'))).toBe('Remove block 3 inside block 1 (Turn 90°).');
  });
});
