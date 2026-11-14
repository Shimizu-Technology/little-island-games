import React,{createContext,useState} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,expect,it,vi} from 'vitest';
import {CoachSpot} from '../src/learn/Coach';
import {Board} from '../src/learn/games/beep-bot/view';
import {ChallengeBoard} from '../src/learn/games/beep-bot/challenge-view';
import {engine,advance,type BotState} from '../src/learn/games/beep-bot/engine';
import {engine as legacy} from '../src/learn/games/beep-bot/legacy';
import {optionsAtLevel} from '../src/learn/levelOptions';
import {challengeEngine} from '../src/learn/games/beep-bot/challenge-engine';
import {beepPuzzles} from '../src/learn/games/beep-bot/challenge-content';
import type {BoardProps} from '../src/learn/types';
vi.mock('react-native',()=>({View:'div',ScrollView:'section',useWindowDimensions:()=>({fontScale:3.12})}));
vi.mock('react-native-svg',()=>({default:'svg',Circle:'circle',Rect:'rect',Path:'path'}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',PressableScale:'button',C:{ink:'#183F39',soft:'#E5EFE5',teal:'#246858',line:'#DBE3DA'}}));
vi.mock('../src/components/motion',()=>({useReducedMotion:()=>true}));
vi.mock('../src/learn/Coach',()=>({CoachSpot:'coach'}));
vi.mock('../src/content/learnAudio',()=>({learnSources:{'beep-bot-help':1}}));
const policy=vi.hoisted(()=>({youngChild:false}));
vi.mock('../src/state/Store',()=>({useStore:()=>({save:{learning:{active:'a',people:[{id:'a',name:'A'}]},settings:{learningComfort:{a:{offers:true,youngChild:policy.youngChild,opening:1}}}}})}));
vi.mock('expo-router',()=>({router:{push:vi.fn(),back:vi.fn(),replace:vi.fn(),canGoBack:()=>true}}));
const audio=vi.hoisted(()=>({play:vi.fn(),stop:vi.fn()}));
vi.mock('../src/components/Audio',()=>({AudioPreferences:createContext({sound:true}),useSoundControls:()=>audio}));
let root:ReactTestRenderer|undefined;
afterEach(async()=>{if(root)await act(async()=>root!.unmount());root=undefined;policy.youngChild=false;audio.play.mockClear();vi.useRealTimers();});
async function mount(element:React.ReactElement){vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);await act(async()=>{root=create(element);});}
const text=()=>JSON.stringify(root!.toJSON());
const button=(label:string)=>root!.root.findAllByType('button').find(b=>b.props.accessibilityLabel===label||b.children.join('')===label)!;
const press=async(label:string)=>act(async()=>{expect(button(label),label).toBeDefined();button(label).props.onPress();});
function school(level:number,state?:BotState){
 const options=optionsAtLevel({mode:'solo',pace:'easy'},level as 1|2|3|4|5),s=state??engine.create(options,{skills:{},rng:()=>0,starter:0,today:1});
 const props:BoardProps<BotState>={session:{game:'beep-bot',version:1,id:'beep-review',revision:0,options,state:s} as BoardProps<BotState>['session'],update:vi.fn(),practice:vi.fn(),skills:{},sound:audio.play,stopSound:audio.stop,soundOn:true,width:335,height:750,active:true,coach:{active:true,done:vi.fn()},cheer:vi.fn()};
 function Harness(){const [state,setState]=useState(s);return <Board {...props} session={{...props.session,state}} update={setState}/>;}
 return {element:<Harness/>,s,props};
}
it('P2-3 Young-child choices hides both the dare invitation and picture',async()=>{
 policy.youngChild=true;await mount(school(3).element);expect(text()).not.toContain('Picture dares');expect(text()).not.toContain('A safe path around a sandcastle');
 policy.youngChild=false;await act(async()=>root!.update(school(3).element));expect(text()).toContain('Picture dares');expect(text()).toContain('A safe path around a sandcastle');
});
it('P2-4 first answer card and then Go are coached; accepting Go completes coaching',async()=>{
 const f=school(1);await mount(f.element);let spots=root!.root.findAllByType(CoachSpot).filter(n=>n.props.active);expect(spots).toHaveLength(1);expect(spots[0].findByType('button').props.accessibilityLabel).toBe('Add Right card');
 await press('Add Right card');spots=root!.root.findAllByType(CoachSpot).filter(n=>n.props.active);expect(spots).toHaveLength(1);expect(spots[0].findByType('button').children.join('')).toBe('Go!');
 await press('Go!');expect(f.props.coach.done).toHaveBeenCalledOnce();
});
it.each(['School','dare'])('P2-4 %s speaks add, insert and replace card names including Again',async(kind)=>{
 if(kind==='School')await mount(school(5).element);else{const d=beepPuzzles[32].descriptor;await mount(<ChallengeBoard state={challengeEngine.create(d,{version:1},{supportOff:true,ownRead:false})} active width={335} dispatch={vi.fn()}/>);}
 await press('Add Up card');expect(audio.play).toHaveBeenLastCalledWith('crab-commands-card-up',true);
 if(kind==='dare'){const d=beepPuzzles[32].descriptor,s={...challengeEngine.create(d,{version:1},{supportOff:true,ownRead:false}),program:['up'] as const};await act(async()=>root!.update(<ChallengeBoard state={{...s,program:[...s.program]}} active width={335} dispatch={vi.fn()}/>));}
 await press('Card 1: Up. Tap to edit');await press('Insert before');await press('Insert Again ×2 card');expect(audio.play).toHaveBeenLastCalledWith('crab-commands-card-repeat',true);
 if(kind==='School')await press('Card 2: Up. Tap to edit');else await press('Card 1: Up. Tap to edit');
 await press('Replace with Left card');expect(audio.play).toHaveBeenLastCalledWith('crab-commands-card-left',true);
});
it('P2-1 Reset after a real v1 advance agrees with the shown starter and restores it after editing',async()=>{
 const o=optionsAtLevel({mode:'solo',pace:'easy'},4),s=legacy.create(o,{skills:{},rng:()=>0,starter:0,today:1}),p=s.puzzles[0];
 const next=advance({...s,program:[...p.answer],cursor:p.answer.length});await mount(school(4,next).element);
 expect(button('Reset plan').props.disabled).toBe(true);await press('Add Up card');expect(button('Reset plan').props.disabled).toBe(false);await press('Reset plan');expect(button('Reset plan').props.disabled).toBe(true);
});
it('P3-4 success playback settles into the shared result and keeps the frame footer',async()=>{
 vi.useFakeTimers();const d=beepPuzzles[0].descriptor,base=challengeEngine.create(d,{version:1},{supportOff:true,ownRead:false}),s={...base,program:[...d.winners[0]]},settled=vi.fn();
 await mount(<ChallengeBoard state={s} active width={335} dispatch={vi.fn()} onSettled={settled} footer={<button>Frame footer</button>}/>);
 await act(async()=>root!.update(<ChallengeBoard state={{...s,won:true,runs:1}} active width={335} dispatch={vi.fn()} onSettled={settled} footer={<button>Frame footer</button>}/>));
 expect(settled).not.toHaveBeenCalled();for(let i=0;i<=s.program.length;i++)await act(async()=>{vi.advanceTimersByTime(140);});expect(settled).toHaveBeenCalledOnce();expect(text()).toContain('Frame footer');expect(text()).not.toContain('Your finish is kept.');
});
it('P3-5 the School board has no in-round Crab bridge',async()=>{await mount(school(5).element);expect(text()).not.toContain('Keep going with Crab Commands');});

it.each(['School','dare'])('P2-2 %s Help keeps a longer working plan and says Press Go',async(kind)=>{
 const d=beepPuzzles[32].descriptor,program:BotState['program']=[];let previous:BotState['program'][number]='right';
 for(const c of d.winners[0]){if(c.startsWith('repeat'))program.push(...Array(Number(c.at(-1))-1).fill(previous));else{program.push(c);previous=c;}}
 if(kind==='School'){const f=school(5);await mount(school(5,{...f.s,puzzles:[d.puzzle,...f.s.puzzles.slice(1)],program}).element);await press('Help');}
 else await mount(<ChallengeBoard state={{...challengeEngine.create(d,{version:1},{supportOff:true,ownRead:false}),program,hintStage:1,hints:1}} active width={335} dispatch={vi.fn()}/>);
 await vi.waitFor(async()=>{await act(async()=>{});expect(text()).toContain('Your plan reaches the shell. Press Go.');});
 expect(text()).not.toContain('Change card');expect(text()).not.toContain('Show the whole plan');
});

it('P2-3 a saved dare also hides its own picture and invitation under Young-child choices',async()=>{
 policy.youngChild=true;const d=beepPuzzles[16].descriptor;
 await mount(<ChallengeBoard state={challengeEngine.create(d,{version:1},{supportOff:true,ownRead:false})} active width={335} dispatch={vi.fn()}/>);
 expect(text()).not.toContain('One changed card, one Go');expect(text()).not.toContain('Dare: one fix');
 policy.youngChild=false;await act(async()=>root!.update(<ChallengeBoard state={challengeEngine.create(d,{version:1},{supportOff:true,ownRead:false})} active width={335} dispatch={vi.fn()}/>));
 expect(text()).toContain('Dare: one fix');
});

it('P2-1 School AX5 keeps selected-card editing and keys before the message',async()=>{
 await mount(school(4).element);const card=root!.root.findAllByType('button').find(n=>String(n.props.accessibilityLabel).startsWith('Card 1:'))!;await act(async()=>card.props.onPress());
 const nodes=root!.root.findAll(n=>typeof n.type==='string');
 expect(nodes.findIndex(n=>n.props.testID==='beep-keys')).toBeLessThan(nodes.findIndex(n=>n.props.testID==='beep-message'));
 const copy=nodes.find(n=>n.children.join('').includes('Choose an arrow to'))!;
 expect(copy.props.maxFontSizeMultiplier).toBe(1.5);
});
it('P3-2 empty dare placeholder is capped at AX5',async()=>{
 const d=beepPuzzles[0].descriptor;await mount(<ChallengeBoard state={challengeEngine.create(d,{version:1},{supportOff:true,ownRead:false})} active width={335} dispatch={vi.fn()}/>);
 expect(root!.root.find(n=>n.props.testID==='beep-placeholder').props.maxFontSizeMultiplier).toBe(1.5);
});
it('P3-3 long programs wrap so running and bumped cards stay in the row',async()=>{
 const f=school(4);await mount(school(4,{...f.s,program:Array(8).fill('left'),cursor:7}).element);
 const row=root!.root.find(n=>n.props.testID==='beep-program');
 expect(row.props.style.flexWrap).toBe('wrap');expect(row.findAllByType('button')).toHaveLength(8);
});
it('P3-5 Hear rules plays the shipped intro while new help is absent',async()=>{
 await mount(school(1).element);await press('Hear rules');expect(audio.play).toHaveBeenLastCalledWith('beep-bot-intro');
});
