import type { HintCue, PublicHintRules } from '../../../puzzles/hints';
import {
  bestSplittingRow, COLORS, evaluateRow, liveHypotheses, rowCodes, rowWords, shellOf,
  type EvidenceEntry, type RowLen, type Rung,
} from './rules';

/**
 * Pure public-evidence hint rules for Gate Crab.
 * Everything in GateView is strictly public (the visible evidence rows, current quiz rows, and
 * the player's current quiz draft). Neither Look, Think, One step, nor Show me ever reads the
 * secret rule ID!
 */
export type GateView = {
  readonly len: RowLen;
  readonly rung: Rung;
  readonly evidence: readonly EvidenceEntry[];
  readonly quizRows: readonly number[];
  readonly quizChoices: readonly (boolean | null)[];
};

/**
 * One help move:
 *   kind 'test': test a high-information distinguishing row at the gate
 *   kind 'quiz': sort one quiz slot once public evidence uniquely identifies the rule
 */
export type GateHelpAction =
  | { readonly kind: 'test'; readonly row: number }
  | { readonly kind: 'quiz'; readonly slot: number; readonly pass: boolean };

export type GateFocus = {
  readonly highlightPass: boolean;
  readonly contrastRow: number | null;
  readonly quizSlot: number | null;
};

export function focusOf(cue: HintCue | null): GateFocus {
  if (!cue) return { highlightPass: false, contrastRow: null, quizSlot: null };
  const highlightPass = cue.focus.includes('pass-column');
  const contrast = cue.focus.find(f => f.startsWith('evidence:'));
  const slot = cue.focus.find(f => f.startsWith('quiz:'));
  return {
    highlightPass,
    contrastRow: contrast ? Number(contrast.slice(9)) : null,
    quizSlot: slot ? Number(slot.slice(5)) : null,
  };
}

/** Finds a simple visible shared trait across all PASS evidence rows (if any), using public evidence only. */
function visiblePassTrait(len: RowLen, evidence: readonly EvidenceEntry[]): string | null {
  const passRows = evidence.filter(e => e.pass).map(e => rowCodes(len, e.row).map(shellOf));
  if (!passRows.length) return null;
  for (const c of [0, 1, 2] as const) {
    if (passRows.every(r => r.some(s => s.col === c))) return `Every PASS row so far has a ${COLORS[c]} shell.`;
    if (passRows.every(r => r.every(s => s.col !== c))) return `None of the PASS rows so far have a ${COLORS[c]} shell.`;
  }
  if (passRows.every(r => r.some(s => s.big === 1))) return 'Every PASS row so far has a big shell.';
  if (passRows.every(r => r.some(s => s.big === 0))) return 'Every PASS row so far has a small shell.';
  return null;
}

/** Summarizes which feature dimensions are still in play among remaining public hypotheses. */
function featureQuestion(rung: Rung, len: RowLen, evidence: readonly EvidenceEntry[]): string {
  const live = liveHypotheses(rung, len, evidence);
  if (live.length === 1) {
    return 'Your tested rows leave only one rule! Check each quiz row against your PASS and BLOCK rows.';
  }
  const fams = new Set(live.map(h => h.family));
  const hasPos = [...fams].some(f => f.includes('pos') || f.includes('ends') || f.includes('order') || f.includes('pair') || f.includes('mid'));
  const hasCount = [...fams].some(f => f.includes('count') || f.includes('exact') || f.includes('ge2') || f.includes('le1') || f.includes('more') || f.includes('parity'));
  const hasSize = live.some(h => h.label.includes('big') || h.label.includes('small') || h.label.includes('size'));
  const hasColor = live.some(h => h.label.includes('coral') || h.label.includes('blue') || h.label.includes('gold') || h.label.includes('colour'));
  const ask: string[] = [];
  if (hasColor) ask.push('shell colour');
  if (hasSize) ask.push('big vs small');
  if (hasPos) ask.push('where a shell sits');
  if (hasCount) ask.push('how many of a shell appear');
  const joined = ask.length > 1 ? `${ask.slice(0, -1).join(', ')} or ${ask[ask.length - 1]}` : ask[0] ?? 'a shell pattern';
  return `Think: could the gate care about ${joined}? Build a row that changes just one shell to test your guess.`;
}

/**
 * Checks if any currently filled quiz choice contradicts a uniquely determined public rule or
 * matches an already-tested evidence row with the opposite answer.
 */
function quizContradiction(view: GateView): HintCue | null {
  for (let i = 0; i < view.quizRows.length; i++) {
    const pick = view.quizChoices[i];
    if (pick === null) continue;
    const exact = view.evidence.find(e => e.row === view.quizRows[i]);
    if (exact && exact.pass !== pick) {
      return {
        text: `Look at quiz row ${i + 1}: you already tested ${rowWords(view.len, exact.row)} and it ${exact.pass ? 'passed' : 'blocked'}.`,
        focus: [`evidence:${exact.row}`, `quiz:${i}`],
      };
    }
  }
  const live = liveHypotheses(view.rung, view.len, view.evidence);
  if (live.length === 1) {
    for (let i = 0; i < view.quizRows.length; i++) {
      const pick = view.quizChoices[i];
      if (pick === null) continue;
      const want = evaluateRow(live[0], view.len, view.quizRows[i]);
      if (pick !== want) {
        return {
          text: `Look closely at quiz row ${i + 1} (${rowWords(view.len, view.quizRows[i])}) and compare it with your PASS and BLOCK clues.`,
          focus: ['pass-column', `quiz:${i}`],
        };
      }
    }
  }
  return null;
}

/**
 * Shared four-step help ladder using only public evidence + a callback to evaluate a hinted test row
 * (which only runs during the player-requested Show me / One step search via the live engine).
 * Notice: `evaluateTest` is ONLY invoked when applying a search step, never inside `look` or `think`
 * and never to select WHICH test row to suggest!
 */
export function gateCrabHelpRules(
  evaluateTest: (row: number) => boolean,
  allowShowMe = true,
): PublicHintRules<GateView, GateHelpAction> {
  const look = (view: GateView): HintCue => {
    const clash = quizContradiction(view);
    if (clash) return clash;
    const trait = visiblePassTrait(view.len, view.evidence);
    return {
      text: trait
        ? `Look at the PASS rows together. ${trait} Does every BLOCK row break that idea?`
        : 'Look at the PASS rows together, then compare them with the BLOCK rows.',
      focus: ['pass-column'],
    };
  };

  const think = (view: GateView): HintCue => {
    const clash = quizContradiction(view);
    if (clash) return clash;
    const split = bestSplittingRow(view.rung, view.len, view.evidence);
    const q = featureQuestion(view.rung, view.len, view.evidence);
    if (split !== null) {
      return {
        text: `${q} Try testing: ${rowWords(view.len, split)}.`,
        focus: ['pass-column'],
      };
    }
    return { text: q, focus: ['pass-column'] };
  };

  return {
    draft: null,
    look,
    think,
    problem: start => ({
      start,
      nodeBudget: 64,
      key: v => `${v.evidence.map(e => `${e.row}:${e.pass ? 1 : 0}`).join(',')}|${v.quizChoices.map(c => (c === null ? '-' : c ? '1' : '0')).join('')}`,
      goal: v => {
        const live = liveHypotheses(v.rung, v.len, v.evidence);
        if (live.length !== 1) return false;
        return v.quizRows.every((r, i) => v.quizChoices[i] === evaluateRow(live[0], v.len, r));
      },
      moves: v => {
        if (!allowShowMe) return [];
        const live = liveHypotheses(v.rung, v.len, v.evidence);
        if (!live.length) return [];
        if (live.length > 1) {
          const row = bestSplittingRow(v.rung, v.len, v.evidence);
          return row === null ? [] : [{ kind: 'test', row }];
        }
        const deduced = live[0];
        for (let i = 0; i < v.quizRows.length; i++) {
          const want = evaluateRow(deduced, v.len, v.quizRows[i]);
          if (v.quizChoices[i] !== want) return [{ kind: 'quiz', slot: i, pass: want }];
        }
        return [];
      },
      apply: (v, a) => {
        if (a.kind === 'test') {
          if (v.evidence.some(e => e.row === a.row)) return v;
          const pass = evaluateTest(a.row);
          return { ...v, evidence: [...v.evidence, { row: a.row, pass }] };
        }
        if (v.quizChoices[a.slot] === a.pass) return v;
        return { ...v, quizChoices: v.quizChoices.map((c, i) => (i === a.slot ? a.pass : c)) };
      },
      heuristic: v => {
        const live = liveHypotheses(v.rung, v.len, v.evidence);
        const testEst = live.length <= 1 ? 0 : Math.ceil(Math.log2(live.length));
        const quizLeft = live.length === 1
          ? v.quizRows.filter((r, i) => v.quizChoices[i] !== evaluateRow(live[0], v.len, r)).length
          : 5;
        return testEst + quizLeft;
      },
    }),
    preserves: () => true,
    unavailable: 'Test another shell row at the gate to gather one more clue, or try a fresh gate.',
  };
}
