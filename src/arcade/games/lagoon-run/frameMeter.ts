/** UI callback scheduling, not display presentation or GPU timing. Bounded to ten minutes. */
export const GAP_LIMITS = [8.3, 16.7, 25, 33] as const;
export const METER_CAPACITY = 36000;
export type FrameSample = { gap: number; tick: number; tags: string[] };
export type Meter = { samples: FrameSample[]; frames: number; elapsed: number; cadence: number; candidate: number; streak: number; rateChanges: number; events: Record<string, number[]> };
export function createMeter(): Meter {
  'worklet';
  return { samples: [], frames: 0, elapsed: 0, cadence: 0, candidate: 0, streak: 0, rateChanges: 0, events: {} };
}
export function recordFrame(m: Meter, gap: number, tick: number, tags: string[]): Meter {
  'worklet';
  if (!Number.isFinite(gap) || gap <= 0) return m;
  // Eight consecutive ordinary gaps establish a cadence. Hitches never masquerade as switches.
  const hz = gap < 11 ? 120 : gap < 20 ? 60 : gap < 29 ? 40 : gap < 38 ? 30 : 0;
  const streak = hz && hz === m.candidate ? m.streak + 1 : 1;
  const changed = !!hz && streak === 8 && m.cadence !== 0 && m.cadence !== hz;
  const events = m.events;
  for (const tag of tags) events[tag] = [...(events[tag] ?? []).slice(-599), gap];
  // A bounded ring; summarize on JS only at export, never sort samples on UI.
  const samples = m.samples;
  samples[m.frames % METER_CAPACITY] = { gap, tick, tags };
  m.frames++;m.elapsed+=gap;m.cadence=hz&&streak>=8?hz:m.cadence;m.candidate=hz;m.streak=streak;m.rateChanges+=Number(changed);
  return m;
}
export function summarizeFrames(samples: FrameSample[]) {
  const gaps = samples.map(s => s.gap).sort((a,b) => a-b), ticks = samples.map(s => s.tick).sort((a,b) => a-b);
  const percentile = (a: number[], p: number) => a[Math.min(a.length-1, Math.floor(a.length*p))] ?? 0;
  const histogram = [0,0,0,0,0];
  for (const n of gaps) histogram[GAP_LIMITS.findIndex(limit => n <= limit + .08) < 0 ? 4 : GAP_LIMITS.findIndex(limit => n <= limit + .08)]++;
  return { frames: gaps.length, fps: gaps.length ? gaps.length*1000/gaps.reduce((a,b)=>a+b,0) : 0, gap: { p95: percentile(gaps,.95), p99: percentile(gaps,.99), max: gaps.at(-1) ?? 0, histogram, limits: GAP_LIMITS }, tick: { mean: ticks.length ? ticks.reduce((a,b)=>a+b,0)/ticks.length : 0, p95: percentile(ticks,.95), max: ticks.at(-1) ?? 0 } };
}

/** Tags mark the FIRST gap following an event. Keep all three causal gaps inspectable. */
export function eventWindows(samples:FrameSample[]) {
 const events:Record<string,{index:number;gaps:number[];worst:number;complete:boolean}[]>={};
 for(let i=0;i<samples.length;i++)for(const tag of samples[i].tags) {
  const gaps=samples.slice(i,i+3).map(s=>s.gap);
  (events[tag]??=[]).push({index:i,gaps,worst:Math.max(...gaps),complete:gaps.length===3});
 }
 return events;
}
