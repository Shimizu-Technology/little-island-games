import React,{createContext} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,expect,it,vi} from 'vitest';
import {ProgramEditor} from '../src/learn/program/ProgramEditor';
import {Board as Beep} from '../src/learn/games/beep-bot/view';
import {Board as Turtle} from '../src/learn/games/turtle-draw/view';
import {ChallengeBoard as BeepChallenge} from '../src/learn/games/beep-bot/challenge-view';
import {ChallengeBoard as CrabChallenge} from '../src/learn/games/crab-commands/challenge-view';
import {engine as beep} from '../src/learn/games/beep-bot/engine';
import {engine as turtle} from '../src/learn/games/turtle-draw/engine';
import {encodeProgram} from '../src/learn/program/codec';
import {beepProgram} from '../src/learn/games/beep-bot/program';
import {crabProgram} from '../src/learn/games/crab-commands/program';
import {turtleProgram} from '../src/learn/games/turtle-draw/program';
import {beepPuzzles} from '../src/learn/games/beep-bot/challenge-content';
import {crabPuzzles} from '../src/learn/games/crab-commands/challenge-content';
import {challengeEngine as beepReplay} from '../src/learn/games/beep-bot/challenge-engine';
import {challengeEngine as crabReplay} from '../src/learn/games/crab-commands/challenge-engine';
vi.mock('../src/learn/stepReveal',()=>({useStepReveal:()=>{}}));
vi.mock('../src/content/learnAudio',()=>({learnSources:{}}));
vi.mock('expo-router',()=>({router:{push:vi.fn(),back:vi.fn()}}));
vi.mock('react-native',()=>({View:'div',ScrollView:'scroll',useWindowDimensions:()=>({fontScale:3.12})}));
vi.mock('react-native-svg',()=>({default:'svg',Circle:'circle',Rect:'rect',Path:'path',Text:'text'}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',PressableScale:'button',C:{ink:'#183F39',soft:'#E5EFE5',teal:'#246858',line:'#DBE3DA'}}));
vi.mock('../src/components/motion',()=>({useReducedMotion:()=>true}));
vi.mock('../src/learn/Coach',()=>({CoachSpot:'coach'}));
vi.mock('../src/learn/program/ProgramEditor',()=>({ProgramEditor:'block-editor'}));
vi.mock('../src/learn/games/beep-bot/comfort',()=>({useBeepComfort:()=>({youngChild:false})}));
vi.mock('../src/learn/games/crab-commands/view',()=>({ArrowArt:()=>null,Beach:'beach',cardLabel:{up:'Up',right:'Right',down:'Down',left:'Left',forward:'Walk','turn-left':'Turn left','turn-right':'Turn right',repeat:'Again'}}));
vi.mock('../src/learn/games/crab-commands/useCrabHint',()=>({useCrabHint:()=>null}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({sound:false}),useSoundControls:()=>({play:vi.fn(),stop:vi.fn()})}));
let root:ReactTestRenderer|undefined;
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=undefined;vi.unstubAllGlobals();});
const options={mode:'solo' as const,pace:'easy' as const},context={skills:{},rng:()=>0,starter:0 as const,today:1};
async function mount(element:React.ReactElement){vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);await act(async()=>{root=create(element);});}
const shared=()=>({update:vi.fn(),practice:vi.fn(),cheer:vi.fn(),sound:vi.fn(),stopSound:vi.fn(),soundOn:false,skills:{},width:337,height:800,active:true,coach:{active:false,done:vi.fn()}});
it('Beep Step to the shell gives the same practice credit and quiet ending as Go',async()=>{
 const s=beep.create(options,context),p=s.puzzles[0];p.blockEditor=true;
 s.program=p.answer;s.cursor=s.program.length-1;s.blockDraft=encodeProgram(beepProgram(s.program));const props=shared();
 await mount(<Beep {...props} session={{game:'beep-bot',version:1,id:'step-beep',revision:0,options,state:s}}/>);
 await act(async()=>root!.root.findByType(ProgramEditor).props.onStep());
 expect(props.practice).toHaveBeenCalledWith('think.sequence',true);expect(props.cheer).toHaveBeenCalledWith('right','beep-bot-shell');expect(props.update.mock.lastCall![0].running).toBe(false);
});
it('Turtle Step to the final segment gives practice credit and a saved completion',async()=>{
 const s=turtle.create(options,context);s.tasks[0].blockEditor=true;s.program=s.tasks[0].target;s.blockDraft=encodeProgram(turtleProgram(s.program));const props=shared();
 await mount(<Turtle {...props} session={{game:'turtle-draw',version:1,id:'step-turtle',revision:0,options,state:s}}/>);
 await act(async()=>root!.root.findByType(ProgramEditor).props.onStep());
 expect(props.practice).toHaveBeenCalledWith('think.geometry',true);expect(props.cheer).toHaveBeenCalledWith('right');expect(props.update.mock.lastCall![0].completed).toEqual([s.program]);
});
it.each(['Crab','Beep'])('%s Challenge awaits the real commit and returns refusal instead of claiming success',async game=>{
 const commit=vi.fn(async()=>null),dispatch=vi.fn();
 if(game==='Crab'){
  const d={...crabPuzzles[0].descriptor,blockEditor:true};const s={...crabReplay.create(d,{version:1},{supportOff:false,ownRead:false}),blockDraft:encodeProgram(crabProgram([]))};
  await mount(<CrabChallenge state={s} active width={337} dispatch={dispatch} commit={commit} sessionKey="fixture:1"/>);
 }else{
  const d={...beepPuzzles[0].descriptor,blockEditor:true};const s={...beepReplay.create(d,{version:1},{supportOff:false,ownRead:false}),blockDraft:encodeProgram(beepProgram([]))};
  await mount(<BeepChallenge state={s} active width={337} dispatch={dispatch} commit={commit} sessionKey="fixture:1"/>);
 }
 const next=game==='Crab'?crabProgram(['right']):beepProgram(['right']);
 expect(await root!.root.findByType(ProgramEditor).props.onChange(next)).toBe(false);
 expect(commit).toHaveBeenCalledOnce();expect(dispatch).not.toHaveBeenCalled();
});
it.each(['Crab','Beep'])('%s published puzzle stays flat even with a forged draft',async game=>{
 if(game==='Crab'){const d=crabPuzzles[0].descriptor;await mount(<CrabChallenge state={{...crabReplay.create(d,{version:1},{supportOff:false,ownRead:false}),blockDraft:encodeProgram(crabProgram([]))}} active width={337} dispatch={vi.fn()}/>);}
 else{const d=beepPuzzles[0].descriptor;await mount(<BeepChallenge state={{...beepReplay.create(d,{version:1},{supportOff:false,ownRead:false}),blockDraft:encodeProgram(beepProgram([]))}} active width={337} dispatch={vi.fn()}/>);}
 expect(root!.root.findAllByType(ProgramEditor)).toHaveLength(0);expect(root!.root.findAllByType('button').some(b=>b.children.join('')==='Block editor')).toBe(false);
});
