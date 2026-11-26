import { runLearning, type RunState } from './engine';

export function runBumped(a: RunState, b: RunState) {
  'worklet';
  // A spent shield absorbs the hit without changing the heart counter.
  return b.lives.hit > a.lives.hit || (a.shield && !b.shield && b.protection > a.protection);
}

export function runSounds(a: RunState, b: RunState): string[] {
  'worklet';
  const sounds: string[] = [];
  const learning = runLearning(b), bumped = runBumped(a, b);
  if (learning && b.bumps > a.bumps) sounds.push('shell-0');
  if (learning && b.passed > a.passed) sounds.push('clear');
  if (b.jump > a.jump || b.duck > a.duck || b.lane !== a.lane) sounds.push('lagoon-snap');
  else if (b.edgeTime > a.edgeTime) sounds.push('run-edge');
  if (b.shells > a.shells && !learning) sounds.push('lagoon-shell');
  if (b.powerEvent !== a.powerEvent && (b.lastPower !== 'shield' || b.shield)) sounds.push('lagoon-power');
  if (bumped) sounds.push('lagoon-thump');
  if (b.nearMissEvent > a.nearMissEvent) sounds.push('run-near');
  return sounds;
}
