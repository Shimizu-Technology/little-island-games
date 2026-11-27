import type { Seat } from "../../../games/match";
import type { CreateContext, LearnOptions, Outcome } from "../../types";
import { integer, keys, object } from "../../kit/numbers";
import { pickItems } from "../../skills";

/**
 * Reef Race native Levels 4 & 5: multi-step reef-hop, current-ride, and route-comparison
 * challenges played right on the numbered ReefBoard track.
 * Pure engine with strict validation and opt-in step-by-step Help that never leaks the final answer.
 */
export const REEF_ROUTE_ROUND = 6;
export type ReefRouteLevel = 4 | 5;

export type ReefStep = {
  delta: number;
  label: string;
  kind: "hop" | "wave" | "crab";
};

export type ReefRouteChoice = {
  label: string;
  steps: readonly ReefStep[];
  landing: number;
};

export type ReefRouteTask = {
  id: string;
  level: ReefRouteLevel;
  skill: string;
  /** 'land': tap the exact final stone on the ReefBoard. 'route': compare two reef routes and pick the better one. 'start': reverse-find the starting stone on the ReefBoard. */
  kind: "land" | "route" | "start";
  /** Board range (60 for Level 4, 100 for Level 5). */
  end: 60 | 100;
  /** Turtle starting stone (or landing stone for 'start' reverse puzzles). */
  anchor: number;
  /** Visible reef current markers on the board (stone -> +wave or -crab). */
  markers: Readonly<Record<number, "wave" | "crab" | "shell">>;
  /** Exact target stone (for 'land' and 'start') or winning route index 0 | 1 (for 'route'). */
  target: number;
  /** Intermediate stone highlighted ONLY on opt-in Help (never the final answer!). */
  midpoint: number;
  /** Concise prompt displayed above the ReefBoard. */
  prompt: string;
  /** Step chips shown for 'land' and 'start' challenges. */
  steps: readonly ReefStep[];
  /** Two competing routes for 'route' challenges. */
  routes?: readonly [ReefRouteChoice, ReefRouteChoice];
  /** Opt-in Help text pointing to step 1 without giving the final answer. */
  hint: string;
  /** Short explanation shown after solving. */
  explain: string;
};

function landTask(
  id: string,
  level: ReefRouteLevel,
  skill: string,
  end: 60 | 100,
  start: number,
  steps: readonly ReefStep[],
  prompt: string,
  hint: string,
): ReefRouteTask {
  const midpoint = start + steps[0].delta;
  const target = steps.reduce((acc, st) => acc + st.delta, start);
  const markers: Record<number, "wave" | "crab" | "shell"> = {};
  let cursor = start;
  for (const st of steps) {
    if (st.kind === "wave") markers[cursor] = "wave";
    else if (st.kind === "crab") markers[cursor] = "crab";
    cursor += st.delta;
  }
  const chain = steps.map((st) => (st.delta > 0 ? `+${st.delta}` : `${st.delta}`)).join(", then ");
  return {
    id,
    level,
    skill,
    kind: "land",
    end,
    anchor: start,
    markers,
    target,
    midpoint,
    prompt,
    steps,
    hint,
    explain: `Starting at ${start} and going ${chain} lands your turtle on stone ${target}.`,
  };
}

function routeTask(
  id: string,
  level: ReefRouteLevel,
  skill: string,
  end: 60 | 100,
  start: number,
  routeA: { label: string; steps: readonly ReefStep[] },
  routeB: { label: string; steps: readonly ReefStep[] },
  prompt: string,
  hint: string,
): ReefRouteTask {
  const landA = routeA.steps.reduce((acc, st) => acc + st.delta, start);
  const landB = routeB.steps.reduce((acc, st) => acc + st.delta, start);
  const winner = landA > landB ? 0 : 1;
  const markers: Record<number, "wave" | "crab" | "shell"> = {};
  if (routeA.steps.some((s) => s.kind === "wave")) markers[start + routeA.steps[0].delta] = "wave";
  if (routeB.steps.some((s) => s.kind === "crab")) markers[start + routeB.steps[0].delta] = "crab";
  return {
    id,
    level,
    skill,
    kind: "route",
    end,
    anchor: start,
    markers,
    target: winner,
    midpoint: start + routeA.steps[0].delta,
    prompt,
    steps: [],
    routes: [
      { ...routeA, landing: landA },
      { ...routeB, landing: landB },
    ],
    hint,
    explain: `Route A lands on ${landA} and Route B lands on ${landB}, so Route ${winner === 0 ? "A" : "B"} swims further ahead!`,
  };
}

function startTask(
  id: string,
  level: ReefRouteLevel,
  skill: string,
  end: 60 | 100,
  targetStart: number,
  steps: readonly ReefStep[],
  prompt: string,
  hint: string,
): ReefRouteTask {
  const landed = steps.reduce((acc, st) => acc + st.delta, targetStart);
  const midpoint = landed - steps[steps.length - 1].delta;
  const markers: Record<number, "wave" | "crab" | "shell"> = { [landed]: "shell" };
  return {
    id,
    level,
    skill,
    kind: "start",
    end,
    anchor: landed,
    markers,
    target: targetStart,
    midpoint,
    prompt,
    steps,
    hint,
    explain: `Working backward from ${landed} brings the turtle back to stone ${targetStart}.`,
  };
}

/** 16 Level 4 challenges (stones 1–60) + 16 Level 5 challenges (stones 31–90). */
export const REEF_ROUTE_TASKS: readonly ReefRouteTask[] = [
  // ---- Level 4: Multi-step reef hops & route comparisons within 1–60 (every start & target shares one 30-stone section) ----
  landTask(
    "rr4-wave-1",
    4,
    "num.add-within-20",
    60,
    9,
    [{ delta: 6, label: "Roll +6", kind: "hop" }, { delta: 2, label: "Wave +2", kind: "wave" }],
    "Your turtle is on 9. Roll +6, then catch a +2 wave. Tap the landing stone!",
    "First hop +6 from stone 9 to reach the glowing wave stone, then ride the wave.",
  ),
  landTask(
    "rr4-crab-1",
    4,
    "num.count-on",
    60,
    14,
    [{ delta: 7, label: "Roll +7", kind: "hop" }, { delta: -2, label: "Crab −2", kind: "crab" }],
    "Start on 14. Hop +7, then a cheeky crab nudges you back −2. Where do you land?",
    "Count on +7 from 14 to the crab stone first, then step back 2.",
  ),
  landTask(
    "rr4-double-1",
    4,
    "num.add-within-20",
    60,
    6,
    [{ delta: 8, label: "First roll +8", kind: "hop" }, { delta: 5, label: "Second roll +5", kind: "hop" }],
    "Start on 6. You get two turns: +8, then +5. Tap where your turtle finishes!",
    "Find where +8 lands from 6 first (highlighted), then count on 5 more.",
  ),
  landTask(
    "rr4-wave-2",
    4,
    "num.number-line",
    60,
    33,
    [{ delta: 9, label: "Roll +9", kind: "hop" }, { delta: 3, label: "Big wave +3", kind: "wave" }],
    "Start on 33. Hop +9 into a +3 current wave. Which stone do you reach?",
    "Jump +9 from 33 to the highlighted stone, then add the +3 wave.",
  ),
  landTask(
    "rr4-crab-2",
    4,
    "num.number-line",
    60,
    38,
    [{ delta: 11, label: "Two dice +11", kind: "hop" }, { delta: -3, label: "Crab −3", kind: "crab" }],
    "Start on 38. Roll +11, then step back −3 for a reef crab. Tap the landing stone!",
    "Add 11 to 38 (like +10 and +1) to reach the highlighted stone, then hop back 3.",
  ),
  landTask(
    "rr4-double-2",
    4,
    "num.add-within-20",
    60,
    35,
    [{ delta: 7, label: "First roll +7", kind: "hop" }, { delta: 8, label: "Second roll +8", kind: "hop" }],
    "Start on 35. Hop +7, then +8 more toward the island. Tap your landing stone!",
    "First hop +7 from 35 to the highlighted stone, then count on 8.",
  ),
  landTask(
    "rr4-wave-3",
    4,
    "num.count-on",
    60,
    41,
    [{ delta: 10, label: "Jet stream +10", kind: "hop" }, { delta: 4, label: "Wave +4", kind: "wave" }],
    "Start on 41. Ride +10, then catch a +4 reef wave. Tap the final stone!",
    "Adding 10 moves down one full row to the highlighted stone; then hop +4.",
  ),
  landTask(
    "rr4-crab-3",
    4,
    "num.count-on",
    60,
    44,
    [{ delta: 12, label: "Double six +12", kind: "hop" }, { delta: -4, label: "Strong crab −4", kind: "crab" }],
    "Start on 44. Roll +12, then slip back −4 on the coral. Where do you stop?",
    "Count +12 from 44 to the highlighted stone, then count back 4.",
  ),
  routeTask(
    "rr4-route-1",
    4,
    "num.compare",
    60,
    11,
    { label: "Route A: +8, then crab −2", steps: [{ delta: 8, label: "+8", kind: "hop" }, { delta: -2, label: "−2", kind: "crab" }] },
    { label: "Route B: +5, then wave +3", steps: [{ delta: 5, label: "+5", kind: "hop" }, { delta: 3, label: "+3", kind: "wave" }] },
    "Your turtle is on 11. Which reef route moves you further ahead?",
    "Compare the net gain: Route A is 8 − 2, while Route B is 5 + 3.",
  ),
  routeTask(
    "rr4-route-2",
    4,
    "num.compare",
    60,
    13,
    { label: "Route A: +9, then wave +2", steps: [{ delta: 9, label: "+9", kind: "hop" }, { delta: 2, label: "+2", kind: "wave" }] },
    { label: "Route B: +12, then crab −3", steps: [{ delta: 12, label: "+12", kind: "hop" }, { delta: -3, label: "−3", kind: "crab" }] },
    "Start on 13. Pick the reef route that reaches the higher stone!",
    "Find each total move: 9 + 2 versus 12 − 3.",
  ),
  routeTask(
    "rr4-route-3",
    4,
    "num.compare",
    60,
    34,
    { label: "Route A: +6, then +7", steps: [{ delta: 6, label: "+6", kind: "hop" }, { delta: 7, label: "+7", kind: "hop" }] },
    { label: "Route B: +10, then wave +4", steps: [{ delta: 10, label: "+10", kind: "hop" }, { delta: 4, label: "+4", kind: "wave" }] },
    "Start on 34. Which route gets closer to stone 60?",
    "Check 6 + 7 against 10 + 4 from stone 34.",
  ),
  routeTask(
    "rr4-route-4",
    4,
    "num.compare",
    60,
    37,
    { label: "Route A: +11, then crab −2", steps: [{ delta: 11, label: "+11", kind: "hop" }, { delta: -2, label: "−2", kind: "crab" }] },
    { label: "Route B: +7, then wave +1", steps: [{ delta: 7, label: "+7", kind: "hop" }, { delta: 1, label: "+1", kind: "wave" }] },
    "Start on 37. Tap the route that carries your turtle further!",
    "Find where Route A's first hop (+11) lands, then subtract 2 and compare with +7 + 1.",
  ),
  landTask(
    "rr4-triple-1",
    4,
    "num.add-within-20",
    60,
    5,
    [
      { delta: 6, label: "Hop +6", kind: "hop" },
      { delta: 4, label: "Hop +4", kind: "hop" },
      { delta: 5, label: "Wave +5", kind: "wave" },
    ],
    "Start on 5. Make three jumps: +6, +4, and a +5 wave. Tap the finish stone!",
    "Notice 6 + 4 makes 10! First hop +6 from 5, then add 4 and 5.",
  ),
  landTask(
    "rr4-triple-2",
    4,
    "num.number-line",
    60,
    32,
    [
      { delta: 10, label: "Hop +10", kind: "hop" },
      { delta: 5, label: "Hop +5", kind: "hop" },
      { delta: -2, label: "Crab −2", kind: "crab" },
    ],
    "Start on 32. Go +10, then +5, then back −2. Which stone do you land on?",
    "Hop +10 from 32 first to the highlighted stone, then +5 and back 2.",
  ),
  routeTask(
    "rr4-route-5",
    4,
    "num.compare",
    60,
    40,
    { label: "Route A: +5, then +9", steps: [{ delta: 5, label: "+5", kind: "hop" }, { delta: 9, label: "+9", kind: "hop" }] },
    { label: "Route B: +8, then wave +5", steps: [{ delta: 8, label: "+8", kind: "hop" }, { delta: 5, label: "+5", kind: "wave" }] },
    "Start on 40. Both routes look close! Which one lands higher?",
    "Compare 5 + 9 with 8 + 5 carefully — they are only 1 stone apart!",
  ),
  routeTask(
    "rr4-route-6",
    4,
    "num.compare",
    60,
    10,
    { label: "Route A: +12, then crab −4", steps: [{ delta: 12, label: "+12", kind: "hop" }, { delta: -4, label: "−4", kind: "crab" }] },
    { label: "Route B: +6, then wave +4", steps: [{ delta: 6, label: "+6", kind: "hop" }, { delta: 4, label: "+4", kind: "wave" }] },
    "Start on 10. Choose the path that wins the reef sprint!",
    "Compare 12 − 4 with 6 + 4 before tapping.",
  ),

  // ---- Level 5: Three-step mixed currents, reverse-start & strategic route choices (stones 31–90) ----
  landTask(
    "rr5-mix-1",
    5,
    "num.add-within-20",
    100,
    63,
    [
      { delta: 12, label: "Roll +12", kind: "hop" },
      { delta: -3, label: "Crab −3", kind: "crab" },
      { delta: 6, label: "Wave +6", kind: "wave" },
    ],
    "Start on 63. Hop +12, slip −3, then ride a +6 wave. Tap your landing stone!",
    "First go +12 from 63 to reach the highlighted stone, then −3 and +6.",
  ),
  landTask(
    "rr5-mix-2",
    5,
    "num.number-line",
    100,
    66,
    [
      { delta: 9, label: "Roll +9", kind: "hop" },
      { delta: 8, label: "Roll +8", kind: "hop" },
      { delta: -4, label: "Crab −4", kind: "crab" },
    ],
    "Start on 66. Make two hops (+9, +8), then step back −4. Where do you land?",
    "Jump +9 from 66 to the highlighted stone, then +8 and back −4.",
  ),
  landTask(
    "rr5-mix-3",
    5,
    "num.add-within-20",
    100,
    34,
    [
      { delta: 15, label: "Sprint +15", kind: "hop" },
      { delta: -6, label: "Back current −6", kind: "crab" },
      { delta: 9, label: "Wave +9", kind: "wave" },
    ],
    "Start on 34. Sprint +15, pull back −6, then surge +9. Tap the final stone!",
    "Start by jumping +15 from 34 to the highlighted stone, then adjust −6 and +9.",
  ),
  landTask(
    "rr5-mix-4",
    5,
    "num.count-on",
    100,
    62,
    [
      { delta: 14, label: "Twin dice +14", kind: "hop" },
      { delta: 7, label: "Wave +7", kind: "wave" },
      { delta: -5, label: "Crab −5", kind: "crab" },
    ],
    "Start on 62. Go +14, catch +7, then lose −5 to a reef crab. Tap the stone!",
    "Add +14 to 62 first to reach the highlighted stone, then +7 and −5.",
  ),
  startTask(
    "rr5-start-1",
    5,
    "num.number-line",
    100,
    38,
    [{ delta: 9, label: "Rolled +9", kind: "hop" }, { delta: 3, label: "Wave +3", kind: "wave" }],
    "Your turtle landed on 50 after rolling +9 and riding a +3 wave. Tap the stone it started on!",
    "Undo the +3 wave first (step back to the highlighted stone), then undo the +9 roll.",
  ),
  startTask(
    "rr5-start-2",
    5,
    "num.number-line",
    100,
    43,
    [{ delta: 11, label: "Rolled +11", kind: "hop" }, { delta: -2, label: "Crab −2", kind: "crab" }],
    "You finished on 52 after hopping +11 and slipping −2 at a crab. Where did you start?",
    "Undo the −2 crab first by stepping forward 2 to the highlighted stone, then subtract 11.",
  ),
  startTask(
    "rr5-start-3",
    5,
    "num.count-on",
    100,
    67,
    [{ delta: 12, label: "Rolled +12", kind: "hop" }, { delta: 4, label: "Wave +4", kind: "wave" }],
    "You reached stone 83 after +12 and a +4 wave. Tap your starting stone!",
    "Step back 4 from 83 to the highlighted stone first, then step back 12.",
  ),
  startTask(
    "rr5-start-4",
    5,
    "num.count-on",
    100,
    71,
    [{ delta: 14, label: "Sprint +14", kind: "hop" }, { delta: -3, label: "Crab −3", kind: "crab" }],
    "You finished on 82 after a +14 sprint and a −3 crab pull. Which stone was your start?",
    "To undo −3, go forward 3 to the highlighted stone, then subtract 14.",
  ),
  routeTask(
    "rr5-route-1",
    5,
    "num.compare",
    100,
    64,
    {
      label: "Route A: +13, crab −4, wave +5",
      steps: [
        { delta: 13, label: "+13", kind: "hop" },
        { delta: -4, label: "−4", kind: "crab" },
        { delta: 5, label: "+5", kind: "wave" },
      ],
    },
    {
      label: "Route B: +8, +9, crab −2",
      steps: [
        { delta: 8, label: "+8", kind: "hop" },
        { delta: 9, label: "+9", kind: "hop" },
        { delta: -2, label: "−2", kind: "crab" },
      ],
    },
    "Start on 64. Compare both 3-step reef currents — which one reaches further?",
    "Find each route's net advance: (13 − 4 + 5) versus (8 + 9 − 2).",
  ),
  routeTask(
    "rr5-route-2",
    5,
    "num.compare",
    100,
    35,
    {
      label: "Route A: +16, crab −5, wave +4",
      steps: [
        { delta: 16, label: "+16", kind: "hop" },
        { delta: -5, label: "−5", kind: "crab" },
        { delta: 4, label: "+4", kind: "wave" },
      ],
    },
    {
      label: "Route B: +9, wave +7, crab −3",
      steps: [
        { delta: 9, label: "+9", kind: "hop" },
        { delta: 7, label: "+7", kind: "wave" },
        { delta: -3, label: "−3", kind: "crab" },
      ],
    },
    "Start on 35. Pick the route that takes your turtle closer to the finish!",
    "Add the gains and subtract the crab pull on each route before comparing.",
  ),
  routeTask(
    "rr5-route-3",
    5,
    "num.compare",
    100,
    68,
    {
      label: "Route A: +7, +7, wave +2",
      steps: [
        { delta: 7, label: "+7", kind: "hop" },
        { delta: 7, label: "+7", kind: "hop" },
        { delta: 2, label: "+2", kind: "wave" },
      ],
    },
    {
      label: "Route B: +19, crab −2",
      steps: [
        { delta: 19, label: "+19", kind: "hop" },
        { delta: -2, label: "−2", kind: "crab" },
      ],
    },
    "Start on 68. Which reef line finishes ahead?",
    "Compare 7 + 7 + 2 against 19 − 2 — they are super close!",
  ),
  routeTask(
    "rr5-route-4",
    5,
    "num.compare",
    100,
    40,
    {
      label: "Route A: +11, wave +6, crab −4",
      steps: [
        { delta: 11, label: "+11", kind: "hop" },
        { delta: 6, label: "+6", kind: "wave" },
        { delta: -4, label: "−4", kind: "crab" },
      ],
    },
    {
      label: "Route B: +15, crab −3",
      steps: [
        { delta: 15, label: "+15", kind: "hop" },
        { delta: -3, label: "−3", kind: "crab" },
      ],
    },
    "Start on 40. Choose the winning current path!",
    "Calculate 11 + 6 − 4 versus 15 − 3.",
  ),
  landTask(
    "rr5-mix-5",
    5,
    "num.add-within-20",
    100,
    36,
    [
      { delta: 14, label: "Hop +14", kind: "hop" },
      { delta: 8, label: "Wave +8", kind: "wave" },
      { delta: -3, label: "Crab −3", kind: "crab" },
    ],
    "Start on 36. Hop +14, ride a +8 wave, then slip back −3. Tap the final stone!",
    "36 + 14 lands right on 50 (highlighted). Now add 8 and subtract 3.",
  ),
  startTask(
    "rr5-start-5",
    5,
    "num.number-line",
    100,
    65,
    [{ delta: 15, label: "Sprint +15", kind: "hop" }, { delta: 6, label: "Wave +6", kind: "wave" }],
    "Your turtle finished on 86 after +15 and a +6 wave. Which stone did it leave from?",
    "Subtract the +6 wave first to reach the highlighted stone, then subtract 15.",
  ),
  routeTask(
    "rr5-route-5",
    5,
    "num.compare",
    100,
    62,
    {
      label: "Route A: +18, crab −6",
      steps: [{ delta: 18, label: "+18", kind: "hop" }, { delta: -6, label: "−6", kind: "crab" }],
    },
    {
      label: "Route B: +9, wave +5",
      steps: [{ delta: 9, label: "+9", kind: "hop" }, { delta: 5, label: "+5", kind: "wave" }],
    },
    "Start on 62. Which path gives the longer swim?",
    "Compare 18 − 6 with 9 + 5.",
  ),
  landTask(
    "rr5-mix-6",
    5,
    "num.count-on",
    100,
    69,
    [
      { delta: 11, label: "Hop +11", kind: "hop" },
      { delta: 9, label: "Wave +9", kind: "wave" },
      { delta: -4, label: "Crab −4", kind: "crab" },
    ],
    "Start on 69. Hop +11, catch a +9 wave, then pull back −4. Tap where you stop!",
    "69 + 11 lands cleanly on 80 (highlighted). From 80, go +9 then −4.",
  ),
];

export const reefRouteTaskById = (id: unknown): ReefRouteTask | undefined =>
  typeof id === "string" ? REEF_ROUTE_TASKS.find((t) => t.id === id) : undefined;

export type ReefRouteState = {
  kind: "reef-route";
  level: ReefRouteLevel;
  starter: Seat;
  ids: string[];
  index: number;
  /** Number of wrong tries on the current challenge. */
  wrongCount: number;
  /** Last wrong stone/route tapped (for gentle feedback), or null. */
  lastWrong: number | null;
  /** True once the child tapped opt-in Help on this challenge. */
  helped: boolean;
  /** True once the child solved this challenge and is ready for Next. */
  solved: boolean;
  /** Completed challenges: true iff solved on first try without Help. */
  clean: boolean[];
};

export const isReefRoute = (s: unknown): s is ReefRouteState =>
  !!s && typeof s === "object" && (s as { kind?: unknown }).kind === "reef-route";

export const reefRouteDone = (s: ReefRouteState) => s.index >= s.ids.length;

export const reefRouteTask = (s: ReefRouteState): ReefRouteTask | undefined =>
  reefRouteTaskById(s.ids[s.index]);

export const reefRouteTurn = (s: ReefRouteState): Seat | null =>
  reefRouteDone(s) ? null : (((s.starter + s.index) % 2) as Seat);

export function createReefRoute(level: ReefRouteLevel, c: CreateContext<unknown>): ReefRouteState {
  const prev = isReefRoute(c.previous) ? new Set(c.previous.ids) : new Set<string>();
  const pool = REEF_ROUTE_TASKS.filter((t) => t.level === level);
  const fresh = pool.filter((t) => !prev.has(t.id));
  const list = fresh.length >= REEF_ROUTE_ROUND ? fresh : pool;
  const picked = pickItems(list, c.skills, REEF_ROUTE_ROUND, c.rng, c.today);
  return {
    kind: "reef-route",
    level,
    starter: c.starter,
    ids: picked.map((t) => t.id),
    index: 0,
    wrongCount: 0,
    lastWrong: null,
    helped: false,
    solved: false,
    clean: [],
  };
}

export function reefRoutePick(s: ReefRouteState, value: number): ReefRouteState {
  const task = reefRouteTask(s);
  if (!task || s.solved) return s;
  const maxVal = task.kind === "route" ? 1 : task.end;
  const minVal = task.kind === "route" ? 0 : 1;
  if (!integer(value, minVal, maxVal)) return s;
  if (value === task.target) {
    return { ...s, solved: true, lastWrong: null };
  }
  return {
    ...s,
    wrongCount: Math.min(20, s.wrongCount + 1),
    lastWrong: value,
  };
}

export function reefRouteHelp(s: ReefRouteState): ReefRouteState {
  if (reefRouteDone(s) || s.solved || s.helped) return s;
  return { ...s, helped: true };
}

export function reefRouteNext(s: ReefRouteState): ReefRouteState {
  if (reefRouteDone(s) || !s.solved) return s;
  return {
    ...s,
    index: s.index + 1,
    wrongCount: 0,
    lastWrong: null,
    helped: false,
    solved: false,
    clean: [...s.clean, !s.helped && s.wrongCount === 0],
  };
}

export function validReefRoute(v: unknown, level: ReefRouteLevel): v is ReefRouteState {
  if (
    !object(v) ||
    !keys(v, ["kind", "level", "starter", "ids", "index", "wrongCount", "lastWrong", "helped", "solved", "clean"])
  ) {
    return false;
  }
  const s = v as unknown as ReefRouteState;
  if (
    s.kind !== "reef-route" ||
    s.level !== level ||
    !integer(s.starter, 0, 1) ||
    !Array.isArray(s.ids) ||
    s.ids.length !== REEF_ROUTE_ROUND ||
    new Set(s.ids).size !== REEF_ROUTE_ROUND ||
    !s.ids.every((id) => reefRouteTaskById(id)?.level === level) ||
    !integer(s.index, 0, REEF_ROUTE_ROUND) ||
    !integer(s.wrongCount, 0, 20) ||
    typeof s.helped !== "boolean" ||
    typeof s.solved !== "boolean" ||
    !Array.isArray(s.clean) ||
    s.clean.length !== s.index ||
    !s.clean.every((b) => typeof b === "boolean")
  ) {
    return false;
  }
  if (s.index === REEF_ROUTE_ROUND) {
    return s.wrongCount === 0 && s.lastWrong === null && !s.helped && !s.solved;
  }
  const task = reefRouteTask(s)!;
  if (s.lastWrong !== null) {
    const minVal = task.kind === "route" ? 0 : 1;
    const maxVal = task.kind === "route" ? 1 : task.end;
    if (!integer(s.lastWrong, minVal, maxVal) || s.lastWrong === task.target || s.wrongCount === 0) return false;
  }
  if (s.solved && s.lastWrong !== null) return false;
  return true;
}

export function reefRouteOutcome(s: ReefRouteState, o: LearnOptions): Outcome {
  if (!reefRouteDone(s)) return null;
  if (o.mode !== "versus") return "done";
  const scores: [number, number] = [0, 0];
  s.clean.forEach((ok, i) => {
    if (ok) scores[(s.starter + i) % 2]++;
  });
  return scores[0] === scores[1] ? "draw" : scores[0] > scores[1] ? 0 : 1;
}
