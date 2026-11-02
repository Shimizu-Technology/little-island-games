/** Opt-in lab diagnostics. Times are native UI callback deltas, not video timestamps. */
export type ProbeFrame = { at: number; delta: number };
export type ProbeRelease = { at: number; id: string; kind: string; target?: string };
export type ReleaseProbe = ProbeRelease & { frames: ProbeFrame[]; maxDelta: number; gates?: unknown };
export function releaseWindow(release: ProbeRelease, ring: ProbeFrame[]): ReleaseProbe {
  "worklet";
  // Include an interval straddling either edge, including a callback delayed by a stall.
  const frames = ring.filter((f) => f.at >= release.at - 500 && f.at - f.delta <= release.at + 500)
    .sort((a, b) => a.at - b.at);
  return { ...release, frames, maxDelta: Math.max(0, ...frames.map((f) => f.delta)) };
}
