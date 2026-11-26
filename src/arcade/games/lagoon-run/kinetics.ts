import { FIXED_DT } from "../../clock";
import { LANE_SECONDS, SLIDE_SECONDS, type RunState } from './engine';

export const RUNNER_KINETICS = 51;

/** Local render transform around the planted shoe line. The tracking root keeps its rule height. */
export function runnerKinetics(s: RunState, reduced: boolean) {
  'worklet';
  if (reduced || s.status !== 'playing' || s.cooldown > 0 || s.kite > 0) {
    return { angle: 0, x: 1, y: 1, scale: 0 };
  }
  if (s.duck > 0) {
    const tuck = Math.min(1, (SLIDE_SECONDS - s.duck) / .045, s.duck / .12);
    return { angle: 0, x: 1 + .09 * tuck, y: 1 - .12 * tuck, scale: 0 };
  }
  const lane = s.laneTime > 0 ? Math.sin(Math.PI * (1 - s.laneTime / LANE_SECONDS)) : 0;
  const angle = Math.sign(s.lane - s.laneFrom) * lane * (11 * Math.PI / 180);
  const hop = s.jump > 0 || s.fastDrop ? 0 : -4 * lane * lane;
  if (s.jump > 0) {
    const launchAge = Math.max(0, s.jumpDuration - s.jump - FIXED_DT);
    const stretch = Math.max(0, 1 - launchAge / .095) ** 2;
    return { angle, x: 1 - .12 * stretch, y: 1 + .14 * stretch, scale: 0 };
  }
  const landingAge = .13 - s.landing;
  // One small rebound after the initial compression makes the return to the gait feel planted.
  const landing = s.landing > 0 ? Math.cos(landingAge * 36) * (s.landing / .13) ** 2 : 0;
  return { angle, x: 1 + .15 * landing, y: 1 - .15 * landing, scale: hop };
}

export function impactMotion(age: number, reduced: boolean) {
  'worklet';
  const decay = (1 - age) ** 2;
  return {
    x: reduced ? 0 : Math.sin(age * Math.PI * 4) * decay * 5,
    y: reduced ? 0 : Math.sin(age * Math.PI * 3) * decay * 2.5,
    flash: decay * (reduced ? .11 : .28),
  };
}
