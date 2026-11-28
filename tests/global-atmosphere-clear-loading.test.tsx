import React from 'react';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { GlobalWeatherLayer } from '../src/atmosphere/GlobalWeatherLayer';

vi.mock('react-native', () => ({ View: 'View', StyleSheet: { absoluteFill: {} } }));
vi.mock('react-native-svg', () => Object.fromEntries(['Svg', 'Circle', 'Defs', 'LinearGradient', 'Path', 'Rect', 'Stop'].map(name => [name, name]).concat([['default', 'Svg']])));
vi.mock('../src/components/motion', () => ({ useReducedMotion: () => true }));
vi.mock('../src/hub/foreground', () => ({ useAppForeground: () => true }));
vi.mock('../src/home/runtime/WeatherOverlay', () => { throw new Error('Clear skies must not load the native particle renderer'); });
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

describe('clear skies do not load particle dependencies', () => {
  it.each(['day', 'sunset', 'night'] as const)('%s/clear renders without evaluating WeatherOverlay or Reanimated', async timeOfDay => {
    let tree!: ReturnType<typeof create>;
    try {
      await act(async () => { tree = create(<GlobalWeatherLayer atmosphere={{ timeOfDay, weather: 'clear' }} width={390} height={660} sky/>); });
      if (timeOfDay === 'day') expect(tree.toJSON()).toBeNull();
      else expect(tree.root.findAll(n => typeof n.type === 'string' && n.props.testID === `atmosphere-sky-${timeOfDay}`)).toHaveLength(1);
    } finally { if (tree) await act(async () => tree.unmount()); }
  });
});
