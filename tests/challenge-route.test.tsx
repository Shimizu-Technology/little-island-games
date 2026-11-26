import React from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import Challenge from '../src/app/challenge';
const fixture = vi.hoisted(() => ({ params: {} as {game?: string; puzzle?: string} }));
vi.mock('expo-router', () => ({ useLocalSearchParams: () => fixture.params, Redirect: 'redirect' }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('../src/components/ui', () => ({ C: {}, Heading: 'h1' }));
vi.mock('../src/components/Recovery', () => ({ Recovery: 'recovery' }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ready:true, epoch:0, save:{}}) }));
vi.mock('../src/challenge/ChallengeFrame', () => ({ ChallengeFrame: 'frame' }));

it.each([
  [{puzzle:'468:2'}, 'reef-sweep', true, undefined],
  [{game:'reef-sweep'}, 'reef-sweep', false, undefined],
  [{game:'sudoku', puzzle:'468:2'}, 'sudoku', false, undefined],
  [{puzzle:'468:-1'}, undefined, undefined, '/cove'],
  [{puzzle:'unknown:0'}, undefined, undefined, '/cove'],
  [{}, undefined, undefined, '/'],
])('resolves route %j without changing legacy game selection', async (params, game, auto, fallback) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.params = params;
  let screen: ReturnType<typeof create> | undefined;
  try {
    await act(async () => { screen = create(<Challenge/>); });
    if (fallback) expect(screen!.root.findByType('redirect').props.href).toBe(fallback);
    else {
      const frame = screen!.root.findByType('frame');
      expect(frame.props.entry.game).toBe(game);
      expect(frame.props.autoStart).toBe(auto);
      if (!params.game) expect(frame.props.requestedCard.ref).toMatchObject({bank:468,puzzle:2});
      if (params.game === 'sudoku') expect(frame.props.requestedCard).toBeUndefined();
    }
  } finally { if(screen) await act(async () => screen!.unmount()); vi.unstubAllGlobals(); }
});
