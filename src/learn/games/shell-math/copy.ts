import { answerOf, equationText, giveTakeParts, hintFor, tensOnesText, levelRoute, placeValue, planFor, resultOf, type Level, type Problem, type RouteId, type Step, type Work } from "../../../math/kit";

/**
 * Every sentence the Shell Math board shows, built from the real plan. Prompts name the numbers a child is
 * looking at; cues name what to look at; neither ever contains the answer to the step before stage 2 of help.
 */
const minus = "−";
/** Answer tiles stay on the number line a level works on: 10 at Level 1, 20 through Level 4, 99 beyond. */
export const tileCap = (level: Level) => (level <= 1 ? 10 : level <= 4 ? 20 : 99);
const sign = (p: Problem) => (p.op === "add" ? "+" : minus);

/** `side` is the group the child filled a ten in (0 the first, 1 the second); the sentences after it describe that move, not the other one. */
export function stepPrompt(level: Level, p: Problem, plan: readonly Step[], at: number, route: RouteId = levelRoute(level, p), side: 0 | 1 | null = null): string {
  const s = plan[at];
  const a = placeValue(p.a), b = placeValue(p.b);
  if (s.kind === "count") {
    return p.op === "add"
      ? `Start at ${Math.max(p.a, p.b)}. Tap to count on ${Math.min(p.a, p.b)}.`
      : `Start at ${p.a}. Tap to count back ${p.b}.`;
  }
  if (s.kind === "fill") {
    return p.op === "add"
      ? `Make a ten. Touch a shell to move that many across.`
      : `Get back to ten. Touch the last shell to take away.`;
  }
  if (s.kind === "trade") {
    return s.dir === "make" ? `Ten ones can swap for one ten. Tap the ones to make a ten.` : `There are not enough ones. Tap a ten to open it into ten ones.`;
  }
  if (s.kind === "pair") return "Pick two numbers that make ten.";
  const role = s.role;
  if (route === "up-to-ten") {
    const lo = p.op === "subtract" && p.unknown === "result" ? p.b : p.op === "add" ? p.a : p.a - p.b;
    const hi = p.op === "subtract" ? p.a : p.a + p.b;
    if (role === "to-ten") return `Climb from ${lo} to ten. ${lo} + ? = 10`;
    if (role === "rest") return `Now climb from 10 to ${hi}. 10 + ? = ${hi}`;
    return `Put the two climbs together. What is the missing number?`;
  }
  if (route === "to-ten-other") {
    const e = (plan[0] as { value: number }).value;
    if (role === "to-ten") return `${p.b} + ? = 10. How many make a ten?`;
    if (role === "rest") return `${p.a} gave ${e} away. How many are left?`;
    return `10 + ${(plan[1] as { value: number }).value} = ?`;
  }
  if (route === "give-take") {
    const g = giveTakeParts(p)!, mid = (plan[0] as { value: number }).value;
    if (p.op === "add") return role === "round-up" ? `Round ${g.n} up to ${g.up}. What is ${g.m} + ${g.up}?` : `That added ${g.d} too many. What is ${mid} ${minus} ${g.d}?`;
    return role === "round-up" ? `Take away ${g.up} instead of ${g.n}. What is ${p.a} ${minus} ${g.up}?` : `That took ${g.d} too many. What is ${mid} + ${g.d}?`;
  }
  if (route === "tens-ones") {
    if (role === "tens") return p.op === "add" ? `Tens first: ${a.tens} + ${b.tens} = ? tens` : `Tens first: ${a.tens} ${minus} ${b.tens} = ? tens`;
    if (role === "ones") return p.op === "add" ? `Ones: ${a.ones} + ${b.ones} = ?` : `Ones: ${a.ones} ${minus} ${b.ones} = ?`;
    return `Put the tens and ones back together. What is ${p.a} ${sign(p)} ${p.b}?`;
  }
  if (route === "to-ten") {
    // The child filled the second group's ten from the first: that group is the one that gave shells.
    const first = plan[0], other = first.kind === "fill" && side === 1 ? first.options.find((o) => o[0] === 1) : undefined;
    if (p.op === "add" && other) return role === "rest" ? `${p.a} to add, ${other[1]} done. How many left?` : `10 + ${p.a - other[1]} = ?`;
    const d = p.op === "add" ? 10 - (p.a % 10) : p.a % 10, ten = p.op === "add" ? p.a + d : p.a - d;
    if (role === "to-ten") return p.op === "add" ? `${p.a} + ? = ${ten}. How many make a ten?` : `${p.a} ${minus} ? = ${ten}. How many take you back to ten?`;
    if (role === "rest") return `${p.b} ${p.op === "add" ? "to add" : "to take away"}, ${d} done. How many left?`;
    return p.op === "add" ? `${ten} + ${p.b - d} = ?` : `${ten} ${minus} ${p.b - d} = ?`;
  }
  if (route === "trade") {
    if (role === "ones") return p.op === "add" ? `Ones: ${a.ones} + ${b.ones} = ?` : `Now ${a.ones + 10} ones. Take away ${b.ones}: ${a.ones + 10} ${minus} ${b.ones} = ?`;
    if (role === "tens") return p.op === "add" ? `Tens, with the new ten: ${a.tens} + ${b.tens} + 1 = ?` : `Tens left: ${a.tens - 1} ${minus} ${b.tens} = ?`;
    return `Put the tens and ones together. What is ${p.a} ${sign(p)} ${p.b}?`;
  }
  return `What is ${equationText(p)}`;
}

/** The first stage of help: where to look, never the number. */
export function stepCue(level: Level, p: Problem, plan: readonly Step[], at: number): string {
  const s = plan[at];
  if (s.kind === "count") return "Touch the shells one at a time and say each number out loud.";
  if (s.kind === "fill") return p.op === "add" ? "Count the empty spaces in the frame. Move that many shells in." : "Look at the shells past the ten. Take those away first.";
  if (s.kind === "trade") return s.dir === "make" ? "Ten ones are the same as one ten. Look at the cubes." : "A ten rod is ten ones. Open one to get more ones.";
  if (s.kind === "pair") return "Look for two numbers that fit together to make ten.";
  if (s.role === "to-ten") return "Look at the empty spaces. How many more to reach ten?";
  if (s.role === "rest") return "What is left over after the shells that made the ten?";
  if (s.role === "ones") return "Look only at the ones.";
  if (s.role === "tens") return "Look only at the tens.";
  if (s.role === "round-up") return "Round to a friendly ten, then fix the difference.";
  return "Put the parts back together.";
}

/** Stage 2 says the step's number; stage 3 fills it in on the pad. */
export function hintLine(level: Level, p: Problem, plan: readonly Step[], w: Work): string | null {
  const h = hintFor(plan, w);
  if (!h) return null;
  if (h.stage === 1) return stepCue(level, p, plan, w.at);
  if (h.kind === "fill" && h.fill) return `Move ${h.fill[1]} ${h.fill[1] === 1 ? "shell" : "shells"}.`;
  if (h.kind === "trade") return plan[w.at].kind === "trade" && (plan[w.at] as { dir: string }).dir === "make" ? "Tap the cubes to make a ten." : "Tap a ten rod to open it.";
  if (h.kind === "count") return `Count ${h.value} ${h.value === 1 ? "shell" : "shells"}.`;
  return h.stage === 2 ? `The number is ${h.value}.` : `I filled in ${h.value}. Tap Go when you are ready.`;
}

/** What the live region says once a problem is solved. */
export function solvedLine(p: Problem, helped: boolean): string {
  return `${helped ? "We worked it out together." : "You worked it out!"} ${equationText(p, true)}`;
}

const ROUTE_NAMES: Record<RouteId, string> = {
  count: "Count on",
  "tens-ones": "Tens and ones",
  "to-ten": "Make a ten",
  "to-ten-other": "Make a ten the other way",
  "up-to-ten": "Climb through ten",
  "give-take": "Round and fix",
  trade: "Trade a ten",
};
export const routeName = (r: RouteId) => ROUTE_NAMES[r];

/** A plain-language walk through another route, one short line per step. Used by "Show a second way". */
export function routeLines(p: Problem, route: RouteId): string[] {
  const plan = planFor(p, route);
  if (!plan) return [];
  const v = (i: number) => (plan[i] as { value: number }).value;
  const r = resultOf(p), a = placeValue(p.a), b = placeValue(p.b);
  switch (route) {
    case "to-ten": {
      // The ten the bridge stands on: 10 for a small number, 50 for 46 + 8.
      const ten = p.op === "add" ? p.a + v(0) : p.a - v(0);
      return p.op === "add"
        ? [`${p.a} needs ${v(0)} more to make ${ten}.`, `Take ${v(0)} from ${p.b}. That leaves ${v(1)}.`, `${ten} + ${v(1)} = ${r}.`]
        : [`${p.a} ${minus} ${v(0)} = ${ten}, back to a ten.`, `${p.b} ${minus} ${v(0)} leaves ${v(1)} more to take.`, `${ten} ${minus} ${v(1)} = ${r}.`];
    }
    case "to-ten-other":
      return [`${p.b} needs ${v(0)} more to make ten.`, `Take ${v(0)} from ${p.a}. That leaves ${v(1)}.`, `10 + ${v(1)} = ${r}.`];
    case "up-to-ten": {
      const lo = p.op === "subtract" && p.unknown === "result" ? p.b : p.a;
      return [`Climb from ${lo} to 10: that is ${v(0)}.`, `Climb from 10 to ${lo + answerOf(p)}: that is ${v(1)}.`, `${v(0)} + ${v(1)} = ${answerOf(p)}.`];
    }
    case "give-take": {
      const g = giveTakeParts(p)!;
      return p.op === "add"
        ? [`${g.n} is almost ${g.up}. Use ${g.up} instead: ${g.m} + ${g.up} = ${v(0)}.`, `That added ${g.d} too many. Take ${g.d} back: ${v(0)} ${minus} ${g.d} = ${r}.`]
        : [`${g.n} is almost ${g.up}. Take away ${g.up} instead: ${p.a} ${minus} ${g.up} = ${v(0)}.`, `That took ${g.d} too many. Give ${g.d} back: ${v(0)} + ${g.d} = ${r}.`];
    }
    case "tens-ones":
      return [`${p.a} is ${tensOnesText(a.tens, a.ones)}.`, `${p.b} is ${tensOnesText(b.tens, b.ones)}.`, `Tens and ones, then together: ${r}.`];
    case "trade":
      return p.op === "add"
        ? [`Ones: ${a.ones} + ${b.ones} = ${a.ones + b.ones}.`, `Ten ones make a ten.`, `${r} is ${tensOnesText(placeValue(r).tens, placeValue(r).ones)}.`]
        : [`Open a ten so there are ${a.ones + 10} ones.`, `Take away ${b.ones} ones, then the tens.`, `${r} is ${tensOnesText(placeValue(r).tens, placeValue(r).ones)}.`];
    default:
      return [`Count on from ${Math.max(p.a, p.b)}.`];
  }
}

/** One line saying what choosing this way means, for the "choose a way" buttons. Never contains the answer. */
export function routeBlurb(p: Problem, route: RouteId): string {
  switch (route) {
    case "to-ten": return p.op === "add" ? `Fill a ten from ${p.a}` : `Go back to ten first`;
    case "to-ten-other": return `Fill a ten from ${p.b}`;
    case "give-take": { const g = giveTakeParts(p); return g ? `Round ${g.n} up to ${g.up}, then fix it` : "Round up, then fix it"; }
    case "trade": return p.op === "add" ? "Make a ten from the ones" : "Open a ten";
    case "up-to-ten": return "Climb up through ten";
    case "tens-ones": return "Tens, then ones";
    case "count": return "Count one at a time";
  }
}
