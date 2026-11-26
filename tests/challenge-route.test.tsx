import React from 'react';
import { act, create } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { emptySave } from '../src/state/validation';
import { createSession } from '../src/board';
import Challenge from '../src/app/challenge';
const fixture = vi.hoisted(() => ({ save: {} as import('../src/state/validation').Save, params: {} as {game?: string; puzzle?: string|string[]} }));
vi.mock('expo-router', () => ({ useLocalSearchParams: () => fixture.params, Redirect: 'redirect' }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('../src/components/ui', () => ({ C: {}, Heading: 'h1' }));
vi.mock('../src/components/Recovery', () => ({ Recovery: 'recovery' }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ready:true, epoch:0, save:fixture.save}) }));
vi.mock('../src/challenge/ChallengeFrame', () => ({ ChallengeFrame: 'frame' }));

const cases: [{game?:string;puzzle?:string|string[]},string|undefined,boolean|undefined,string|undefined][] = [
  [{puzzle:'468:2'}, 'reef-sweep', true, undefined],
  [{game:'reef-sweep'}, 'reef-sweep', false, undefined],
  [{game:'sudoku', puzzle:'468:2'}, 'sudoku', false, undefined],
  [{puzzle:'468:-1'}, undefined, undefined, '/cove'],
  [{puzzle:'unknown:0'}, undefined, undefined, '/cove'],
  [{puzzle:''}, undefined, undefined, '/cove'],
  [{puzzle:['468:2','468:1']}, 'reef-sweep', true, undefined],
  [{}, undefined, undefined, '/'],
];
it.each(cases)('resolves route %j without changing legacy game selection', async (params, game, auto, fallback) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); fixture.params = params;
  let screen: ReturnType<typeof create> | undefined;
  try {
    await act(async () => { screen = create(<Challenge/>); });
    if (fallback) expect(screen!.root.findByType('redirect' as React.ElementType).props.href).toBe(fallback);
    else {
      const frame = screen!.root.findByType('frame' as React.ElementType);
      expect(frame.props.entry.game).toBe(game);
      expect(frame.props.autoStart).toBe(auto);
      if (!params.game) expect(frame.props.requestedCard.ref).toMatchObject({bank:468,puzzle:2});
      if (params.game === 'sudoku') expect(frame.props.requestedCard).toBeUndefined();
    }
  } finally { if(screen) await act(async () => screen!.unmount()); vi.unstubAllGlobals(); }
});

it('redirects a legacy-only Reef Sweep Continue to its original board',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 fixture.params={game:'reef-sweep'};
 fixture.save={...emptySave(),board:{'reef-sweep':createSession('reef-sweep',{seed:91})}};
 let screen:ReturnType<typeof create>|undefined;
 try{
  await act(async()=>{screen=create(<Challenge/>);});
  expect(screen!.root.findByType('redirect' as React.ElementType).props.href).toEqual({pathname:'/board',params:{game:'reef-sweep'}});
 }finally{if(screen)await act(async()=>screen!.unmount());fixture.save=emptySave();vi.unstubAllGlobals();}
});
it('keeps the resolved puzzle when the router returns a fresh array',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);fixture.params={puzzle:['468:2','468:1']};
 let screen:ReturnType<typeof create>|undefined;
 try{
  await act(async()=>{screen=create(<Challenge/>);});
  fixture.params={puzzle:['468:2','468:1']};
  await act(async()=>screen!.update(<Challenge/>));
  expect(screen!.root.findByType('frame' as React.ElementType).props.requestedCard.ref).toMatchObject({bank:468,puzzle:2});
 }finally{if(screen)await act(async()=>screen!.unmount());vi.unstubAllGlobals();}
});
