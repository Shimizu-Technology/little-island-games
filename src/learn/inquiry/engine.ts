/**
 * K6 inquiry kit: predict → test → explain around an existing illustrative model.
 *
 * Pure: plain data in, plain data out. No React, clocks or `Math.random`. The same functions run the School
 * board, the hints and the bots in tests. A game supplies its investigations; the kit owns the steps, the checks,
 * the hint ladder and what counts as independent work. See docs/INQUIRY_KIT.md.
 */
import { exact, integer } from "../kit/science";

/** One adjustable or fixed part of the model's setup. Fixed controls show the setup but cannot change. */
export type Control = { name: string; options: readonly string[]; fixed?: boolean };
/** What the model shows for a setup: which outcome it is, and the reading computed by the model. */
export type Observation = { outcome: number; reading: string };

/**
 * An investigation. `observe`: the setup is given and the child predicts which outcome the model will show.
 * `reach`: the goal names an outcome and the child plans a setup. The plan is the prediction. The goal never names
 * the setting, outcome or reason that answers it.
 */
export type Investigation = {
  key: string;
  kind: "observe" | "reach";
  title: string;
  /** The goal. Never states the answer. */
  question: string;
  controls: readonly Control[];
  start: readonly number[];
  /** Possible outcomes, in the model's order. Observe rounds pick one as the prediction. */
  outcomes: readonly string[];
  /** Reach rounds: the outcome the goal asks for. */
  want?: number;
  /** The model. Every number a child sees comes from here. */
  observe: (settings: readonly number[]) => Observation;
  /** Asked once the accepted test is on screen. */
  explain: { prompt: string; choices: readonly string[]; answer: number };
  /** Evidence shown before any test, such as a reading the goal refers to. Never the answer. */
  given?: string;
  /** Where to look (hint 1). */
  clue: string;
  /** The model's rule, cited after the test and as hint 2. Says it is a model. */
  rule: string;
};

/** One action. `t` stores the prediction and the tested setup, so a saved test is evidence of what was tried. */
export type Act =
  | readonly ["t", number, ...number[]]
  | readonly ["r"]
  | readonly ["e", number]
  | readonly ["h"]
  | readonly ["x"];

export type InquiryState = {
  version: 2;
  level: number;
  seed: number;
  /** Mirror of the replayed position, for the frame's step reveal. Always checked against the history. */
  index: number;
  /** Investigations in the round. The frame's progress reads `index` of `total`. */
  total: number;
  /** The setup on screen. During a result it is the tested setup. */
  draft: number[];
  /** The chosen prediction (observe), or -1. */
  guess: number;
  history: Act[];
};

export type Phase = "setup" | "result" | "explain" | "done" | "finished";
/** What happened in one investigation. Built from the history only. */
export type Step = { tests: number; firstMatched: boolean; misses: number; hints: number };
export type Progress = {
  index: number;
  phase: Phase;
  /** The last test's observation in this investigation, if any. */
  seen: Observation | null;
  /** Whether that test matched the prediction (observe) or reached the goal (reach). */
  matched: boolean;
  records: Step[];
  /** The explanation choices tried and refused in this investigation. */
  tried: number[];
};

/**
 * Room for a long, careful round. Every investigation's history is bounded (one test per distinct setup, three
 * hints, each wrong explanation once), and the content test proves a whole round fits, so the cap never blocks
 * finishing.
 */
export const HISTORY_CAP = 160;
export const HINT_STAGES = 3;
/** Levels at which a star needs a first test that matched the prediction or plan. */
export const strictLevel = (level: number) => level >= 4;

const emptyRecord = (): Step => ({ tests: 0, firstMatched: false, misses: 0, hints: 0 });
const isAct = (a: unknown): a is Act => {
  if (!Array.isArray(a) || a.length === 0 || Object.keys(a).length !== a.length) return false;
  if (a[0] === "t") return a.length >= 2 && a.length <= 6 && a.slice(1).every((n) => integer(n, -1, 64));
  if (a[0] === "e") return a.length === 2 && integer(a[1], 0, 8);
  return a.length === 1 && (a[0] === "r" || a[0] === "h" || a[0] === "x");
};

/** True when `settings` is a legal setup for this investigation: right length, in range, fixed parts unchanged. */
export function validSetup(q: Investigation, settings: readonly unknown[]): settings is number[] {
  return (
    settings.length === q.controls.length &&
    settings.every((n, i) => integer(n, 0, q.controls[i].options.length - 1) && (!q.controls[i].fixed || n === q.start[i]))
  );
}

const matches = (q: Investigation, guess: number, seen: Observation) =>
  q.kind === "observe" ? guess === seen.outcome : seen.outcome === q.want;

/** Rebuild the round from its history. Null if any action was not legal where it happened. */
export function replay(qs: readonly Investigation[], history: readonly Act[]): Progress | null {
  let index = 0, phase: Phase = qs.length ? "setup" : "finished", seen: Observation | null = null, matched = false;
  let tried: number[] = [];
  const records: Step[] = [emptyRecord()];
  let setups: string[] = [];
  for (const a of history) {
    const q = qs[index], r = records[index];
    if (!q || !isAct(a)) return null;
    if (a[0] === "h") {
      if (phase === "done" || r.hints >= HINT_STAGES) return null;
      r.hints++;
    } else if (a[0] === "t") {
      const [, guess, ...settings] = a;
      if (phase !== "setup" || !validSetup(q, settings)) return null;
      if (q.kind === "observe" ? !integer(guess, 0, q.outcomes.length - 1) : guess !== -1) return null;
      if (setups.includes(settings.join())) return null;
      setups = [...setups, settings.join()];
      seen = q.observe(settings);
      matched = matches(q, guess, seen);
      if (r.tests === 0) r.firstMatched = matched;
      r.tests++;
      phase = q.kind === "reach" && !matched ? "result" : "explain";
    } else if (a[0] === "r") {
      if (phase !== "result") return null;
      phase = "setup";
    } else if (a[0] === "e") {
      if (phase !== "explain" || a[1] >= q.explain.choices.length || tried.includes(a[1])) return null;
      if (a[1] === q.explain.answer) phase = "done";
      else { r.misses++; tried = [...tried, a[1]]; }
    } else {
      if (phase !== "done") return null;
      index++;
      phase = index === qs.length ? "finished" : "setup";
      seen = null; matched = false; tried = []; setups = [];
      if (index < qs.length) records.push(emptyRecord());
    }
  }
  return { index, phase, seen, matched, records: index === qs.length ? records.slice(0, index) : records, tried };
}

/** Work so far is independent: no hints, no wrong explanation and, at strict levels, every first test right. */
export function clean(p: Progress, level: number): boolean {
  return p.records.every((r) => r.hints === 0 && r.misses === 0 && (!strictLevel(level) || r.tests === 0 || r.firstMatched));
}

/** A setup that reaches the goal (reach), found by searching the model. The hint and the bots use this. */
export function solve(q: Investigation): number[] | null {
  if (q.kind === "observe") return [...q.start];
  const free = q.controls.map((c, i) => (c.fixed ? [q.start[i]] : c.options.map((_, j) => j)));
  const walk = (i: number, at: number[]): number[] | null => {
    if (i === free.length) return q.observe(at).outcome === q.want ? at : null;
    for (const v of free[i]) { const found = walk(i + 1, [...at, v]); if (found) return found; }
    return null;
  };
  return walk(0, []);
}

export function create(level: number, seed: number, qs: readonly Investigation[]): InquiryState {
  return { version: 2, level, seed, index: 0, total: qs.length, draft: qs[0] ? [...qs[0].start] : [], guess: -1, history: [] };
}

/** The whole saved round, checked: shape, replay, mirrors and the setup on screen. */
export function validState(x: unknown, level: number, qs: readonly Investigation[]): x is InquiryState {
  if (!exact(x, ["version", "level", "seed", "index", "total", "draft", "guess", "history"])) return false;
  const s = x as InquiryState;
  if (s.version !== 2 || s.level !== level || !integer(s.seed, 0, 999999) || s.total !== qs.length) return false;
  if (!Array.isArray(s.history) || s.history.length > HISTORY_CAP || !Array.isArray(s.draft) || !Number.isInteger(s.guess)) return false;
  const p = replay(qs, s.history);
  if (!p || p.index !== s.index) return false;
  if (p.phase === "finished") return s.draft.length === 0 && s.guess === -1;
  const q = qs[p.index];
  if (!validSetup(q, s.draft)) return false;
  if (q.kind === "reach" ? s.guess !== -1 : !integer(s.guess, -1, q.outcomes.length - 1)) return false;
  if (p.phase !== "setup") {
    const last = lastTest(s.history);
    if (!last || last[1] !== s.guess || last.slice(2).some((n, i) => n !== s.draft[i])) return false;
  }
  return true;
}
const lastTest = (h: readonly Act[]) => [...h].reverse().find((a) => a[0] === "t") as readonly ["t", number, ...number[]] | undefined;

export type Move =
  | { type: "set"; control: number; value: number }
  | { type: "predict"; outcome: number }
  | { type: "test" }
  | { type: "revise" }
  | { type: "explain"; choice: number }
  | { type: "hint" }
  | { type: "next" };

/** One move. Returns the same object when the move is not allowed, so a board can ignore it. */
export function move(qs: readonly Investigation[], s: InquiryState, m: Move): InquiryState {
  const p = replay(qs, s.history);
  if (!p || p.phase === "finished") return s;
  const q = qs[p.index];
  const push = (a: Act): InquiryState | null => s.history.length < HISTORY_CAP ? { ...s, history: [...s.history, a] } : null;
  switch (m.type) {
    case "set": {
      if (p.phase !== "setup" || !integer(m.control, 0, q.controls.length - 1)) return s;
      const draft = [...s.draft]; draft[m.control] = m.value;
      return validSetup(q, draft) && draft[m.control] !== s.draft[m.control] ? { ...s, draft } : s;
    }
    case "predict":
      return p.phase === "setup" && q.kind === "observe" && integer(m.outcome, 0, q.outcomes.length - 1) && m.outcome !== s.guess ? { ...s, guess: m.outcome } : s;
    case "test": {
      if (p.phase !== "setup" || (q.kind === "observe" && s.guess < 0) || testedBefore(qs, s)) return s;
      return push(["t", s.guess, ...s.draft]) ?? s;
    }
    case "revise": {
      if (p.phase !== "result") return s;
      return push(["r"]) ?? s;
    }
    case "explain": {
      if (p.phase !== "explain" || !integer(m.choice, 0, q.explain.choices.length - 1) || p.tried.includes(m.choice)) return s;
      return push(["e", m.choice]) ?? s;
    }
    case "hint": {
      if (p.phase === "done" || p.records[p.index].hints >= HINT_STAGES) return s;
      return push(["h"]) ?? s;
    }
    case "next": {
      if (p.phase !== "done") return s;
      const n = push(["x"]);
      if (!n) return s;
      const later = qs[p.index + 1];
      return { ...n, index: p.index + 1, draft: later ? [...later.start] : [], guess: -1 };
    }
  }
}

/** This investigation already tested the setup on screen. A repeat would add nothing new, so Test refuses it. */
export function testedBefore(qs: readonly Investigation[], s: InquiryState): boolean {
  let since = s.history.length;
  while (since > 0 && s.history[since - 1][0] !== "x") since--;
  return s.history.slice(since).some((a) => a[0] === "t" && a.slice(2).join() === s.draft.join());
}

/**
 * Undo puts back an earlier setup or prediction from before the last change. Only the unsaved draft can be undone:
 * tests, answers and hints are evidence and stay. Returns the same state when `earlier` is not from this setup step.
 */
export function undo(s: InquiryState, earlier: Pick<InquiryState, "draft" | "guess" | "history" | "index">, qs: readonly Investigation[]): InquiryState {
  const q = qs[s.index];
  if (!q || earlier.index !== s.index || earlier.history.length !== s.history.length || replay(qs, s.history)?.phase !== "setup" || !validSetup(q, earlier.draft)) return s;
  return { ...s, draft: [...earlier.draft], guess: earlier.guess };
}

/** Most acts one investigation can add: one test per distinct setup with a revise after each miss, hints, answers and Next. */
export function investigationBound(q: Investigation): number {
  const setups = q.controls.reduce((n, c) => n * (c.fixed ? 1 : c.options.length), 1);
  return 2 * setups - 1 + HINT_STAGES + q.explain.choices.length + 1;
}

/** The hint ladder, read from the same investigation the checks use. */
export function hintText(q: Investigation, p: Progress): string[] {
  const stages = p.records[p.index]?.hints ?? 0;
  const show = (): string => {
    if (p.phase === "explain") return `The reason that fits the model: ${q.explain.choices[q.explain.answer]}`;
    if (q.kind === "observe") return `This model will show: ${q.outcomes[q.observe(q.start).outcome]}.`;
    const plan = solve(q);
    return plan ? `One setup that works: ${q.controls.map((c, i) => `${c.name} ${c.options[plan[i]]}`).filter((_, i) => !q.controls[i].fixed).join(", ")}.` : q.rule;
  };
  return [q.clue, q.rule, show()].slice(0, stages);
}

/** The model in words, for VoiceOver. Before a test it names the setup only. */
export function describeSetup(q: Investigation, settings: readonly number[], seen: Observation | null): string {
  const setup = q.controls.map((c, i) => `${c.name}: ${c.options[settings[i] ?? q.start[i]]}`).join(". ");
  return `${q.title}. Model setup. ${setup}.${q.given ? ` Given: ${q.given}.` : ""}${seen ? ` Result: ${seen.reading}` : " Result hidden until you test."}`;
}

/** Round finished. */
export const finished = (qs: readonly Investigation[], s: InquiryState) => replay(qs, s.history)?.phase === "finished";
