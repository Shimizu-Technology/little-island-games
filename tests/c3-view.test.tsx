import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ProgramPanel } from '../src/learn/games/code-lab/ProgramPanel';
import { initialAttempt, step } from '../src/learn/games/code-lab/attempt';
import { schoolPrograms, deepPrograms } from '../src/learn/games/code-lab/content';
const win = vi.hoisted(()=>({width:393,height:852,fontScale:1}));
vi.mock('react-native',()=>({Platform:{select:()=> 'Menlo'},View:'div',ScrollView:'scroll',useWindowDimensions:()=>win}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',PressableScale:'button',C:{soft:'#eee'}}));
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
