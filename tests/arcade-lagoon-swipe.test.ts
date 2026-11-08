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
 handlers.onBegin();handlers.onUpdate({translationX:-21,translationY:0});handlers.onUpdate({translationX:-22,translationY:-21});
 expect(box.value.queue.map(c=>c.action.type)).toEqual(['left','jump']);
 handlers.onFinalize();handlers.onBegin();handlers.onUpdate({translationX:19,translationY:0});expect(box.value.queue).toHaveLength(2);handlers.onUpdate({translationX:21,translationY:0});expect(box.value.queue.map(c=>c.action.type)).toEqual(['left','jump','right']);
});
