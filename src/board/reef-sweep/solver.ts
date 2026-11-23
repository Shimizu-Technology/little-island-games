/**
 * Pure public-constraint deduction solver for Reef Sweep (BD-08, BD-09).
 *
 * Strictly public information only: every deduction reads ONLY `size`, `totalUrchins`,
 * and `visible[i]` for revealed cells (`visible[i] >= 0`). Hidden mine locations are
 * never passed to or read by deduction/hint functions.
 *
 * Deduction tiers (in strict ascending order):
 *   1. single-cell: a revealed number forces all remaining touching spaces to be urchins or safe.
 *   2. subset: comparing two overlapping clues (subset or overlap difference, e.g. 1-2, 1-2-1)
 *      forces unique neighbors to be urchins or safe.
 *   3. coupled: remaining-urchin count and bounded connected-component constraint satisfaction
 *      across frontier clues + global urchin total.
 */
export type DeductionTier = "single-cell" | "subset" | "coupled";

export const DEDUCTION_TIERS: readonly DeductionTier[] = ["single-cell", "subset", "coupled"] as const;

export const tierRank = (tier: DeductionTier): number =>
  tier === "single-cell" ? 1 : tier === "subset" ? 2 : 3;

export type PublicReefView = {
  size: number;
  totalUrchins: number;
  /** Revealed cell: 0..8. Closed unflagged cell: -1. Flagged cell: -2. Never hidden mines. */
  visible: readonly number[];
};

export type DeductionReason = {
  /** Level 1 (Look): points attention to the public clue(s) or count without naming the move. */
  look: string;
  /** Level 2 (Think): explains the public reasoning rule without revealing the exact cell. */
  think: string;
  /** Level 3 (One step): explains why the exact suggested tile is proven safe, an urchin, or wrongly flagged. */
  oneStep: string;
};

export type PublicStep = {
  kind: "open" | "flag" | "unflag";
  cell: number;
  tier: DeductionTier;
  clues: number[];
  reason: DeductionReason;
};

export type DeduceResult =
  | {
      status: "deduced";
      step: PublicStep;
      safe: number[];
      urchins: number[];
      wrongFlags: number[];
      tier: DeductionTier;
    }
  | { status: "solved" }
  | { status: "stalled"; safe: number[]; urchins: number[]; wrongFlags: number[] }
  | { status: "budget-exhausted"; nodes: number };

export type SolveNoGuessResult =
  | {
      status: "solved";
      ceiling: DeductionTier;
      steps: number;
      opens: number[];
      trace: string;
      tierCounts: Record<DeductionTier, number>;
    }
  | { status: "stalled"; revealed: number; ceiling: DeductionTier }
  | { status: "budget-exhausted"; nodes: number };

const neighborCache = new Map<number, readonly (readonly number[])[]>();

function neighborsRef(n: number, cell: number): readonly number[] {
  let table = neighborCache.get(n);
  if (!table) {
    table = Array.from({ length: n * n }, (_, idx) => {
      const r = Math.floor(idx / n),
        c = idx % n,
        out: number[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        const nr = r + dr;
        if (nr < 0 || nr >= n) continue;
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc;
          if ((dr === 0 && dc === 0) || nc < 0 || nc >= n) continue;
          out.push(nr * n + nc);
        }
      }
      return out;
    });
    neighborCache.set(n, table);
  }
  return table[cell] ?? [];
}

/** Row-major sorted 8-neighbors for a cell on an n×n grid. */
export function neighbors(n: number, cell: number): number[] {
  return [...neighborsRef(n, cell)];
}

export function coordinate(size: number, cell: number): string {
  return `${String.fromCharCode(65 + (cell % size))}${Math.floor(cell / size) + 1}`;
}

/** Extracts ONLY public visible values. Never reads `board[i]` when `marks[i] !== 1`. */
export function publicView(
  size: number,
  totalUrchins: number,
  board: readonly number[],
  marks: readonly number[]
): PublicReefView {
  const count = size * size;
  const visible = new Array<number>(count);
  for (let i = 0; i < count; i++) {
    visible[i] = marks[i] === 1 ? board[i] : marks[i] === 2 ? -2 : -1;
  }
  return { size, totalUrchins, visible };
}

type Constraint = {
  clue: number;
  value: number;
  cells: number[];
  rem: number;
};

type Provenance = {
  tier: DeductionTier;
  anchors: number[];
  rule: "single-safe" | "single-urchin" | "subset" | "coupled-component" | "coupled-count";
  prereqMines: number[];
  order: number;
  usesTotal?: boolean;
};

function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Checks whether ONLY `clueIndices` (plus `totalUrchins` iff `useTotal` is true) on the
 * current closed spaces (`visible[i] < 0`) mathematically force `target` to be safe or an urchin.
 * Returns true only if at least one valid assignment exists and zero counterexamples exist.
 */
function provesOnClosedBoard(
  size: number,
  totalUrchins: number,
  visible: readonly number[],
  clueIndices: readonly number[],
  target: number,
  wantSafe: boolean,
  useTotal: boolean,
  nodeBudget = 60_000
): boolean {
  const count = size * size;
  const closed: number[] = [];
  for (let i = 0; i < count; i++) if (visible[i] < 0) closed.push(i);
  const cs = clueIndices.map((clue) => ({
    cells: neighbors(size, clue).filter((nb) => visible[nb] < 0),
    v: visible[clue],
  }));
  const inFront = new Set<number>();
  for (const c of cs) for (const cell of c.cells) inFront.add(cell);
  const front = closed.filter((i) => inFront.has(i));
  const degree = new Map<number, number>();
  for (const c of cs) for (const cell of c.cells) degree.set(cell, (degree.get(cell) ?? 0) + 1);
  front.sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a - b);
  const outside = closed.filter((i) => !inFront.has(i));
  const targetPos = front.indexOf(target);

  const used = new Array<number>(cs.length).fill(0);
  const left = cs.map((c) => c.cells.length);
  const touch: number[][] = front.map((cell) => {
    const list: number[] = [];
    for (let ci = 0; ci < cs.length; ci++) if (cs[ci].cells.includes(cell)) list.push(ci);
    return list;
  });

  let nodes = 0;
  let models = 0;
  let counterexample = false;
  let exhausted = false;

  function dfs(pos: number, mines: number): void {
    if (counterexample || exhausted) return;
    if (++nodes > nodeBudget) {
      exhausted = true;
      return;
    }
    if (useTotal && (mines > totalUrchins || mines + (front.length - pos) + outside.length < totalUrchins)) return;
    if (pos === front.length) {
      for (let ci = 0; ci < cs.length; ci++) if (used[ci] !== cs[ci].v) return;
      if (useTotal) {
        const rem = totalUrchins - mines;
        if (rem < 0 || rem > outside.length) return;
        models++;
        if (targetPos === -1) {
          if (wantSafe && rem > 0) counterexample = true;
          if (!wantSafe && rem < outside.length) counterexample = true;
        }
      } else {
        models++;
        if (targetPos === -1) counterexample = true;
      }
      return;
    }
    const vals: readonly (0 | 1)[] = pos === targetPos ? (wantSafe ? [1, 0] : [0, 1]) : [0, 1];
    const rel = touch[pos];
    for (const val of vals) {
      let ok = true;
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        const am = used[ci] + val;
        const remLeft = left[ci] - 1;
        if (am > cs[ci].v || am + remLeft < cs[ci].v) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        used[ci] += val;
        left[ci] -= 1;
      }
      const isBadBranch = pos === targetPos && ((wantSafe && val === 1) || (!wantSafe && val === 0));
      const before = models;
      dfs(pos + 1, mines + val);
      if (isBadBranch && models > before) counterexample = true;
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        used[ci] -= val;
        left[ci] += 1;
      }
      if (counterexample || exhausted) return;
    }
  }

  dfs(0, 0);
  return !exhausted && !counterexample && models > 0;
}

function minimizeCoupledPremises(
  size: number,
  totalUrchins: number,
  visible: readonly number[],
  target: number,
  wantSafe: boolean
): { anchors: number[]; rule: "coupled-component" | "coupled-count"; usesTotal: boolean } {
  const count = size * size;
  const activeClues: number[] = [];
  for (let i = 0; i < count; i++) {
    if (visible[i] > 0 && neighbors(size, i).some((nb) => visible[nb] < 0)) activeClues.push(i);
  }
  const needsTotal = !provesOnClosedBoard(size, totalUrchins, visible, activeClues, target, wantSafe, false);
  const tr = Math.floor(target / size);
  const tc = target % size;
  // Try removing clues farthest from target first so the minimal proving set stays local when possible.
  const removalOrder = [...activeClues].sort((a, b) => {
    const da = Math.abs(Math.floor(a / size) - tr) + Math.abs((a % size) - tc);
    const db = Math.abs(Math.floor(b / size) - tr) + Math.abs((b % size) - tc);
    return db - da || a - b;
  });
  let minSet = [...activeClues];
  for (const clue of removalOrder) {
    const trial = minSet.filter((c) => c !== clue);
    if (provesOnClosedBoard(size, totalUrchins, visible, trial, target, wantSafe, needsTotal)) {
      minSet = trial;
    }
  }
  minSet.sort((a, b) => a - b);
  return {
    anchors: minSet,
    rule: needsTotal ? "coupled-count" : "coupled-component",
    usesTotal: needsTotal,
  };
}

function collectPrereqAnchors(
  mines: readonly number[],
  provenance: ReadonlyMap<number, Provenance>,
  exclude: ReadonlySet<number>
): number[] {
  const seenMines = new Set<number>();
  const anchors = new Set<number>();
  const queue = [...mines];
  while (queue.length) {
    const m = queue.shift()!;
    if (seenMines.has(m)) continue;
    seenMines.add(m);
    const p = provenance.get(m);
    if (!p) continue;
    for (const a of p.anchors) if (!exclude.has(a)) anchors.add(a);
    for (const pm of p.prereqMines) if (!seenMines.has(pm)) queue.push(pm);
  }
  return [...anchors].sort((a, b) => a - b);
}

function buildReason(
  size: number,
  visible: readonly number[],
  totalUrchins: number,
  kind: "open" | "flag" | "unflag",
  cell: number,
  prov: Provenance,
  provenance: ReadonlyMap<number, Provenance>
): { reason: DeductionReason; anchors: number[] } {
  const at = coordinate(size, cell);
  const clueList = prov.anchors.map((c) => `${visible[c]} at ${coordinate(size, c)}`);
  if (kind === "unflag") {
    const clueText = clueList.length ? `Look at ${joinList(clueList)}.` : "Count the remaining sea urchins on the reef.";
    return {
      anchors: prov.anchors,
      reason: {
        look: `${clueText} One of your flags does not match the numbers.`,
        think: "Flags are only reminders. Check which spaces around those numbers must actually be safe.",
        oneStep: `Remove the flag at ${at}: the visible numbers prove ${at} is a safe pearl space.`,
      },
    };
  }
  if (prov.rule === "single-urchin") {
    const clue = prov.anchors[0];
    const clueCoord = clue !== undefined ? coordinate(size, clue) : at;
    const val = clue !== undefined ? visible[clue] : 1;
    const closedNeighbors = clue !== undefined ? neighbors(size, clue).filter((nb) => visible[nb] < 0) : [];
    const flaggedPrereqs = prov.prereqMines.filter((m) => visible[m] === -2);
    const unflaggedPrereqs = prov.prereqMines.filter((m) => visible[m] !== -2);
    const rem = Math.max(1, val - flaggedPrereqs.length);
    if (unflaggedPrereqs.length === 0 && closedNeighbors.length === val) {
      return {
        anchors: prov.anchors,
        reason: {
          look: `Look at the ${val} at ${clueCoord}.`,
          think:
            val === 1
              ? `Count the closed spaces touching ${clueCoord}. Only 1 closed space is left, so it must hold an urchin.`
              : `Count the closed spaces touching ${clueCoord}. Only ${val} closed spaces are left for its ${val} urchins.`,
          oneStep: `Flag ${at}: the ${val} at ${clueCoord} has only ${val === 1 ? "1 closed space" : `${val} closed spaces`} left, so ${at} holds an urchin.`,
        },
      };
    }
    return {
      anchors: prov.anchors,
      reason: {
        look: `Look at the ${val} at ${clueCoord}.`,
        think: `Count the remaining unflagged closed spaces touching ${clueCoord}. Only ${rem === 1 ? "1 space is" : `${rem} spaces are`} left for ${rem === 1 ? "its last urchin" : `its remaining ${rem} urchins`}.`,
        oneStep: `Flag ${at}: the ${val} at ${clueCoord} needs an urchin in every remaining closed neighbor, including ${at}.`,
      },
    };
  }
  if (prov.rule === "single-safe") {
    const clue = prov.anchors[0];
    const clueCoord = clue !== undefined ? coordinate(size, clue) : at;
    const val = clue !== undefined ? visible[clue] : 0;
    if (val === 0) {
      return {
        anchors: prov.anchors,
        reason: {
          look: `Look at the 0 at ${clueCoord}.`,
          think: `A 0 touches no sea urchins, so every touching space is safe.`,
          oneStep: `Open ${at}: the 0 at ${clueCoord} touches no sea urchins.`,
        },
      };
    }
    const flaggedPrereqs = prov.prereqMines.filter((m) => visible[m] === -2);
    const unflaggedPrereqs = prov.prereqMines.filter((m) => visible[m] !== -2);
    if (unflaggedPrereqs.length === 0 && flaggedPrereqs.length >= val) {
      const flaggedCoords = joinList(flaggedPrereqs.map((m) => coordinate(size, m)));
      return {
        anchors: prov.anchors,
        reason: {
          look: `Look at the ${val} at ${clueCoord}.`,
          think: `The ${val} at ${clueCoord} already touches its ${val === 1 ? "flagged urchin" : `${val} flagged urchins`} at ${flaggedCoords}, so its other touching spaces are safe.`,
          oneStep: `Open ${at}: the ${val} at ${clueCoord} already touches its ${val === 1 ? "flagged urchin" : `${val} flagged urchins`} at ${flaggedCoords}, so ${at} is safe.`,
        },
      };
    }
    // At least one prerequisite urchin is unflagged: name the exact prerequisite clue(s) forcing it.
    const prereqClues = collectPrereqAnchors(unflaggedPrereqs, provenance, new Set(prov.anchors));
    const combinedAnchors = [...prov.anchors, ...prereqClues];
    const mineCoords = joinList(unflaggedPrereqs.map((m) => coordinate(size, m)));
    const prereqText = joinList(prereqClues.map((c) => `the ${visible[c]} at ${coordinate(size, c)}`));
    return {
      anchors: combinedAnchors,
      reason: {
        look: prereqText ? `Look at the ${val} at ${clueCoord} together with ${prereqText}.` : `Look at the ${val} at ${clueCoord}.`,
        think: prereqText
          ? `First see that ${prereqText} forces ${unflaggedPrereqs.length === 1 ? "an urchin" : "urchins"} at ${mineCoords}, which accounts for the ${val} at ${clueCoord}.`
          : `The ${val === 1 ? "urchin" : `${val} urchins`} touching ${clueCoord} must sit at ${mineCoords}, so its other closed spaces are safe.`,
        oneStep: prereqText
          ? `Open ${at}: ${prereqText} forces ${unflaggedPrereqs.length === 1 ? "an urchin" : "urchins"} at ${mineCoords}, which accounts for the ${val} at ${clueCoord}, so ${at} is safe.`
          : `Open ${at}: the ${val} at ${clueCoord} must have its ${val === 1 ? "urchin" : "urchins"} at ${mineCoords}, so ${at} is safe.`,
      },
    };
  }
  if (prov.rule === "subset") {
    const [a, b] = prov.anchors;
    const labelA = a !== undefined ? `the ${visible[a]} at ${coordinate(size, a)}` : "one clue";
    const labelB = b !== undefined ? `the ${visible[b]} at ${coordinate(size, b)}` : "its neighbor";
    const unflaggedPrereqs = prov.prereqMines.filter((m) => visible[m] !== -2);
    const prereqClues = unflaggedPrereqs.length
      ? collectPrereqAnchors(unflaggedPrereqs, provenance, new Set(prov.anchors))
      : [];
    const combinedAnchors = [...prov.anchors, ...prereqClues];
    const extraNote =
      unflaggedPrereqs.length && prereqClues.length
        ? ` (with ${joinList(unflaggedPrereqs.map((m) => coordinate(size, m)))} forced by ${joinList(prereqClues.map((c) => `${visible[c]} at ${coordinate(size, c)}`))})`
        : "";
    return {
      anchors: combinedAnchors,
      reason: {
        look: `Compare ${labelA} and ${labelB}${prereqClues.length ? ` alongside ${joinList(prereqClues.map((c) => `the ${visible[c]} at ${coordinate(size, c)}`))}` : ""}.`,
        think: "See which closed spaces both numbers share, and compare how many urchins each one still needs.",
        oneStep:
          kind === "flag"
            ? `Flag ${at}: comparing ${labelA} with ${labelB}${extraNote} forces an urchin at ${at}.`
            : `Open ${at}: comparing ${labelA} with ${labelB}${extraNote} leaves no room for an urchin at ${at}.`,
      },
    };
  }
  const groupText = clueList.length ? joinList(clueList) : "the visible clues";
  if (prov.rule === "coupled-count" || prov.usesTotal) {
    return {
      anchors: prov.anchors,
      reason: {
        look: clueList.length
          ? `Look at ${groupText} together with the total of ${totalUrchins} sea urchins.`
          : `Count how many of the ${totalUrchins} sea urchins are still unplaced.`,
        think: "Use the total sea urchin count together with these linked numbers on the closed spaces to see where the remaining urchins must sit.",
        oneStep:
          kind === "flag"
            ? `Flag ${at}: on the closed spaces, every arrangement of ${totalUrchins} sea urchins that fits ${groupText} puts an urchin at ${at}.`
            : `Open ${at}: on the closed spaces, every arrangement of ${totalUrchins} sea urchins that fits ${groupText} leaves ${at} safe.`,
      },
    };
  }
  return {
    anchors: prov.anchors,
    reason: {
      look: `Look at these linked clues together: ${groupText}.`,
      think: "Try the ways the sea urchins can fit on the closed spaces around these linked numbers at the same time.",
      oneStep:
        kind === "flag"
          ? `Flag ${at}: on the closed spaces, every arrangement that fits ${groupText} puts an urchin at ${at}.`
          : `Open ${at}: on the closed spaces, every arrangement that fits ${groupText} leaves ${at} safe.`,
    },
  };
}

type ComponentSolutions = {
  vars: number[];
  clues: number[];
  /** Map from mine count k -> { alwaysOne bitmask, alwaysZero bitmask } over vars indices. */
  byCount: Map<number, { alwaysOne: number; alwaysZero: number }>;
};

const MAX_COMPONENT_VARS = 22;

function solveComponent(
  vars: number[],
  constraints: readonly Constraint[],
  maxMines: number,
  nodeBudget: number,
  shouldStop?: () => boolean
): { status: "ok"; sol: ComponentSolutions; nodes: number } | { status: "budget-exhausted"; nodes: number } {
  const m = vars.length;
  if (m > MAX_COMPONENT_VARS) return { status: "budget-exhausted", nodes: 0 };
  const varIndex = new Map<number, number>();
  vars.forEach((cell, idx) => varIndex.set(cell, idx));

  const cVars: number[][] = constraints.map((c) => c.cells.map((cell) => varIndex.get(cell)!));
  const cRem: number[] = constraints.map((c) => c.rem);
  const cLeft: number[] = cVars.map((cv) => cv.length);
  const cAssignedMines = new Array<number>(constraints.length).fill(0);

  // Order variables by highest constraint degree for fast pruning.
  const touching: number[][] = Array.from({ length: m }, () => []);
  cVars.forEach((cv, ci) => {
    for (const vi of cv) touching[vi].push(ci);
  });
  const order = Array.from({ length: m }, (_, i) => i).sort((a, b) => touching[b].length - touching[a].length || a - b);

  const byCount = new Map<number, { alwaysOne: number; alwaysZero: number }>();
  const allBits = m === 32 ? -1 : (1 << m) - 1;
  let nodes = 0;

  function dfs(pos: number, mask: number, mines: number): boolean {
    if (++nodes > nodeBudget || ((nodes & 255) === 0 && shouldStop?.())) return false;
    if (pos === m) {
      const existing = byCount.get(mines);
      const zeroMask = ~mask & allBits;
      if (!existing) byCount.set(mines, { alwaysOne: mask, alwaysZero: zeroMask });
      else {
        existing.alwaysOne &= mask;
        existing.alwaysZero &= zeroMask;
      }
      return true;
    }
    const vi = order[pos];
    const rel = touching[vi];

    for (const val of [0, 1]) {
      const nextMines = mines + val;
      if (nextMines > maxMines) continue;
      let ok = true;
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        const am = cAssignedMines[ci] + val;
        const left = cLeft[ci] - 1;
        if (am > cRem[ci] || am + left < cRem[ci]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        cAssignedMines[ci] += val;
        cLeft[ci] -= 1;
      }
      const nextMask = val === 1 ? mask | (1 << vi) : mask;
      const alive = dfs(pos + 1, nextMask, nextMines);
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        cAssignedMines[ci] -= val;
        cLeft[ci] += 1;
      }
      if (!alive) return false;
    }
    return true;
  }

  const ok = dfs(0, 0, 0);
  if (!ok) return { status: "budget-exhausted", nodes };
  return {
    status: "ok",
    sol: { vars, clues: constraints.map((c) => c.clue), byCount },
    nodes,
  };
}

/**
 * Deduces the next sound public step from visible numbers and total urchin count only.
 * Always tries single-cell first, then subset/difference, then bounded coupled/mine-count.
 * Stops at the lowest tier that produces an actionable safe cell (or wrong-flag removal).
 */
export function deducePublic(
  view: PublicReefView,
  options: {
    maxTier?: DeductionTier;
    nodeBudget?: number;
    preferFlag?: boolean;
    /** When true, teach flagging an unflagged prerequisite forced mine before suggesting a safe opening that depends on it. */
    teachPrerequisites?: boolean;
    /** When false, skip premise minimization & explanation generation (used by fast internal solver loops). */
    explain?: boolean;
    /** Pure cooperative abort predicate checked inside coupled DFS (never introduces clocks into solver.ts). */
    shouldStop?: () => boolean;
  } = {}
): DeduceResult {
  const { size, totalUrchins, visible } = view;
  const maxTier = options.maxTier ?? "coupled";
  const nodeBudget = options.nodeBudget ?? 12_000;
  const preferFlag = options.preferFlag ?? false;
  const teachPrerequisites = options.teachPrerequisites ?? false;
  const explain = options.explain ?? true;
  const shouldStop = options.shouldStop;
  const count = size * size;
  let revealedCount = 0;
  for (let i = 0; i < count; i++) if (visible[i] >= 0) revealedCount++;
  if (revealedCount >= count - totalUrchins) return { status: "solved" };

  const provenSafe = new Set<number>();
  const provenUrchin = new Set<number>();
  const provenance = new Map<number, Provenance>();
  let deriveOrder = 0;

  const recordSafe = (cell: number, prov: Omit<Provenance, "order">) => {
    if (provenSafe.has(cell) || provenUrchin.has(cell)) return false;
    provenSafe.add(cell);
    provenance.set(cell, { ...prov, order: deriveOrder++ });
    return true;
  };
  const recordUrchin = (cell: number, prov: Omit<Provenance, "order">) => {
    if (provenSafe.has(cell) || provenUrchin.has(cell)) return false;
    provenUrchin.add(cell);
    provenance.set(cell, { ...prov, order: deriveOrder++ });
    return true;
  };

  const activeConstraints = (): Constraint[] => {
    const out: Constraint[] = [];
    for (let i = 0; i < count; i++) {
      const v = visible[i];
      if (v < 0) continue;
      const near = neighborsRef(size, i);
      const unknown: number[] = [];
      let mines = 0;
      for (let k = 0; k < near.length; k++) {
        const j = near[k];
        if (visible[j] >= 0 || provenSafe.has(j)) continue;
        if (provenUrchin.has(j)) mines++;
        else unknown.push(j);
      }
      const rem = v - mines;
      if (rem < 0 || rem > unknown.length) return [];
      if (unknown.length > 0) out.push({ clue: i, value: v, cells: unknown, rem });
    }
    return out;
  };

  const trackPrereqs = explain || teachPrerequisites;
  const EMPTY_MINES: number[] = [];
  const provenMinesAround = (clue: number): number[] =>
    trackPrereqs ? neighborsRef(size, clue).filter((nb) => provenUrchin.has(nb)) : EMPTY_MINES;

  const runSingleCell = (ceilingSoFar: DeductionTier): boolean => {
    let changed = false;
    for (;;) {
      let progress = false;
      const cs = activeConstraints();
      for (const c of cs) {
        if (c.rem === 0) {
          const prereqMines = provenMinesAround(c.clue);
          for (const cell of c.cells) {
            if (recordSafe(cell, { tier: ceilingSoFar, anchors: [c.clue], rule: "single-safe", prereqMines }))
              progress = true;
          }
        } else if (c.rem === c.cells.length) {
          const prereqMines = provenMinesAround(c.clue);
          for (const cell of c.cells) {
            if (recordUrchin(cell, { tier: ceilingSoFar, anchors: [c.clue], rule: "single-urchin", prereqMines }))
              progress = true;
          }
        }
      }
      if (!progress) break;
      changed = true;
    }
    return changed;
  };

  const runSubset = (ceilingSoFar: DeductionTier): boolean => {
    const cs = activeConstraints();
    const sets = cs.map((c) => new Set(c.cells));
    let progress = false;
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i],
        setA = sets[i];
      for (let j = i + 1; j < cs.length; j++) {
        const b = cs[j],
          setB = sets[j];
        let shared = false;
        for (const x of a.cells) {
          if (setB.has(x)) {
            shared = true;
            break;
          }
        }
        if (!shared) continue;
        const onlyA = a.cells.filter((x) => !setB.has(x));
        const onlyB = b.cells.filter((x) => !setA.has(x));
        if (!onlyA.length && !onlyB.length) continue;
        const diff = a.rem - b.rem;
        const prereqMines = [...new Set([...provenMinesAround(a.clue), ...provenMinesAround(b.clue)])];
        if (diff === onlyA.length) {
          for (const x of onlyA) {
            if (recordUrchin(x, { tier: ceilingSoFar, anchors: [a.clue, b.clue], rule: "subset", prereqMines }))
              progress = true;
          }
          for (const x of onlyB) {
            if (recordSafe(x, { tier: ceilingSoFar, anchors: [a.clue, b.clue], rule: "subset", prereqMines }))
              progress = true;
          }
        } else if (-diff === onlyB.length) {
          for (const x of onlyB) {
            if (recordUrchin(x, { tier: ceilingSoFar, anchors: [a.clue, b.clue], rule: "subset", prereqMines }))
              progress = true;
          }
          for (const x of onlyA) {
            if (recordSafe(x, { tier: ceilingSoFar, anchors: [a.clue, b.clue], rule: "subset", prereqMines }))
              progress = true;
          }
        }
      }
    }
    return progress;
  };

  let usedNodes = 0;

  const runCoupled = (): { changed: boolean; exhausted: boolean } => {
    const allUnknown: number[] = [];
    for (let i = 0; i < count; i++) {
      if (visible[i] < 0 && !provenSafe.has(i) && !provenUrchin.has(i)) allUnknown.push(i);
    }
    const remTotal = totalUrchins - provenUrchin.size;
    if (remTotal < 0 || remTotal > allUnknown.length) return { changed: false, exhausted: false };
    const allProvenMines = [...provenUrchin];
    if (remTotal === 0 && allUnknown.length > 0) {
      let progress = false;
      for (const cell of allUnknown) {
        if (
          recordSafe(cell, {
            tier: "coupled",
            anchors: [],
            rule: "coupled-count",
            prereqMines: allProvenMines,
            usesTotal: true,
          })
        )
          progress = true;
      }
      return { changed: progress, exhausted: false };
    }
    if (remTotal === allUnknown.length && allUnknown.length > 0) {
      let progress = false;
      for (const cell of allUnknown) {
        if (
          recordUrchin(cell, {
            tier: "coupled",
            anchors: [],
            rule: "coupled-count",
            prereqMines: allProvenMines,
            usesTotal: true,
          })
        )
          progress = true;
      }
      return { changed: progress, exhausted: false };
    }

    const cs = activeConstraints();
    if (!cs.length) return { changed: false, exhausted: false };

    // Partition constraints into connected components via shared unknown cells.
    const cellToCs = new Map<number, number[]>();
    cs.forEach((c, idx) => {
      for (const cell of c.cells) {
        const list = cellToCs.get(cell);
        if (list) list.push(idx);
        else cellToCs.set(cell, [idx]);
      }
    });
    const visited = new Array<boolean>(cs.length).fill(false);
    const comps: { vars: number[]; constraints: Constraint[] }[] = [];
    for (let i = 0; i < cs.length; i++) {
      if (visited[i]) continue;
      const queue = [i];
      visited[i] = true;
      const compCs: Constraint[] = [];
      const varSet = new Set<number>();
      while (queue.length) {
        const ci = queue.pop()!;
        const c = cs[ci];
        compCs.push(c);
        for (const cell of c.cells) {
          varSet.add(cell);
          for (const nextCi of cellToCs.get(cell) ?? []) {
            if (!visited[nextCi]) {
              visited[nextCi] = true;
              queue.push(nextCi);
            }
          }
        }
      }
      comps.push({ vars: [...varSet].sort((a, b) => a - b), constraints: compCs });
    }

    const frontierSet = new Set<number>();
    for (const comp of comps) for (const v of comp.vars) frontierSet.add(v);
    const outsideVars = allUnknown.filter((v) => !frontierSet.has(v));

    const solvedComps: ComponentSolutions[] = [];
    for (const comp of comps) {
      if (shouldStop?.()) return { changed: false, exhausted: true };
      const remainingBudget = Math.max(1, nodeBudget - usedNodes);
      const res = solveComponent(comp.vars, comp.constraints, remTotal, remainingBudget, shouldStop);
      usedNodes += res.nodes;
      if (res.status === "budget-exhausted") return { changed: false, exhausted: true };
      if (res.sol.byCount.size === 0) return { changed: false, exhausted: false };
      solvedComps.push(res.sol);
    }

    // Prefix / suffix DP on mine counts across components to enforce global remaining mine total.
    const kCount = solvedComps.length;
    const prefix: Set<number>[] = Array.from({ length: kCount + 1 }, () => new Set<number>());
    prefix[0].add(0);
    for (let i = 0; i < kCount; i++) {
      for (const prev of prefix[i]) {
        for (const mines of solvedComps[i].byCount.keys()) {
          if (prev + mines <= remTotal) prefix[i + 1].add(prev + mines);
        }
      }
    }
    const suffix: Set<number>[] = Array.from({ length: kCount + 1 }, () => new Set<number>());
    suffix[kCount].add(0);
    for (let i = kCount - 1; i >= 0; i--) {
      for (const next of suffix[i + 1]) {
        for (const mines of solvedComps[i].byCount.keys()) {
          if (next + mines <= remTotal) suffix[i].add(next + mines);
        }
      }
    }

    const minFrontierNeeded = Math.max(0, remTotal - outsideVars.length);
    let progress = false;

    for (let i = 0; i < kCount; i++) {
      const sol = solvedComps[i];
      const m = sol.vars.length;
      const allBits = m === 32 ? -1 : (1 << m) - 1;
      let alwaysOne = allBits;
      let alwaysZero = allBits;
      let localOne = allBits;
      let localZero = allBits;
      let anyFeasible = false;
      for (const [mines, masks] of sol.byCount) {
        localOne &= masks.alwaysOne;
        localZero &= masks.alwaysZero;
        let feasible = false;
        for (const p of prefix[i]) {
          for (const q of suffix[i + 1]) {
            const sum = p + mines + q;
            if (sum >= minFrontierNeeded && sum <= remTotal) {
              feasible = true;
              break;
            }
          }
          if (feasible) break;
        }
        if (feasible) {
          anyFeasible = true;
          alwaysOne &= masks.alwaysOne;
          alwaysZero &= masks.alwaysZero;
        }
      }
      if (!anyFeasible) return { changed: false, exhausted: false };
      const allClues = [...sol.clues].sort((a, b) => a - b);
      for (let bit = 0; bit < m; bit++) {
        const cell = sol.vars[bit];
        if ((alwaysOne & (1 << bit)) !== 0) {
          const usesTotal = (localOne & (1 << bit)) === 0;
          if (
            recordUrchin(cell, {
              tier: "coupled",
              anchors: allClues,
              rule: usesTotal ? "coupled-count" : "coupled-component",
              prereqMines: allProvenMines,
              usesTotal,
            })
          )
            progress = true;
        } else if ((alwaysZero & (1 << bit)) !== 0) {
          const usesTotal = (localZero & (1 << bit)) === 0;
          if (
            recordSafe(cell, {
              tier: "coupled",
              anchors: allClues,
              rule: usesTotal ? "coupled-count" : "coupled-component",
              prereqMines: allProvenMines,
              usesTotal,
            })
          )
            progress = true;
        }
      }
    }

    if (outsideVars.length > 0) {
      const validTotals = [...prefix[kCount]].filter((sum) => sum >= minFrontierNeeded && sum <= remTotal);
      if (validTotals.length > 0) {
        const minSum = Math.min(...validTotals);
        const maxSum = Math.max(...validTotals);
        const allCsClues = cs.map((c) => c.clue).sort((a, b) => a - b);
        if (minSum === remTotal) {
          for (const cell of outsideVars) {
            if (
              recordSafe(cell, {
                tier: "coupled",
                anchors: allCsClues,
                rule: "coupled-count",
                prereqMines: allProvenMines,
                usesTotal: true,
              })
            )
              progress = true;
          }
        } else if (maxSum === remTotal - outsideVars.length) {
          for (const cell of outsideVars) {
            if (
              recordUrchin(cell, {
                tier: "coupled",
                anchors: allCsClues,
                rule: "coupled-count",
                prereqMines: allProvenMines,
                usesTotal: true,
              })
            )
              progress = true;
          }
        }
      }
    }

    return { changed: progress, exhausted: false };
  };

  // Escalate strictly tier-by-tier only while no proven safe cell is available yet.
  runSingleCell("single-cell");

  if (provenSafe.size === 0 && tierRank(maxTier) >= 2) {
    for (;;) {
      const sub = runSubset("subset");
      if (!sub) break;
      runSingleCell("subset");
      if (provenSafe.size > 0) break;
    }
  }

  if (provenSafe.size === 0 && tierRank(maxTier) >= 3) {
    for (;;) {
      const res = runCoupled();
      if (res.exhausted) return { status: "budget-exhausted", nodes: usedNodes };
      if (!res.changed) break;
      runSingleCell("coupled");
      if (provenSafe.size > 0) break;
      if (runSubset("coupled")) {
        runSingleCell("coupled");
        if (provenSafe.size > 0) break;
      }
    }
  }

  const safe = [...provenSafe].sort((a, b) => a - b);
  const urchins = [...provenUrchin].sort((a, b) => a - b);
  const wrongFlags = safe.filter((c) => visible[c] === -2);
  const unflaggedSafe = safe.filter((c) => visible[c] === -1);
  const unflaggedUrchins = urchins.filter((c) => visible[c] === -1);

  if (!safe.length && !unflaggedUrchins.length) {
    return { status: "stalled", safe, urchins, wrongFlags };
  }

  const byTierAndIndex = (a: number, b: number) =>
    tierRank(provenance.get(a)!.tier) - tierRank(provenance.get(b)!.tier) || a - b;

  const byTierAndOrder = (a: number, b: number) =>
    tierRank(provenance.get(a)!.tier) - tierRank(provenance.get(b)!.tier) ||
    provenance.get(a)!.order - provenance.get(b)!.order ||
    a - b;

  const earliestUnflaggedPrereq = (targetCell: number): number | null => {
    const seen = new Set<number>();
    const unflagged: number[] = [];
    const queue = [...(provenance.get(targetCell)?.prereqMines ?? [])];
    while (queue.length) {
      const m = queue.shift()!;
      if (seen.has(m)) continue;
      seen.add(m);
      if (visible[m] === -1) unflagged.push(m);
      for (const pm of provenance.get(m)?.prereqMines ?? []) if (!seen.has(pm)) queue.push(pm);
    }
    if (!unflagged.length) return null;
    unflagged.sort(byTierAndOrder);
    return unflagged[0];
  };

  let kind: "open" | "flag" | "unflag";
  let cell: number;

  if (preferFlag && unflaggedUrchins.length > 0) {
    kind = "flag";
    cell = [...unflaggedUrchins].sort(byTierAndIndex)[0];
  } else if (teachPrerequisites && unflaggedSafe.length > 0) {
    // Prefer a direct safe opening with no unflagged prerequisite mines; otherwise teach the earliest
    // unflagged prerequisite forced mine first so every explanation is self-contained and truthful.
    const directSafe = unflaggedSafe.filter((c) => earliestUnflaggedPrereq(c) === null);
    if (directSafe.length > 0) {
      kind = "open";
      cell = [...directSafe].sort(byTierAndIndex)[0];
    } else {
      const target = [...unflaggedSafe].sort(byTierAndIndex)[0];
      const prereqMine = earliestUnflaggedPrereq(target);
      if (prereqMine !== null) {
        kind = "flag";
        cell = prereqMine;
      } else {
        kind = "open";
        cell = target;
      }
    }
  } else if (unflaggedSafe.length > 0) {
    kind = "open";
    cell = [...unflaggedSafe].sort(byTierAndIndex)[0];
  } else if (wrongFlags.length > 0) {
    kind = "unflag";
    cell = wrongFlags[0];
  } else {
    kind = "flag";
    cell = [...unflaggedUrchins].sort(byTierAndIndex)[0];
  }

  let prov = provenance.get(cell)!;
  const stepTier = prov.tier;

  if (!explain) {
    return {
      status: "deduced",
      step: {
        kind,
        cell,
        tier: stepTier,
        clues: prov.anchors,
        reason: { look: "", think: "", oneStep: "" },
      },
      safe,
      urchins,
      wrongFlags,
      tier: stepTier,
    };
  }

  // For coupled explanations, compute an exact minimal proving clue subset on the actual closed board
  // so every "in every arrangement that fits ..." statement is mathematically true with zero counterexamples.
  if (prov.rule === "coupled-component" || prov.rule === "coupled-count") {
    const minimized = minimizeCoupledPremises(size, totalUrchins, visible, cell, kind !== "flag");
    prov = { ...prov, anchors: minimized.anchors, rule: minimized.rule, usesTotal: minimized.usesTotal };
  }

  const built = buildReason(size, visible, totalUrchins, kind, cell, prov, provenance);
  return {
    status: "deduced",
    step: {
      kind,
      cell,
      tier: stepTier,
      clues: built.anchors,
      reason: built.reason,
    },
    safe,
    urchins,
    wrongFlags,
    tier: stepTier,
  };
}

/** Opens a cell on a board with zero-flood-fill, returning a new marks array. */
export function revealCell(board: readonly number[], size: number, marks: readonly number[], cell: number): number[] {
  const next = [...marks];
  next[cell] = 1;
  const queue = board[cell] === 0 ? [cell] : [];
  while (queue.length) {
    const cur = queue.pop()!;
    for (const nb of neighbors(size, cur)) {
      if (next[nb] === 0 && board[nb] !== -1) {
        next[nb] = 1;
        if (board[nb] === 0) queue.push(nb);
      }
    }
  }
  return next;
}

export type PublicSolveStepper = {
  board: readonly number[];
  size: number;
  totalUrchins: number;
  marks: number[];
  ceiling: DeductionTier;
  opens: number[];
  traceParts: string[];
  tierCounts: Record<DeductionTier, number>;
  iter: number;
};

/** Pure clock-free incremental stepper so async runners can yield and check deadlines mid-candidate. */
export function createPublicSolve(board: readonly number[], size: number, start: number): PublicSolveStepper | null {
  const count = size * size;
  if (start < 0 || start >= count || board[start] === -1) return null;
  const totalUrchins = board.filter((v) => v === -1).length;
  return {
    board,
    size,
    totalUrchins,
    marks: revealCell(board, size, new Array<number>(count).fill(0), start),
    ceiling: "single-cell",
    opens: [start],
    traceParts: [`open:${start}`],
    tierCounts: { "single-cell": 0, subset: 0, coupled: 0 },
    iter: 0,
  };
}

/** Runs one deduction step on a `PublicSolveStepper` without allocating explanations or clocks. */
export function stepPublicSolve(
  st: PublicSolveStepper,
  options: { maxTier?: DeductionTier; nodeBudget?: number; shouldStop?: () => boolean } = {}
):
  | { status: "continue" }
  | { status: "solved"; ceiling: DeductionTier; opens: number[]; trace: string; tierCounts: Record<DeductionTier, number> }
  | { status: "stalled"; revealed: number; ceiling: DeductionTier }
  | { status: "budget-exhausted"; nodes: number } {
  const count = st.size * st.size;
  if (st.iter >= count) {
    return { status: "stalled", revealed: st.marks.filter((m) => m === 1).length, ceiling: st.ceiling };
  }
  st.iter++;
  const view = publicView(st.size, st.totalUrchins, st.board, st.marks);
  const res = deducePublic(view, {
    maxTier: options.maxTier,
    nodeBudget: options.nodeBudget,
    explain: false,
    shouldStop: options.shouldStop,
  });
  if (res.status === "solved") {
    return {
      status: "solved",
      ceiling: st.ceiling,
      opens: st.opens,
      trace: st.traceParts.join(">"),
      tierCounts: st.tierCounts,
    };
  }
  if (res.status === "budget-exhausted") return { status: "budget-exhausted", nodes: res.nodes };
  if (res.status === "stalled" || res.step.kind !== "open") {
    return { status: "stalled", revealed: st.marks.filter((m) => m === 1).length, ceiling: st.ceiling };
  }
  const { cell, tier } = res.step;
  if (st.board[cell] === -1) {
    return { status: "stalled", revealed: st.marks.filter((m) => m === 1).length, ceiling: st.ceiling };
  }
  if (tierRank(tier) > tierRank(st.ceiling)) st.ceiling = tier;
  st.tierCounts[tier]++;
  st.opens.push(cell);
  st.traceParts.push(`${tier[0]}:${cell}`);
  st.marks = revealCell(st.board, st.size, st.marks, cell);
  return { status: "continue" };
}

/**
 * Plays a board from `start` using strictly public deduction (`deducePublic`) with zero guesses.
 * At each step, opens the lowest-tier proven safe cell until every non-urchin cell is revealed.
 */
export function solvePublicNoGuess(
  board: readonly number[],
  size: number,
  start: number,
  options: { maxTier?: DeductionTier; nodeBudget?: number } = {}
): SolveNoGuessResult {
  const st = createPublicSolve(board, size, start);
  if (!st) return { status: "stalled", revealed: 0, ceiling: "single-cell" };
  for (;;) {
    const res = stepPublicSolve(st, options);
    if (res.status === "continue") continue;
    if (res.status === "solved") {
      return {
        status: "solved",
        ceiling: res.ceiling,
        steps: res.opens.length,
        opens: res.opens,
        trace: res.trace,
        tierCounts: res.tierCounts,
      };
    }
    return res;
  }
}

/**
 * Exact mathematical lower bound on opening taps for a Reef Sweep board:
 * each connected component of 0-cells needs at least 1 tap, and each non-zero safe cell
 * with no adjacent 0-cell can never be flood-filled so it needs 1 tap.
 */
export function exactMinOpenings(board: readonly number[], size: number): number {
  const count = size * size;
  const visited = new Array<boolean>(count).fill(false);
  let taps = 0;
  for (let i = 0; i < count; i++) {
    if (board[i] !== 0 || visited[i]) continue;
    taps++;
    const stack = [i];
    visited[i] = true;
    while (stack.length) {
      const cur = stack.pop()!;
      for (const nb of neighbors(size, cur)) {
        if (board[nb] === 0 && !visited[nb]) {
          visited[nb] = true;
          stack.push(nb);
        }
      }
    }
  }
  for (let i = 0; i < count; i++) {
    if (board[i] > 0 && !neighbors(size, i).some((nb) => board[nb] === 0)) taps++;
  }
  return taps;
}

/**
 * Builds up to `limit` distinct counterfactual mine layouts (sorted indices) that:
 * - agree with EVERY revealed number in `view`,
 * - place no mine on `start`, its neighbors, or any revealed cell,
 * - have exact count `view.totalUrchins`, and
 * - differ from `actualMines`.
 * Used by `adapter.hidden.twins` and counterfactual tests to prove hints never leak hidden mines.
 */
export function findCounterfactualTwins(
  view: PublicReefView,
  actualMines: readonly number[],
  start: number,
  limit = 2,
  nodeBudget = 6000
): number[][] {
  const { size, totalUrchins, visible } = view;
  const count = size * size;
  const actualKey = [...actualMines].sort((a, b) => a - b).join(",");
  const forbidden = new Set<number>([start, ...neighbors(size, start)]);
  for (let i = 0; i < count; i++) if (visible[i] >= 0) forbidden.add(i);

  const candidates: number[] = [];
  for (let i = 0; i < count; i++) if (!forbidden.has(i)) candidates.push(i);
  if (candidates.length < totalUrchins) return [];

  // Build constraints for every revealed clue that has candidate neighbors.
  const clueIndices: number[] = [];
  const clueValues: number[] = [];
  const clueLeft: number[] = [];
  const clueAssigned: number[] = [];
  const touching: number[][] = Array.from({ length: candidates.length }, () => []);
  const candPos = new Map<number, number>();
  candidates.forEach((cell, idx) => candPos.set(cell, idx));

  for (let i = 0; i < count; i++) {
    if (visible[i] < 0) continue;
    const near = neighbors(size, i).filter((nb) => candPos.has(nb));
    if (!near.length) {
      if (visible[i] !== 0) return [];
      continue;
    }
    const ci = clueIndices.length;
    clueIndices.push(i);
    clueValues.push(visible[i]);
    clueLeft.push(near.length);
    clueAssigned.push(0);
    for (const nb of near) touching[candPos.get(nb)!].push(ci);
  }

  // Order constrained candidates first so pruning triggers early; try opposite value of actualMines first to find twins fast.
  const actualSet = new Set(actualMines);
  const order = Array.from({ length: candidates.length }, (_, i) => i).sort(
    (a, b) => touching[b].length - touching[a].length || a - b
  );
  const chosen: number[] = [];
  const found: number[][] = [];
  const seen = new Set<string>([actualKey]);
  let nodes = 0;

  function dfs(pos: number, mines: number): void {
    if (found.length >= limit || ++nodes > nodeBudget) return;
    const remVars = order.length - pos;
    if (mines > totalUrchins || mines + remVars < totalUrchins) return;
    if (pos === order.length) {
      if (mines !== totalUrchins) return;
      const sorted = [...chosen].sort((a, b) => a - b);
      const key = sorted.join(",");
      if (!seen.has(key)) {
        seen.add(key);
        found.push(sorted);
      }
      return;
    }
    const idx = order[pos];
    const cell = candidates[idx];
    const rel = touching[idx];
    // Prefer flipping away from actualMines so we discover counterfactual worlds immediately.
    const tryOrder = actualSet.has(cell) ? [0, 1] : [1, 0];
    for (const val of tryOrder) {
      if (found.length >= limit || nodes > nodeBudget) return;
      let ok = true;
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        const am = clueAssigned[ci] + val;
        const left = clueLeft[ci] - 1;
        if (am > clueValues[ci] || am + left < clueValues[ci]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        clueAssigned[ci] += val;
        clueLeft[ci] -= 1;
      }
      if (val === 1) chosen.push(cell);
      dfs(pos + 1, mines + val);
      if (val === 1) chosen.pop();
      for (let i = 0; i < rel.length; i++) {
        const ci = rel[i];
        clueAssigned[ci] -= val;
        clueLeft[ci] += 1;
      }
    }
  }

  dfs(0, 0);
  return found;
}
