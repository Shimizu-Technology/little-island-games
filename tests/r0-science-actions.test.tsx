/** R0: the shared science board (Weather Watch, Food Web Reef, Star Station) at the largest text size. Test model takes
 * its own full-width line under Reset and Hint, so it is never pushed off the right edge where a child can't reach it. */
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ScienceBoard } from '../src/learn/games/weather-watch/ScienceBoard';
import { engine as weather } from '../src/learn/games/weather-watch/engine';
import { optionsAtLevel } from '../src/learn/levels';
import { random } from '../src/games/types';

const viewport = vi.hoisted(() => ({ width: 393, height: 852, fontScale: 3.12 }));
vi.mock('react-native', () => ({ View: 'View', TextInput: 'TextInput', useWindowDimensions: () => viewport }));
vi.mock('react-native-svg', () => ({ default: 'Svg', G: 'G', Path: 'Path', Circle: 'Circle', Ellipse: 'Ellipse', Rect: 'Rect', Line: 'Line', Text: 'SvgText', Defs: 'Defs', RadialGradient: 'RadialGradient', LinearGradient: 'LinearGradient', Stop: 'Stop', Polygon: 'Polygon' }));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/islander/active', async () => { const { defaultLook } = await import('../src/islander/look'); return { useActiveIslanderLook: () => defaultLook }; });
vi.mock('../src/learn/Coach', () => ({ CoachSpot: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../src/components/ui', () => ({ font: 'Arial', C: { ink: '#123' }, Copy: 'Copy', Button: 'Button', PressableScale: 'PressableScale' }));

const options = optionsAtLevel({ mode: 'solo', pace: 'easy' }, 1);
const props = { update: () => {}, practice: () => {}, skills: {}, sound: () => {}, stopSound: () => {}, soundOn: false, width: 361, height: 759, active: true, coach: { active: false, done: () => {} }, cheer: () => {} };
const textOf = (n: { children: unknown[] }): string => n.children.map(c => typeof c === 'string' ? c : textOf(c as never)).join('');
let root: ReactTestRenderer | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; Object.assign(viewport, { fontScale: 3.12 }); });

it.each([[3.12, true], [1, false]])('at text scale %s Test model has its own line: %s', (fontScale, ownLine) => {
  Object.assign(viewport, { fontScale });
  const state = weather.create(options, { skills: {}, rng: random(1), starter: 0, today: 0 });
  act(() => { root = create(<ScienceBoard {...props} game="weather-watch" session={{ game: 'weather-watch', version: 1, id: 't', revision: 0, options, state: { ...state, actions: 1 } }} />); });
  const row = root!.root.find(n => n.props.testID === 'science-actions');
  expect(row.props.style.flexWrap).toBe(ownLine ? 'wrap' : 'nowrap');
  const test = row.findAll(n => String(n.type) === 'Button').find(b => textOf(b).trim() === 'Test model')!;
  expect(test.props.style).toEqual(ownLine ? { flexBasis: '100%' } : { flex: 1 });
});
