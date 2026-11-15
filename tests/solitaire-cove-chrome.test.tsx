import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {expect,it,vi} from 'vitest';
import {CoveRound} from '../src/cove/CoveRound';
import {wordFitMultiplier} from '../src/components/wordFit';
import type {ChallengeEntry} from '../src/challenge/types';
const fixture=vi.hoisted(()=>({scale:1,game:'solitaire'}));
vi.mock('react-native',()=>({View:'div',useWindowDimensions:()=>({width:393,height:852,fontScale:fixture.scale})}));
vi.mock('expo-router',()=>({useIsFocused:()=>true}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',Heading:'h2'}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/components/Audio',()=>({useSoundControls:()=>({play(){}})}));
vi.mock('../src/state/Store',()=>({useStore:()=>({epoch:0,save:{settings:{sound:false},challenge:{paused:[{id:'test',game:fixture.game,revision:0,puzzle:{},result:null,credited:false,partner:null}]}},challengeOpen:vi.fn()})}));
vi.mock('../src/challenge/SessionGate',()=>({SessionGate:({render}:{render:()=>React.ReactNode})=>render()}));
vi.mock('../src/cove/catalog',()=>({infoFor:(game:string)=>({name:game==='solitaire'?'Solitaire':'Other game'}),sameRef:()=>true}));
vi.mock('../src/cove/PeoplePicker',()=>({solvingPeople:()=>[]}));
vi.mock('../src/cove/presentation',()=>({presentationFor:()=>({})}));
it.each([1,1.49,1.5,3.5])('Solitaire header is bounded at AX5 and inert below accessibility sizes (%s)',async scale=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);fixture.scale=scale;let screen:ReactTestRenderer|undefined;
 try{for(const game of ['solitaire','crossnumber','word-search']){
  fixture.game=game;const entry={game,helpUI:'board',puzzles:[],render:()=>null}as unknown as ChallengeEntry;
  await act(async()=>{screen=create(<CoveRound entry={entry} card={{ref:{}} as never} partner={null} width={353} onBrowse={()=>{}} onClose={()=>{}}/>);});
  const header=screen!.root.findByType('h2'),back=screen!.root.findAllByType('button').find(n=>n.children.includes('← Cove'))!;
  const bounded=scale>=1.5&&(game==='solitaire'||game==='word-search');expect(back.props.maxFontSizeMultiplier).toBe(bounded?1.3:undefined);
  expect(header.props.maxFontSizeMultiplier).toBe(game==='word-search'&&scale>=1.5?wordFitMultiplier('Other game',24,233,2):game==='solitaire'&&scale>=1.5?1.3:undefined);
  await act(async()=>screen!.unmount());screen=undefined;
 }}finally{if(screen)await act(async()=>screen!.unmount());vi.unstubAllGlobals();}
});
