import { placeValue, tensOnesText, resultOf, type Level, type Problem, type RouteId, type Step, type Work } from "../../../math/kit";

/**
 * What is on the sand at this point in the plan. Pure data, so a test can check that the shells and blocks always
 * add up to the arithmetic before anything is drawn.
 */
export type FramesPic = { gold: number; blue: number; struck: number; ghost: number };
export type PairPic = { a: number; b: number; fullA: boolean; fullB: boolean };
export type BlocksPic = { tens: number; ones: number; ghostOnes: number; struckOnes: number; struckTens: number };
export type LinePic = { lo: number; hi: number; start: number; hops: number[]; ten: number; made: number };
export type Picture = { frames?: FramesPic; pair?: PairPic; blocks?: BlocksPic; line?: LinePic; caption: string };

export function pictureFor(level: Level, p: Problem, route: RouteId, plan: readonly Step[], w: Work): Picture {
  const at = w.solved ? plan.length : w.at;
  const pic = pictureBase(level, p, route, plan, w, at);
  // Make a ten asks the child to find the bridge, so the number line waits until the first step is done.
  return level === 4 && at < 1 && pic.line ? { ...pic, line: undefined } : pic;
}

function pictureBase(level: Level, p: Problem, route: RouteId, plan: readonly Step[], w: Work, at: number): Picture {  const r = resultOf(p);
  if (route === "count") {
    const big = Math.max(p.a, p.b), small = Math.min(p.a, p.b);
    if (p.op === "add") {
      const t = w.solved ? small : w.at > 0 ? small : w.tapped;
      return { frames: { gold: big, blue: t, struck: 0, ghost: small - t }, caption: `${big + t} shells so far` };
    }
    const t = w.at > 0 || w.solved ? p.b : w.tapped;
    return { frames: { gold: p.a, blue: 0, struck: t, ghost: 0 }, caption: `${p.a - t} shells left` };
  }
  if (route === "tens-ones") {
    const a = placeValue(p.a), b = placeValue(p.b);
    if (Math.max(p.a, p.b, r) <= 20) {
      return p.op === "add"
        ? { frames: { gold: p.a, blue: p.b, struck: 0, ghost: 0 }, caption: `${p.a} and ${p.b} together` }
        : { frames: { gold: p.a, blue: 0, struck: p.b, ghost: 0 }, caption: `${p.a} take away ${p.b}` };
    }
    return p.op === "add"
      ? { blocks: { tens: a.tens + b.tens, ones: a.ones + b.ones, ghostOnes: 0, struckOnes: 0, struckTens: 0 }, caption: tensOnesText(a.tens + b.tens, a.ones + b.ones) }
      : { blocks: { tens: a.tens, ones: a.ones, ghostOnes: 0, struckOnes: b.ones, struckTens: b.tens }, caption: `${tensOnesText(a.tens, a.ones)}, take away ${tensOnesText(b.tens, b.ones)}` };
  }
  if (route === "to-ten" || route === "to-ten-other") {
    if (p.op === "add") {
      const first = plan[0];
      const toB = route === "to-ten-other" || w.side === 1;
      const moved = at < 1 ? 0 : first.kind === "fill" ? first.options.find((o) => o[0] === (w.side ?? 0))?.[1] ?? first.options[0][1] : first.kind === "number" ? first.value : 0;
      const a2 = toB ? p.a - moved : p.a + moved, b2 = toB ? p.b + moved : p.b - moved;
      return {
        pair: { a: a2, b: b2, fullA: a2 === 10, fullB: b2 === 10 },
        line: { lo: 0, hi: 20, start: toB ? p.b : p.a, hops: [10, r], ten: 10, made: Math.min(at, 2) },
        caption: at >= 1 ? `${toB ? b2 : a2} is a full ten, with ${toB ? a2 : b2} left over` : `${p.a} and ${p.b}: make one of them a ten`,
      };
    }
    // Subtract: one big group, the ones past ten are taken first, then the rest.
    const oa = p.a % 10, struck = at >= 2 || w.solved ? p.b : at >= 1 ? oa : 0;
    return { frames: { gold: p.a, blue: 0, struck, ghost: 0 }, line: { lo: 0, hi: 20, start: p.a, hops: [10, r], ten: 10, made: Math.min(at, 2) }, caption: `${p.a - struck} shells left` };
  }
  if (route === "up-to-ten") {
    const lo = p.op === "subtract" && p.unknown === "result" ? p.b : p.op === "add" ? p.a : p.a - p.b;
    const hi = p.op === "subtract" ? p.a : p.a + p.b;
    const climbed = at >= 2 || w.solved ? hi - lo : at >= 1 ? 10 - lo : 0;
    return {
      frames: { gold: lo, blue: climbed, struck: 0, ghost: hi - lo - climbed },
      line: { lo: 0, hi: 20, start: lo, hops: [10, hi], ten: 10, made: Math.min(at, 2) },
      caption: `Climbing from ${lo} up to ${hi}`,
    };
  }
  if (route === "trade") {
    const a = placeValue(p.a), b = placeValue(p.b);
    const traded = plan.slice(0, at).some((s) => s.kind === "trade");
    if (p.op === "add") {
      const tens = a.tens + b.tens + (traded ? 1 : 0), ones = a.ones + b.ones - (traded ? 10 : 0);
      return { blocks: { tens, ones, ghostOnes: 0, struckOnes: 0, struckTens: 0 }, caption: tensOnesText(tens, ones) };
    }
    const tens = a.tens - (traded ? 1 : 0), ones = a.ones + (traded ? 10 : 0);
    const onesTaken = plan.slice(0, at).some((s) => s.kind === "number" && s.role === "ones");
    const tensTaken = plan.slice(0, at).some((s) => s.kind === "number" && s.role === "tens") || (b.tens === 0 && onesTaken);
    return {
      blocks: { tens, ones, ghostOnes: 0, struckOnes: onesTaken || w.solved ? b.ones : 0, struckTens: tensTaken || w.solved ? b.tens : 0 },
      caption: tensOnesText(tens, ones),
    };
  }
  // give-take has no picture of its own: the number line carries it.
  return { caption: "" };
}
