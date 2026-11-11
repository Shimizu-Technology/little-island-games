import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { stillPress } from '../src/components/stillPress';

/**
 * React Native's own press state machine (installed Pressability.js), with platform measurement
 * stubbed to a 69×56 pad key at (100, 100). This is the responder the pad's Pressable uses.
 */
const require = createRequire(import.meta.url);
function pressability() {
  const babel = require('@babel/core') as { transformSync(code: string, options: object): { code?: string | null } | null };
  const file = require.resolve('react-native/Libraries/Pressability/Pressability.js');
  const code = babel.transformSync(readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false, presets: [['module:@react-native/babel-preset', { disableImportExportTransform: false }]] })!.code!;
  const stub = (name: string): unknown => {
    if (name.includes('featureflags')) return new Proxy({}, { get: () => () => false });
    if (name.includes('SoundManager')) return { playTouchSound() {} };
    if (name.includes('UIManager')) return { measure: (_id: number, cb: (...a: number[]) => void) => cb(0, 0, 69, 56, 100, 100) };
    if (name.includes('StyleSheet/Rect')) return { normalizeRect: (x: unknown) => x };
    if (name.includes('Utilities/Platform')) return { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default };
    if (name.includes('HoverState')) return { isHoverEnabled: () => false };
    if (name.includes('PerformanceEventEmitter')) return { emitEvent() {} };
    return require(name.startsWith('.') ? require.resolve(name, { paths: [file] }) : name);
  };
  const mod = { exports: {} as { default: new (config: object) => { getEventHandlers(): Record<string, (e: unknown) => void>; reset(): void } } };
  new Function('require', 'module', 'exports', code)(stub, mod, mod.exports);
  return mod.exports.default;
}
const Pressability = pressability();
const at = (x: number, y: number) => ({ currentTarget: 1, persist() {}, nativeEvent: { pageX: x, pageY: y, touches: [{ pageX: x, pageY: y }], changedTouches: [{ pageX: x, pageY: y }] } });
/** One touch on the key centre (134.5, 128), moving through `path`, then released or terminated. */
async function gesture(still: boolean, path: [number, number][], end: 'release' | 'terminate' = 'release') {
  let presses = 0;
  const count = () => { presses++; }, keys = stillPress(count), handlers = still ? keys : { onPress: count };
  const p = new Pressability(handlers), h = p.getEventHandlers();
  // The key's View receives the touch events beside the responder ones, as on device.
  const touch = (name: 'onTouchStart' | 'onTouchMove' | 'onTouchEnd' | 'onTouchCancel', e: ReturnType<typeof at>) => { if (still) keys[name](e); };
  touch('onTouchStart', at(134.5, 128)); h.onResponderGrant(at(134.5, 128));
  for (const [x, y] of path) { touch('onTouchMove', at(x, y)); h.onResponderMove(at(x, y)); }
  const [x, y] = path.at(-1) ?? [134.5, 128];
  if (end === 'release') { h.onResponderRelease(at(x, y)); touch('onTouchEnd', at(x, y)); } else { h.onResponderTerminate(at(x, y)); touch('onTouchCancel', at(x, y)); }
  p.reset();
  await new Promise(resolve => setTimeout(resolve, 1));
  return presses;
}

describe('a drag that starts on a number-pad key never enters a number (review R4)', () => {
  it('reproduces the review: a plain press still fires after a 40-point sideways drag', async () => {
    expect(await gesture(false, [[154.5, 128], [174.5, 128]])).toBe(1);
  });
  it('cancels the pad press once the finger moves past the slop, inside or outside the key', async () => {
    expect(await gesture(true, [[154.5, 128], [174.5, 128]])).toBe(0);
    expect(await gesture(true, [[134.5, 140], [134.5, 150]])).toBe(0);
    expect(await gesture(true, [[150, 128]])).toBe(0);
  });
  it('stays cancelled when the finger leaves the key and comes back', async () => {
    expect(await gesture(true, [[134.5, 200], [134.5, 128]])).toBe(0);
  });
  it('never presses when the scroll view takes the touch', async () => {
    expect(await gesture(true, [[134.5, 132]], 'terminate')).toBe(0);
  });
  it('still presses for an ordinary tap, a small wobble, and an accessibility activation', async () => {
    expect(await gesture(true, [])).toBe(1);
    expect(await gesture(true, [[138, 131], [136, 126]])).toBe(1);
    let presses = 0;
    const keys = stillPress(() => { presses++; });
    keys.onPress();
    expect(presses).toBe(1);
    // After a cancelled drag, a later activation with no touch still acts.
    keys.onTouchStart(at(134.5, 128)); keys.onTouchMove(at(180, 128)); keys.onTouchEnd();
    await new Promise(resolve => setTimeout(resolve, 1));
    keys.onPress();
    expect(presses).toBe(2);
  });
  it('is what the grid pad uses', () => {
    expect(readFileSync('src/puzzles/grid/GridShell.tsx', 'utf8')).toMatch(/<Button key=\{i\} compact stillOnly/);
  });
});
