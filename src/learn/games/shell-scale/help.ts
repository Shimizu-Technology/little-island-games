import type { HintCue, PublicHintRules } from '../../../puzzles/hints';
import {
  analyzeOdd, analyzeSort, bestPublicWeighing, bitsOf, itemName, panLabel, type OddDir, type PublicBoard,
} from './rules';

/**
 * Strictly public view passed into Shell Scale's hint ladder.
 * ZERO hidden weight / odd-pearl fields exist on this type!
 */
export type PublicScaleView = PublicBoard & {
  order: readonly number[];
  oddPick: number | null;
  oddDir: OddDir | null;
  /** True during Scale-Holder mode so One step / Show me suggests without auto-triggering a secret answer. */
  scaleHolder?: boolean;
};

/**
 * Public-knowledge hint action:
 * - weigh: perform the optimal public-knowledge weighing (leftMask, rightMask)
 * - place-sort: place a publicly deduced shell into its sorted slot
 * - pick-odd: select the publicly deduced odd pearl (and direction)
 */
export type ScaleHelpAction =
  | { kind: 'weigh'; left: number; right: number }
  | { kind: 'place-sort'; item: number; slot: number }
  | { kind: 'pick-odd'; pearl: number; dir: OddDir };

export type ScaleFocus = {
  greyKnown: boolean;
  highlightLeft: number;
  highlightRight: number;
};

export function focusOf(cue: HintCue | null): ScaleFocus {
  if (!cue) return { greyKnown: false, highlightLeft: 0, highlightRight: 0 };
  let greyKnown = false, highlightLeft = 0, highlightRight = 0;
  for (const token of cue.focus) {
    if (token === 'grey-known') greyKnown = true;
    else if (token.startsWith('panL:')) highlightLeft = Number(token.slice(5)) || 0;
    else if (token.startsWith('panR:')) highlightRight = Number(token.slice(5)) || 0;
  }
  return { greyKnown, highlightLeft, highlightRight };
}

/** Accessible summary of the scale, public weighings, and current answer draft (ZERO hidden data). */
export function describeScale(v: PublicScaleView): string {
  const last = v.history.at(-1);
  const lastText = !last
    ? 'Scale is level. No weighings yet.'
    : last.outcome === '='
      ? `Last weighing: ${panLabel(v, last.left)} balanced with ${panLabel(v, last.right)}.`
      : last.outcome === 'L'
        ? `Last weighing: ${panLabel(v, last.left)} was heavier than ${panLabel(v, last.right)}.`
        : `Last weighing: ${panLabel(v, last.right)} was heavier than ${panLabel(v, last.left)}.`;
  if (v.kind === 'sort') {
    const row = v.order.map((s, idx) => `Spot ${idx + 1}: ${s >= 0 ? itemName(v, s) : 'empty'}`).join('. ');
    return `Shell Scale with ${v.n} shells. ${v.history.length} weighings so far. ${lastText} Answer row, lightest to heaviest: ${row}.`;
  }
  const pick = v.oddPick !== null
    ? `Chosen: Pearl ${v.oddPick + 1}${v.kind === 'odd-either' && v.oddDir ? ` (${v.oddDir})` : ''}.`
    : 'No pearl chosen yet.';
  return `Shell Scale with ${v.n} pearls. ${v.history.length} weighings so far. ${lastText} ${pick}`;
}

/**
 * Shared public-knowledge four-step help ladder (Look, Think, One step, Show me):
 * - Look (Step 1): greys out pairs / pearls already known from transitive closure of public results!
 * - Think (Step 2): suggests the optimal public-knowledge next weighing (or names the deduced answer if already unique)!
 * - One step / Show me (Steps 3–4): executes the optimal public weighing (if >1 world remains) or places the
 *   publicly deduced answer step-by-step (if uniquely deduced). Never reads hidden weights!
 */
export function shellHelpRules(view: PublicScaleView): PublicHintRules<PublicScaleView, ScaleHelpAction> {
  const look = (v: PublicScaleView): HintCue => {
    if (v.kind === 'sort') {
      const info = analyzeSort(v.n, v.history);
      if (info.deducedOrder) {
        return {
          text: 'Look: every pair is already known from the scale — no more weighings needed! Line them up from lightest to heaviest.',
          focus: ['grey-known'],
        };
      }
      if (!info.knownPairs.length) {
        return {
          text: 'Look: no shells have been weighed yet. Put any two shells on the pans to start.',
          focus: ['grey-known'],
        };
      }
      const pairWord = info.knownPairs.length === 1 ? 'pair is' : 'pairs are';
      return {
        text: `Look: ${info.knownPairs.length} ${pairWord} already known from your weighings and greyed out so you do not need to weigh them again. ${info.unknownPairs.length} left to check.`,
        focus: ['grey-known'],
      };
    }
    const info = analyzeOdd(v.kind, v.n, v.history);
    if (info.deduced) {
      const dirText = v.kind === 'odd-either' ? ` (${info.deduced.dir === 'heavy' ? 'heavier' : 'lighter'})` : '';
      return {
        text: `Look: every other pearl is ruled out (greyed out). Pearl ${info.deduced.odd + 1}${dirText} is the only one left!`,
        focus: ['grey-known'],
      };
    }
    if (!info.ruledOut.length) {
      const groupSize = v.n === 9 ? 3 : v.n === 12 ? 4 : 1;
      return {
        text: `Look: split the pearls into three equal groups — put ${groupSize} on the left pan, ${groupSize} on the right pan, and leave the rest on the table.`,
        focus: ['grey-known'],
      };
    }
    const suspects = v.n - info.ruledOut.length;
    return {
      text: `Look: ${info.ruledOut.length} normal pearls are greyed out. Only ${suspects} pearls can still be the odd one.`,
      focus: ['grey-known'],
    };
  };

  const think = (v: PublicScaleView): HintCue => {
    if (v.kind === 'sort') {
      const info = analyzeSort(v.n, v.history);
      if (info.deducedOrder) {
        const names = info.deducedOrder.map(i => itemName(v, i)).join(' < ');
        return {
          text: `Think: the weighings already prove the full order: ${names}. Put them in the row and tap Check.`,
          focus: ['grey-known'],
        };
      }
      const next = bestPublicWeighing(v);
      if (next) {
        const [a] = bitsOf(next.left, v.n);
        const [b] = bitsOf(next.right, v.n);
        return {
          text: `Think: weigh ${itemName(v, a)} against ${itemName(v, b)} next — it splits the remaining ${info.consistentOrders} possible orders most evenly.`,
          focus: ['grey-known', `panL:${next.left}`, `panR:${next.right}`],
        };
      }
      return look(v);
    }
    const info = analyzeOdd(v.kind, v.n, v.history);
    if (info.deduced) {
      const dirText = v.kind === 'odd-either' ? ` and mark it ${info.deduced.dir === 'heavy' ? 'Heavier' : 'Lighter'}` : '';
      return {
        text: `Think: your weighings already prove it is Pearl ${info.deduced.odd + 1}! Pick Pearl ${info.deduced.odd + 1}${dirText} and tap Check.`,
        focus: ['grey-known'],
      };
    }
    const next = bestPublicWeighing(v);
    if (next) {
      return {
        text: `Think: weigh ${panLabel(v, next.left)} on the left against ${panLabel(v, next.right)} on the right.`,
        focus: ['grey-known', `panL:${next.left}`, `panR:${next.right}`],
      };
    }
    return look(v);
  };

  // Determine the next strictly public action(s) without ever reading hidden weights.
  const nextPublicStep = (v: PublicScaleView): ScaleHelpAction | null => {
    if (v.kind === 'sort') {
      const info = analyzeSort(v.n, v.history);
      if (info.deducedOrder) {
        for (let slot = 0; slot < v.n; slot++) {
          const want = info.deducedOrder[slot];
          if (v.order[slot] !== want) return { kind: 'place-sort', item: want, slot };
        }
        return null;
      }
      if (v.scaleHolder) return null;
      const w = bestPublicWeighing(v);
      return w ? { kind: 'weigh', left: w.left, right: w.right } : null;
    }
    const info = analyzeOdd(v.kind, v.n, v.history);
    if (info.deduced) {
      if (v.oddPick !== info.deduced.odd || (v.kind === 'odd-either' && v.oddDir !== info.deduced.dir)) {
        return { kind: 'pick-odd', pearl: info.deduced.odd, dir: info.deduced.dir };
      }
      return null;
    }
    if (v.scaleHolder) return null;
    const w = bestPublicWeighing(v);
    return w ? { kind: 'weigh', left: w.left, right: w.right } : null;
  };

  // A synthetic marker in the public search state so a single optimal weighing step completes
  // cleanly without peeking at hidden outcomes (the real engine evaluates the weighing on commit!).
  const isWeighed = (v: PublicScaleView) => Boolean((v as PublicScaleView & { weighedStep?: boolean }).weighedStep);

  const isPublicGoal = (v: PublicScaleView): boolean => {
    if (isWeighed(v)) return true;
    if (v.kind === 'sort') {
      const info = analyzeSort(v.n, v.history);
      return !!info.deducedOrder && info.deducedOrder.every((shell, slot) => v.order[slot] === shell);
    }
    const info = analyzeOdd(v.kind, v.n, v.history);
    return !!info.deduced && v.oddPick === info.deduced.odd && (v.kind === 'odd-heavy' || v.oddDir === info.deduced.dir);
  };

  return {
    draft: null,
    look,
    think,
    problem: start => ({
      start,
      nodeBudget: 64,
      key: v => `${isWeighed(v) ? 'W' : 'P'}|${v.order.join(',')}|${v.oddPick ?? -1}|${v.oddDir ?? ''}`,
      goal: isPublicGoal,
      moves: v => {
        if (isPublicGoal(v)) return [];
        const step = nextPublicStep(v);
        return step ? [step] : [];
      },
      apply: (v, a): PublicScaleView => {
        if (a.kind === 'weigh') return { ...v, weighedStep: true } as PublicScaleView;
        if (a.kind === 'place-sort') {
          const order = [...v.order];
          const cur = order.indexOf(a.item);
          const occ = order[a.slot];
          order[a.slot] = a.item;
          if (cur !== -1) order[cur] = occ;
          return { ...v, order };
        }
        return { ...v, oddPick: a.pearl, oddDir: a.dir };
      },
      heuristic: v => (isPublicGoal(v) ? 0 : 1),
    }),
    preserves: () => true,
    unavailable: view.scaleHolder
      ? 'Ask the Scale Holder to weigh the suggested pans — help never peeks at their secret!'
      : 'Your answer row matches everything the scale has shown. Tap Check!',
  };
}
