import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ProgramPanel } from '../src/learn/games/code-lab/ProgramPanel';
import { initialAttempt, step } from '../src/learn/games/code-lab/attempt';
import { schoolPrograms, deepPrograms } from '../src/learn/games/code-lab/content';
const win = vi.hoisted(()=>({width:393,height:852,fontScale:1}));
vi.mock('react-native',()=>({Platform:{select:()=> 'Menlo'},View:'div',ScrollView:'scroll',useWindowDimensions:()=>win}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',PressableScale:'button',C:{soft:'#eee'}}));
vi.mock('../src/learn/Coach',()=>({CoachSpot:({children,...props}:{children:React.ReactNode})=><div data-coach {...props}>{children}</div>}));
let tree: ReactTestRenderer | undefined;
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.unstubAllGlobals();});
const text=(node: {children: readonly unknown[]}):string=>node.children.map(c=>typeof c==='string'?c:c&&typeof c==='object'&&'children'in c?text(c as {children: readonly unknown[]}):'').join('');
it('touch selects a line/value, Undo sends an engine action, and saturated Help stays disabled through edits',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);const d=schoolPrograms[4][9], send=vi.fn();let state=initialAttempt(d);
  await act(async()=>{tree=create(<ProgramPanel d={d} state={state} send={send} active width={335}/>);});
  const buttons=()=>tree!.root.findAllByType('button');
  const choice=buttons().find(b=>b.props.label?.includes('choose'))!;await act(async()=>choice.props.onPress());expect(send).toHaveBeenCalledWith(['e',0,0]);
  state=step(state,['e',0,0],d)!;state=step(state,['h',3],d)!;
  await act(async()=>tree!.update(<ProgramPanel d={d} state={state} send={send} active width={335}/>));
  const undo=buttons().find(b=>text(b)==='Undo')!;expect(undo.props.disabled).toBe(false);await act(async()=>undo.props.onPress());expect(send).toHaveBeenCalledWith(['u']);
  for(const label of ['Look help','One step help','Clear help'])expect(buttons().find(b=>b.props.label===label)?.props.disabled).toBe(true);
});
for(const [width,height]of [[393,852],[852,393],[744,1133],[1133,744]])it(`AX5 ${width}×${height} keeps code and controls in the workspace; code scrolls vertically and all choices have full spoken labels`,async()=>{
  Object.assign(win,{width,height,fontScale:3.12});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const d=deepPrograms.at(-1)!;await act(async()=>{tree=create(<ProgramPanel d={d} state={initialAttempt(d)} send={vi.fn()} active width={width-60}/>);});
  const workspace=tree!.root.findByProps({testID:'lab-workspace'});expect(workspace.props.style.flexDirection).toBe(width>height?'row':'column');
  const scroll=tree!.root.findAllByType('scroll' as never).find(n=>n.props.accessibilityLabel==='Python program, scroll for all lines')!;expect(scroll.props.style.height).toBeGreaterThanOrEqual(132);expect(scroll.props.horizontal).toBeUndefined();
  expect(workspace.findAllByType('button').some(b=>text(b)==='Run code')).toBe(true);expect(workspace.findAllByType('button').some(b=>text(b)==='Undo')).toBe(true);
  expect(tree!.root.findAllByType('p').filter(p=>p.props.style?.fontFamily).every(p=>p.props.maxFontSizeMultiplier===1.3)).toBe(true);
});
it('a Predict answer is chosen before Check and a missed answer is crossed out after resume',async()=>{
  Object.assign(win,{width:393,height:852,fontScale:1});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);const d=schoolPrograms[0][0],send=vi.fn();let state=initialAttempt(d);
  await act(async()=>{tree=create(<ProgramPanel d={d} state={state} send={send} active width={335}/>);});
  expect(tree!.root.findAllByType('button').find(b=>text(b)==='Check prediction')?.props.disabled).toBe(true);
  const wrong=(d.answer+1)%4;state=step(state,['p',wrong],d)!;state=step(state,['c'],d)!;state=JSON.parse(JSON.stringify(state));
  await act(async()=>tree!.update(<ProgramPanel d={d} state={state} send={send} active width={335}/>));
  expect(tree!.root.findAllByType('button').find(b=>b.props.label?.startsWith(`Output ${'ABCD'[wrong]}`))?.props.label).toContain('crossed out');
});

it('keeps code continuations inside a separate numbered/indented statement column and names output line breaks', async () => {
  Object.assign(win,{width:393,height:852,fontScale:3.12});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const d=deepPrograms.at(-1)!;await act(async()=>{tree=create(<ProgramPanel d={d} state={initialAttempt(d)} send={vi.fn()} active width={335}/>);});
  const statements=tree!.root.findAllByProps({testID:'lab-code-statement'});expect(statements).toHaveLength(d.lines.length);
  expect(statements.every(s=>s.props.style.flex===1&&s.props.style.minWidth===0)).toBe(true);
  expect(statements.some(s=>s.props.style.paddingLeft>=24)).toBe(true);
  expect(tree!.root.findAllByType('button').some(b=>b.props.accessibilityLabel?.includes('inside'))).toBe(true);
  const p=schoolPrograms[4][0];await act(async()=>tree!.update(<ProgramPanel d={p} state={initialAttempt(p)} send={vi.fn()} active width={335}/>));
  const choice=tree!.root.findAllByType('button').find(b=>b.props.label?.includes('6, then 0'))!;expect(text(choice)).toContain('6 · then 0');
});

it('a finished Challenge can inspect its trace even when the host disables further game actions', async () => {
  Object.assign(win,{width:744,height:1133,fontScale:1});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  const d=schoolPrograms[4][0],send=vi.fn();let state=step(initialAttempt(d),['p',d.answer],d)!;state=step(state,['c'],d)!;
  await act(async()=>{tree=create(<ProgramPanel d={d} state={state} send={send} active={false} width={704}/>);});
  const last=tree!.root.findAllByType('button').find(b=>text(b)==='Last line')!;expect(last.props.disabled).toBe(false);
  await act(async()=>last.props.onPress());expect(send).not.toHaveBeenCalled();expect(tree!.root.findAllByType('p').some(p=>text(p)==='Trace · line 3')).toBe(true);
});

it('only shows a checked draft trace; Undo restores it with Run disabled and a clamped cursor',async()=>{
 Object.assign(win,{width:393,height:852,fontScale:1});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const d=deepPrograms.at(-1)!,send=vi.fn();let state=initialAttempt(d);
 for(let i=0;i<d.slots.length;i++)state=step(state,['e',i,d.slots[i].answer],d)!;
 // A wrong return retains the long loop trace without completing the puzzle.
 const slot=d.slots.findIndex(s=>s.before.trim()==='return');
 state=step(state,['e',slot,(d.slots[slot].answer+1)%3],d)!;state=step(state,['c'],d)!;
 const render=async()=>{await act(async()=>{const node=<ProgramPanel d={d} state={state} send={send} active width={335}/>;if(tree)tree.update(node);else tree=create(node);});};
 const button=(label:string)=>tree!.root.findAllByType('button').find(b=>text(b)===label)!;
 await render();await act(async()=>button('Last line').props.onPress());
 state=step(state,['e',1,(state.picks[1]+1)%3],d)!;await render();
 expect(tree!.root.findAllByType('p').some(p=>text(p).startsWith('Result:'))).toBe(false);
 state=step(state,['u'],d)!;await render();expect(button('Run code').props.disabled).toBe(true);
 expect(tree!.root.findAllByType('p').some(p=>text(p).includes('already run'))).toBe(true);
 // A different, shorter, checked trace must not leave Earlier line indexing the old trace length.
 state=step(state,['e',1,(state.picks[1]+1)%3],d)!;state=step(state,['c'],d)!;await render();
 if(!button('Earlier line').props.disabled)await act(async()=>button('Earlier line').props.onPress());
});

it('coaches a Build line and the whole Predict choice group without pointing at an answer',async()=>{
 Object.assign(win,{width:393,height:852,fontScale:1});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 for(const mode of ['build','predict']){
 const d=schoolPrograms[0].find(d=>d.mode===mode)!;
 await act(async()=>{const node=<ProgramPanel d={d} state={initialAttempt(d)} send={vi.fn()} active coaching width={335}/>;if(tree)tree.update(node);else tree=create(node);});
 const spots=tree!.root.findAllByType('div').filter(n=>n.props['data-coach']);expect(spots).toHaveLength(1);expect(spots[0].props.active).toBe(true);expect(spots[0].props.handAt).toBe(mode==='predict'?'none':undefined);
 if(mode==='predict')expect(spots[0].findAllByType('button')).toHaveLength(4);
 }
});

vi.mock('../src/learn/games/code-lab/LegacyBoard',()=>({Board:()=>null,Art:()=>null}));
vi.mock('../src/learn/stepReveal',()=>({useStepReveal:()=>undefined}));
it('records each School level in its own skill and dismisses the first-move coach on an accepted check',async()=>{
 const {Board}=await import('../src/learn/games/code-lab/view');const {engine}=await import('../src/learn/games/code-lab/engine');
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const skills=['think.code-sequence','think.code-variables','think.code-functions','think.code-debug','think.code-variables'];
 for(let level=1;level<=5;level++){
 const options={mode:'solo',pace:'easy'};const s=engine.create(options as never,{rng:()=>0,skills:{},starter:0,today:0}) as import('../src/learn/games/code-lab/engine').ModernState;
 s.level=level;s.programs=[0,1,2,3];const d=schoolPrograms[level-1][0];s.attempt=step(initialAttempt(d),['p',d.answer],d)!;
 const practice=vi.fn(),done=vi.fn(),update=vi.fn();const props={session:{id:'skill-check',state:s},update,active:true,width:335,sound:vi.fn(),cheer:vi.fn(),practice,coach:{active:true,done}};
 await act(async()=>{const node=<Board {...props as unknown as Parameters<typeof Board>[0]}/>;if(tree)tree.update(node);else tree=create(node);});
 expect(tree!.root.findByType(ProgramPanel).props.coaching).toBe(true);
 await act(async()=>tree!.root.findByType(ProgramPanel).props.send(['c']));expect(practice).toHaveBeenCalledWith(skills[level-1],true);expect(done).toHaveBeenCalledOnce();expect(update).toHaveBeenCalledOnce();
 }
});

it('keeps the Predict scroll container mounted when the first choice dismisses coaching',async()=>{
 Object.assign(win,{width:393,height:852,fontScale:3.12});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const d=schoolPrograms[4][0],send=vi.fn();let state=initialAttempt(d);
 await act(async()=>{tree=create(<ProgramPanel d={d} state={state} send={send} active coaching width={335}/>);});
 const before=tree!.root.findByProps({accessibilityLabel:'Four possible outputs'});
 state=step(state,['p',d.answer],d)!;
 await act(async()=>tree!.update(<ProgramPanel d={d} state={state} send={send} active coaching={false} width={335}/>));
 expect(tree!.root.findByProps({accessibilityLabel:'Four possible outputs'})).toBe(before);
});

it('shows the return goal and actual return when printed output alone matches',async()=>{
 Object.assign(win,{width:393,height:852,fontScale:3.12});vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 const d=deepPrograms.find(d=>d.id==='deep-3-7')!;let state=initialAttempt(d);
 for(const [i,pick]of [0,0,0,2].entries())state=step(state,['e',i,pick],d)!;
 state=step(state,['c'],d)!;expect(state.won).toBe(false);
 await act(async()=>{tree=create(<ProgramPanel d={d} state={state} send={vi.fn()} active width={335}/>);});
 const copy=tree!.root.findAllByType('p').map(text).join('\n');
 expect(copy).toContain('Goal: 3');expect(copy).toContain('Last return goal: 2');
 expect(copy).toContain('Result: 3');expect(copy).toContain('Last return: 0');
});
