import React, { createContext } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ChallengeBoard } from '../src/learn/games/crab-commands/challenge-view';
import { challengeEngine, type State } from '../src/learn/games/crab-commands/challenge-engine';
import { crabPuzzles } from '../src/learn/games/crab-commands/challenge-content';
vi.mock('../src/content/learnAudio',()=>({learnSources:{}}));
vi.mock('react-native',()=>({View:'div'}));
vi.mock('../src/components/ui',()=>({View:'div',Button:'button',Copy:'p',PressableScale:'button',C:{ink:'#183F39',soft:'#E5EFE5'}}));
vi.mock('../src/components/motion',()=>({useReducedMotion:()=>true}));
const sound=vi.hoisted(()=>({play:vi.fn(),stop:vi.fn()}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({sound:false}),useSoundControls:()=>sound}));
vi.mock('../src/learn/games/crab-commands/view',()=>({ArrowArt:()=>null,Beach:'beach',cardLabel:{up:'Up',right:'Right',down:'Down',left:'Left',forward:'Walk','turn-left':'Turn left','turn-right':'Turn right',repeat:'Again ×2'}}));
let root:ReactTestRenderer|undefined;
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=undefined;vi.unstubAllGlobals();});
const state=(i=0)=>challengeEngine.create(crabPuzzles[i].descriptor,{version:1},{supportOff:false,ownRead:false});
const mount=async(s:State,dispatch=vi.fn())=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);await act(async()=>{root=create(<ChallengeBoard state={s} dispatch={dispatch} active width={335}/>);});return dispatch;};
const press=async(label:string)=>act(async()=>{const b=root!.root.findAllByType('button').find(b=>b.props.accessibilityLabel===label||b.children.join('')===label);expect(b,label).toBeDefined();b!.props.onPress();});
it('first help shows only the next step; full plan takes two more explicit choices',async()=>{
 let s=state(1);s=challengeEngine.step(s,['h'],s.descriptor)!.state;await mount(s);
 await vi.waitFor(async()=>{await act(async()=>{});expect(JSON.stringify(root!.toJSON())).toContain('Add card 1:');},{timeout:5000,interval:20});expect(JSON.stringify(root!.toJSON())).not.toContain('One working plan:');
 expect(root!.root.findAllByType('p').find(p=>p.children.join('').startsWith('Add card 1:'))!.props.style.color).toBe('#183F39');
 await press('More help');s=challengeEngine.step(s,['h'],s.descriptor)!.state;
 await act(async()=>root!.update(<ChallengeBoard state={s} dispatch={vi.fn()} active width={335}/>));expect(JSON.stringify(root!.toJSON())).toContain('Show the whole plan');
});
it('selects a broken card, replaces it, inserts before it and removes it through explicit controls',async()=>{
 const s=state(7),dispatch=await mount(s);
 await press(`Card 1: Walk. Select to change, insert before, or remove.`);await press('Replace with Turn right');expect(dispatch).toHaveBeenLastCalledWith(['r',0,6]);
 await press(`Card 1: Walk. Select to change, insert before, or remove.`);await press('Insert before');await press('Insert Walk');expect(dispatch).toHaveBeenLastCalledWith(['i',0,4]);
 await press(`Card 1: Walk. Select to change, insert before, or remove.`);await press('Remove card');expect(dispatch).toHaveBeenLastCalledWith(['x',0]);
});
it('hides footprints for the blind dare, keeps help available and labels walking costs',async()=>{
 const s={...state(),supportOff:true};await mount(s);expect(root!.root.findByProps({level:s.descriptor.level}).props.plan).toBeUndefined();expect(JSON.stringify(root!.toJSON())).toContain('Mud 2 / sand 1 / turn 0');
});
it('an inactive board has no automatic ticks and makes no accepted edit',async()=>{
 const s=state(),dispatch=vi.fn();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 await act(async()=>{root=create(<ChallengeBoard state={s} dispatch={dispatch} active={false} width={335}/>);});await press('Add Walk');expect(dispatch).not.toHaveBeenCalled();
});
