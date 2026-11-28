import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {expect,it,vi} from 'vitest';
import {CoveRound} from '../src/cove/CoveRound';
import type {ChallengeEntry} from '../src/challenge/types';
import {useBoardHud,type BoardCommands} from '../src/cove/boardHud';
vi.mock('../src/atmosphere/AtmosphereHeader', () => ({ AtmosphereHeader: () => null }));
vi.mock('../src/atmosphere/GlobalWeatherLayer', () => ({ GlobalWeatherLayer: () => null, AtmosphereSky: () => null }));

const fixture=vi.hoisted(()=>({scale:1,game:'solitaire'}));
vi.mock('react-native',()=>({View:'div',ScrollView:'section',useWindowDimensions:()=>({width:393,height:852,fontScale:fixture.scale})}));
vi.mock('expo-router',()=>({useIsFocused:()=>true}));
vi.mock('../src/ui',async()=>(await import('./helpers/cove-ui')).ui);
vi.mock('../src/cove/CoveArt',async()=>(await import('./helpers/cove-ui')).art);
vi.mock('../src/personalization/Portrait',()=>({Portrait:()=>null}));
vi.mock('../src/components/SaveStatus',()=>({SaveStatus:()=>null}));
vi.mock('../src/components/Audio',()=>({useSoundControls:()=>({play(){}})}));
vi.mock('../src/state/Store',()=>({useStore:()=>({epoch:0,save:{settings:{sound:false},challenge:{paused:[{id:'test',game:fixture.game,revision:0,puzzle:{},result:null,credited:false,partner:null}]}},challengeOpen:vi.fn()})}));
vi.mock('../src/challenge/SessionGate',()=>({SessionGate:({render}:{render:()=>React.ReactNode})=>render()}));
vi.mock('../src/cove/catalog',async()=>({...await vi.importActual<object>('../src/cove/catalog'),infoFor:(game:string)=>({name:game==='solitaire'?'Solitaire':'Other game'}),sameRef:()=>true}));
vi.mock('../src/cove/PeoplePicker',()=>({solvingPeople:()=>[],FaceButton:()=>null}));
vi.mock('../src/cove/presentation',()=>({presentationFor:()=>({})}));
/** A board that hands the HUD what its real counterpart hands over (see SolitaireBoard, LatinBoard): nothing for a board that keeps its own. */
function Board({commands}:{commands:BoardCommands}){useBoardHud(commands);return <p>board</p>;}
/** 4.0 Clean: one HUD row replaces the old "← Cove" button and title above the board, at every text size. */
it.each([1,1.49,1.5,3.5])('the board HUD is one row with Back, the name and difficulty, and only the actions its board hands over (%s)',async scale=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);fixture.scale=scale;let screen:ReactTestRenderer|undefined;
 try{for(const [game,undo,hint] of [['solitaire',true,true],['sudoku',true,true],['crossnumber',false,false]] as const){
  fixture.game=game;const commands:BoardCommands={...undo?{undo:{run:()=>{}}}:{},...hint?{hint:{run:()=>{},label:game==='solitaire'?'Think':undefined}}:{}};
  const entry={game,helpUI:'board',puzzles:[{ref:{},tier:3,title:'Fixture'}],render:()=><Board commands={commands}/>,controls:{help:()=>({type:'help'}),reset:()=>({type:'reset'})}}as unknown as ChallengeEntry;
  await act(async()=>{screen=create(<CoveRound entry={entry} card={{ref:{},tier:3} as never} partner={null} width={353} onBrowse={()=>{}} onClose={()=>{}}/>);});
  const hud=screen!.root.findByProps({testID:'hud'});
  expect(hud.props['data-title']).toBe(game==='solitaire'?'Solitaire':'Other game');expect(hud.props['data-subtitle']).toBe('Hard');
  expect(screen!.root.findByProps({testID:'hud-back'}).props.accessibilityLabel).toBe('Save and leave');
  expect(screen!.root.findAllByProps({testID:'hud-undo'})).toHaveLength(undo?1:0);expect(screen!.root.findAllByProps({testID:'hud-hint'})).toHaveLength(hint?1:0);
  expect(screen!.root.findAllByProps({testID:'hud-more'})).toHaveLength(1);
  // The staged Hint keeps its board's own word (Solitaire's Hint → Think → One step).
  if(hint)expect(screen!.root.findByProps({testID:'hud-hint'}).props.accessibilityLabel).toBe(game==='solitaire'?'Think':'Hint');
  expect(JSON.stringify(screen!.toJSON())).not.toMatch(/← Cove|Bands, packs|Help · show me how|Helping a child/);
  await act(async()=>screen!.unmount());screen=undefined;
 }}finally{if(screen)await act(async()=>screen!.unmount());vi.unstubAllGlobals();}
});
