vi.mock('../src/components/Icon', () => ({ Icon: 'Icon' }));
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BoardPrimary, BoardSpaceContent, BoardSpaceProvider, useBoardGeometry } from '../src/learn/BoardSpace';
import { StepReveal } from '../src/learn/stepReveal';
vi.mock('react-native', () => ({ View: 'view', ScrollView: 'scroll' }));
const Host = 'view' as unknown as React.ComponentType<Record<string, unknown>>;
let tree: ReactTestRenderer | undefined;
const frames = new Map<number, FrameRequestCallback>(); let next = 0;
let bottom = 0;
const nodeMock = () => ({ measureLayout: (_: unknown, done: (x:number,y:number,w:number,h:number)=>void) => done(0,0,333,bottom) });
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++next, cb); return next; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(async () => { if (tree) await act(async () => tree!.unmount()); tree = undefined; frames.clear(); vi.unstubAllGlobals(); });
function Drawing({ blocks = false }: { blocks?: boolean }) {
  const g = useBoardGeometry('crab-commands', 280, 150, !blocks);
  const editor = useBoardGeometry('program-editor', 340, 140, blocks);
  return <BoardPrimary><Host data-height={blocks ? editor.height : g.height} onLayout={blocks ? editor.onLayout : g.onLayout}><Host data-card="kept" /></Host></BoardPrimary>;
}
const space = { width: 333, height: 500, large: false };
async function flush() { await act(async () => { const queue = [...frames.values()]; frames.clear(); for (const f of queue) f(0); }); }
async function layout(content: number, drawing: number, reverse = false) {
  bottom=content;
  const hosts = tree!.root.findAllByType('view' as never);
  const region = hosts.find(n => n.props['data-height'] !== undefined)!;
  const whole = hosts.find(n => n.props.testID === 'content')!;
  const events = [() => whole.props.onLayout({ nativeEvent: { layout: { height: content } } }), () => region.props.onLayout({ nativeEvent: { layout: { height: drawing } } })];
  await act(async () => { for (const event of reverse ? events.reverse() : events) event(); });
  await flush();
}
it('measures filled plans, converges after resizing, and grows back when the plan clears', async () => {
  await act(async () => { tree = create(<BoardSpaceProvider space={space}><BoardSpaceContent testID="content"><Drawing /></BoardSpaceContent></BoardSpaceProvider>, {createNodeMock:nodeMock}); });
  await layout(568, 280);
  const height = () => tree!.root.findAllByType('view' as never).find(n => n.props['data-height'] !== undefined)!.props['data-height'];
  expect(height()).toBe(212);
  await layout(500, 212, true); expect(height()).toBe(212);
  await layout(430, 212); expect(height()).toBe(280);
});
it('collects first layout before the frame has measured its width; no second layout event is needed', async () => {
  const render = (ready: boolean) => <BoardSpaceProvider space={ready ? space : null}><BoardSpaceContent testID="content"><Drawing /></BoardSpaceContent></BoardSpaceProvider>;
  await act(async () => { tree = create(render(false), {createNodeMock:nodeMock}); }); await layout(568, 280);
  await act(async () => tree!.update(render(true))); await flush();
  expect(tree!.root.findAllByType('view' as never).find(n => n.props['data-height'] !== undefined)!.props['data-height']).toBe(212);
});
it('hands the flexible allocation from beach to block editor and cancels scheduled work at unmount', async () => {
  const render = (blocks: boolean) => <BoardSpaceProvider space={space}><BoardSpaceContent testID="content"><Drawing blocks={blocks} /></BoardSpaceContent></BoardSpaceProvider>;
  await act(async () => { tree = create(render(false), {createNodeMock:nodeMock}); }); await layout(568, 280);
  await act(async () => tree!.update(render(true))); await layout(600, 340);
  expect(tree!.root.findAllByType('view' as never).find(n => n.props['data-height'] !== undefined)!.props['data-height']).toBe(240);
  await act(async () => tree!.unmount()); tree = undefined; expect(frames.size).toBe(0);
});
it('has no new plan scrolling or dimension changes outside LearnFrame', async () => {
  await act(async () => { tree = create(<Drawing />); });
  expect(tree!.root.findAllByType('scroll' as never)).toHaveLength(0);
  expect(tree!.root.findAllByType('view' as never).find(n => n.props['data-height'] !== undefined)!.props['data-height']).toBe(280);
});
it('re-arms AX entry on rotation, without pulling the page after each edit', async () => {
  const reveal = vi.fn();
  const render = (width: number) => <StepReveal.Provider value={reveal}><BoardSpaceProvider space={{ ...space, width, large: true }}><BoardSpaceContent testID="content"><Drawing /></BoardSpaceContent></BoardSpaceProvider></StepReveal.Provider>;
  await act(async () => { tree = create(render(333), {createNodeMock:nodeMock}); }); await flush(); expect(reveal).toHaveBeenCalledTimes(1);
  await layout(568, 280); expect(reveal).toHaveBeenCalledTimes(1);
  await act(async () => tree!.update(render(700))); await flush(); expect(reveal).toHaveBeenCalledTimes(2);
});

it('waits for transient header chrome to settle before its single entry reveal',async()=>{
 const reveal=vi.fn();
 const render=(anchorReady:boolean)=><StepReveal.Provider value={reveal}><BoardSpaceProvider space={{...space,large:true,anchorReady}}><BoardSpaceContent><Drawing/></BoardSpaceContent></BoardSpaceProvider></StepReveal.Provider>;
 await act(async()=>{tree=create(render(false), {createNodeMock:nodeMock});});await flush();expect(reveal).not.toHaveBeenCalled();
 await act(async()=>tree!.update(render(true)));await flush();expect(reveal).toHaveBeenCalledTimes(1);
 await act(async()=>tree!.update(render(false)));await flush();
 await act(async()=>tree!.update(render(true)));await flush();expect(reveal).toHaveBeenCalledTimes(1);
});
it('secondary content below the measured primary boundary cannot shrink a board that already fits',async()=>{
 await act(async()=>{tree=create(<BoardSpaceProvider space={space}><BoardSpaceContent testID="content"><Drawing/></BoardSpaceContent></BoardSpaceProvider>,{createNodeMock:nodeMock});});
 bottom=450;
 await act(async()=>{
  const views=tree!.root.findAllByType('view' as never);
  views.find(n=>n.props.testID==='content')!.props.onLayout({nativeEvent:{layout:{height:900}}});
  views.find(n=>n.props['data-height']!==undefined)!.props.onLayout({nativeEvent:{layout:{height:280}}});
 });await flush();
 expect(tree!.root.findAllByType('view' as never).find(n=>n.props['data-height']!==undefined)!.props['data-height']).toBe(280);
});
it('keeps the last allocation through a drawing remount until the next fresh layout',async()=>{
 const render=(shown:boolean)=><BoardSpaceProvider space={space}><BoardSpaceContent testID="content">{shown&&<Drawing/>}</BoardSpaceContent></BoardSpaceProvider>;
 await act(async()=>{tree=create(render(true),{createNodeMock:nodeMock});});await layout(568,280);
 await act(async()=>tree!.update(render(false)));await flush();
 await act(async()=>tree!.update(render(true)));
 expect(tree!.root.findAllByType('view' as never).find(n=>n.props['data-height']!==undefined)!.props['data-height']).toBe(212);
 await flush();
 expect(tree!.root.findAllByType('view' as never).find(n=>n.props['data-height']!==undefined)!.props['data-height']).toBe(212);
});
