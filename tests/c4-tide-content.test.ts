import { describe, expect, it } from 'vitest';
import content from '../src/learn/games/tide-logic/content.json';
import { DEEP, ENDLESS, botFails, familyOf, generateContent, semanticKey, traceCatch, type Row } from '../src/learn/games/tide-logic/generate';
import { DEEP_NAMES, ENDLESS_NAMES } from '../src/learn/games/tide-logic/challenge-content';
import { FRAMES, LITERALS, goalSentence, routes, ruleSpace, separation, signature, space, usesRuleWords, type FrameId } from '../src/learn/games/tide-logic/rules';
import { keywordBot } from '../src/learn/games/tide-logic/bots';

const school = content.school as unknown as Row[][], endless = content.endless as unknown as Row[][], deep = content.deep as unknown as Row[][];
const all = [...school.flat(), ...endless.flat(), ...deep.flat()];
const bands: [string, Row[]][] = [...school.map((b, i) => [`School ${i + 1}`, b] as [string, Row[]]), ...endless.map((b, i) => [`Endless ${ENDLESS_NAMES[i]}`, b] as [string, Row[]]), ...deep.map((b, i) => [`Deep ${DEEP_NAMES[i]}`, b] as [string, Row[]])];
const lit = (s: string) => LITERALS.indexOf(s);

describe('BK-24 certified supply', () => {
  it('ships 308 belts (target 300, floor 100): 40 per School level, 60 Endless Tide, 48 Deep Water', () => {
    expect(school.map(b => b.length)).toEqual([40, 40, 40, 40, 40]);
    expect(endless.map(b => b.length)).toEqual([10, 10, 10, 10, 10, 10]);
    expect(deep.map(b => b.length)).toEqual([12, 12, 12, 12]);
    expect(all.length).toBe(308); expect(all.length).toBeGreaterThanOrEqual(300);
  });
  it('is exactly what the solver bakes (the committed content is not hand-edited)', () => {
    expect(JSON.parse(JSON.stringify(generateContent()))).toEqual({ school: content.school, endless: content.endless, deep: content.deep });
    expect(ENDLESS.map(b => b.name)).toEqual(ENDLESS_NAMES); expect(DEEP.map(s => s.name)).toEqual(DEEP_NAMES);
  });
  it('every wrong rule fails its belt: an exhaustive check over each frame\'s whole rule space, for every shipped belt', () => {
    let checked = 0;
    for (const row of all) {
      const proof = separation(FRAMES[row.frame], row.target, row.belt);
      expect(proof.lucky, `${row.frame} ${JSON.stringify(row.target)} on ${row.belt}`).toEqual([]);
      expect(proof.rules).toBe(ruleSpace(FRAMES[row.frame]).length);
      checked += proof.rules;
    }
    // 308 belts, every rule a child can build in each frame: well over a hundred thousand rule-on-belt checks.
    expect(checked).toBeGreaterThan(100000);
  });
  it('each belt\'s separating core is exactly what the solver needs, and the belt uses both buckets', () => {
    for (const row of all) {
      expect(row.need).toBeGreaterThanOrEqual(1); expect(row.need).toBeLessThanOrEqual(row.belt.length);
      expect(new Set(routes(FRAMES[row.frame], row.target, row.belt)).size).toBe(2);
    }
  });
  it('has 308 distinct semantic hashes: no two belts ask for the same behaviour on the same catches', () => {
    expect(new Set(all.map(semanticKey)).size).toBe(308);
  });
  it('keeps every family at or under a quarter of its band, with at least four families in each', () => {
    for (const [name, rows] of bands) {
      const counts = new Map<string, number>();
      for (const r of rows) { expect(r.family).toBe(familyOf(FRAMES[r.frame], r.target, r.kind)); counts.set(r.family, (counts.get(r.family) ?? 0) + 1); }
      expect(counts.size, name).toBeGreaterThanOrEqual(4);
      expect(Math.max(...counts.values()), name).toBeLessThanOrEqual(rows.length / 4);
    }
  });
  it('reports its technique histogram', () => {
    const count = (p: (r: Row) => boolean) => all.filter(p).length, words = (r: Row) => r.target.map((o, i) => FRAMES[r.frame].slots[i].options[o]);
    const histogram = {
      oneClue: count(r => r.frame === 'color' || r.frame === 'size'),
      and: count(r => ['two6', 'two7', 'not'].includes(r.frame) && words(r)[1] === 'and'),
      or: count(r => ['two6', 'two7', 'not'].includes(r.frame) && words(r)[1] === 'or'),
      bellOn: count(r => r.frame === 'bell' && words(r)[0] === 'on'), bellAfter: count(r => r.frame === 'bell' && words(r)[0] === 'after'),
      bellClue: count(r => r.frame === 'two7' && words(r).includes('bell')), not: count(r => r.frame === 'not'), three: count(r => r.frame === 'three'),
      flipTrace: count(r => r.frame === 'flip' && r.kind === 'trace'), flipFind: count(r => r.frame === 'flip' && r.kind === 'find'), find: count(r => r.kind === 'find'),
    };
    expect(histogram).toEqual({ oneClue: 80, and: 75, or: 65, bellOn: 25, bellAfter: 25, bellClue: 27, not: 36, three: 26, flipTrace: 6, flipFind: 6, find: 28 });
    for (const v of Object.values(histogram)) expect(v).toBeGreaterThan(0);
  });
});

describe('SC-05 depth', () => {
  it('hides the rule words above Level 2: goal sentences never say if, and, or, not, then or else', () => {
    for (const row of [...school.slice(2).flat(), ...endless.flat(), ...deep.flat()].filter(r => r.kind === 'write')) {
      const text = goalSentence(FRAMES[row.frame], row.target)!;
      expect(text).toBeTruthy(); expect(usesRuleWords(text), text).toBe(false);
    }
    // Levels 1 and 2 keep their plain, gentle wording.
    for (const row of school.slice(0, 2).flat()) expect(goalSentence(FRAMES[row.frame], row.target)).toMatch(/^Send (blue|coral|big|small) catches (left|right)\. The rest go (left|right)\.$/);
  });
  it('the real bell: at Level 4 "on this catch" and "on the catch before" always sort the belt differently', () => {
    for (const row of school[3]) {
      const twin = [1 - row.target[0], row.target[1], row.target[2]];
      expect(routes(FRAMES.bell, twin, row.belt)).not.toEqual(routes(FRAMES.bell, row.target, row.belt));
      expect(signature(FRAMES.bell, twin)).not.toBe(signature(FRAMES.bell, row.target));
    }
    expect(school[3].some(r => r.target[0] === 1) && school[3].some(r => r.target[0] === 0)).toBe(true);
  });
  it('the flip gate sorts the spec\'s belt: bells on catches 2 and 5 of six go left, right, right, right, left, left', () => {
    expect(routes(FRAMES.flip, [lit('bell'), 0], [0, 8, 1, 2, 9, 3])).toEqual([0, 1, 1, 1, 0, 0]);
  });
  it('the spec\'s Not belt: three catches pin "coral and no bell" among every two-clue rule with Not', () => {
    // big blue fish → right, big coral fish → left, big coral fish with a bell → right.
    const target = [lit('coral'), 0, lit('not bell'), 0], belt = [0, 1, 9];
    expect(routes(FRAMES.not, target, belt)).toEqual([1, 0, 1]);
    const lucky = separation(FRAMES.not, target, belt).lucky;
    // Size and kind never vary on these three catches, so only rules that differ there can pass: none of the colour-and-bell ideas do.
    expect(lucky.every(r => [r[0], r[2]].some(o => !['blue', 'coral', 'bell', 'not blue', 'not coral', 'not bell'].includes(LITERALS[o])))).toBe(true);
  });
  it('the spec\'s find-the-rule belt: big blue fish left, small blue fish right, small blue shell left pins "big or shell" among two-clue rules on colour, size and kind', () => {
    const target = [FRAMES.two6.slots[0].options.indexOf('big'), 1, FRAMES.two6.slots[2].options.indexOf('shell'), 0];
    expect(routes(FRAMES.two6, target, [0, 2, 6])).toEqual([0, 1, 0]);
    // Colour never varies on the spec's belt, so the honest proof needs one coral catch more; the shipped find belts all pass the full proof.
    expect(separation(FRAMES.two6, target, [0, 2, 6, 3]).lucky).toEqual([]);
  });
  it('Not, three clues and flip gates are each a real new idea: every Not target uses NO bell, and no three-clue target can be written with two clues', () => {
    const two = new Set(space(FRAMES.two7).map(x => x.sig));
    for (const r of all.filter(r => r.frame === 'not')) expect([r.target[0], r.target[2]].map(o => LITERALS[o])).toContain('not bell');
    for (const r of all.filter(r => r.frame === 'three')) expect(two.has(signature(FRAMES.three, r.target))).toBe(false);
  });
  it('School Level 5\'s trace question asks about a catch where the rule and its most tempting wrong rule part ways', () => {
    for (const row of school[4]) {
      expect(row.trace).toBe(traceCatch(FRAMES.two7, row.target, row.belt));
      const want = routes(FRAMES.two7, row.target, row.belt);
      expect(space(FRAMES.two7).some(x => x.sig !== signature(FRAMES.two7, row.target) && routes(FRAMES.two7, x.rule, row.belt)[row.trace!] !== want[row.trace!])).toBe(true);
    }
  });
});

describe('Difficulty rises and the dumb players fail the top', () => {
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  it('School: each level\'s quarters climb, and Levels 3–5 top quarters defeat the keyword copier', () => {
    for (let level = 0; level < 5; level++) {
      const q = [0, 1, 2, 3].map(i => mean(school[level].slice(i * 10, i * 10 + 10).map(r => r.score)));
      expect([...q].sort((a, b) => a - b)).toEqual(q);
    }
    for (const level of [2, 3, 4]) for (const row of school[level].slice(30)) expect(botFails(row), JSON.stringify(row)).toBe(true);
    // The keyword copier is what "the sentence spells the rule" used to reward: at Levels 1–2 it still works, on purpose.
    for (const row of school[0]) expect(botFails(row)).toBe(false);
  });
  it('Deep Water: every step climbs tier 1 to 6 and its tier 5–6 rungs defeat that step\'s dumb player', () => {
    for (const rows of deep) {
      if (rows !== deep[3]) expect(mean(rows.slice(8).map(r => r.score))).toBeGreaterThan(mean(rows.slice(0, 4).map(r => r.score)));
      for (const row of rows.slice(8)) expect(botFails(row), JSON.stringify(row)).toBe(true);
    }
    // Find the rule climbs frames: two clues, then Not, then three clues.
    expect(deep[3].map(r => r.frame)).toEqual(['two7', 'two7', 'two7', 'two7', 'not', 'not', 'not', 'not', 'three', 'three', 'three', 'three']);
  });
  it('Endless Tide: the Find it tier defeats the one-clue guesser, and the tiers climb in rule space', () => {
    for (const row of endless[5]) expect(botFails(row)).toBe(true);
    const sizes = ENDLESS.map(b => ruleSpace(FRAMES[b.frame as FrameId]).length);
    expect(sizes[5]).toBeGreaterThan(sizes[0]); expect(sizes[4]).toBeGreaterThan(sizes[3]);
  });
  it('the keyword copier reads a sentence the way a skimming child would', () => {
    expect(keywordBot(FRAMES.two6, 'Blue fish go left. The rest go right.')).toEqual([0, 0, 4, 0]);
    expect(keywordBot(FRAMES.not, 'Coral catches without a bell go left. The rest go right.')).toEqual([lit('coral'), 0, lit('bell'), 0]);
  });
});
