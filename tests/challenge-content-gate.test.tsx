import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { expect, it, vi } from 'vitest';
import { SessionGate } from '../src/challenge/SessionGate';
vi.mock('react-native',()=>({View:'div'}));
vi.mock('../src/components/ui',()=>({Button:'button',Copy:'p'}));
it('F4-1/F4-9: Continue withholds the board, keeps a kind local retry, then reopens the same slot',async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);let resolve!:(x:{ok:true})=>void;
 const open=vi.fn().mockResolvedValueOnce({ok:false,kind:'content-unavailable',message:'Your saved work is kept. Try again.'}).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const render=vi.fn(()=> <span>Exact saved board</span>),expected={owner:'a',game:'puzzle',epoch:1,id:'saved',revision:2};let root!:ReactTestRenderer;
 try{
  await act(async()=>{root=create(<SessionGate open={open} expected={expected} render={render}/>);});
  expect(render).not.toHaveBeenCalled();expect(JSON.stringify(root.toJSON())).toContain('Your saved work is kept.');
  expect(root.root.findByProps({testID:'paused-content'}).props.accessibilityLiveRegion).toBe('polite');
  await act(async()=>root.root.findByType('button').props.onPress());expect(render).not.toHaveBeenCalled();
  await act(async()=>resolve({ok:true}));expect(JSON.stringify(root.toJSON())).toContain('Exact saved board');expect(open.mock.calls).toEqual([[expected],[expected]]);
 }finally{if(root)await act(async()=>root.unmount());vi.unstubAllGlobals();}
});
