import { createRng } from "../../../puzzles/rng";

const STONE_NAMES: Record<string, string> = {
  coral: "coral ring",
  jade: "jade triangle",
  blue: "blue cross",
  gold: "gold stripes",
  plum: "plum diamond",
};

export function describePatternToken(token: string): string {
  if (token.startsWith("stone:")) {
    const [, color, scale, turn] = token.split(":");
    const sizeText = scale && scale !== "0" ? `, size ${scale}` : "";
    const turnText = turn ? `, pointing ${turn}` : "";
    return `${STONE_NAMES[color] ?? color}${sizeText}${turnText}`;
  }
  if (token.startsWith("shells:")) return `${token.split(":")[1]} shells`;
  if (token.startsWith("arrow:")) return `${token.split(":")[1]} arrow`;
  return token;
}

export const COLORS = ["coral", "blue", "gold", "jade", "plum"] as const;
export const DIRS = ["up", "right", "down", "left"] as const;
export type StoneColor = (typeof COLORS)[number];
export type ArrowDir = (typeof DIRS)[number];

export const shells = (n: number) => `shells:${n}`;
export const arrow = (dir: ArrowDir) => `arrow:${dir}`;
export const stone = (color: StoneColor, size = 0, turn?: ArrowDir) =>
  turn ? `stone:${color}:${size}:${turn}` : size ? `stone:${color}:${size}` : `stone:${color}`;

export const RULE_IDS = [
  // Band a: color cycles (5)
  "color-ab", "color-abb", "color-aab", "color-abc", "color-aabb",
  // Band b: shells & arrows (5)
  "shell-up", "shell-down", "shell-bounce", "arrow-cw", "arrow-ccw",
  // Band c: arithmetic & multi-clue stones with turn (6)
  "num-add", "num-sub", "stone-color-size", "stone-color-turn", "stone-size-turn", "stone-color-size-turn",
  // Band d: growth & nonlinear number families (6)
  "num-double", "num-triple", "num-square", "num-square-plus", "num-fib", "num-grow-step",
  // Band e: two-rule & alternating number trails (4)
  "two-double-sub", "two-add-sub", "two-add-mul", "two-interleaved",
  // Band f: 3x3 pattern grids (4)
  "grid-color-size", "grid-color-turn", "grid-add-rc", "grid-row-mul",
] as const;

export type RuleId = (typeof RULE_IDS)[number];
export type PatternBand = "a" | "b" | "c" | "d" | "e" | "f";
export type RuleFamily = "color" | "shell" | "arrow" | "two-clue" | "number" | "two-rule" | "grid";

export type CatalogRule = {
  id: RuleId;
  band: PatternBand;
  family: RuleFamily;
  /** Short rule card shown in Say-the-rule dares and Rule hints (never leaks the answer stone). */
  card: string;
  /** Family-level look cue (step 1 of hint ladder). */
  lookCue: string;
};

export const RULE_CATALOG: readonly CatalogRule[] = [
  { id: "color-ab", band: "a", family: "color", card: "Alternate two colors (A, B)", lookCue: "Watch two stone colors trade places every step." },
  { id: "color-abb", band: "a", family: "color", card: "Repeat one, then two (A, B, B)", lookCue: "Group the trail in threes: one first color, then two of the next." },
  { id: "color-aab", band: "a", family: "color", card: "Repeat two, then one (A, A, B)", lookCue: "Group the trail in threes: two of one color, then one of the next." },
  { id: "color-abc", band: "a", family: "color", card: "Cycle three colors (A, B, C)", lookCue: "Three different colors repeat in the same order." },
  { id: "color-aabb", band: "a", family: "color", card: "Repeat in pairs (A, A, B, B)", lookCue: "Each color appears twice in a row before switching." },

  { id: "shell-up", band: "b", family: "shell", card: "Add 1 shell each step", lookCue: "Count the shells from left to right: the pile grows by one." },
  { id: "shell-down", band: "b", family: "shell", card: "Take away 1 shell each step", lookCue: "Count the shells from left to right: one shell leaves each step." },
  { id: "shell-bounce", band: "b", family: "shell", card: "Shells climb up, then back down", lookCue: "The shell counts rise to a middle peak (or valley) and mirror back." },
  { id: "arrow-cw", band: "b", family: "arrow", card: "Turn clockwise one quarter turn", lookCue: "Follow the arrow point: it turns clockwise each step." },
  { id: "arrow-ccw", band: "b", family: "arrow", card: "Turn counter-clockwise one quarter turn", lookCue: "Follow the arrow point: it turns counter-clockwise each step." },

  { id: "num-add", band: "c", family: "number", card: "Add the same number each step", lookCue: "Find the difference between neighboring numbers: the jump stays steady." },
  { id: "num-sub", band: "c", family: "number", card: "Subtract the same number each step", lookCue: "The numbers shrink by the exact same jump every step." },
  { id: "stone-color-size", band: "c", family: "two-clue", card: "Track color and size together", lookCue: "Check two clues separately: the stone color and the stone size." },
  { id: "stone-color-turn", band: "c", family: "two-clue", card: "Track color and pointer turn", lookCue: "Check two clues separately: the stone color and which way the pointer turns." },
  { id: "stone-size-turn", band: "c", family: "two-clue", card: "Track size and pointer turn", lookCue: "Check two clues separately: the stone size and which way the pointer turns." },
  { id: "stone-color-size-turn", band: "c", family: "two-clue", card: "Track color, size, and turn", lookCue: "Follow all three clues one by one: color, size, and pointer turn." },

  { id: "num-double", band: "d", family: "number", card: "Double each step (×2)", lookCue: "Compare each number with the one before it: it doubles every step." },
  { id: "num-triple", band: "d", family: "number", card: "Triple each step (×3)", lookCue: "Each stone is three times the stone before it." },
  { id: "num-square", band: "d", family: "number", card: "Square numbers (n × n)", lookCue: "Think of multiplying counting numbers by themselves: 1×1, 2×2, 3×3…" },
  { id: "num-square-plus", band: "d", family: "number", card: "Square numbers plus a constant", lookCue: "Look at how far each stone sits above a square number." },
  { id: "num-fib", band: "d", family: "number", card: "Add the previous two stones", lookCue: "Try adding two neighboring stones together to make the next stone." },
  { id: "num-grow-step", band: "d", family: "number", card: "Jumps grow by 1 each step", lookCue: "Measure the jumps between neighbors: each jump is 1 larger than the last." },

  { id: "two-double-sub", band: "e", family: "two-rule", card: "Double, then take away the same amount", lookCue: "Two rules take turns: first multiply by 2, then subtract." },
  { id: "two-add-sub", band: "e", family: "two-rule", card: "Add one jump, then subtract another", lookCue: "Two rules take turns: one step goes up, the next step goes down." },
  { id: "two-add-mul", band: "e", family: "two-rule", card: "Add a jump, then double", lookCue: "Two rules take turns: add first, then multiply by 2." },
  { id: "two-interleaved", band: "e", family: "two-rule", card: "Two woven number paths", lookCue: "Skip every other stone: odd spots and even spots follow two separate jumps." },

  { id: "grid-color-size", band: "f", family: "grid", card: "Rows keep color, columns change size", lookCue: "Read across each row for color and down each column for size." },
  { id: "grid-color-turn", band: "f", family: "grid", card: "Rows keep color, columns turn pointer", lookCue: "Read across each row for color and follow the pointer turn across columns." },
  { id: "grid-add-rc", band: "f", family: "grid", card: "Add across rows, add down columns", lookCue: "Check the jump across each row and the different jump down each column." },
  { id: "grid-row-mul", band: "f", family: "grid", card: "Multiply the first two in each row", lookCue: "Look across each row: the first two numbers combine to make the third." },
] as const;

export const RULE_BY_ID: Record<RuleId, CatalogRule> = Object.fromEntries(
  RULE_CATALOG.map((r) => [r.id, r]),
) as Record<RuleId, CatalogRule>;

export type PatternPuzzle = {
  ruleId: RuleId;
  tiles: string[];
  /** Sorted gap indices (1 or 2 gaps). In 1D trails, every gap is >= 2. */
  gaps: number[];
  /** Distinct choice tokens (includes every answer token + wrong-rule decoys). */
  choices: string[];
  /** Optional rule cards for Say-the-rule dares/Challenge (includes ruleId). */
  ruleChoices?: RuleId[];
  /** True for 3x3 grids (tiles.length === 9). */
  grid: boolean;
  title: string;
  /** Pure rule explanation (never names the answer stone!). */
  ruleHint: string;
  /** Step-2 guidance (names where to apply the rule, still not the answer stone). */
  thinkHint: string;
};

const parseIntToken = (t: string): number | null => (/^-?\d+$/.test(t) ? Number(t) : null);
const parseShell = (t: string): number | null => (t.startsWith("shells:") ? parseIntToken(t.slice(7)) : null);
const parseArrow = (t: string): number | null => {
  if (!t.startsWith("arrow:")) return null;
  const idx = DIRS.indexOf(t.slice(6) as ArrowDir);
  return idx >= 0 ? idx : null;
};
type ParsedStone = { color: StoneColor; size: number; turn: number | null };
const parseStone = (t: string): ParsedStone | null => {
  if (!t.startsWith("stone:")) return null;
  const parts = t.split(":");
  const color = parts[1] as StoneColor;
  if (!COLORS.includes(color)) return null;
  if (parts.length === 2) return { color, size: 0, turn: null };
  const size = Number(parts[2]);
  if (!Number.isInteger(size) || size < 0 || size > 3) return null;
  if (parts.length === 3) return size > 0 ? { color, size, turn: null } : null;
  if (parts.length === 4) {
    const turn = DIRS.indexOf(parts[3] as ArrowDir);
    return turn >= 0 ? { color, size, turn } : null;
  }
  return null;
};

/**
 * Independent catalog-rule matcher.
 * Given visible tiles (null at gap indices), returns EVERY rule in the 30-rule catalog
 * that can validly generate all visible tiles, along with the distinct gap-completion
 * tuples that rule admits.
 */
export function matchCatalogRule(ruleId: RuleId, visible: readonly (string | null)[]): string[][] {
  const n = visible.length;
  const gaps: number[] = [];
  for (let i = 0; i < n; i++) if (visible[i] === null) gaps.push(i);
  const fits = (cand: readonly string[]): boolean => {
    if (cand.length !== n) return false;
    for (let i = 0; i < n; i++) if (visible[i] !== null && visible[i] !== cand[i]) return false;
    return true;
  };
  const seen = new Set<string>();
  const solutions: string[][] = [];
  const record = (cand: readonly string[]) => {
    if (!fits(cand)) return;
    const tuple = gaps.map((g) => cand[g]);
    const key = tuple.join("\0");
    if (!seen.has(key)) {
      seen.add(key);
      solutions.push(tuple);
    }
  };

  // Pre-classify token domain to prune impossible rule families quickly without missing anything.
  const shown = visible.filter((t): t is string => t !== null);
  if (shown.length === 0) return [];
  const isPlainColorStone = shown.every((t) => { const p = parseStone(t); return p !== null && p.size === 0 && p.turn === null; });
  const isSizedStone = shown.every((t) => { const p = parseStone(t); return p !== null && p.size > 0 && p.turn === null; });
  const isTurnedStoneNoSize = shown.every((t) => { const p = parseStone(t); return p !== null && p.size === 0 && p.turn !== null; });
  const isSizedTurnedStone = shown.every((t) => { const p = parseStone(t); return p !== null && p.size > 0 && p.turn !== null; });
  const isShell = shown.every((t) => parseShell(t) !== null);
  const isArrow = shown.every((t) => parseArrow(t) !== null);
  const isNumber = shown.every((t) => parseIntToken(t) !== null);

  if (n === 7) {
    switch (ruleId) {
      case "color-ab": {
        if (!isPlainColorStone) return [];
        for (const a of COLORS) for (const b of COLORS) if (a !== b) {
          record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(i % 2 === 0 ? a : b)));
        }
        return solutions;
      }
      case "color-abb": {
        if (!isPlainColorStone) return [];
        for (const a of COLORS) for (const b of COLORS) if (a !== b) {
          const cyc = [a, b, b];
          record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(cyc[i % 3])));
        }
        return solutions;
      }
      case "color-aab": {
        if (!isPlainColorStone) return [];
        for (const a of COLORS) for (const b of COLORS) if (a !== b) {
          const cyc = [a, a, b];
          record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(cyc[i % 3])));
        }
        return solutions;
      }
      case "color-abc": {
        if (!isPlainColorStone) return [];
        for (const a of COLORS) for (const b of COLORS) if (b !== a) for (const c of COLORS) if (c !== a && c !== b) {
          const cyc = [a, b, c];
          record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(cyc[i % 3])));
        }
        return solutions;
      }
      case "color-aabb": {
        if (!isPlainColorStone) return [];
        for (const a of COLORS) for (const b of COLORS) if (a !== b) {
          const cyc = [a, a, b, b];
          record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(cyc[i % 4])));
        }
        return solutions;
      }
      case "shell-up": {
        if (!isShell) return [];
        for (let s = 1; s <= 4; s++) record([0, 1, 2, 3, 4, 5, 6].map((i) => shells(s + i)));
        return solutions;
      }
      case "shell-down": {
        if (!isShell) return [];
        for (let s = 7; s <= 10; s++) record([0, 1, 2, 3, 4, 5, 6].map((i) => shells(s - i)));
        return solutions;
      }
      case "shell-bounce": {
        if (!isShell) return [];
        for (let s = 1; s <= 5; s++) {
          record([0, 1, 2, 3, 2, 1, 0].map((d) => shells(s + d)));
          record([3, 2, 1, 0, 1, 2, 3].map((d) => shells(s + d)));
        }
        return solutions;
      }
      case "arrow-cw": {
        if (!isArrow) return [];
        for (let s = 0; s < 4; s++) record([0, 1, 2, 3, 4, 5, 6].map((i) => arrow(DIRS[(s + i) % 4])));
        return solutions;
      }
      case "arrow-ccw": {
        if (!isArrow) return [];
        for (let s = 0; s < 4; s++) record([0, 1, 2, 3, 4, 5, 6].map((i) => arrow(DIRS[(s + 40 - i) % 4])));
        return solutions;
      }
      case "stone-color-size": {
        if (!isSizedStone) return [];
        for (const a of COLORS) for (const b of COLORS) if (a !== b) {
          for (const sizePattern of [[1, 1, 2, 2, 1, 1, 2], [1, 2, 3, 1, 2, 3, 1], [3, 2, 1, 3, 2, 1, 3]] as const) {
            record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(i % 2 === 0 ? a : b, sizePattern[i])));
          }
        }
        return solutions;
      }
      case "stone-color-turn": {
        if (!isTurnedStoneNoSize) return [];
        for (const a of COLORS) for (const b of COLORS) if (a !== b) {
          for (let d0 = 0; d0 < 4; d0++) for (const step of [1, 3] as const) {
            record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(i % 2 === 0 ? a : b, 0, DIRS[(d0 + i * step) % 4])));
          }
        }
        return solutions;
      }
      case "stone-size-turn": {
        if (!isSizedTurnedStone) return [];
        const first = parseStone(shown[0])!;
        if (shown.some((t) => parseStone(t)!.color !== first.color)) return [];
        for (const sizePattern of [[1, 2, 3, 1, 2, 3, 1], [3, 2, 1, 3, 2, 1, 3], [1, 1, 2, 2, 1, 1, 2]] as const) {
          for (let d0 = 0; d0 < 4; d0++) for (const step of [1, 3] as const) {
            record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(first.color, sizePattern[i], DIRS[(d0 + i * step) % 4])));
          }
        }
        return solutions;
      }
      case "stone-color-size-turn": {
        if (!isSizedTurnedStone) return [];
        const seenColors = new Set(shown.map((t) => parseStone(t)!.color));
        if (seenColors.size > 2) return [];
        for (const a of COLORS) for (const b of COLORS) if (a !== b) {
          if (visible[0] !== null && parseStone(visible[0])!.color !== a) continue;
          if (visible[1] !== null && parseStone(visible[1])!.color !== b) continue;
          for (const sizePattern of [[1, 1, 2, 2, 1, 1, 2], [1, 2, 3, 1, 2, 3, 1]] as const) {
            for (let d0 = 0; d0 < 4; d0++) for (const step of [1, 3] as const) {
              record([0, 1, 2, 3, 4, 5, 6].map((i) => stone(i % 2 === 0 ? a : b, sizePattern[i], DIRS[(d0 + i * step) % 4])));
            }
          }
        }
        return solutions;
      }
      case "num-add": {
        if (!isNumber) return [];
        const vals = visible.map((v) => (v === null ? null : Number(v)));
        const idx = vals.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
        if (idx.length < 2) return [];
        const i0 = idx[0], i1 = idx[1];
        const diff = vals[i1]! - vals[i0]!;
        const span = i1 - i0;
        if (diff <= 0 || diff % span !== 0) return [];
        const d = diff / span;
        if (d < 1 || d > 15) return [];
        const a = vals[i0]! - i0 * d;
        if (a < 1 || a > 100) return [];
        record([0, 1, 2, 3, 4, 5, 6].map((i) => String(a + i * d)));
        return solutions;
      }
      case "num-sub": {
        if (!isNumber) return [];
        const vals = visible.map((v) => (v === null ? null : Number(v)));
        const idx = vals.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
        if (idx.length < 2) return [];
        const i0 = idx[0], i1 = idx[1];
        const diff = vals[i0]! - vals[i1]!;
        const span = i1 - i0;
        if (diff <= 0 || diff % span !== 0) return [];
        const d = diff / span;
        if (d < 1 || d > 15) return [];
        const a = vals[i0]! + i0 * d;
        if (a - 6 * d < 1 || a > 150) return [];
        record([0, 1, 2, 3, 4, 5, 6].map((i) => String(a - i * d)));
        return solutions;
      }
      case "num-double": {
        if (!isNumber) return [];
        for (let a = 1; a <= 12; a++) record([0, 1, 2, 3, 4, 5, 6].map((i) => String(a * 2 ** i)));
        return solutions;
      }
      case "num-triple": {
        if (!isNumber) return [];
        for (let a = 1; a <= 4; a++) record([0, 1, 2, 3, 4, 5, 6].map((i) => String(a * 3 ** i)));
        return solutions;
      }
      case "num-square": {
        if (!isNumber) return [];
        for (let k = 1; k <= 10; k++) record([0, 1, 2, 3, 4, 5, 6].map((i) => String((i + k) ** 2)));
        return solutions;
      }
      case "num-square-plus": {
        if (!isNumber) return [];
        for (let k = 1; k <= 10; k++) for (let c = 1; c <= 10; c++) {
          record([0, 1, 2, 3, 4, 5, 6].map((i) => String((i + k) ** 2 + c)));
        }
        return solutions;
      }
      case "num-fib": {
        if (!isNumber) return [];
        for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) {
          const seq = [a, b];
          for (let i = 2; i < 7; i++) seq.push(seq[i - 1] + seq[i - 2]);
          record(seq.map(String));
        }
        return solutions;
      }
      case "num-grow-step": {
        if (!isNumber) return [];
        for (let a = 1; a <= 25; a++) for (let d = 1; d <= 8; d++) {
          const seq = [a];
          for (let i = 0; i < 6; i++) seq.push(seq[i] + d + i);
          record(seq.map(String));
        }
        return solutions;
      }
      case "two-double-sub": {
        if (!isNumber) return [];
        for (let a = 2; a <= 12; a++) for (let k = 1; k <= 6; k++) {
          if (k >= a) continue;
          const seq = [a];
          for (let i = 1; i < 7; i++) seq.push(i % 2 === 1 ? seq[i - 1] * 2 : seq[i - 1] - k);
          if (seq.every((x) => x >= 1)) record(seq.map(String));
        }
        return solutions;
      }
      case "two-add-sub": {
        if (!isNumber) return [];
        for (let a = 2; a <= 25; a++) for (let p = 3; p <= 10; p++) for (let q = 1; q <= 7; q++) {
          if (p === q) continue;
          const seq = [a];
          for (let i = 1; i < 7; i++) seq.push(i % 2 === 1 ? seq[i - 1] + p : seq[i - 1] - q);
          if (seq.every((x) => x >= 1)) record(seq.map(String));
        }
        return solutions;
      }
      case "two-add-mul": {
        if (!isNumber) return [];
        for (let a = 1; a <= 10; a++) for (let p = 1; p <= 6; p++) {
          const seq = [a];
          for (let i = 1; i < 7; i++) seq.push(i % 2 === 1 ? seq[i - 1] + p : seq[i - 1] * 2);
          record(seq.map(String));
        }
        return solutions;
      }
      case "two-interleaved": {
        if (!isNumber) return [];
        const vals = visible.map((v) => (v === null ? null : Number(v)));
        // Enumerate all valid catalog (a, p) for even track (0,2,4,6) and (b, q) for odd track (1,3,5)
        // matching every visible stone — never treat an underdetermined track (< 2 visible stones) as ruled out.
        const evenOpts: [number, number][] = [];
        const aLo = vals[0] !== null ? Math.max(1, vals[0]) : 1;
        const aHi = vals[0] !== null ? Math.min(30, vals[0]) : 30;
        for (let a = aLo; a <= aHi; a++) {
          for (let p = 1; p <= 9; p++) {
            if (
              (vals[0] === null || vals[0] === a) &&
              (vals[2] === null || vals[2] === a + p) &&
              (vals[4] === null || vals[4] === a + 2 * p) &&
              (vals[6] === null || vals[6] === a + 3 * p)
            ) {
              evenOpts.push([a, p]);
            }
          }
        }
        if (evenOpts.length === 0) return [];
        const oddOpts: [number, number][] = [];
        const bLo = vals[1] !== null ? Math.max(1, vals[1]) : 1;
        const bHi = vals[1] !== null ? Math.min(30, vals[1]) : 30;
        for (let b = bLo; b <= bHi; b++) {
          for (let q = 1; q <= 9; q++) {
            if (
              (vals[1] === null || vals[1] === b) &&
              (vals[3] === null || vals[3] === b + q) &&
              (vals[5] === null || vals[5] === b + 2 * q)
            ) {
              oddOpts.push([b, q]);
            }
          }
        }
        for (const [a, p] of evenOpts) {
          for (const [b, q] of oddOpts) {
            if (p === q) continue;
            record([0, 1, 2, 3, 4, 5, 6].map((i) => String(i % 2 === 0 ? a + (i / 2) * p : b + ((i - 1) / 2) * q)));
            if (solutions.length >= 2) return solutions;
          }
        }
        return solutions;
      }
      default:
        return [];
    }
  }

  if (n === 9) {
    switch (ruleId) {
      case "grid-color-size": {
        if (!isSizedStone) return [];
        for (const r0 of COLORS) for (const r1 of COLORS) if (r1 !== r0) for (const r2 of COLORS) if (r2 !== r0 && r2 !== r1) {
          const rows = [r0, r1, r2];
          for (const sizes of [[1, 2, 3], [3, 2, 1]] as const) {
            record(Array.from({ length: 9 }, (_, i) => stone(rows[Math.floor(i / 3)], sizes[i % 3])));
          }
        }
        return solutions;
      }
      case "grid-color-turn": {
        if (!isTurnedStoneNoSize) return [];
        for (const r0 of COLORS) for (const r1 of COLORS) if (r1 !== r0) for (const r2 of COLORS) if (r2 !== r0 && r2 !== r1) {
          const rows = [r0, r1, r2];
          for (let d0 = 0; d0 < 4; d0++) for (const step of [1, 3] as const) {
            record(Array.from({ length: 9 }, (_, i) => stone(rows[Math.floor(i / 3)], 0, DIRS[(d0 + (i % 3) * step) % 4])));
          }
        }
        return solutions;
      }
      case "grid-add-rc": {
        if (!isNumber) return [];
        for (let start = 1; start <= 20; start++) for (let dx = 1; dx <= 8; dx++) for (let dy = 1; dy <= 8; dy++) {
          if (dx === dy) continue;
          record(Array.from({ length: 9 }, (_, i) => String(start + Math.floor(i / 3) * dy + (i % 3) * dx)));
        }
        return solutions;
      }
      case "grid-row-mul": {
        if (!isNumber) return [];
        const vals = visible.map((v) => (v === null ? null : Number(v)));
        // Each row [a, b, c] satisfies a * b === c, with a,b in 2..12.
        const rowOpts: number[][][] = [[], [], []];
        for (let r = 0; r < 3; r++) {
          const v0 = vals[r * 3], v1 = vals[r * 3 + 1], v2 = vals[r * 3 + 2];
          for (let a = 2; a <= 12; a++) for (let b = 2; b <= 12; b++) {
            const c = a * b;
            if ((v0 === null || v0 === a) && (v1 === null || v1 === b) && (v2 === null || v2 === c)) {
              rowOpts[r].push([a, b, c]);
            }
          }
          if (rowOpts[r].length === 0) return [];
        }
        for (const r0 of rowOpts[0]) for (const r1 of rowOpts[1]) for (const r2 of rowOpts[2]) {
          record([...r0, ...r1, ...r2].map(String));
          if (solutions.length >= 2) return solutions;
        }
        return solutions;
      }
      default:
        return [];
    }
  }
  return [];
}

export type UniquenessVerdict = {
  unique: boolean;
  matchingRules: RuleId[];
  solutions: string[][];
};

/**
 * Independent uniqueness checker across the entire 30-rule catalog.
 * Returns `unique: true` ONLY when exactly 1 catalog rule matches the visible stones
 * AND that rule forces a single unique completion at all gap indices.
 */
export function checkUniqueCatalogRule(tiles: readonly string[], gaps: readonly number[]): UniquenessVerdict {
  const gapSet = new Set(gaps);
  const visible = tiles.map((t, i) => (gapSet.has(i) ? null : t));
  const matchingRules: RuleId[] = [];
  let chosenSolutions: string[][] = [];
  for (const rule of RULE_CATALOG) {
    const sols = matchCatalogRule(rule.id, visible);
    if (sols.length > 0) {
      matchingRules.push(rule.id);
      if (matchingRules.length === 1) chosenSolutions = sols;
    }
  }
  const expected = gaps.map((g) => tiles[g]);
  const exact =
    matchingRules.length === 1 &&
    chosenSolutions.length === 1 &&
    chosenSolutions[0].every((v, i) => v === expected[i]);
  return { unique: exact, matchingRules, solutions: chosenSolutions };
}

/**
 * Generates wrong-rule decoys for numeric patterns so that:
 * 1. Decoys come from plausible wrong rules (wrong jump, linear average, off-by-one step, ×2, etc.)
 *    rather than simply repeating tiles already visible on the trail.
 * 2. When a gap sits between neighbours L and R, unseen candidates include multiple skewed values
 *    between L and R so the F3 between-neighbours median habit wins well under 40% of tasks.
 */
export function buildNumberChoices(
  tiles: readonly string[],
  gaps: readonly number[],
  seed: number,
  extraRuleDecoys: readonly number[] = [],
): string[] {
  const rng = createRng((seed ^ 0x51a7b3) >>> 0);
  const answers = gaps.map((g) => Number(tiles[g]));
  const answerSet = new Set(answers);
  const shown = new Set(tiles.filter((_, i) => !gaps.includes(i)).map(Number));

  const decoyPool: number[] = [];
  const add = (n: number) => {
    if (!Number.isInteger(n) || n < 1 || answerSet.has(n) || decoyPool.includes(n)) return;
    decoyPool.push(n);
  };

  for (const d of extraRuleDecoys) add(d);

  // For each gap, synthesize plausible wrong-rule results and skewed between-neighbour values.
  for (const g of gaps) {
    const ans = Number(tiles[g]);
    const left = g > 0 && !gaps.includes(g - 1) ? Number(tiles[g - 1]) : null;
    const right = g + 1 < tiles.length && !gaps.includes(g + 1) ? Number(tiles[g + 1]) : null;
    const left2 = g > 1 && !gaps.includes(g - 2) ? Number(tiles[g - 2]) : null;

    if (left !== null && right !== null && Math.abs(right - left) >= 4) {
      const lo = Math.min(left, right);
      const hi = Math.max(left, right);
      // Add linear midpoint when nonlinear, plus skewed side values strictly between lo and hi
      // so the unseen between-neighbour sorted list does NOT have `ans` as its median!
      const mid = Math.round((lo + hi) / 2);
      if (mid !== ans && !shown.has(mid)) add(mid);

      // Pick side (low or high) deterministically from seed to skew the unseen between-neighbour candidates.
      const skewHigh = (seed + g) % 2 === 0;
      const below: number[] = [];
      const above: number[] = [];
      for (let x = ans - 1; x > lo && below.length < 4; x--) if (!shown.has(x) && !answerSet.has(x)) below.push(x);
      for (let x = ans + 1; x < hi && above.length < 4; x++) if (!shown.has(x) && !answerSet.has(x)) above.push(x);

      // Putting 2-3 unseen decoys on ONE side (and 0 on the other) shifts BOTH upper and lower medians away from `ans`!
      const primary = skewHigh ? above : below;
      const secondary = skewHigh ? below : above;
      if (primary.length >= 2) {
        for (const x of primary.slice(0, 3)) add(x);
      } else if (secondary.length >= 2) {
        for (const x of secondary.slice(0, 3)) add(x);
      } else if (primary.length === 1) {
        add(primary[0]);
      } else if (secondary.length === 1) {
        add(secondary[0]);
      }
    }

    // Wrong-rule extrapolations from left / left2 (keep outside (lo,hi) when gap has both neighbours,
    // so we don't undo the between-neighbour skew and accidentally re-center the answer as median!)
    const lo = left !== null && right !== null ? Math.min(left, right) : null;
    const hi = left !== null && right !== null ? Math.max(left, right) : null;
    const addExtrapolation = (n: number) => {
      if (lo !== null && hi !== null && n > lo && n < hi) return;
      if (!shown.has(n)) add(n);
    };
    if (left !== null) {
      const prevStep = left2 !== null ? left - left2 : 2;
      for (const wrong of [
        left + prevStep + 1,
        left + prevStep - 1,
        left + prevStep + 2,
        left * 2,
        (hi ?? ans) + 1,
        (hi ?? ans) + 2,
        (hi ?? ans) + Math.max(3, Math.abs(prevStep)),
        (lo ?? ans) - 1,
        (lo ?? ans) - 2,
        ans + Math.max(3, Math.abs(prevStep) + 1),
      ]) {
        addExtrapolation(wrong);
      }
    } else {
      for (const delta of [1, -1, 2, -2, 3, -3, 4, 5]) if (!shown.has(ans + delta)) add(ans + delta);
    }
  }

  // Fallback unseen integers near answers if pool is still short
  let radius = 1;
  while (decoyPool.length < Math.max(5, 6 - answers.length)) {
    const base = answers[0];
    if (!shown.has(base + radius)) add(base + radius);
    if (!shown.has(base - radius)) add(base - radius);
    radius++;
    if (radius > 40) {
      add(base + radius);
      if (decoyPool.length >= 6) break;
    }
  }

  const targetCount = Math.min(7, Math.max(6, answers.length + 4));
  const picked = [...new Set(answers)].map(String);
  for (const d of decoyPool) {
    if (picked.length >= targetCount) break;
    picked.push(String(d));
  }
  return rng.shuffle(picked);
}

/**
 * Exact F3 between-neighbours habit bot (puzzles/REPORT.md):
 * Keeps unseen numeric choices strictly between the left and right neighbours of the gap,
 * sorts them, and picks the middle element. (Falls back to unseen choices when gap is at an end.)
 */
export function betweenNeighboursPick(
  tiles: readonly string[],
  gap: number,
  choices: readonly string[],
  tieBreak: "upper" | "lower" = "upper",
): string | null {
  const nums = choices.map(parseIntToken);
  if (nums.some((n) => n === null)) return null;
  const shown = new Set(tiles.filter((_, i) => i !== gap).map(Number));
  const unseen = choices
    .map(Number)
    .filter((v) => !shown.has(v))
    .sort((a, b) => a - b);
  const left = gap > 0 ? Number(tiles[gap - 1]) : null;
  const right = gap + 1 < tiles.length ? Number(tiles[gap + 1]) : null;
  const between =
    left !== null && right !== null
      ? unseen.filter((v) => v > Math.min(left, right) && v < Math.max(left, right))
      : [];
  const pool = between.length > 0 ? between : unseen.length > 0 ? unseen : choices.map(Number).sort((a, b) => a - b);
  const idx = tieBreak === "upper" ? Math.floor(pool.length / 2) : Math.floor((pool.length - 1) / 2);
  return String(pool[idx]);
}

/** Generate a single certified PatternPuzzle for any of the 30 catalog rules. */
export function buildRulePuzzle(
  ruleId: RuleId,
  seed: number,
  options?: { gaps?: number[]; twoGaps?: boolean; ruleChoices?: boolean },
): PatternPuzzle | null {
  const rng = createRng(seed);
  const rule = RULE_BY_ID[ruleId];
  const colorOrder = rng.shuffle([...COLORS]);
  const [c0, c1, c2] = colorOrder;

  let tiles: string[] = [];
  let title = "Fill the missing stepping stone";
  let ruleHint = rule.lookCue;
  let thinkHint = "Start at stone 1 and check how each stone changes into the next.";
  let nonNumPool: string[] = [];
  let extraNumDecoys: number[] = [];
  let grid = false;

  switch (ruleId) {
    case "color-ab":
      tiles = Array.from({ length: 7 }, (_, i) => stone(i % 2 === 0 ? c0 : c1));
      nonNumPool = COLORS.map((c) => stone(c));
      ruleHint = "Two stone colors trade places every step (A, B, A, B).";
      thinkHint = "Check the color right before the gap, then switch to the other color.";
      break;
    case "color-abb":
      tiles = Array.from({ length: 7 }, (_, i) => stone([c0, c1, c1][i % 3]));
      nonNumPool = COLORS.map((c) => stone(c));
      ruleHint = "The stones repeat in groups of three: one of the first color, then two of the next.";
      thinkHint = "Count 1-2-3 from the start to see which spot of the trio is missing.";
      break;
    case "color-aab":
      tiles = Array.from({ length: 7 }, (_, i) => stone([c0, c0, c1][i % 3]));
      nonNumPool = COLORS.map((c) => stone(c));
      ruleHint = "The stones repeat in groups of three: two of the first color, then one of the next.";
      thinkHint = "Count 1-2-3 from the start to see which spot of the trio is missing.";
      break;
    case "color-abc":
      tiles = Array.from({ length: 7 }, (_, i) => stone([c0, c1, c2][i % 3]));
      nonNumPool = COLORS.map((c) => stone(c));
      ruleHint = "Three colors cycle in order (A, B, C, A, B, C).";
      thinkHint = "Look at the first three stones to see which color comes next in the cycle.";
      break;
    case "color-aabb":
      tiles = Array.from({ length: 7 }, (_, i) => stone([c0, c0, c1, c1][i % 4]));
      nonNumPool = COLORS.map((c) => stone(c));
      ruleHint = "Each color appears twice in a row before switching (A, A, B, B).";
      thinkHint = "Check whether the color before the gap has appeared once or twice.";
      break;
    case "shell-up": {
      const start = 1 + rng.below(4);
      tiles = Array.from({ length: 7 }, (_, i) => shells(start + i));
      // Offer extra shell counts (1..10) so the answer is NEVER the only unseen shell count!
      nonNumPool = Array.from({ length: 10 }, (_, i) => shells(i + 1));
      ruleHint = "Each stone holds 1 more shell than the stone before it.";
      thinkHint = "Count the shells right before the gap and add 1.";
      break;
    }
    case "shell-down": {
      const start = 7 + rng.below(4);
      tiles = Array.from({ length: 7 }, (_, i) => shells(start - i));
      nonNumPool = Array.from({ length: 10 }, (_, i) => shells(i + 1));
      ruleHint = "Each stone holds 1 fewer shell than the stone before it.";
      thinkHint = "Count the shells right before the gap and take away 1.";
      break;
    }
    case "shell-bounce": {
      const start = 1 + rng.below(5);
      const peak = rng.below(2) === 0;
      const offs = peak ? [0, 1, 2, 3, 2, 1, 0] : [3, 2, 1, 0, 1, 2, 3];
      tiles = offs.map((d) => shells(start + d));
      nonNumPool = Array.from({ length: 9 }, (_, i) => shells(i + 1));
      ruleHint = peak
        ? "Shell counts climb up by 1 to stone 4, then step back down by 1."
        : "Shell counts step down by 1 to stone 4, then climb back up by 1.";
      thinkHint = "Stone 4 is the turning point; match the mirror stone on the other side.";
      break;
    }
    case "arrow-cw": {
      const d0 = rng.below(4);
      tiles = Array.from({ length: 7 }, (_, i) => arrow(DIRS[(d0 + i) % 4]));
      nonNumPool = DIRS.map(arrow);
      ruleHint = "Each arrow turns one quarter turn clockwise.";
      thinkHint = "Start from the arrow before the gap and turn it one quarter turn clockwise.";
      break;
    }
    case "arrow-ccw": {
      const d0 = rng.below(4);
      tiles = Array.from({ length: 7 }, (_, i) => arrow(DIRS[(d0 + 40 - i) % 4]));
      nonNumPool = DIRS.map(arrow);
      ruleHint = "Each arrow turns one quarter turn counter-clockwise.";
      thinkHint = "Start from the arrow before the gap and turn it one quarter turn counter-clockwise.";
      break;
    }
    case "num-add": {
      const step = 2 + rng.below(7);
      const start = 1 + rng.below(18);
      tiles = Array.from({ length: 7 }, (_, i) => String(start + i * step));
      ruleHint = `Add ${step} each step along the trail.`;
      thinkHint = `Find a stone next to the gap and count by ${step}.`;
      extraNumDecoys = [start + 5 * (step + 1), start + 5 * (step - 1)];
      break;
    }
    case "num-sub": {
      const step = 2 + rng.below(6);
      const start = 6 * step + 3 + rng.below(20);
      tiles = Array.from({ length: 7 }, (_, i) => String(start - i * step));
      ruleHint = `Subtract ${step} each step along the trail.`;
      thinkHint = `Find a stone next to the gap and step down by ${step}.`;
      break;
    }
    case "stone-color-size": {
      const sizePat = rng.below(2) === 0 ? [1, 1, 2, 2, 1, 1, 2] : [1, 2, 3, 1, 2, 3, 1];
      tiles = Array.from({ length: 7 }, (_, i) => stone(i % 2 === 0 ? c0 : c1, sizePat[i]));
      const sizes = sizePat.includes(3) ? [1, 2, 3] : [1, 2];
      nonNumPool = [c0, c1, c2].flatMap((c) => sizes.map((sz) => stone(c, sz)));
      ruleHint = sizePat.includes(3)
        ? "Follow two clues: color alternates every step, and size cycles 1, 2, 3."
        : "Follow two clues: color alternates every step, and size switches every two steps.";
      thinkHint = "Find the missing color first, then check the size pattern.";
      break;
    }
    case "stone-color-turn": {
      const d0 = rng.below(4);
      const step = rng.below(2) === 0 ? 1 : 3;
      tiles = Array.from({ length: 7 }, (_, i) => stone(i % 2 === 0 ? c0 : c1, 0, DIRS[(d0 + i * step) % 4]));
      nonNumPool = [c0, c1].flatMap((c) => DIRS.map((d) => stone(c, 0, d)));
      ruleHint = `Follow two clues: color alternates every step, and the pointer turns one quarter turn ${step === 1 ? "clockwise" : "counter-clockwise"}.`;
      thinkHint = "Pick the next alternating color, then turn the pointer one quarter turn.";
      break;
    }
    case "stone-size-turn": {
      const sizePat = rng.below(2) === 0 ? [1, 2, 3, 1, 2, 3, 1] : [3, 2, 1, 3, 2, 1, 3];
      const d0 = rng.below(4);
      const step = rng.below(2) === 0 ? 1 : 3;
      tiles = Array.from({ length: 7 }, (_, i) => stone(c0, sizePat[i], DIRS[(d0 + i * step) % 4]));
      nonNumPool = [1, 2, 3].flatMap((sz) => DIRS.map((d) => stone(c0, sz, d)));
      ruleHint = `Follow two clues: size repeats ${sizePat[0]}-${sizePat[1]}-${sizePat[2]}, and the pointer turns ${step === 1 ? "clockwise" : "counter-clockwise"} every step.`;
      thinkHint = "Check which size comes next in the trio, then turn the pointer one quarter turn.";
      break;
    }
    case "stone-color-size-turn": {
      const sizePat = rng.below(2) === 0 ? [1, 1, 2, 2, 1, 1, 2] : [1, 2, 3, 1, 2, 3, 1];
      const d0 = rng.below(4);
      const step = rng.below(2) === 0 ? 1 : 3;
      tiles = Array.from({ length: 7 }, (_, i) => stone(i % 2 === 0 ? c0 : c1, sizePat[i], DIRS[(d0 + i * step) % 4]));
      const sizes = sizePat.includes(3) ? [1, 2, 3] : [1, 2];
      nonNumPool = [c0, c1].flatMap((c) => sizes.flatMap((sz) => DIRS.map((d) => stone(c, sz, d))));
      ruleHint = `Follow three clues: color alternates, size repeats, and the pointer turns ${step === 1 ? "clockwise" : "counter-clockwise"}.`;
      thinkHint = "Solve one clue at a time: color, then size, then pointer direction.";
      break;
    }
    case "num-double": {
      const base = 2 + rng.below(6);
      tiles = Array.from({ length: 7 }, (_, i) => String(base * 2 ** i));
      ruleHint = "Double the number on each step (multiply by 2).";
      thinkHint = "Multiply the stone before the gap by 2 (or halve the stone after it).";
      break;
    }
    case "num-triple": {
      const base = 1 + rng.below(3);
      tiles = Array.from({ length: 7 }, (_, i) => String(base * 3 ** i));
      ruleHint = "Triple the number on each step (multiply by 3).";
      thinkHint = "Multiply the stone before the gap by 3.";
      break;
    }
    case "num-square": {
      const offset = 1 + rng.below(6);
      tiles = Array.from({ length: 7 }, (_, i) => String((i + offset) ** 2));
      ruleHint = "Each stone is a square number (a counting number times itself).";
      thinkHint = "Find which counting number was squared before the gap, then square the next one.";
      break;
    }
    case "num-square-plus": {
      const offset = 1 + rng.below(5);
      const plus = 1 + rng.below(6);
      tiles = Array.from({ length: 7 }, (_, i) => String((i + offset) ** 2 + plus));
      ruleHint = `Take each square number and add ${plus}.`;
      thinkHint = `Subtract ${plus} to spot the square numbers, then add ${plus} back at the gap.`;
      break;
    }
    case "num-fib": {
      const a = 1 + rng.below(6), b = 1 + rng.below(6);
      const seq = [a, b];
      for (let i = 2; i < 7; i++) seq.push(seq[i - 1] + seq[i - 2]);
      tiles = seq.map(String);
      ruleHint = "Add the two stones right before a spot to get the next stone.";
      thinkHint = "Look at the two stones right before the gap and add them together.";
      break;
    }
    case "num-grow-step": {
      const start = 1 + rng.below(12);
      const firstJump = 1 + rng.below(5);
      const seq = [start];
      for (let i = 0; i < 6; i++) seq.push(seq[i] + firstJump + i);
      tiles = seq.map(String);
      ruleHint = `The jump grows by 1 every step: +${firstJump}, +${firstJump + 1}, +${firstJump + 2}…`;
      thinkHint = "Find the jump into the stone before the gap, then add 1 to that jump.";
      break;
    }
    case "two-double-sub": {
      const k = 1 + rng.below(4);
      const start = k + 1 + rng.below(6);
      const seq = [start];
      for (let i = 1; i < 7; i++) seq.push(i % 2 === 1 ? seq[i - 1] * 2 : seq[i - 1] - k);
      tiles = seq.map(String);
      ruleHint = `Two rules alternate: double the stone, then take away ${k}.`;
      thinkHint = "Check whether the step right before the gap doubled or subtracted, then do the other rule.";
      break;
    }
    case "two-add-sub": {
      const p = 4 + rng.below(6);
      const q = 1 + rng.below(p - 2);
      const start = 3 + rng.below(12);
      const seq = [start];
      for (let i = 1; i < 7; i++) seq.push(i % 2 === 1 ? seq[i - 1] + p : seq[i - 1] - q);
      tiles = seq.map(String);
      ruleHint = `Two rules alternate: add ${p}, then take away ${q}.`;
      thinkHint = "Check whether the last jump went up or down, then apply the opposite step.";
      break;
    }
    case "two-add-mul": {
      const p = 1 + rng.below(5);
      const start = 2 + rng.below(6);
      const seq = [start];
      for (let i = 1; i < 7; i++) seq.push(i % 2 === 1 ? seq[i - 1] + p : seq[i - 1] * 2);
      tiles = seq.map(String);
      ruleHint = `Two rules alternate: add ${p}, then double.`;
      thinkHint = "Check whether the last step added or doubled, then do the other step.";
      break;
    }
    case "two-interleaved": {
      const a = 2 + rng.below(10), b = 3 + rng.below(10);
      const p = 2 + rng.below(5);
      let q = 2 + rng.below(5);
      if (q === p) q = (p % 5) + 2;
      tiles = Array.from({ length: 7 }, (_, i) => String(i % 2 === 0 ? a + (i / 2) * p : b + ((i - 1) / 2) * q));
      ruleHint = `Two paths are woven together: odd spots (1, 3, 5, 7) add ${p}; even spots (2, 4, 6) add ${q}.`;
      thinkHint = "Look two stones back on the same woven path and add its jump.";
      break;
    }
    case "grid-color-size": {
      grid = true;
      title = "Complete the 3 × 3 color and size reef";
      const sizes = rng.below(2) === 0 ? [1, 2, 3] : [3, 2, 1];
      const rows = [c0, c1, c2];
      tiles = Array.from({ length: 9 }, (_, i) => stone(rows[Math.floor(i / 3)], sizes[i % 3]));
      nonNumPool = rows.flatMap((c) => [1, 2, 3].map((sz) => stone(c, sz)));
      ruleHint = "Each row keeps one color, and each column keeps one stone size.";
      thinkHint = "Match the color of the gap's row and the size of the gap's column.";
      break;
    }
    case "grid-color-turn": {
      grid = true;
      title = "Complete the 3 × 3 color and turn reef";
      const d0 = rng.below(4);
      const step = rng.below(2) === 0 ? 1 : 3;
      const rows = [c0, c1, c2];
      tiles = Array.from({ length: 9 }, (_, i) => stone(rows[Math.floor(i / 3)], 0, DIRS[(d0 + (i % 3) * step) % 4]));
      nonNumPool = rows.flatMap((c) => DIRS.map((d) => stone(c, 0, d)));
      ruleHint = `Each row keeps one color, and each column turns the pointer one quarter turn ${step === 1 ? "clockwise" : "counter-clockwise"}.`;
      thinkHint = "Match the color of the gap's row and the pointer direction of its column.";
      break;
    }
    case "grid-add-rc": {
      grid = true;
      title = "Complete the 3 × 3 number reef";
      const start = 1 + rng.below(12);
      const dx = 1 + rng.below(6);
      let dy = 1 + rng.below(6);
      if (dy === dx) dy = (dx % 6) + 1;
      tiles = Array.from({ length: 9 }, (_, i) => String(start + Math.floor(i / 3) * dy + (i % 3) * dx));
      ruleHint = `Across each row add ${dx}. Down each column add ${dy}.`;
      thinkHint = "Use the row jump from the left or the column jump from above to find the missing cell.";
      break;
    }
    case "grid-row-mul": {
      grid = true;
      title = "Complete the 3 × 3 product reef";
      const rows: [number, number, number][] = [];
      const used = new Set<string>();
      for (let r = 0; r < 3; r++) {
        let a = 2 + rng.below(7), b = 2 + rng.below(7);
        while (used.has(`${a},${b}`)) { a = 2 + rng.below(7); b = 2 + rng.below(7); }
        used.add(`${a},${b}`);
        rows.push([a, b, a * b]);
      }
      tiles = rows.flat().map(String);
      ruleHint = "In every row, multiply the first two numbers to get the third number.";
      thinkHint = "Multiply the two given numbers in the gap's row (or divide from the third).";
      break;
    }
  }

  // Choose gap indices (for 1D trails: ALWAYS >= 2; for 3x3 grids: anywhere in row 1-2 or col 2)
  let gaps: number[];
  if (options?.gaps) {
    gaps = [...options.gaps].sort((a, b) => a - b);
  } else if (grid) {
    if (options?.twoGaps) {
      const candidates: [number, number][] = ruleId === "grid-row-mul" ? [[5, 8], [2, 8], [2, 5]] : [[4, 8], [5, 7], [3, 8], [4, 7]];
      gaps = [...candidates[rng.below(candidates.length)]];
    } else {
      const candidates = ruleId === "grid-row-mul" ? [2, 5, 8, 7, 4] : [4, 5, 6, 7, 8];
      gaps = [candidates[rng.below(candidates.length)]];
    }
  } else if (options?.twoGaps) {
    // Two non-adjacent gaps after stone 2 so rule remains uniquely determined
    const pairs: [number, number][] = [[2, 4], [2, 5], [2, 6], [3, 5], [3, 6], [4, 6]];
    gaps = [...pairs[rng.below(pairs.length)]];
  } else {
    // Gap anywhere after stone 2: indices 2, 3, 4, 5, or 6!
    gaps = [2 + rng.below(5)];
  }

  // Verify strict 30-rule uniqueness!
  const check = checkUniqueCatalogRule(tiles, gaps);
  if (!check.unique || check.matchingRules[0] !== ruleId) return null;

  // Build choices (numeric uses wrong-rule + F3-safe decoys; non-numeric uses attribute-near decoys)
  let choices: string[];
  if (parseIntToken(tiles[0]) !== null) {
    choices = buildNumberChoices(tiles, gaps, seed, extraNumDecoys);
  } else {
    const answers = [...new Set(gaps.map((g) => tiles[g]))];
    const pool = [...new Set(nonNumPool)].filter((t) => !answers.includes(t));
    // Prioritize wrong-rule decoys (same color/wrong turn, wrong color/same turn, etc.)
    const distractors = rng.shuffle(pool).slice(0, Math.max(3, 6 - answers.length));
    choices = rng.shuffle([...answers, ...distractors]);
  }

  let ruleChoices: RuleId[] | undefined;
  if (options?.ruleChoices) {
    const sameDomain = RULE_CATALOG.filter((r) => r.id !== ruleId && (r.family === rule.family || r.band === rule.band)).map((r) => r.id);
    const others = RULE_CATALOG.filter((r) => r.id !== ruleId && !sameDomain.includes(r.id)).map((r) => r.id);
    const picks = [...rng.shuffle(sameDomain), ...rng.shuffle(others)].slice(0, 3);
    ruleChoices = rng.shuffle([ruleId, ...picks]);
  }

  return { ruleId, tiles, gaps, choices, ...(ruleChoices ? { ruleChoices } : {}), grid, title, ruleHint, thinkHint };
}

/** Shared pure hint engine: Step 1 names the rule (never the answer), Step 2 guides applying it, Step 3 names the answer stone(s). */
export function patternHint(puzzle: PatternPuzzle, step: 1 | 2 | 3): string {
  if (step === 1) return puzzle.ruleHint;
  if (step === 2) return `${puzzle.ruleHint} ${puzzle.thinkHint}`;
  const answerText = puzzle.gaps.map((g) => `stone ${g + 1} is ${describePatternToken(puzzle.tiles[g])}`).join(", and ");
  return `${puzzle.ruleHint} The answer: ${answerText}.`;
}
