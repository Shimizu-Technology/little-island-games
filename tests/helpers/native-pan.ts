import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/**
 * React Native's own PanResponder (the installed Libraries/Interaction/PanResponder.js, compiled
 * here), and a one-finger driver that feeds it what the responder system does on device: a touch
 * history in page coordinates, a MOVE per sample, and a release that carries the lifted touch while
 * the gesture state still holds the last MOVE (the installed release never updates it).
 */
const require = createRequire(import.meta.url);
type Module = { exports: Record<string, unknown> & { default?: unknown } };
function load(file: string): Module['exports'] {
  const babel = require('@babel/core') as { transformSync(code: string, options: object): { code?: string | null } | null };
  const code = babel.transformSync(readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false, presets: [['module:@react-native/babel-preset', { disableImportExportTransform: false }]] })!.code!;
  const mod: Module = { exports: {} };
  const req = (name: string): unknown => name.startsWith('.') ? load(require.resolve(join(dirname(file), name))) : require(name);
  new Function('require', 'module', 'exports', code)(req, mod, mod.exports);
  return mod.exports;
}
export type PanHandlers = Record<string, (e: unknown) => unknown>;
export const realPanResponder = () => (load(require.resolve('react-native/Libraries/Interaction/PanResponder.js')).default as { create(config: object): { panHandlers: PanHandlers } });

/** One finger on a responder view whose top-left corner sits at `origin` on the page. */
export function finger(h: PanHandlers, origin = { x: 20, y: 200 }) {
  const track = { touchActive: false, startPageX: 0, startPageY: 0, startTimeStamp: 0, currentPageX: 0, currentPageY: 0, currentTimeStamp: 0, previousPageX: 0, previousPageY: 0, previousTimeStamp: 0 };
  const history = { touchBank: [track], numberActiveTouches: 0, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: 0 };
  let time = 1000, granted = false;
  const event = (x: number, y: number, lifted: boolean) => {
    const touch = { identifier: 0, pageX: origin.x + x, pageY: origin.y + y, locationX: x, locationY: y, timestamp: time, target: 1 };
    return { nativeEvent: { ...touch, touches: lifted ? [] : [touch], changedTouches: [touch] }, touchHistory: history, currentTarget: 1, target: 1, persist() {} };
  };
  const at = (x: number, y: number) => {
    time += 16;
    Object.assign(track, { previousPageX: track.currentPageX, previousPageY: track.currentPageY, previousTimeStamp: track.currentTimeStamp, currentPageX: origin.x + x, currentPageY: origin.y + y, currentTimeStamp: time });
    history.mostRecentTimeStamp = time;
  };
  return {
    /** Touch down at (x, y) in the view; returns whether the view took the touch. */
    down(x: number, y: number) {
      time += 16;
      Object.assign(track, { touchActive: true, startPageX: origin.x + x, startPageY: origin.y + y, startTimeStamp: time, currentPageX: origin.x + x, currentPageY: origin.y + y, currentTimeStamp: time, previousPageX: origin.x + x, previousPageY: origin.y + y, previousTimeStamp: time });
      Object.assign(history, { numberActiveTouches: 1, mostRecentTimeStamp: time });
      const e = event(x, y, false);
      h.onStartShouldSetResponderCapture?.(e);
      granted = !!h.onStartShouldSetResponder?.(e);
      if (granted) { h.onResponderGrant(e); h.onResponderStart?.(e); }
      return granted;
    },
    // The responder system sends move capture to the responder's ancestors only, never to the responder itself.
    move(x: number, y: number) { at(x, y); if (granted) h.onResponderMove(event(x, y, false)); },
    /** Let go at (x, y): a finger can lift past the last MOVE sample. */
    up(x: number, y: number) { at(x, y); track.touchActive = false; history.numberActiveTouches = 0; const e = event(x, y, true); if (granted) { h.onResponderEnd?.(e); h.onResponderRelease(e); } granted = false; },
    /** Another responder (the page's scroll view) asks for the touch; returns whether it was given up. */
    request(x: number, y: number) { const ok = !!h.onResponderTerminationRequest(event(x, y, false)); if (ok && granted) { h.onResponderTerminate(event(x, y, false)); granted = false; } return ok; },
  };
}
