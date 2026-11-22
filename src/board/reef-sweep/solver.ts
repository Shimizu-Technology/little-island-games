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

/** Row-major sorted 8-neighbors for a cell on an n×n grid. */
export function neighbors(n: number, cell: number): number[] {
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
  return [...(table[cell] ?? [])];
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
  clues: number[];
  rule: "single-safe" | "single-urchin" | "subset" | "coupled-component" | "coupled-count";
};

function buildReason(
  size: number,
  visible: readonly number[],
  totalUrchins: number,
  kind: "open" | "flag" | "unflag",
  cell: number,
  prov: Provenance
): DeductionReason {
  const at = coordinate(size, cell);
  const clueList = prov.clues.map((c) => `${visible[c]} at ${coordinate(size, c)}`);
  if (kind === "unflag") {
    const clueText = clueList.length ? `Look at ${clueList.join(" and ")}.` : "Count the remaining sea urchins on the reef.";
    return {
      look: `${clueText} One of your flags does not match the numbers.`,
      think: "Flags are only reminders. Check which spaces around those numbers must actually be safe.",
      oneStep: `Remove the flag at ${at}: the visible numbers prove ${at} is a safe pearl space.`,
    };
  }
  if (prov.tier === "single-cell") {
    const clue = prov.clues[0];
    const clueCoord = clue !== undefined ? coordinate(size, clue) : at;
    const val = clue !== undefined ? visible[clue] : 0;
    if (kind === "flag") {
      return {
        look: `Look at the ${val} at ${clueCoord}.`,
        think: `Count the closed spaces touching ${clueCoord}. When a number has only that many closed spaces left, every one holds an urchin.`,
        oneStep: `Flag ${at}: the ${val} at ${clueCoord} needs an urchin there.`,
      };
    }
    return {
      look: `Look at the ${val} at ${clueCoord}.`,
      think: `All ${val === 1 ? "of its urchin is" : `${val} of its urchins are`} already accounted for, so its other touching spaces are safe.`,
      oneStep: `Open ${at}: the ${val} at ${clueCoord} already has all its urchins placed.`,
    };
  }
  if (prov.tier === "subset") {
    const [a, b] = prov.clues;
    const labelA = a !== undefined ? `the ${visible[a]} at ${coordinate(size, a)}` : "one clue";
    const labelB = b !== undefined ? `the ${visible[b]} at ${coordinate(size, b)}` : "its neighbor";
    return {
      look: `Compare ${labelA} and ${labelB}.`,
      think: "See which closed spaces both numbers share, and compare how many urchins each one still needs.",
      oneStep:
        kind === "flag"
          ? `Flag ${at}: comparing ${labelA} with ${labelB} forces an urchin at ${at}.`
          : `Open ${at}: comparing ${labelA} with ${labelB} leaves no room for an urchin at ${at}.`,
    };
  }
  if (prov.rule === "coupled-count") {
    const clueText = clueList.length ? ` Look at ${clueList.join(", ")} together with the total of ${totalUrchins} urchins.` : "";
    return {
      look: `Count how many of the ${totalUrchins} sea urchins are still unplaced.${clueText}`,
      think: "Use the total remaining urchins together with the visible numbers to see where the last urchins must sit.",
      oneStep:
        kind === "flag"
          ? `Flag ${at}: every way to place the remaining urchins puts one at ${at}.`
          : `Open ${at}: the remaining urchins are all needed elsewhere, so ${at} is safe.`,
    };
  }
  const groupText = clueList.length ? clueList.join(", ") : "the frontier clues";
  return {
    look: `Look at these linked clues together: ${groupText}.`,
    think: "Try the few ways the urchins could fit around these linked numbers at the same time.",
    oneStep:
      kind === "flag"
        ? `Flag ${at}: in every arrangement that fits ${groupText}, ${at} holds an urchin.`
        : `Open ${at}: in every arrangement that fits ${groupText}, ${at} is safe.`,
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
  nodeBudget: number
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
    if (++nodes > nodeBudget) return false;
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
  options: { maxTier?: DeductionTier; nodeBudget?: number; preferFlag?: boolean } = {}
): DeduceResult {
  const { size, totalUrchins, visible } = view;
  const maxTier = options.maxTier ?? "coupled";
  const nodeBudget = options.nodeBudget ?? 12_000;
  const preferFlag = options.preferFlag ?? false;
  const count = size * size;
  let revealedCount = 0;
  for (let i = 0; i < count; i++) if (visible[i] >= 0) revealedCount++;
  if (revealedCount >= count - totalUrchins) return { status: "solved" };

  const provenSafe = new Set<number>();
  const provenUrchin = new Set<number>();
  const provenance = new Map<number, Provenance>();

  const recordSafe = (cell: number, prov: Provenance) => {
    if (provenSafe.has(cell) || provenUrchin.has(cell)) return false;
    provenSafe.add(cell);
    provenance.set(cell, prov);
    return true;
  };
  const recordUrchin = (cell: number, prov: Provenance) => {
    if (provenSafe.has(cell) || provenUrchin.has(cell)) return false;
    provenUrchin.add(cell);
    provenance.set(cell, prov);
    return true;
  };

  const activeConstraints = (): Constraint[] => {
    const out: Constraint[] = [];
    for (let i = 0; i < count; i++) {
      const v = visible[i];
      if (v < 0) continue;
      const near = neighbors(size, i);
      const unknown: number[] = [];
      let mines = 0;
      for (const j of near) {
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

  const runSingleCell = (ceilingSoFar: DeductionTier): boolean => {
    let changed = false;
    for (;;) {
      let progress = false;
      const cs = activeConstraints();
      for (const c of cs) {
        if (c.rem === 0) {
          for (const cell of c.cells) {
            if (recordSafe(cell, { tier: ceilingSoFar, clues: [c.clue], rule: "single-safe" })) progress = true;
          }
        } else if (c.rem === c.cells.length) {
          for (const cell of c.cells) {
            if (recordUrchin(cell, { tier: ceilingSoFar, clues: [c.clue], rule: "single-urchin" })) progress = true;
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
        if (diff === onlyA.length) {
          for (const x of onlyA) {
            if (recordUrchin(x, { tier: ceilingSoFar, clues: [a.clue, b.clue], rule: "subset" })) progress = true;
          }
          for (const x of onlyB) {
            if (recordSafe(x, { tier: ceilingSoFar, clues: [a.clue, b.clue], rule: "subset" })) progress = true;
          }
        } else if (-diff === onlyB.length) {
          for (const x of onlyB) {
            if (recordUrchin(x, { tier: ceilingSoFar, clues: [a.clue, b.clue], rule: "subset" })) progress = true;
          }
          for (const x of onlyA) {
            if (recordSafe(x, { tier: ceilingSoFar, clues: [a.clue, b.clue], rule: "subset" })) progress = true;
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
    if (remTotal === 0 && allUnknown.length > 0) {
      let progress = false;
      for (const cell of allUnknown) {
        if (recordSafe(cell, { tier: "coupled", clues: [], rule: "coupled-count" })) progress = true;
      }
      return { changed: progress, exhausted: false };
    }
    if (remTotal === allUnknown.length && allUnknown.length > 0) {
      let progress = false;
      for (const cell of allUnknown) {
        if (recordUrchin(cell, { tier: "coupled", clues: [], rule: "coupled-count" })) progress = true;
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
      const remainingBudget = Math.max(1, nodeBudget - usedNodes);
      const res = solveComponent(comp.vars, comp.constraints, remTotal, remainingBudget);
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
      let anyFeasible = false;
      for (const [mines, masks] of sol.byCount) {
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
      const topClues = sol.clues.slice(0, 3);
      for (let bit = 0; bit < m; bit++) {
        const cell = sol.vars[bit];
        if ((alwaysOne & (1 << bit)) !== 0) {
          if (recordUrchin(cell, { tier: "coupled", clues: topClues, rule: "coupled-component" })) progress = true;
        } else if ((alwaysZero & (1 << bit)) !== 0) {
          if (recordSafe(cell, { tier: "coupled", clues: topClues, rule: "coupled-component" })) progress = true;
        }
      }
    }

    if (outsideVars.length > 0) {
      const validTotals = [...prefix[kCount]].filter((sum) => sum >= minFrontierNeeded && sum <= remTotal);
      if (validTotals.length > 0) {
        const minSum = Math.min(...validTotals);
        const maxSum = Math.max(...validTotals);
        const topClues = cs.slice(0, 3).map((c) => c.clue);
        if (minSum === remTotal) {
          for (const cell of outsideVars) {
            if (recordSafe(cell, { tier: "coupled", clues: topClues, rule: "coupled-count" })) progress = true;
          }
        } else if (maxSum === remTotal - outsideVars.length) {
          for (const cell of outsideVars) {
            if (recordUrchin(cell, { tier: "coupled", clues: topClues, rule: "coupled-count" })) progress = true;
          }
        }
      }
    }

    return { changed: progress, exhausted: false };
  };

  let highestTier: DeductionTier = "single-cell";

  // Escalate strictly tier-by-tier only while no proven safe cell is available yet.
  runSingleCell("single-cell");

  if (provenSafe.size === 0 && tierRank(maxTier) >= 2) {
    for (;;) {
      const sub = runSubset("subset");
      if (!sub) break;
      highestTier = "subset";
      runSingleCell("subset");
      if (provenSafe.size > 0) break;
    }
  }

  if (provenSafe.size === 0 && tierRank(maxTier) >= 3) {
    for (;;) {
      const res = runCoupled();
      if (res.exhausted) return { status: "budget-exhausted", nodes: usedNodes };
      if (!res.changed) break;
      highestTier = "coupled";
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

  // Pick next actionable step deterministically:
  // 1. If a proven safe cell is wrongly flagged (and no unflagged safe cell or we want to fix wrong flags), unflag or open.
  // 2. If preferFlag is requested and there's an unflagged proven urchin, flag it.
  // 3. Otherwise open the lowest-tier (then lowest-index) unflagged safe cell, or unflag a wrongly flagged safe cell.
  let kind: "open" | "flag" | "unflag";
  let cell: number;

  if (preferFlag && unflaggedUrchins.length > 0) {
    kind = "flag";
    cell = unflaggedUrchins.sort((a, b) => tierRank(provenance.get(a)!.tier) - tierRank(provenance.get(b)!.tier) || a - b)[0];
  } else if (unflaggedSafe.length > 0) {
    kind = "open";
    cell = unflaggedSafe.sort((a, b) => tierRank(provenance.get(a)!.tier) - tierRank(provenance.get(b)!.tier) || a - b)[0];
  } else if (wrongFlags.length > 0) {
    kind = "unflag";
    cell = wrongFlags[0];
  } else {
    kind = "flag";
    cell = unflaggedUrchins[0];
  }

  const prov = provenance.get(cell)!;
  const stepTier = tierRank(prov.tier) > tierRank(highestTier) ? prov.tier : prov.tier;
  return {
    status: "deduced",
    step: {
      kind,
      cell,
      tier: stepTier,
      clues: prov.clues,
      reason: buildReason(size, visible, totalUrchins, kind, cell, prov),
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
  const count = size * size;
  const totalUrchins = board.filter((v) => v === -1).length;
  if (start < 0 || start >= count || board[start] === -1) {
    return { status: "stalled", revealed: 0, ceiling: "single-cell" };
  }
  let marks = revealCell(board, size, new Array<number>(count).fill(0), start);
  const opens: number[] = [start];
  const traceParts: string[] = [`open:${start}`];
  const tierCounts: Record<DeductionTier, number> = { "single-cell": 0, subset: 0, coupled: 0 };
  let ceiling: DeductionTier = "single-cell";

  for (let iter = 0; iter < count; iter++) {
    const view = publicView(size, totalUrchins, board, marks);
    const res = deducePublic(view, { maxTier: options.maxTier, nodeBudget: options.nodeBudget });
    if (res.status === "solved") {
      return {
        status: "solved",
        ceiling,
        steps: opens.length,
        opens,
        trace: traceParts.join(">"),
        tierCounts,
      };
    }
    if (res.status === "budget-exhausted") return { status: "budget-exhausted", nodes: res.nodes };
    if (res.status === "stalled" || res.step.kind !== "open") {
      const revealed = marks.filter((m) => m === 1).length;
      return { status: "stalled", revealed, ceiling };
    }
    const { cell, tier } = res.step;
    if (board[cell] === -1) {
      // Soundness invariant: public solver must never open an urchin.
      return { status: "stalled", revealed: marks.filter((m) => m === 1).length, ceiling };
    }
    if (tierRank(tier) > tierRank(ceiling)) ceiling = tier;
    tierCounts[tier]++;
    opens.push(cell);
    traceParts.push(`${tier[0]}:${cell}`);
    marks = revealCell(board, size, marks, cell);
  }
  return { status: "stalled", revealed: marks.filter((m) => m === 1).length, ceiling };
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
