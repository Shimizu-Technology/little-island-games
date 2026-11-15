import React,{useState} from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,expect,it,vi} from 'vitest';
import {ProgramEditor} from '../src/learn/program/ProgramEditor';
import {PaletteDrag} from '../src/learn/program/PaletteDrag';
import {emptyProgram,type Program} from '../src/learn/program/model';
import {withCrabProgram} from '../src/learn/games/crab-commands/program';
import {engine,currentLevel} from '../src/learn/games/crab-commands/engine';
vi.mock('react-native',()=>({View:'div',ScrollView:'scroll',useWindowDimensions:()=>({fontScale:3.12}),PanResponder:{create:(handlers:object)=>({panHandlers:handlers})}}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p',PressableScale:'button',C:{ink:'#183F39',teal:'#246858',soft:'#E5EFE5',cream:'#FCFAF4',paper:'#FFF',line:'#DBE3DA'}}));
let tree:ReactTestRenderer|undefined;
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;vi.useRealTimers();vi.unstubAllGlobals();});
const text=(b:{props:Record<string,unknown>;children:unknown[]})=>b.props.accessibilityLabel??b.children.filter(c=>typeof c==='string'||typeof c==='number').join('');
async function press(name:string){await act(async()=>{const button=tree!.root.findAllByType('button').find(b=>text(b)===name)!;expect(button,name).toBeDefined();await button.props.onPress();});}
const right={kind:'command' as const,command:1};
async function mount(p:Program,onChange?:(p:Program)=>Promise<boolean>){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);const heard=vi.fn(),changed=vi.fn();
 function Harness(){const [program,set]=useState(p);return <ProgramEditor program={program} maxHeight={280} cards={[{code:1,name:'Right',icon:<span>→</span>}]} disabled={false} hear={heard} onChange={async next=>{changed(next);if(onChange)return onChange(next);set(next);return true;}}/>;}
 await act(async()=>{tree=create(<Harness/>);});return {heard,changed};
}
it('awaits rejected commits, preserves accepted tree and undo history, and gives no success feedback',async()=>{
 const {heard,changed}=await mount(emptyProgram(),async()=>false);
 await press('↻ Repeat ×2');expect(changed).toHaveBeenCalledOnce();expect(heard).not.toHaveBeenCalled();
 expect(tree!.root.findAllByType('p').map(p=>p.children.join('')).join(' ')).toContain('Your plan is kept.');
 const undo=tree!.root.findAllByType('button').find(b=>text(b)==='Undo block edit')!;expect(undo.props.disabled).toBe(true);
});
it('a selected existing card can move into a repeat without deleting and rebuilding it',async()=>{
 const p:Program={version:1,body:[right,{kind:'repeat',times:2,body:[]}],songs:[]};const {changed}=await mount(p);
 const select=tree!.root.findAllByType('button').find(b=>String(b.props.accessibilityLabel).includes(': Right. Tap to change.'))!;
 await act(async()=>select.props.onPress());
 const slot=tree!.root.findAllByType('button').find(b=>String(b.props.accessibilityLabel).includes('Inside repeat'))!;
 await act(async()=>{await slot.props.onPress();});
 expect(changed.mock.lastCall?.[0]).toEqual({version:1,body:[{kind:'repeat',times:2,body:[right]}],songs:[]});
});
it('repeat controls have spoken labels and the program has its own bounded scrolling area',async()=>{
 await mount({version:1,body:[{kind:'repeat',times:2,body:[right]}],songs:[]});
 const add=tree!.root.findAllByType('button').find(b=>text(b)==='↻ Repeat ×2')!;
 expect(add.props.label).toBe('Add Repeat 2 times');
 const root=tree!.root.findByProps({testID:'program-editor'});expect(root.props.style.maxHeight).toBe(280);
 const list=tree!.root.findByProps({accessibilityLabel:'Nested program cards'});expect(list.props.style.height).toBeLessThanOrEqual(140);
});
it('palette responds visibly on touch-down while retaining its drag responder',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
 await act(async()=>{tree=create(<PaletteDrag disabled={false} start={vi.fn()} move={vi.fn()} drop={vi.fn()} cancel={vi.fn()} tap={vi.fn()}><span>Repeat</span></PaletteDrag>);});
 await act(async()=>tree!.root.findByProps({testID:'program-palette-drag'}).props.onPanResponderGrant());
 expect(tree!.root.findByProps({testID:'program-palette-drag'}).props.style.opacity).toBeLessThan(1);
});
it('one block edit advances Together by one turn even when it expands into several cards',()=>{
 const options={mode:'together' as const,pace:'easy' as const};const s=engine.create(options,{skills:{},rng:()=>0,starter:0,today:1});
 const next=withCrabProgram(s,{version:1,body:[{kind:'repeat',times:4,body:[right]}],songs:[]},currentLevel(s))!;
 expect((next.cards-s.cards)%2).toBe(1);expect(engine.validate(next,options)).toBe(true);
});

async function dragHarness(){
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);const changed=vi.fn(()=>true),scrollTo=vi.fn();
 await act(async()=>{tree=create(<ProgramEditor program={emptyProgram()} cards={[{code:1,name:'Right',icon:<span>→</span>}]} disabled={false} hear={vi.fn()} onChange={changed}/>,{createNodeMock:({props:raw})=>{const props=raw as {testID?:string};return {measureInWindow:(cb:(x:number,y:number,w:number,h:number)=>void)=>props.testID==='program-plan-viewport'?cb(0,100,200,120):cb(0,500,200,44),scrollTo};}});});
 return {changed,scrollTo};
}
it('a drop over an offscreen End of plan never inserts into invisible content',async()=>{
 const {changed}=await dragHarness();
 const palette=tree!.root.findAllByProps({testID:'program-palette-drag'})[0];
 await act(async()=>{palette.props.onPanResponderGrant();palette.props.onPanResponderMove(null,{moveX:50,moveY:510});palette.props.onPanResponderRelease(null,{dx:20,dy:-100,moveX:50,moveY:510});});
 expect(changed).not.toHaveBeenCalled();
});
it('holding a drag near the visible plan edge auto-scrolls the list and stops on release',async()=>{
 vi.useFakeTimers();const {scrollTo}=await dragHarness();
 const list=tree!.root.findByProps({accessibilityLabel:'Nested program cards'});
 await act(async()=>{list.props.onContentSizeChange?.(200,400);});
 const palette=tree!.root.findAllByProps({testID:'program-palette-drag'})[0];
 await act(async()=>{palette.props.onPanResponderGrant();palette.props.onPanResponderMove(null,{moveX:50,moveY:215});});
 await act(async()=>{vi.advanceTimersByTime(65);});
 expect(scrollTo).toHaveBeenCalledWith({y:12,animated:false});
 await act(async()=>{palette.props.onPanResponderTerminate();});const count=scrollTo.mock.calls.length;
 await act(async()=>{vi.advanceTimersByTime(200);});expect(scrollTo.mock.calls).toHaveLength(count);
});
