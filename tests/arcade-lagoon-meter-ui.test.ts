import {beforeEach,expect,it,vi} from 'vitest';
import {createRun} from '../src/arcade/games/lagoon-run/engine';
import {runLevels} from '../src/arcade/games/scrolling/content';
import {useRunMeter} from '../src/arcade/games/lagoon-run/useRunMeter';
import type {SharedValue} from 'react-native-reanimated';
const runtime=vi.hoisted(()=>({effects:[] as (()=>unknown)[],callback:null as null|((info:{timeSincePreviousFrame:number})=>void),batches:[] as number[],files:[] as string[],measurement:true}));
vi.mock('react',()=>({useCallback:(fn:unknown)=>fn,useEffect:(fn:()=>unknown)=>runtime.effects.push(fn),useRef:(current:unknown)=>({current}),useState:(value:unknown)=>[value,()=>{}]}));
vi.mock('react-native',()=>({Platform:{OS:'ios',Version:'26.5'}}));
vi.mock('expo-constants',()=>({default:{get expoConfig(){return {extra:{lagoonMeasurement:runtime.measurement}};}}}));
vi.mock('expo-file-system',()=>({Paths:{document:'/test'},File:class{write(s:string){runtime.files.push(s);}}}));
const box=<T,>(value:T)=>({value,set(next:T){this.value=next;},modify(fn:(old:T)=>T){this.value=fn(this.value);}}) as SharedValue<T>;
vi.mock('react-native-reanimated',()=>({useSharedValue:(value:unknown)=>({value,set(next:unknown){this.value=next;},modify(fn:(old:unknown)=>unknown){this.value=fn(this.value);}}),useFrameCallback:(fn:typeof runtime.callback)=>{runtime.callback=fn;return {setActive:()=>{}};},runOnUI:(fn:()=>void)=>fn,runOnJS:(fn:(...args:unknown[])=>unknown)=>(...args:unknown[])=>{runtime.batches.push((args[0] as {samples:unknown[]}).samples.length);return fn(...args);}}));
beforeEach(()=>{runtime.effects=[];runtime.callback=null;runtime.batches=[];runtime.files=[];runtime.measurement=true;});
it('streams bounded batches and exports one complete 60-second receipt, keeping history off the UI boundary',()=>{
 const state=box(createRun(runLevels[7],771));
 useRunMeter(true,true,state,box(.5),box<string[]>([]),true,771);
 for(const effect of runtime.effects)effect();
 for(let i=0;i<3603;i++)runtime.callback!({timeSincePreviousFrame:1000/60});
 expect(Math.max(...runtime.batches)).toBeLessThanOrEqual(61);
 expect(runtime.files).toHaveLength(1);const saved=JSON.parse(runtime.files[0]);
 expect(saved.seed).toBe(771);expect(saved.level).toBe('w1-8');expect(saved.frames).toBeGreaterThanOrEqual(3600);expect(saved.summary.fps).toBeCloseTo(60,3);expect(saved.samples).toHaveLength(saved.frames);
});

it('exports accumulated history when leaving exactly after an empty UI batch',()=>{
 const state=box(createRun(runLevels[7],771));
 useRunMeter(true,true,state,box(.5),box<string[]>([]),false,771);
 const cleanups=runtime.effects.map(effect=>effect()).filter((fn):fn is ()=>void=>typeof fn==='function');
 for(let i=0;i<62;i++)runtime.callback!({timeSincePreviousFrame:1000/60});
 expect(runtime.batches).toEqual([61]);expect(runtime.files).toHaveLength(0);
 for(const cleanup of cleanups)cleanup();
 expect(runtime.files).toHaveLength(1);expect(JSON.parse(runtime.files[0]).frames).toBe(61);
});

it('assigns an event to the following gap caused by its work, not the gap ending before it',()=>{
 const state=box(createRun(runLevels[7],771)),tags=box<string[]>([]);
 useRunMeter(true,true,state,box(.5),tags,false,771);
 const cleanups=runtime.effects.map(effect=>effect()).filter((f):f is ()=>void=>typeof f==='function');
 runtime.callback!({timeSincePreviousFrame:16});
 tags.set(['pickup']);runtime.callback!({timeSincePreviousFrame:16});
 runtime.callback!({timeSincePreviousFrame:50});runtime.callback!({timeSincePreviousFrame:16});runtime.callback!({timeSincePreviousFrame:16});
 for(const cleanup of cleanups)cleanup();
 const saved=JSON.parse(runtime.files[0]);expect(saved.events.pickup).toEqual([50]);
});

it('never writes into a family sandbox even when budget debug is requested',()=>{
 runtime.measurement=false;
 const state=box(createRun(runLevels[7],771));
 useRunMeter(true,true,state,box(.5),box<string[]>([]),true,771);
 const cleanups=runtime.effects.map(effect=>effect()).filter((f):f is ()=>void=>typeof f==='function');
 for(let i=0;i<3605;i++)runtime.callback!({timeSincePreviousFrame:1000/60});
 for(const cleanup of cleanups)cleanup();expect(runtime.files).toHaveLength(0);
});
