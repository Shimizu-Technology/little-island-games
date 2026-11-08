import { expect, it, vi } from 'vitest';
import type { SharedValue } from 'react-native-reanimated';
import type { Commands } from '../src/arcade/mailbox';
import type { RunInput } from '../src/arcade/games/lagoon-run/engine';
import { runSwipe } from '../src/arcade/games/lagoon-run/swipe';
vi.mock('react-native-gesture-handler',()=>({Gesture:{Pan:()=>{const handlers:Record<string,unknown>={};const g=new Proxy({handlers},{get:(_,key)=>key==='handlers'?handlers:(arg:unknown)=>{handlers[String(key)]=arg;return g;}});return g;}}}));
const shared=<T,>(value:T)=>({value,set(next:T){this.value=next;}}) as SharedValue<T>;
it('chains left then jump on one touch, and cancellation resets the next touch origin',()=>{
 const box=shared<Commands<RunInput>>({helper:false,serial:0,queue:[]}),origin=shared({x:0,y:0});
 const handlers=(runSwipe(box,origin) as unknown as {handlers:Record<string,(e?:unknown)=>void>}).handlers;
 handlers.onBegin();handlers.onUpdate({translationX:-21,translationY:0});handlers.onUpdate({translationX:-22,translationY:-40});
 expect(box.value.queue.map(c=>c.action.type)).toEqual(['left','jump']);
 handlers.onFinalize();handlers.onBegin();handlers.onUpdate({translationX:19,translationY:0});expect(box.value.queue).toHaveLength(2);handlers.onUpdate({translationX:21,translationY:0});expect(box.value.queue.map(c=>c.action.type)).toEqual(['left','jump','right']);
});

it.each([45,60,120])('fires once for a realistic %s point swipe, including many small updates',distance=>{
 const box=shared<Commands<RunInput>>({helper:false,serial:0,queue:[]}),origin=shared({x:0,y:0});
 const h=(runSwipe(box,origin) as unknown as {handlers:Record<string,(e?:unknown)=>void>}).handlers;
 h.onBegin();for(let i=1;i<=24;i++)h.onUpdate({translationX:distance*i/24,translationY:0});
 expect(box.value.queue.map(c=>c.action.type)).toEqual(['right']);
 h.onFinalize();h.onBegin();h.onUpdate({translationX:distance,translationY:0});expect(box.value.queue.map(c=>c.action.type)).toEqual(['right','right']);
});
it('does not turn a drifting or arcing jump swipe into extra jumps or lane changes',()=>{
 for(const arc of [false,true]) {
  const box=shared<Commands<RunInput>>({helper:false,serial:0,queue:[]}),origin=shared({x:0,y:0});
  const h=(runSwipe(box,origin) as unknown as {handlers:Record<string,(e?:unknown)=>void>}).handlers;
  h.onBegin();for(let i=1;i<=12;i++)h.onUpdate({translationX:arc?0:i*2.5,translationY:-i*10});
  if(arc)for(let x=5;x<=25;x+=5)h.onUpdate({translationX:x,translationY:-120});
  expect(box.value.queue.map(c=>c.action.type)).toEqual(['jump']);
 }
});
