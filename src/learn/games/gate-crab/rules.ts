import { sha256Hex } from '../../../puzzles/sha256';
import type { Rng } from '../../../puzzles/rng';

/**
 * Gate Crab pure rules engine.
 * A shell has a colour (coral, blue, gold) and a size (small, big): 6 distinct shells.
 * Rung A uses 2-shell rows (36 rows); Rungs B-F use 3-shell rows (216 rows).
 * Every rule in the catalog is canonically identified by its full 216-row truth table so
 * semantically equivalent rules never duplicate across the catalog.
 */

export const COLORS = ['coral', 'blue', 'gold'] as const;
export const SIZES = ['small', 'big'] as const;
export const POS_NAMES = ['first', 'middle', 'last'] as const;
export const RUNGS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;

export type ColorIdx = 0 | 1 | 2;
export type SizeIdx = 0 | 1;
export type ShellCode = 0 | 1 | 2 | 3 | 4 | 5;
export type RowLen = 2 | 3;
export type Rung = (typeof RUNGS)[number];
export type Shell = { readonly col: ColorIdx; readonly big: SizeIdx };

export const shellOf = (code: number): Shell => ({
  col: (code % 3) as ColorIdx,
  big: (code >= 3 ? 1 : 0) as SizeIdx,
});
export const codeOf = (col: ColorIdx, big: SizeIdx): ShellCode => (big * 3 + col) as ShellCode;
export const ALL_SHELL_CODES: readonly ShellCode[] = [0, 1, 2, 3, 4, 5];
export const isShellCode = (v: unknown): v is ShellCode => Number.isInteger(v) && (v as number) >= 0 && (v as number) < 6;
export const shellWords = (code: ShellCode): string => {
  const s = shellOf(code);
  return `${s.big ? 'big' : 'small'} ${COLORS[s.col]}`;
};
export const shellShort = (code: ShellCode): string => {
  const s = shellOf(code);
  return `${s.big ? 'BIG' : 'sm'} ${COLORS[s.col]}`;
};

export const rowSpaceSize = (len: RowLen): number => (len === 2 ? 36 : 216);
export const isRowIndex = (len: RowLen, v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < rowSpaceSize(len);

export function rowCodes(len: RowLen, index: number): ShellCode[] {
  if (len === 2) return [Math.floor(index / 6) as ShellCode, (index % 6) as ShellCode];
  return [
    Math.floor(index / 36) as ShellCode,
    (Math.floor(index / 6) % 6) as ShellCode,
    (index % 6) as ShellCode,
  ];
}
export function codesToRow(codes: readonly ShellCode[]): number {
  if (codes.length === 2) return codes[0] * 6 + codes[1];
  return codes[0] * 36 + codes[1] * 6 + codes[2];
}
export function rowShells(len: RowLen, index: number): Shell[] {
  return rowCodes(len, index).map(shellOf);
}
export function rowWords(len: RowLen, index: number): string {
  return rowCodes(len, index).map(shellWords).join(', ');
}
export function rowShort(len: RowLen, index: number): string {
  return rowCodes(len, index).map(shellShort).join(' · ');
}

export const ROWS_2: readonly (readonly Shell[])[] = Array.from({ length: 36 }, (_, i) => rowShells(2, i));
export const ROWS_3: readonly (readonly Shell[])[] = Array.from({ length: 216 }, (_, i) => rowShells(3, i));

/** Visual descriptor so Rule-Maker picture cards & rule reveals draw clear, text-free icons. */
export type RulePictureSpec =
  | { kind: 'has-color'; col: ColorIdx; negate?: boolean }
  | { kind: 'has-size'; big: SizeIdx; all?: boolean }
  | { kind: 'has-shell'; shell: ShellCode; negate?: boolean }
  | { kind: 'count-color'; col: ColorIdx; op: 'eq1' | 'eq2' | 'ge2' | 'le1' | 'even' | 'odd' }
  | { kind: 'count-size'; big: SizeIdx; count: 1 | 2 }
  | { kind: 'count-shell'; shell: ShellCode; op: 'eq1' | 'ge2' }
  | { kind: 'both-colors'; c1: ColorIdx; c2: ColorIdx }
  | { kind: 'pos'; pos: 0 | 1 | 2; col?: ColorIdx; big?: SizeIdx; negate?: boolean }
  | { kind: 'ends'; col?: ColorIdx; big?: SizeIdx; negate?: boolean; both?: boolean }
  | { kind: 'diversity'; mode: 'all-same' | 'all-diff' | 'exact-2' | 'at-least-2' | 'all-distinct-shells' | 'dup-shells' }
  | { kind: 'pair'; i: 0 | 1 | 2; j: 0 | 1 | 2; attr: 'color' | 'size' | 'exact'; same: boolean }
  | { kind: 'neighbors'; mode: 'diff-color' | 'same-color' | 'alt-size' | 'adj-exact' | 'adj-colors'; c1?: ColorIdx; c2?: ColorIdx; ordered?: boolean }
  | { kind: 'order'; mode: 'grow' | 'shrink' | 'peak' | 'valley' | 'first-bigger' | 'last-bigger' | 'col-before'; c1?: ColorIdx; c2?: ColorIdx }
  | { kind: 'compound'; op: 'and' | 'or' | 'unless' | 'xor' | 'implies'; left: RulePictureSpec; right: RulePictureSpec }
  | { kind: 'compare'; c1: ColorIdx; c2: ColorIdx; op: 'gt' | 'ge' | 'eq' | 'wgt' }
  | { kind: 'parity'; even: boolean }
  | { kind: 'every'; scope: 'big' | 'small' | 'color'; scopeCol?: ColorIdx; targetCol?: ColorIdx; targetBig?: SizeIdx; sameColor?: boolean; diffColor?: boolean }
  | { kind: 'mid-matches-end'; attr: 'color' | 'size' | 'exact' };

export type RuleDef = {
  readonly id: string;
  readonly rung: Rung;
  readonly family: string;
  readonly label: string;
  readonly picture: RulePictureSpec;
  readonly test: (row: readonly Shell[]) => boolean;
  /** Full 216-row truth table over all 3-shell rows ('1' = pass, '0' = block). */
  readonly table216: string;
  /** SHA-256 hex digest of table216. */
  readonly tableHash: string;
  /** Full 36-row truth table over all 2-shell rows (used for Rung A validation). */
  readonly table36: string;
  readonly pass216: number;
  readonly pass36: number;
};

type RawRule = {
  id: string;
  rung: Rung;
  family: string;
  label: string;
  picture: RulePictureSpec;
  test: (row: readonly Shell[]) => boolean;
};

const cnt = (row: readonly Shell[], fn: (s: Shell) => boolean): number => {
  let n = 0;
  for (let i = 0; i < row.length; i++) if (fn(row[i])) n++;
  return n;
};
const sizePoints = (row: readonly Shell[]): number => {
  let t = 0;
  for (let i = 0; i < row.length; i++) t += row[i].big ? 2 : 1;
  return t;
};

function buildCatalog(): readonly RuleDef[] {
  const raw: RawRule[] = [];
  const push = (r: RawRule) => raw.push(r);

  // ---------- RUNG A: One clue (2-shell rows in School/Pack, also evaluated on 216-row space) ----------
  for (const c of [0, 1, 2] as const) {
    push({
      id: `a-has-c${c}`, rung: 'a', family: 'a-has-color',
      label: `Has a ${COLORS[c]} shell`,
      picture: { kind: 'has-color', col: c },
      test: r => cnt(r, s => s.col === c) > 0,
    });
  }
  push({
    id: 'a-has-big', rung: 'a', family: 'a-size',
    label: 'Has a big shell',
    picture: { kind: 'has-size', big: 1 },
    test: r => cnt(r, s => s.big === 1) > 0,
  });
  push({
    id: 'a-has-small', rung: 'a', family: 'a-size',
    label: 'Has a small shell',
    picture: { kind: 'has-size', big: 0 },
    test: r => cnt(r, s => s.big === 0) > 0,
  });
  push({
    id: 'a-all-big', rung: 'a', family: 'a-size',
    label: 'Every shell is big',
    picture: { kind: 'has-size', big: 1, all: true },
    test: r => r.every(s => s.big === 1),
  });
  push({
    id: 'a-all-small', rung: 'a', family: 'a-size',
    label: 'Every shell is small',
    picture: { kind: 'has-size', big: 0, all: true },
    test: r => r.every(s => s.big === 0),
  });
  for (const c of [0, 1, 2] as const) {
    const bigCode = codeOf(c, 1);
    const smCode = codeOf(c, 0);
    push({
      id: `a-has-big-c${c}`, rung: 'a', family: 'a-has-big-shell',
      label: `Has a big ${COLORS[c]} shell`,
      picture: { kind: 'has-shell', shell: bigCode },
      test: r => cnt(r, s => s.col === c && s.big === 1) > 0,
    });
    push({
      id: `a-has-sm-c${c}`, rung: 'a', family: 'a-has-small-shell',
      label: `Has a small ${COLORS[c]} shell`,
      picture: { kind: 'has-shell', shell: smCode },
      test: r => cnt(r, s => s.col === c && s.big === 0) > 0,
    });
    push({
      id: `a-no-big-c${c}`, rung: 'a', family: 'a-no-big-shell',
      label: `Has no big ${COLORS[c]} shell`,
      picture: { kind: 'has-shell', shell: bigCode, negate: true },
      test: r => cnt(r, s => s.col === c && s.big === 1) === 0,
    });
  }

  // ---------- RUNG B: Counting (3-shell rows) ----------
  for (const c of [0, 1, 2] as const) {
    push({
      id: `b-no-c${c}`, rung: 'b', family: 'b-no-color',
      label: `Has no ${COLORS[c]} shell`,
      picture: { kind: 'has-color', col: c, negate: true },
      test: r => cnt(r, s => s.col === c) === 0,
    });
    push({
      id: `b-eq1-c${c}`, rung: 'b', family: 'b-exact-one-color',
      label: `Has exactly one ${COLORS[c]} shell`,
      picture: { kind: 'count-color', col: c, op: 'eq1' },
      test: r => cnt(r, s => s.col === c) === 1,
    });
    push({
      id: `b-ge2-c${c}`, rung: 'b', family: 'b-at-least-two-color',
      label: `Has at least two ${COLORS[c]} shells`,
      picture: { kind: 'count-color', col: c, op: 'ge2' },
      test: r => cnt(r, s => s.col === c) >= 2,
    });
    push({
      id: `b-eq2-c${c}`, rung: 'b', family: 'b-exact-two-color',
      label: `Has exactly two ${COLORS[c]} shells`,
      picture: { kind: 'count-color', col: c, op: 'eq2' },
      test: r => cnt(r, s => s.col === c) === 2,
    });
    push({
      id: `b-le1-c${c}`, rung: 'b', family: 'b-at-most-one-color',
      label: `Has at most one ${COLORS[c]} shell`,
      picture: { kind: 'count-color', col: c, op: 'le1' },
      test: r => cnt(r, s => s.col === c) <= 1,
    });
  }
  push({
    id: 'b-eq1-big', rung: 'b', family: 'b-count-size',
    label: 'Has exactly one big shell',
    picture: { kind: 'count-size', big: 1, count: 1 },
    test: r => cnt(r, s => s.big === 1) === 1,
  });
  push({
    id: 'b-eq2-big', rung: 'b', family: 'b-count-size',
    label: 'Has exactly two big shells',
    picture: { kind: 'count-size', big: 1, count: 2 },
    test: r => cnt(r, s => s.big === 1) === 2,
  });
  for (const code of [0, 1, 2, 3, 4, 5] as const) {
    const sh = shellOf(code);
    push({
      id: `b-eq1-s${code}`, rung: 'b', family: 'b-exact-one-shell',
      label: `Has exactly one ${shellWords(code)} shell`,
      picture: { kind: 'count-shell', shell: code, op: 'eq1' },
      test: r => cnt(r, s => s.col === sh.col && s.big === sh.big) === 1,
    });
    push({
      id: `b-ge2-s${code}`, rung: 'b', family: 'b-at-least-two-shell',
      label: `Has at least two ${shellWords(code)} shells`,
      picture: { kind: 'count-shell', shell: code, op: 'ge2' },
      test: r => cnt(r, s => s.col === sh.col && s.big === sh.big) >= 2,
    });
  }
  const colorPairs: [ColorIdx, ColorIdx][] = [[0, 1], [0, 2], [1, 2]];
  for (const [c1, c2] of colorPairs) {
    push({
      id: `b-both-c${c1}c${c2}`, rung: 'b', family: 'b-both-colors',
      label: `Has both ${COLORS[c1]} and ${COLORS[c2]}`,
      picture: { kind: 'both-colors', c1, c2 },
      test: r => cnt(r, s => s.col === c1) > 0 && cnt(r, s => s.col === c2) > 0,
    });
  }

  // ---------- RUNG C: Where it sits (3-shell rows) ----------
  const posPreds: { id: string; label: string; family: string; picture: RulePictureSpec; test: (r: readonly Shell[]) => boolean }[] = [];
  for (const i of [0, 1, 2] as const) {
    for (const c of [0, 1, 2] as const) {
      const p: RawRule = {
        id: `c-p${i}-c${c}`, rung: 'c', family: 'c-pos-color',
        label: `The ${POS_NAMES[i]} shell is ${COLORS[c]}`,
        picture: { kind: 'pos', pos: i, col: c },
        test: r => r[i] !== undefined && r[i].col === c,
      };
      push(p);
      posPreds.push(p);
      push({
        id: `c-p${i}-not-c${c}`, rung: 'c', family: 'c-pos-not-color',
        label: `The ${POS_NAMES[i]} shell is not ${COLORS[c]}`,
        picture: { kind: 'pos', pos: i, col: c, negate: true },
        test: r => r[i] !== undefined && r[i].col !== c,
      });
    }
    for (const big of [1, 0] as const) {
      const p: RawRule = {
        id: `c-p${i}-${big ? 'big' : 'sm'}`, rung: 'c', family: 'c-pos-size',
        label: `The ${POS_NAMES[i]} shell is ${big ? 'big' : 'small'}`,
        picture: { kind: 'pos', pos: i, big },
        test: r => r[i] !== undefined && r[i].big === big,
      };
      push(p);
      posPreds.push(p);
    }
    for (const code of [0, 1, 2, 3, 4, 5] as const) {
      const sh = shellOf(code);
      push({
        id: `c-p${i}-s${code}`, rung: 'c', family: `c-pos-${i}-shell`,
        label: `The ${POS_NAMES[i]} shell is ${shellWords(code)}`,
        picture: { kind: 'pos', pos: i, col: sh.col, big: sh.big },
        test: r => r[i] !== undefined && r[i].col === sh.col && r[i].big === sh.big,
      });
    }
  }
  for (const c of [0, 1, 2] as const) {
    push({
      id: `c-ends-c${c}`, rung: 'c', family: 'c-ends-have',
      label: `An end shell is ${COLORS[c]}`,
      picture: { kind: 'ends', col: c },
      test: r => r[0].col === c || r[r.length - 1].col === c,
    });
    push({
      id: `c-ends-no-c${c}`, rung: 'c', family: 'c-ends-not',
      label: `Neither end shell is ${COLORS[c]}`,
      picture: { kind: 'ends', col: c, negate: true },
      test: r => r[0].col !== c && r[r.length - 1].col !== c,
    });
  }
  push({
    id: 'c-ends-big', rung: 'c', family: 'c-ends-have',
    label: 'An end shell is big',
    picture: { kind: 'ends', big: 1 },
    test: r => r[0].big === 1 || r[r.length - 1].big === 1,
  });
  push({
    id: 'c-ends-small', rung: 'c', family: 'c-ends-have',
    label: 'An end shell is small',
    picture: { kind: 'ends', big: 0 },
    test: r => r[0].big === 0 || r[r.length - 1].big === 0,
  });
  push({
    id: 'c-ends-both-big', rung: 'c', family: 'c-ends-not',
    label: 'Both end shells are big',
    picture: { kind: 'ends', big: 1, both: true },
    test: r => r[0].big === 1 && r[r.length - 1].big === 1,
  });
  push({
    id: 'c-ends-both-small', rung: 'c', family: 'c-ends-not',
    label: 'Both end shells are small',
    picture: { kind: 'ends', big: 0, both: true },
    test: r => r[0].big === 0 && r[r.length - 1].big === 0,
  });

  // ---------- RUNG D: How they relate (3-shell rows) ----------
  push({
    id: 'd-all-same-col', rung: 'd', family: 'd-diversity',
    label: 'All three are the same colour',
    picture: { kind: 'diversity', mode: 'all-same' },
    test: r => r[0].col === r[1].col && r[1].col === r[2].col,
  });
  push({
    id: 'd-all-diff-col', rung: 'd', family: 'd-diversity',
    label: 'All three are different colours',
    picture: { kind: 'diversity', mode: 'all-diff' },
    test: r => r[0].col !== r[1].col && r[1].col !== r[2].col && r[0].col !== r[2].col,
  });
  push({
    id: 'd-exact-2-col', rung: 'd', family: 'd-diversity',
    label: 'Exactly two colours appear',
    picture: { kind: 'diversity', mode: 'exact-2' },
    test: r => new Set(r.map(s => s.col)).size === 2,
  });
  push({
    id: 'd-at-least-2-col', rung: 'd', family: 'd-diversity',
    label: 'At least two shells share a colour',
    picture: { kind: 'diversity', mode: 'at-least-2' },
    test: r => new Set(r.map(s => s.col)).size <= 2,
  });
  push({
    id: 'd-all-distinct-sh', rung: 'd', family: 'd-exact-match',
    label: 'All three shells are different',
    picture: { kind: 'diversity', mode: 'all-distinct-shells' },
    test: r => new Set(r.map(s => codeOf(s.col, s.big))).size === 3,
  });
  push({
    id: 'd-dup-sh', rung: 'd', family: 'd-exact-match',
    label: 'At least two shells match exactly',
    picture: { kind: 'diversity', mode: 'dup-shells' },
    test: r => new Set(r.map(s => codeOf(s.col, s.big))).size <= 2,
  });
  const indexPairs: [0 | 1 | 2, 0 | 1 | 2][] = [[0, 1], [1, 2], [0, 2]];
  for (const [i, j] of indexPairs) {
    const aName = POS_NAMES[i], bName = POS_NAMES[j];
    push({
      id: `d-same-col-${i}${j}`, rung: 'd', family: 'd-pair-color',
      label: `The ${aName} and ${bName} are the same colour`,
      picture: { kind: 'pair', i, j, attr: 'color', same: true },
      test: r => r[i].col === r[j].col,
    });
    push({
      id: `d-diff-col-${i}${j}`, rung: 'd', family: 'd-pair-color',
      label: `The ${aName} and ${bName} are different colours`,
      picture: { kind: 'pair', i, j, attr: 'color', same: false },
      test: r => r[i].col !== r[j].col,
    });
    push({
      id: `d-same-sz-${i}${j}`, rung: 'd', family: 'd-pair-size',
      label: `The ${aName} and ${bName} are the same size`,
      picture: { kind: 'pair', i, j, attr: 'size', same: true },
      test: r => r[i].big === r[j].big,
    });
    push({
      id: `d-diff-sz-${i}${j}`, rung: 'd', family: 'd-pair-size',
      label: `The ${aName} and ${bName} are different sizes`,
      picture: { kind: 'pair', i, j, attr: 'size', same: false },
      test: r => r[i].big !== r[j].big,
    });
    push({
      id: `d-exact-${i}${j}`, rung: 'd', family: 'd-exact-match',
      label: `The ${aName} and ${bName} shells match exactly`,
      picture: { kind: 'pair', i, j, attr: 'exact', same: true },
      test: r => r[i].col === r[j].col && r[i].big === r[j].big,
    });
  }
  push({
    id: 'd-nb-diff-col', rung: 'd', family: 'd-neighbors',
    label: 'Neighbours never share a colour',
    picture: { kind: 'neighbors', mode: 'diff-color' },
    test: r => r[0].col !== r[1].col && r[1].col !== r[2].col,
  });
  push({
    id: 'd-nb-same-col', rung: 'd', family: 'd-neighbors',
    label: 'Two neighbouring shells share a colour',
    picture: { kind: 'neighbors', mode: 'same-color' },
    test: r => r[0].col === r[1].col || r[1].col === r[2].col,
  });
  push({
    id: 'd-nb-alt-sz', rung: 'd', family: 'd-neighbors',
    label: 'Neighbours always change size',
    picture: { kind: 'neighbors', mode: 'alt-size' },
    test: r => r[0].big !== r[1].big && r[1].big !== r[2].big,
  });
  push({
    id: 'd-nb-exact', rung: 'd', family: 'd-neighbors',
    label: 'Two neighbouring shells match exactly',
    picture: { kind: 'neighbors', mode: 'adj-exact' },
    test: r => (r[0].col === r[1].col && r[0].big === r[1].big) || (r[1].col === r[2].col && r[1].big === r[2].big),
  });
  push({
    id: 'd-sz-grow', rung: 'd', family: 'd-size-order',
    label: 'Sizes never shrink going left to right',
    picture: { kind: 'order', mode: 'grow' },
    test: r => r[0].big <= r[1].big && r[1].big <= r[2].big,
  });
  push({
    id: 'd-sz-shrink', rung: 'd', family: 'd-size-order',
    label: 'Sizes never grow going left to right',
    picture: { kind: 'order', mode: 'shrink' },
    test: r => r[0].big >= r[1].big && r[1].big >= r[2].big,
  });
  push({
    id: 'd-sz-peak', rung: 'd', family: 'd-size-order',
    label: 'Only the middle shell is big',
    picture: { kind: 'order', mode: 'peak' },
    test: r => r[0].big === 0 && r[1].big === 1 && r[2].big === 0,
  });
  push({
    id: 'd-sz-valley', rung: 'd', family: 'd-size-order',
    label: 'Only the middle shell is small',
    picture: { kind: 'order', mode: 'valley' },
    test: r => r[0].big === 1 && r[1].big === 0 && r[2].big === 1,
  });
  push({
    id: 'd-first-bigger', rung: 'd', family: 'd-size-order',
    label: 'The first shell is bigger than the last',
    picture: { kind: 'order', mode: 'first-bigger' },
    test: r => r[0].big > r[2].big,
  });
  push({
    id: 'd-last-bigger', rung: 'd', family: 'd-size-order',
    label: 'The last shell is bigger than the first',
    picture: { kind: 'order', mode: 'last-bigger' },
    test: r => r[2].big > r[0].big,
  });
  for (const [c1, c2] of colorPairs) {
    push({
      id: `d-adj-c${c1}c${c2}`, rung: 'd', family: 'd-adj-color-pair',
      label: `A ${COLORS[c1]} shell sits next to a ${COLORS[c2]} shell`,
      picture: { kind: 'neighbors', mode: 'adj-colors', c1, c2, ordered: false },
      test: r => (r[0].col === c1 && r[1].col === c2) || (r[0].col === c2 && r[1].col === c1)
        || (r[1].col === c1 && r[2].col === c2) || (r[1].col === c2 && r[2].col === c1),
    });
  }
  const orderedColorPairs: [ColorIdx, ColorIdx][] = [[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]];
  for (const [c1, c2] of orderedColorPairs) {
    push({
      id: `d-before-c${c1}c${c2}`, rung: 'd', family: 'd-color-before',
      label: `A ${COLORS[c1]} shell sits to the left of a ${COLORS[c2]} shell`,
      picture: { kind: 'order', mode: 'col-before', c1, c2 },
      test: r => (r[0].col === c1 && (r[1].col === c2 || r[2].col === c2)) || (r[1].col === c1 && r[2].col === c2),
    });
    push({
      id: `d-right-next-c${c1}c${c2}`, rung: 'd', family: 'd-ordered-adj',
      label: `A ${COLORS[c1]} shell sits just left of a ${COLORS[c2]} shell`,
      picture: { kind: 'neighbors', mode: 'adj-colors', c1, c2, ordered: true },
      test: r => (r[0].col === c1 && r[1].col === c2) || (r[1].col === c1 && r[2].col === c2),
    });
  }

  // ---------- RUNG E: And, or, unless (3-shell rows) ----------
  const hasPreds = raw.filter(r => r.rung === 'a' && (r.family === 'a-has-color' || r.id === 'a-has-big' || r.id === 'a-has-small'));
  const simplePos = posPreds; // 15 predicates: pos 0/1/2 is color or big/small
  for (let i = 0; i < simplePos.length; i++) {
    for (let j = i + 1; j < simplePos.length; j++) {
      const a = simplePos[i], b = simplePos[j];
      push({
        id: `e-and-p-${i}-${j}`, rung: 'e', family: 'e-and-pos',
        label: `${a.label} AND ${b.label.toLowerCase()}`,
        picture: { kind: 'compound', op: 'and', left: a.picture, right: b.picture },
        test: r => a.test(r) && b.test(r),
      });
      push({
        id: `e-or-p-${i}-${j}`, rung: 'e', family: 'e-or-pos',
        label: `${a.label} OR ${b.label.toLowerCase()}`,
        picture: { kind: 'compound', op: 'or', left: a.picture, right: b.picture },
        test: r => a.test(r) || b.test(r),
      });
    }
  }
  for (let i = 0; i < hasPreds.length; i++) {
    for (let j = 0; j < simplePos.length; j++) {
      const a = hasPreds[i], b = simplePos[j];
      push({
        id: `e-and-hp-${i}-${j}`, rung: 'e', family: 'e-and-has',
        label: `${a.label} AND ${b.label.toLowerCase()}`,
        picture: { kind: 'compound', op: 'and', left: a.picture, right: b.picture },
        test: r => a.test(r) && b.test(r),
      });
      push({
        id: `e-or-hp-${i}-${j}`, rung: 'e', family: 'e-or-has',
        label: `${a.label} OR ${b.label.toLowerCase()}`,
        picture: { kind: 'compound', op: 'or', left: a.picture, right: b.picture },
        test: r => a.test(r) || b.test(r),
      });
      push({
        id: `e-un-hp-${i}-${j}`, rung: 'e', family: 'e-unless-pos',
        label: `${a.label} UNLESS ${b.label.toLowerCase()}`,
        picture: { kind: 'compound', op: 'unless', left: a.picture, right: b.picture },
        test: r => a.test(r) && !b.test(r),
      });
      push({
        id: `e-un-ph-${j}-${i}`, rung: 'e', family: 'e-unless-has',
        label: `${b.label} UNLESS ${a.label.toLowerCase()}`,
        picture: { kind: 'compound', op: 'unless', left: b.picture, right: a.picture },
        test: r => b.test(r) && !a.test(r),
      });
    }
  }

  // ---------- RUNG F: Deep rules (3-shell rows, adult-caliber deduction) ----------
  // 1. Parity & size-score rules
  push({
    id: 'f-pts-even', rung: 'f', family: 'f-parity',
    label: 'Total size points is even (small 1, big 2)',
    picture: { kind: 'parity', even: true },
    test: r => sizePoints(r) % 2 === 0,
  });
  push({
    id: 'f-pts-odd', rung: 'f', family: 'f-parity',
    label: 'Total size points is odd (small 1, big 2)',
    picture: { kind: 'parity', even: false },
    test: r => sizePoints(r) % 2 === 1,
  });
  for (const c of [0, 1, 2] as const) {
    push({
      id: `f-even-c${c}`, rung: 'f', family: 'f-parity',
      label: `An even number of ${COLORS[c]} shells`,
      picture: { kind: 'count-color', col: c, op: 'even' },
      test: r => cnt(r, s => s.col === c) % 2 === 0,
    });
    push({
      id: `f-odd-c${c}`, rung: 'f', family: 'f-parity',
      label: `An odd number of ${COLORS[c]} shells`,
      picture: { kind: 'count-color', col: c, op: 'odd' },
      test: r => cnt(r, s => s.col === c) % 2 === 1,
    });
  }
  // 2. Balance & comparison rules
  for (const [c1, c2] of orderedColorPairs) {
    push({
      id: `f-more-c${c1}-c${c2}`, rung: 'f', family: 'f-compare-count',
      label: `More ${COLORS[c1]} than ${COLORS[c2]}`,
      picture: { kind: 'compare', c1, c2, op: 'gt' },
      test: r => cnt(r, s => s.col === c1) > cnt(r, s => s.col === c2),
    });
    push({
      id: `f-ge-c${c1}-c${c2}`, rung: 'f', family: 'f-compare-ge',
      label: `At least as many ${COLORS[c1]} as ${COLORS[c2]}`,
      picture: { kind: 'compare', c1, c2, op: 'ge' },
      test: r => cnt(r, s => s.col === c1) >= cnt(r, s => s.col === c2),
    });
    push({
      id: `f-wgt-c${c1}-c${c2}`, rung: 'f', family: 'f-weighted-balance',
      label: `Total ${COLORS[c1]} size beats total ${COLORS[c2]} size`,
      picture: { kind: 'compare', c1, c2, op: 'wgt' },
      test: r => {
        const w1 = r.reduce((t, s) => t + (s.col === c1 ? (s.big ? 2 : 1) : 0), 0);
        const w2 = r.reduce((t, s) => t + (s.col === c2 ? (s.big ? 2 : 1) : 0), 0);
        return w1 > w2;
      },
    });
  }
  for (const [c1, c2] of colorPairs) {
    push({
      id: `f-eq-c${c1}-c${c2}`, rung: 'f', family: 'f-compare-count',
      label: `Same number of ${COLORS[c1]} and ${COLORS[c2]}`,
      picture: { kind: 'compare', c1, c2, op: 'eq' },
      test: r => cnt(r, s => s.col === c1) === cnt(r, s => s.col === c2),
    });
  }
  // 3. Universal quantifiers ("Every X is Y")
  for (const c of [0, 1, 2] as const) {
    push({
      id: `f-every-big-c${c}`, rung: 'f', family: 'f-every',
      label: `Every big shell is ${COLORS[c]}`,
      picture: { kind: 'every', scope: 'big', targetCol: c },
      test: r => r.every(s => s.big === 0 || s.col === c),
    });
    push({
      id: `f-every-sm-c${c}`, rung: 'f', family: 'f-every',
      label: `Every small shell is ${COLORS[c]}`,
      picture: { kind: 'every', scope: 'small', targetCol: c },
      test: r => r.every(s => s.big === 1 || s.col === c),
    });
    push({
      id: `f-every-c${c}-big`, rung: 'f', family: 'f-every',
      label: `Every ${COLORS[c]} shell is big`,
      picture: { kind: 'every', scope: 'color', scopeCol: c, targetBig: 1 },
      test: r => r.every(s => s.col !== c || s.big === 1),
    });
  }
  push({
    id: 'f-big-same-col', rung: 'f', family: 'f-every-group',
    label: 'The big shells are all the same colour',
    picture: { kind: 'every', scope: 'big', sameColor: true },
    test: r => new Set(r.filter(s => s.big === 1).map(s => s.col)).size <= 1,
  });
  push({
    id: 'f-sm-same-col', rung: 'f', family: 'f-every-group',
    label: 'The small shells are all the same colour',
    picture: { kind: 'every', scope: 'small', sameColor: true },
    test: r => new Set(r.filter(s => s.big === 0).map(s => s.col)).size <= 1,
  });
  push({
    id: 'f-big-diff-col', rung: 'f', family: 'f-every-group',
    label: 'Every big shell has a different colour',
    picture: { kind: 'every', scope: 'big', diffColor: true },
    test: r => {
      const bigs = r.filter(s => s.big === 1);
      return new Set(bigs.map(s => s.col)).size === bigs.length;
    },
  });
  push({
    id: 'f-sm-diff-col', rung: 'f', family: 'f-every-group',
    label: 'Every small shell has a different colour',
    picture: { kind: 'every', scope: 'small', diffColor: true },
    test: r => {
      const smalls = r.filter(s => s.big === 0);
      return new Set(smalls.map(s => s.col)).size === smalls.length;
    },
  });
  push({
    id: 'f-mid-end-col', rung: 'f', family: 'f-mid-end',
    label: 'The middle shell shares a colour with an end',
    picture: { kind: 'mid-matches-end', attr: 'color' },
    test: r => r[1].col === r[0].col || r[1].col === r[2].col,
  });
  push({
    id: 'f-mid-end-sz', rung: 'f', family: 'f-mid-end',
    label: 'The middle shell shares a size with an end',
    picture: { kind: 'mid-matches-end', attr: 'size' },
    test: r => r[1].big === r[0].big || r[1].big === r[2].big,
  });
  push({
    id: 'f-mid-end-ex', rung: 'f', family: 'f-mid-end',
    label: 'The middle shell matches an end shell exactly',
    picture: { kind: 'mid-matches-end', attr: 'exact' },
    test: r => (r[1].col === r[0].col && r[1].big === r[0].big) || (r[1].col === r[2].col && r[1].big === r[2].big),
  });
  // 4. Conditional if-then rules
  for (const [c1, c2] of orderedColorPairs) {
    push({
      id: `f-if-c${c1}-c${c2}`, rung: 'f', family: 'f-if-then-color',
      label: `If there is ${COLORS[c1]}, there is ${COLORS[c2]}`,
      picture: { kind: 'compound', op: 'implies', left: { kind: 'has-color', col: c1 }, right: { kind: 'has-color', col: c2 } },
      test: r => cnt(r, s => s.col === c1) === 0 || cnt(r, s => s.col === c2) > 0,
    });
  }
  for (const c of [0, 1, 2] as const) {
    push({
      id: `f-if-p0big-p2c${c}`, rung: 'f', family: 'f-if-then-pos',
      label: `If the first is big, the last is ${COLORS[c]}`,
      picture: { kind: 'compound', op: 'implies', left: { kind: 'pos', pos: 0, big: 1 }, right: { kind: 'pos', pos: 2, col: c } },
      test: r => r[0].big === 0 || r[2].col === c,
    });
    push({
      id: `f-if-p0c${c}-p2big`, rung: 'f', family: 'f-if-then-pos',
      label: `If the first is ${COLORS[c]}, the last is big`,
      picture: { kind: 'compound', op: 'implies', left: { kind: 'pos', pos: 0, col: c }, right: { kind: 'pos', pos: 2, big: 1 } },
      test: r => r[0].col !== c || r[2].big === 1,
    });
    push({
      id: `f-if-p1c${c}-p0big`, rung: 'f', family: 'f-if-then-pos',
      label: `If the middle is ${COLORS[c]}, the first is big`,
      picture: { kind: 'compound', op: 'implies', left: { kind: 'pos', pos: 1, col: c }, right: { kind: 'pos', pos: 0, big: 1 } },
      test: r => r[1].col !== c || r[0].big === 1,
    });
    push({
      id: `f-if-p2c${c}-p1sm`, rung: 'f', family: 'f-if-then-pos',
      label: `If the last is ${COLORS[c]}, the middle is small`,
      picture: { kind: 'compound', op: 'implies', left: { kind: 'pos', pos: 2, col: c }, right: { kind: 'pos', pos: 1, big: 0 } },
      test: r => r[2].col !== c || r[1].big === 0,
    });
    push({
      id: `f-if-p0c${c}-p2c${c}`, rung: 'f', family: 'f-if-then-pos',
      label: `If the first is ${COLORS[c]}, the last is ${COLORS[c]}`,
      picture: { kind: 'compound', op: 'implies', left: { kind: 'pos', pos: 0, col: c }, right: { kind: 'pos', pos: 2, col: c } },
      test: r => r[0].col !== c || r[2].col === c,
    });
  }
  // 5. Exclusive-OR ("Either ... or ..., not both") rules
  for (const [c1, c2] of colorPairs) {
    push({
      id: `f-xor-c${c1}-c${c2}`, rung: 'f', family: 'f-xor-color',
      label: `Either ${COLORS[c1]} or ${COLORS[c2]}, not both`,
      picture: { kind: 'compound', op: 'xor', left: { kind: 'has-color', col: c1 }, right: { kind: 'has-color', col: c2 } },
      test: r => (cnt(r, s => s.col === c1) > 0) !== (cnt(r, s => s.col === c2) > 0),
    });
    push({
      id: `f-xor-big-c${c1}-c${c2}`, rung: 'f', family: 'f-xor-color',
      label: `Either a big ${COLORS[c1]} or a big ${COLORS[c2]}, not both`,
      picture: { kind: 'compound', op: 'xor', left: { kind: 'has-shell', shell: codeOf(c1, 1) }, right: { kind: 'has-shell', shell: codeOf(c2, 1) } },
      test: r => (cnt(r, s => s.col === c1 && s.big === 1) > 0) !== (cnt(r, s => s.col === c2 && s.big === 1) > 0),
    });
    push({
      id: `f-xor-sm-c${c1}-c${c2}`, rung: 'f', family: 'f-xor-color',
      label: `Either a small ${COLORS[c1]} or a small ${COLORS[c2]}, not both`,
      picture: { kind: 'compound', op: 'xor', left: { kind: 'has-shell', shell: codeOf(c1, 0) }, right: { kind: 'has-shell', shell: codeOf(c2, 0) } },
      test: r => (cnt(r, s => s.col === c1 && s.big === 0) > 0) !== (cnt(r, s => s.col === c2 && s.big === 0) > 0),
    });
  }
  for (const c of [0, 1, 2] as const) {
    for (const c2 of [0, 1, 2] as const) {
      push({
        id: `f-xor-p0c${c}-p2c${c2}`, rung: 'f', family: 'f-xor-pos',
        label: `Either first is ${COLORS[c]} or last is ${COLORS[c2]}, not both`,
        picture: { kind: 'compound', op: 'xor', left: { kind: 'pos', pos: 0, col: c }, right: { kind: 'pos', pos: 2, col: c2 } },
        test: r => (r[0].col === c) !== (r[2].col === c2),
      });
    }
    push({
      id: `f-xor-p0big-p1c${c}`, rung: 'f', family: 'f-xor-pos',
      label: `Either first is big or middle is ${COLORS[c]}, not both`,
      picture: { kind: 'compound', op: 'xor', left: { kind: 'pos', pos: 0, big: 1 }, right: { kind: 'pos', pos: 1, col: c } },
      test: r => (r[0].big === 1) !== (r[1].col === c),
    });
    push({
      id: `f-xor-p1big-p2c${c}`, rung: 'f', family: 'f-xor-pos',
      label: `Either middle is big or last is ${COLORS[c]}, not both`,
      picture: { kind: 'compound', op: 'xor', left: { kind: 'pos', pos: 1, big: 1 }, right: { kind: 'pos', pos: 2, col: c } },
      test: r => (r[1].big === 1) !== (r[2].col === c),
    });
    push({
      id: `f-xor-p2big-p0c${c}`, rung: 'f', family: 'f-xor-pos',
      label: `Either last is big or first is ${COLORS[c]}, not both`,
      picture: { kind: 'compound', op: 'xor', left: { kind: 'pos', pos: 2, big: 1 }, right: { kind: 'pos', pos: 0, col: c } },
      test: r => (r[2].big === 1) !== (r[0].col === c),
    });
  }

  // Canonical deduplication by full 216-row truth table (and 36-row table for Rung A).
  const seen216 = new Set<string>();
  const seen36A = new Set<string>();
  const out: RuleDef[] = [];
  for (const r of raw) {
    const t216 = ROWS_3.map(row => (r.test(row) ? '1' : '0')).join('');
    let pass216 = 0;
    for (let i = 0; i < 216; i++) if (t216[i] === '1') pass216++;
    if (pass216 < 12 || pass216 > 204) continue;
    if (seen216.has(t216)) continue;

    let t36 = '';
    let pass36 = 0;
    if (r.rung === 'a') {
      t36 = ROWS_2.map(row => (r.test(row) ? '1' : '0')).join('');
      for (let i = 0; i < 36; i++) if (t36[i] === '1') pass36++;
      if (pass36 < 6 || pass36 > 30) continue;
      if (seen36A.has(t36)) continue;
      seen36A.add(t36);
    } else {
      t36 = '';
      pass36 = 0;
    }

    seen216.add(t216);
    out.push({
      ...r,
      table216: t216,
      tableHash: sha256Hex(t216),
      table36: t36,
      pass216,
      pass36,
    });
  }
  return out;
}

export const ALL_RULES: readonly RuleDef[] = buildCatalog();
export const RULE_BY_ID: ReadonlyMap<string, RuleDef> = new Map(ALL_RULES.map(r => [r.id, r]));
export const RULES_BY_RUNG: Readonly<Record<Rung, readonly RuleDef[]>> = {
  a: ALL_RULES.filter(r => r.rung === 'a'),
  b: ALL_RULES.filter(r => r.rung === 'b'),
  c: ALL_RULES.filter(r => r.rung === 'c'),
  d: ALL_RULES.filter(r => r.rung === 'd'),
  e: ALL_RULES.filter(r => r.rung === 'e'),
  f: ALL_RULES.filter(r => r.rung === 'f'),
};

/**
 * Cumulative public hypothesis space for each rung.
 * Rung A operates on 2-shell rows (only Rung A rules); Rungs B-F accumulate all rules up to that rung
 * over the full 216-row 3-shell universe.
 */
export const HYPOTHESES_FOR_RUNG: Readonly<Record<Rung, readonly RuleDef[]>> = {
  a: RULES_BY_RUNG.a,
  b: [...RULES_BY_RUNG.a, ...RULES_BY_RUNG.b],
  c: [...RULES_BY_RUNG.a, ...RULES_BY_RUNG.b, ...RULES_BY_RUNG.c],
  d: [...RULES_BY_RUNG.a, ...RULES_BY_RUNG.b, ...RULES_BY_RUNG.c, ...RULES_BY_RUNG.d],
  e: [...RULES_BY_RUNG.a, ...RULES_BY_RUNG.b, ...RULES_BY_RUNG.c, ...RULES_BY_RUNG.d, ...RULES_BY_RUNG.e],
  f: ALL_RULES,
};

export const rungLength = (rung: Rung): RowLen => (rung === 'a' ? 2 : 3);
export const rungIndex = (rung: Rung): number => RUNGS.indexOf(rung);

export function evaluateRow(rule: RuleDef, len: RowLen, rowIdx: number): boolean {
  if (len === 2) return rule.table36 ? rule.table36[rowIdx] === '1' : rule.test(ROWS_2[rowIdx]);
  return rule.table216[rowIdx] === '1';
}

export type EvidenceEntry = { readonly row: number; readonly pass: boolean };

export type CounterexampleInfo = {
  readonly row: number;
  readonly actualPass: boolean;
  readonly contrastRow: number | null;
  readonly contrastPass: boolean | null;
  readonly note: string;
};

/** Compact immutable puzzle descriptor. */
export type GatePuzzle = {
  readonly len: RowLen;
  readonly rung: Rung;
  readonly ruleId: string;
  readonly starters: readonly [number, number, number, number];
  readonly quiz: readonly [number, number, number, number, number];
  readonly backups: readonly number[];
};

/** Compact pack tuple: [len, rung, ruleId, starters, quiz, backups]. */
export type GateTuple = [RowLen, Rung, string, number[], number[], number[]];

export const puzzleTuple = (p: GatePuzzle): GateTuple => [
  p.len, p.rung, p.ruleId, [...p.starters], [...p.quiz], [...p.backups],
];

export function validPuzzle(p: GatePuzzle): boolean {
  if ((p.len !== 2 && p.len !== 3) || !RUNGS.includes(p.rung) || p.len !== rungLength(p.rung)) return false;
  const rule = RULE_BY_ID.get(p.ruleId);
  if (!rule || rungIndex(rule.rung) > rungIndex(p.rung)) return false;
  if (p.starters.length !== 4 || p.quiz.length !== 5 || p.backups.length < 3 || p.backups.length > 10) return false;
  const all = [...p.starters, ...p.quiz, ...p.backups];
  if (!all.every(r => isRowIndex(p.len, r)) || new Set(all).size !== all.length) return false;
  // Starters must contain 2 PASS and 2 BLOCK (holds for every twin world matching starter evidence).
  const starterPass = p.starters.filter(r => evaluateRow(rule, p.len, r)).length;
  if (starterPass !== 2) return false;
  return true;
}

export function tuplePuzzle(x: unknown): GatePuzzle | null {
  if (!Array.isArray(x) || x.length !== 6) return null;
  const [len, rung, ruleId, starters, quiz, backups] = x;
  if ((len !== 2 && len !== 3) || typeof rung !== 'string' || !RUNGS.includes(rung as Rung) || typeof ruleId !== 'string') return null;
  if (!Array.isArray(starters) || starters.length !== 4 || !Array.isArray(quiz) || quiz.length !== 5 || !Array.isArray(backups)) return null;
  if (![...starters, ...quiz, ...backups].every(n => isRowIndex(len, n))) return null;
  const p: GatePuzzle = {
    len,
    rung: rung as Rung,
    ruleId,
    starters: [starters[0], starters[1], starters[2], starters[3]],
    quiz: [quiz[0], quiz[1], quiz[2], quiz[3], quiz[4]],
    backups: [...backups],
  };
  return validPuzzle(p) ? p : null;
}

export function starterEvidence(p: GatePuzzle): EvidenceEntry[] {
  const rule = RULE_BY_ID.get(p.ruleId)!;
  return p.starters.map(row => ({ row, pass: evaluateRow(rule, p.len, row) }));
}

/** Public inference: all rules in the rung's hypothesis family consistent with public evidence. */
export function liveHypotheses(rung: Rung, len: RowLen, evidence: readonly EvidenceEntry[]): RuleDef[] {
  const pool = HYPOTHESES_FOR_RUNG[rung];
  return pool.filter(h => evidence.every(e => evaluateRow(h, len, e.row) === e.pass));
}

/**
 * Pure public-information minimax splitter: picks the lowest-index untested row that minimizes
 * the worst-case remaining hypothesis count `max(yes, live - yes)`.
 * Never inspects the hidden rule!
 */
export function bestSplittingRow(rung: Rung, len: RowLen, evidence: readonly EvidenceEntry[]): number | null {
  const live = liveHypotheses(rung, len, evidence);
  if (live.length <= 1) return null;
  const tested = new Set(evidence.map(e => e.row));
  const space = rowSpaceSize(len);
  let best = -1;
  let bestWorst = Infinity;
  for (let row = 0; row < space; row++) {
    if (tested.has(row)) continue;
    let yes = 0;
    for (let k = 0; k < live.length; k++) if (evaluateRow(live[k], len, row)) yes++;
    if (yes === 0 || yes === live.length) continue;
    const worst = Math.max(yes, live.length - yes);
    if (worst < bestWorst) {
      bestWorst = worst;
      best = row;
      if (worst === Math.ceil(live.length / 2)) break;
    }
  }
  return best >= 0 ? best : null;
}

/** Similarity between two rows: number of matching slot colours + matching slot sizes (0..2*len). */
export function rowSimilarity(len: RowLen, a: number, b: number): number {
  const sa = len === 2 ? ROWS_2[a] : ROWS_3[a];
  const sb = len === 2 ? ROWS_2[b] : ROWS_3[b];
  let score = 0;
  for (let i = 0; i < len; i++) {
    if (sa[i].col === sb[i].col) score++;
    if (sa[i].big === sb[i].big) score++;
  }
  return score;
}

/**
 * Simulates the naive "copy-nearest tested row" habit: for each quiz row, finds the most similar
 * evidence row (highest matching features, deterministic tiebreak) and copies its PASS/BLOCK label.
 * Returns true iff the naive habit passes ALL 5 quiz rows.
 */
export function copyNearestPasses(
  len: RowLen,
  rule: RuleDef,
  evidenceRows: readonly number[],
  quizRows: readonly number[],
): boolean {
  if (!evidenceRows.length) return false;
  for (const q of quizRows) {
    let bestRow = evidenceRows[0];
    let bestScore = -1;
    for (const e of evidenceRows) {
      const score = rowSimilarity(len, q, e);
      if (score > bestScore) {
        bestScore = score;
        bestRow = e;
      }
    }
    if (evaluateRow(rule, len, bestRow) !== evaluateRow(rule, len, q)) return false;
  }
  return true;
}

/**
 * Finds the most similar tested row with the OPPOSITE outcome to serve as a gentle visual
 * counterexample comparison when the player misses a quiz row.
 */
export function closestContrastingEvidence(
  len: RowLen,
  rowIdx: number,
  actualPass: boolean,
  evidence: readonly EvidenceEntry[],
): EvidenceEntry | null {
  let best: EvidenceEntry | null = null;
  let bestScore = -1;
  for (const e of evidence) {
    if (e.pass === actualPass) continue;
    const score = rowSimilarity(len, rowIdx, e.row);
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/** Plain-English description of what changed between two shell rows for the counterexample callout. */
export function compareRowsText(len: RowLen, rowA: number, rowB: number): string {
  const a = rowCodes(len, rowA), b = rowCodes(len, rowB);
  const diffs: string[] = [];
  const names = len === 2 ? ['first', 'second'] : ['first', 'middle', 'last'];
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) diffs.push(`the ${names[i]} shell`);
  }
  if (!diffs.length) return 'Both rows are the same.';
  if (diffs.length === 1) return `Only ${diffs[0]} changed between these two rows.`;
  return `Compare ${diffs.join(' and ')}.`;
}

/**
 * Runs the pure public minimax tester from the puzzle's starter examples until only 1 hypothesis
 * remains in HYPOTHESES_FOR_RUNG[rung].
 */
export function goodTesterWitness(p: GatePuzzle, maxTests = 16): {
  tests: number[];
  lower: number;
  upper: number;
  liveAfterStarters: number;
  identified: boolean;
} {
  const rule = RULE_BY_ID.get(p.ruleId)!;
  const ev = starterEvidence(p);
  const live0 = liveHypotheses(p.rung, p.len, ev);
  const tests: number[] = [];
  let live = live0;
  while (live.length > 1 && tests.length < maxTests) {
    const next = bestSplittingRow(p.rung, p.len, ev);
    if (next === null) break;
    tests.push(next);
    ev.push({ row: next, pass: evaluateRow(rule, p.len, next) });
    live = liveHypotheses(p.rung, p.len, ev);
  }
  const lower = live0.length <= 1 ? 0 : Math.min(tests.length, 1);
  return { tests, lower, upper: tests.length, liveAfterStarters: live0.length, identified: live.length === 1 };
}

/**
 * Picks a deterministic replacement quiz row after a quiz miss reveals one row as a counterexample.
 * Uses only the puzzle's backups first, then falls back to the highest-disagreement unseen row in the space.
 */
export function nextQuizReplacement(
  p: GatePuzzle,
  usedRows: ReadonlySet<number>,
  needPass: boolean,
): number | null {
  const rule = RULE_BY_ID.get(p.ruleId)!;
  for (const b of p.backups) {
    if (!usedRows.has(b) && evaluateRow(rule, p.len, b) === needPass) return b;
  }
  for (const b of p.backups) {
    if (!usedRows.has(b)) return b;
  }
  const space = rowSpaceSize(p.len);
  for (let r = 0; r < space; r++) {
    if (!usedRows.has(r) && evaluateRow(rule, p.len, r) === needPass) return r;
  }
  for (let r = 0; r < space; r++) {
    if (!usedRows.has(r)) return r;
  }
  return null;
}

/** Checks that the 5 quiz answers are not a trivial alternating pattern (P,B,P,B,P or B,P,B,P,B). */
export function isNonAlternating(answers: readonly boolean[]): boolean {
  if (answers.length !== 5) return false;
  const alt1 = answers.every((v, i) => v === (i % 2 === 0));
  const alt2 = answers.every((v, i) => v === (i % 2 === 1));
  return !alt1 && !alt2;
}

/**
 * Builds a complete, validated GatePuzzle for a given rule & RNG:
 * - 4 starter rows (2 PASS, 2 BLOCK) leaving >= 2 hypotheses live (so hidden worlds exist & thinking matters)
 * - 5 balanced quiz rows (3 PASS + 2 BLOCK or 2 PASS + 3 BLOCK) picked where rival rules disagree most
 * - Non-alternating quiz order (blocks naive alternating bots)
 * - 6 balanced backup rows for counterexample replacements
 */
export function constructPuzzle(rule: RuleDef, rng: Rng): GatePuzzle | null {
  const len = rungLength(rule.rung);
  const space = rowSpaceSize(len);
  const pool = HYPOTHESES_FOR_RUNG[rule.rung];
  const allPass: number[] = [];
  const allBlock: number[] = [];
  for (let i = 0; i < space; i++) {
    if (evaluateRow(rule, len, i)) allPass.push(i);
    else allBlock.push(i);
  }
  if (allPass.length < 7 || allBlock.length < 7) return null;

  // Try up to 12 starter draws to find 2 PASS + 2 BLOCK that leave >= 2 hypotheses live.
  let starters: [number, number, number, number] | null = null;
  let liveRivals: RuleDef[] = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const pShuf = rng.shuffle(allPass);
    const bShuf = rng.shuffle(allBlock);
    const cand: [number, number, number, number] = [pShuf[0], pShuf[1], bShuf[0], bShuf[1]];
    const ev: EvidenceEntry[] = [
      { row: cand[0], pass: true },
      { row: cand[1], pass: true },
      { row: cand[2], pass: false },
      { row: cand[3], pass: false },
    ];
    const live = pool.filter(h => h.id !== rule.id && ev.every(e => evaluateRow(h, len, e.row) === e.pass));
    if (live.length >= 1) {
      starters = cand;
      liveRivals = live;
      break;
    }
  }
  if (!starters) return null;

  const starterSet = new Set<number>(starters);
  const disagreeScore = (rowIdx: number): number => {
    const truth = evaluateRow(rule, len, rowIdx);
    let score = 0;
    for (let k = 0; k < liveRivals.length; k++) {
      if (evaluateRow(liveRivals[k], len, rowIdx) !== truth) score++;
    }
    return score;
  };

  // Prefer rows that disagree with the most rival rules AND fool the nearest-starter heuristic.
  const foolsNearest = (rowIdx: number): number => {
    let bestRow = starters![0];
    let bestSim = -1;
    for (const s of starters!) {
      const sim = rowSimilarity(len, rowIdx, s);
      if (sim > bestSim) { bestSim = sim; bestRow = s; }
    }
    return evaluateRow(rule, len, bestRow) !== evaluateRow(rule, len, rowIdx) ? 1 : 0;
  };

  const rank = (rows: number[]) =>
    rng.shuffle(rows.filter(r => !starterSet.has(r))).sort((a, b) => {
      const da = disagreeScore(a), db = disagreeScore(b);
      if (db !== da) return db - da;
      return foolsNearest(b) - foolsNearest(a);
    });

  const rankedPass = rank(allPass);
  const rankedBlock = rank(allBlock);
  const threePass = rng.below(2) === 0;
  const pickPass = rankedPass.slice(0, threePass ? 3 : 2);
  const pickBlock = rankedBlock.slice(0, threePass ? 2 : 3);
  if (pickPass.length + pickBlock.length !== 5) return null;

  // Shuffle quiz order while ensuring non-alternating truth vector.
  let quizArr = rng.shuffle([...pickPass, ...pickBlock]);
  for (let tries = 0; tries < 8 && !isNonAlternating(quizArr.map(r => evaluateRow(rule, len, r))); tries++) {
    quizArr = rng.shuffle([...pickPass, ...pickBlock]);
  }
  if (!isNonAlternating(quizArr.map(r => evaluateRow(rule, len, r)))) {
    // Deterministic non-alternating order: put two same-outcome rows first.
    quizArr = [...pickPass, ...pickBlock];
  }

  const quizSet = new Set<number>(quizArr);
  const remPass = rankedPass.filter(r => !quizSet.has(r)).slice(0, 3);
  const remBlock = rankedBlock.filter(r => !quizSet.has(r)).slice(0, 3);
  const backups = [...remPass, ...remBlock];
  if (backups.length < 3) return null;

  const puzzle: GatePuzzle = {
    len,
    rung: rule.rung,
    ruleId: rule.id,
    starters,
    quiz: [quizArr[0], quizArr[1], quizArr[2], quizArr[3], quizArr[4]],
    backups,
  };
  return validPuzzle(puzzle) ? puzzle : null;
}
