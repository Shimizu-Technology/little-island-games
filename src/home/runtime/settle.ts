/** Acknowledgement is independent of animation completion. Neither alone hides art. */
export type SettleGate = { committed: boolean; finished: boolean; revision?: string };
export function canRevealResting(gate: SettleGate, renderedRevision: string): boolean {
  'worklet';
  return gate.committed && gate.finished && gate.revision === renderedRevision;
}
export const settleSpring = {
  mass: 1, stiffness: 900, damping: 60, velocity: 0,
  overshootClamping: true, energyThreshold: .00001,
} as const;
/** Exact critically damped curve; at the cap the destination is exact. */
export function settleProgress(elapsed: number, reduced = false): number {
  'worklet';
  if (reduced || elapsed >= 240) return 1;
  const t = Math.max(0, elapsed) / 1000;
  return 1 - (1 + 30 * t) * Math.exp(-30 * t);
}
export function trayExit(dx: number, dy: number, vertical: boolean): 'pending' | 'scroll' | 'pickup' {
  'worklet';
  const cross = vertical ? -dx : -dy;
  const along = Math.abs(vertical ? dy : dx);
  if (along > 14 && along > Math.abs(cross)) return 'scroll';
  return cross > 8 && cross > along ? 'pickup' : 'pending';
}
