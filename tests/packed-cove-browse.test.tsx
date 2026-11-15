import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import CoveScreen from '../src/cove/CoveScreen';
import { emptyChallenge } from '../src/state/challenge';
import { emptySave } from '../src/state/validation';
import { emptyLocal, defaults } from '../src/cove/local';
import type { ChallengeCard, ChallengeEntry } from '../src/challenge/types';
const fixture = vi.hoisted(() => ({ local: {} as ReturnType<typeof import('../src/cove/useCoveLocal').useCoveLocal>, save: {} as ReturnType<typeof emptySave>, entries: [] as ChallengeEntry[], covePerson: vi.fn(), game:'solitaire' }));
vi.mock('react-native', () => ({ ScrollView: 'section', View: 'div', TextInput: 'input', useWindowDimensions: () => ({ width: 320, height: 667, fontScale: 1 }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('expo-router', async () => { const { useEffect } = await import('react'); return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]), useLocalSearchParams: () => ({ game: fixture.game }), router: {} }; });
vi.mock('../src/components/ui', () => ({ Button: 'button', Chip: 'button', Copy: 'p', Heading: 'h2', IconButton: 'button', PressableScale: 'button', Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? <aside>{children}</aside> : null, ToggleRow: 'switch', C: {}, font: undefined }));
vi.mock('../src/components/Recovery', () => ({ Recovery: () => null }));
vi.mock('../src/components/SaveStatus', () => ({ SaveStatus: () => null }));
vi.mock('../src/hub/Landmarks', () => ({ Landmark: () => null }));
vi.mock('../src/components/GameIcon', () => ({ GameIcon: () => null, hasGameArt: () => false }));
vi.mock('../src/components/Text', () => ({ Text: 'span' }));
vi.mock('../src/cove/PeoplePicker', () => ({ PeoplePicker: () => null, solvingPeople: () => [{ id: 'family', name: 'Family practice' }] }));
vi.mock('../src/cove/CoveRound', () => ({ CoveRound: ({onBrowse}:{onBrowse:()=>void}) => <button onClick={onBrowse}>Browse packs</button> }));
vi.mock('../src/cove/PuzzleBrowser',()=>({PuzzleBrowser:()=> <p>Browser ready</p>}));
vi.mock('../src/cove/useCoveLocal', () => ({ useCoveLocal: () => fixture.local }));
vi.mock('../src/state/Store', () => ({ useStore: () => ({ ready: true, epoch: 1, save: fixture.save, covePerson: fixture.covePerson }) }));
vi.mock('../src/hub/navigation', () => ({ openGame: vi.fn() }));
vi.mock('../src/cove/catalog', async () => ({ ...await vi.importActual('../src/cove/catalog'), coveEntries: () => fixture.entries }));

for(const game of ['solitaire','sudoku'])for(const resumed of [true,false])it(`${game}: ${resumed?'resumed packed link opens its browser on the first tap':'fresh packed link deals exactly once'}`,async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);fixture.game=game;fixture.save=emptySave();
 const card={tier:1,title:'Fixture',ref:{bank:10,puzzle:0,engine:game,rules:1,hash:'a'.repeat(64)}}as ChallengeCard;
 const choose=vi.fn(async()=>card.ref),entry={game,cove:true,puzzles:[],codec:'fixture',catalog:{banks:new Map(),codecs:new Map(),contexts:new Set(),dares:new Map()},packed:{bands:[{kind:'band',bank:10,path:'endless',tier:1,title:'Fixture',count:1}],card:()=>card,choose,prepare:async()=>{}},controls:{help:()=>null,reset:()=>null},render:()=>null}as unknown as ChallengeEntry;
 fixture.entries=[entry];fixture.local={data:emptyLocal(),ready:true,error:'',load:vi.fn(),reset:vi.fn(),change:vi.fn()};
 if(resumed)fixture.save={...fixture.save,challenge:{...emptyChallenge(),paused:[{version:1,owner:'family',game,id:'paused-fixture',ordinal:1,revision:1,puzzle:card.ref,codec:'fixture',payload:{},selectedDares:[],partner:null,result:null,credited:false}]}};
 let screen:ReactTestRenderer|undefined;
 try{
  await act(async()=>{screen=create(<CoveScreen/>);});expect(screen!.root.findAllByType('button').some(n=>n.children.includes('Browse packs'))).toBe(true);
  expect(choose).toHaveBeenCalledTimes(resumed?0:1);
  if(resumed){await act(async()=>screen!.root.findAllByType('button').find(n=>n.children.includes('Browse packs'))!.props.onClick());expect(JSON.stringify(screen!.toJSON())).toContain('Browser ready');expect(choose).not.toHaveBeenCalled();}
  else{await act(async()=>screen!.update(<CoveScreen/>));expect(choose).toHaveBeenCalledTimes(1);}
 }finally{if(screen)await act(async()=>screen!.unmount());vi.unstubAllGlobals();}
});
