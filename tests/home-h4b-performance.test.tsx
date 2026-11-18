import React from 'react';
import {act,create} from 'react-test-renderer';
import {it,expect,vi} from 'vitest';
import {HomeCharacter} from '../src/home/characterRenderer';
import {mealFrame,mealTimes} from '../src/home/runtime/meal';
import {MealArt} from '../src/home/runtime/MealArt';
import {EntityArt} from '../src/home/runtime/EntityArt';
import {buildScene} from '../src/home/scene/graph';
import {labFixtures} from '../src/home/runtime/lab';
import {instance} from '../src/home/model';
const clock=vi.hoisted(()=>({shared:undefined as any,animations:0,deferJS:false,js:[]as any[],reactions:[] as any[],frames:[] as any[]}));
vi.mock('react-native-gesture-handler',()=>({Gesture:{Manual:()=>({})}}));
vi.mock('react-native',()=>({View:'view',Platform:{OS:'ios'}}));
vi.mock('react-native-svg',()=>Object.fromEntries(['G','Circle','Ellipse','Rect','Path','Defs','ClipPath','Text','LinearGradient','Stop','Pattern'].map(k=>[k,k.toLowerCase()]).concat([['default','svg']])));
vi.mock('react-native-reanimated',()=>({default:{View:'animated-view',createAnimatedComponent:()=> 'animated-g'},Easing:{linear:(t:number)=>t},ReduceMotion:{Never:'never'},withTiming:(v:number)=>{clock.animations++;return v;},useAnimatedReaction:(prepare:any,react:any)=>{
  const latest=React.useRef({prepare,react});React.useLayoutEffect(()=>{latest.current={prepare,react};});
  const entry=React.useRef({tick:()=>latest.current.react(latest.current.prepare(),null)}).current;
  React.useEffect(()=>{clock.reactions.push(entry);return()=>{clock.reactions=clock.reactions.filter(e=>e!==entry);};},[entry]);
 },useFrameCallback:(fn:any)=>{
  const latest=React.useRef(fn);React.useLayoutEffect(()=>{latest.current=fn;});
  const entry=React.useRef({isActive:false,setActive(v:boolean){this.isActive=v;},tick:(ms=16.67)=>latest.current({timeSincePreviousFrame:ms})}).current;
  React.useEffect(()=>{clock.frames.push(entry);return()=>{clock.frames=clock.frames.filter(e=>e!==entry);};},[entry]);return entry;
 },cancelAnimation:()=>{},runOnJS:(fn:any)=>(...args:any[])=>{if(clock.deferJS)clock.js.push(()=>fn(...args));else return fn(...args);},runOnUI:(fn:any)=>fn,
 useSharedValue:(v:number)=>{const shared=React.useRef({value:v,set(n:number){this.value=n;},get(){return this.value;}}).current;clock.shared=shared;return shared;},
 useDerivedValue:(fn:any)=>{const latest=React.useRef(fn);latest.current=fn;return React.useRef({get value(){return latest.current();}}).current;},useAnimatedStyle:(fn:any)=>({evaluate:fn}),useAnimatedProps:(fn:any)=>({evaluate:fn})}));
vi.mock('../src/home/art/Items',()=>({ItemArt:()=>null}));
vi.mock('../src/home/art/More',()=>({MoreItemArt:()=>null}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
it('mounts only two food variants, rather than one whole food tree per pose',async()=>{
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<MealArt input={{slot:0,base:'stand',action:null,face:null,facing:'right',size:224}} meal={{key:9,action:'eat',food:instance('snack','mango',0,0)}} reduced={false}/>);});
 expect(tree.root.findAllByProps({'data-rig':'islander'})).toHaveLength(1);
 expect(tree.root.findAllByProps({'data-meal-food':'mango'})).toHaveLength(2);
 expect(tree.root.findAllByProps({'data-limb':'right-arm'}).length).toBeLessThanOrEqual(1);
 expect(tree.root.findAll(n=>typeof n.type==='string' && !!n.props['data-mouth']).length).toBeLessThanOrEqual(3);
 await act(async()=>tree.unmount());
});
it('retains the idle and prewarmed meal bodies when a meal starts and finishes',async()=>{
 let mounts=0,unmounts=0;
 function Body(){React.useEffect(()=>{mounts++;return()=>{unmounts++;};},[]);return React.createElement('body');}
 const renderer=()=> <Body/>;
 const scene=buildScene(labFixtures['rig-meal']()),entity=scene.entities['character/0'];
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<EntityArt prepareMeal entity={entity} reduced={false} renderCharacter={renderer}/>);});
 const meal={key:1,action:'eat' as const,food:instance('snack','mango',0,0)};
 await act(async()=>tree.update(<EntityArt prepareMeal entity={entity} meal={meal} reduced={false} renderCharacter={renderer}/>));
 expect({mounts,unmounts}).toEqual({mounts:2,unmounts:0});
 await act(async()=>tree.update(<EntityArt prepareMeal entity={entity} reduced={false} renderCharacter={renderer}/>));
 expect({mounts,unmounts}).toEqual({mounts:2,unmounts:0});
 await act(async()=>tree.unmount());
 expect(unmounts).toBe(2);
});

it('changes a single arm or fin path to each authored pose without replacing it',async()=>{
 for(const slot of [0,1] as const)for(const facing of ['left','right'] as const){
  const input={slot,base:'stand' as const,action:'eat' as const,face:null,facing,size:224};
  const meal={key:8,action:'eat' as const,food:instance('snack','mango',0,0)};
  let live!:ReturnType<typeof create>,reference!:ReturnType<typeof create>;
  await act(async()=>{live=create(<MealArt input={input} meal={meal} reduced={false}/>);});
  const progress=clock.shared;
  const marker=slot===0?{'data-limb':'right-arm'}:{'data-joint':'fin'};
  const changing=live.root.findAllByProps(marker).find(n=>n.props.animatedProps);
  expect(changing).toBeDefined();
  for(const time of mealTimes){
   progress.value=8000+time;
   await act(async()=>{reference=create(<HomeCharacter input={{...input,meal:mealFrame(time)}}/>);});
   const path=reference.root.findAllByProps(marker).find(n=>typeof n.type==='string');
   expect(changing!.props.animatedProps.evaluate().d).toBe(path!.props.d);
   await act(async()=>reference.unmount());
  }
  await act(async()=>live.unmount());
 }
});

it('keeps hidden landing drawings mounted across a meal and gives them no meal caches',async()=>{
 const {SettleArt}=await import('../src/home/runtime/SettleArt');
 const scene=buildScene(labFixtures['rig-meal']()),source=scene.entities['character/0'];
 let mounts=0;
 function Body(){React.useEffect(()=>{mounts++;},[]);return React.createElement('body');}
 const render=()=> <Body/>;
 const interaction={slots:{value:[{},{}]},clock:{value:0},poseLayouts:{value:{}}} as any;
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<SettleArt source={source} destination={source} interaction={interaction} index={0} reduced={false} bases={['stand']} renderCharacter={render}/>);});
 expect(tree.root.findAllByType(MealArt)).toHaveLength(0);
 const initial=mounts;
 await act(async()=>tree.update(<SettleArt source={{...source,action:'eat'}} destination={{...source,action:'eat'}} interaction={interaction} index={0} reduced={false} bases={['stand']} renderCharacter={render}/>));
 expect(mounts).toBe(initial);
 await act(async()=>tree.unmount());
});

it('leaves offered food at the contact while the empty hand approaches it',async()=>{
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<MealArt input={{slot:0,base:'stand',action:null,face:null,facing:'right',size:224}} meal={{key:8,action:'eat',offered:true,food:instance('a','mango',0,0)}} reduced={false}/>);});
 const progress=clock.shared,food=tree.root.findByProps({testID:'meal-held-food'});
 const at=(ms:number)=>{progress.value=8000+ms;return food.props.style[1].evaluate().transform.slice(0,2);};
 expect(at(0)).toEqual(at(180));expect(at(90)).toEqual(at(180));expect(at(540)).not.toEqual(at(180));
 await act(async()=>tree.unmount());
});

it('does not repaint prewarmed carry and landing rigs for a resting friends transient meal',async()=>{
 const {DragOverlay}=await import('../src/home/runtime/DragOverlay');
 const {buildingLayout}=await import('../src/home/camera');
 const scene=buildScene(labFixtures['rig-meal']()),hero=scene.entities['character/0'];
 const interaction={slots:{value:[{},{}]},camera:{value:{a:1}},clock:{value:0},poseLayouts:{value:{}}}as any;
 const render=vi.fn(()=>React.createElement('body')),building=buildingLayout(4);
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<DragOverlay scene={scene} pickups={[]} interaction={interaction} building={building} reduced={false} renderCharacter={render}/>);});
 const before=render.mock.calls.length;
 const next={...scene,revision:'eating',entities:{...scene.entities,[hero.id]:{...hero,action:'eat' as const}}};
 await act(async()=>tree.update(<DragOverlay scene={next} pickups={[]} interaction={interaction} building={building} reduced={false} renderCharacter={render}/>));
 expect(render.mock.calls.length).toBe(before);
 await act(async()=>tree.unmount());
});

it('receiving a cup switches prebuilt carry grips without repainting whole characters',async()=>{
 const {CarriedCharacter}=await import('../src/home/runtime/CarriedCharacter');
 const scene=buildScene(labFixtures['rig-meal']()),hero=scene.entities['character/0'];
 const interaction={slots:{value:[{},{}]},clock:{value:0}}as any;
 const inputs:any[]=[];const render=vi.fn((input:any)=>{inputs.push(input);return React.createElement('body');});
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<CarriedCharacter entity={hero} interaction={interaction} index={0} reduced={false} renderCharacter={render}/>);});
 const before=render.mock.calls.length;
 await act(async()=>tree.update(<CarriedCharacter entity={{...hero,children:['home/item/cup']}} interaction={interaction} index={0} reduced={false} renderCharacter={render}/>));
 expect(render.mock.calls.length).toBe(before);
 await act(async()=>tree.unmount());
});

it('prebuilt loose and holding arms keep the authored hand geometry at every carry lean',async()=>{
 const {G}=await import('react-native-svg');
 const hero=buildScene(labFixtures['rig-meal']()).entities['character/0'];
 const grip={renderLayer:(holding:boolean,children:React.ReactNode)=><G data-carry-state={String(holding)}>{children}</G>};
 for(const facing of ['front','left']as const)for(const lean of [-1,0,1]){
  let tree!:ReturnType<typeof create>;
  await act(async()=>{tree=create(<EntityArt entity={{...hero,facing}} carry carryGrip={grip} reduced={false} tilt={lean*6} limbLag={Math.abs(lean)}/>);});
  for(const held of [false,true]){
   let reference!:ReturnType<typeof create>;
   await act(async()=>{reference=create(<HomeCharacter input={{slot:0,base:'carry',facing:facing==='left'?'left':'right',size:224,face:null,action:held?'hold':null,tilt:lean*6,limbLag:Math.abs(lean),gaze:{x:0,y:-1}}}/>);});
   for(const marker of [{'data-limb':'right-arm'},{'data-mitten':'right'}]){
    const variants=tree.root.findAllByProps(marker).filter(n=>typeof n.type==='string');
    const selected=variants.find(n=>{let p=n.parent;while(p){if(p.props['data-carry-state']!==undefined)return p.props['data-carry-state']===String(held);p=p.parent;}return false;});
    const wanted=reference.root.findAllByProps(marker).find(n=>typeof n.type==='string');
    expect(selected?.props.d).toBe(wanted?.props.d);expect(selected).toBeDefined();
   }
   await act(async()=>reference.unmount());
  }
  await act(async()=>tree.unmount());
 }
});


it('does not repaint hidden human landing bodies when the first cup is attached',async()=>{
 const {SettleArt}=await import('../src/home/runtime/SettleArt');
 const hero=buildScene(labFixtures['rig-meal']()).entities['character/0'];
 const interaction={slots:{value:[{},{}]},clock:{value:0},poseLayouts:{value:{}}}as any;
 const render=vi.fn((_input:any)=>React.createElement('body'));let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<SettleArt source={hero} interaction={interaction} index={0} reduced={false} bases={['stand']} renderCharacter={render}/>);});
 const before=render.mock.calls.length;
 const held={...hero,action:'hold' as const,children:['cup']};
 await act(async()=>tree.update(<SettleArt source={held} interaction={interaction} index={0} reduced={false} bases={['stand']} renderCharacter={render}/>));
 expect(render.mock.calls.length).toBe(before);
 await act(async()=>tree.unmount());
});

it('keeps the hidden idle human drawing unchanged during an offered drink',async()=>{
 const hero=buildScene(labFixtures['rig-meal']()).entities['character/0'];
 const render=vi.fn((_input:any)=>React.createElement('body'));let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<EntityArt prepareMeal entity={hero} reduced={false} renderCharacter={render}/>);});
 render.mockClear();
 const meal={key:12,action:'drink' as const,food:instance('cup','coconut-drink',0,0)};
 await act(async()=>tree.update(<EntityArt prepareMeal entity={{...hero,action:'drink',children:['cup']}} meal={meal} reduced={false} renderCharacter={render}/>));
 expect(render.mock.calls).toHaveLength(1);
 expect(render.mock.calls[0]?.[0]?.mealPlayback).toBeDefined();
 await act(async()=>tree.unmount());
});


it('prebuilt resting grips match the authored hold arm in each base and facing',async()=>{
 const {CharacterDrawing}=await import('../src/home/runtime/CharacterDrawing');
 for(const base of ['stand','sit','lie','bathe']as const)for(const facing of ['left','right']as const){
  const input={slot:0 as const,base,facing,size:224,face:null,action:null};
  let draw:any;const render=(value:any)=>{draw=value;return React.createElement('body');};
  let tree!:ReturnType<typeof create>;
  await act(async()=>{tree=create(<CharacterDrawing input={input} renderCharacter={render}/>);});
  for(const held of [false,true]){
   await act(async()=>tree.update(<CharacterDrawing input={{...input,action:held?'hold':null}} renderCharacter={render}/>));
   expect(draw.carryGrip.renderLayer(held,null).props.holding.value).toBe(held);
   let actual!:ReturnType<typeof create>,expected!:ReturnType<typeof create>;
   await act(async()=>{actual=create(<HomeCharacter input={draw}/>);expected=create(<HomeCharacter input={{...input,action:held?'hold':null}}/>);});
   for(const marker of [{'data-limb':'right-arm'},{'data-mitten':'right'}]){
    const selected=actual.root.findAllByProps(marker).filter(n=>typeof n.type==='string').find(n=>{
     let p=n.parent;while(p){if(p.props.selected!==undefined)return p.props.selected===held;p=p.parent;}return false;
    });
    const target=expected.root.findAllByProps(marker).find(n=>typeof n.type==='string');
    expect(selected).toBeDefined();expect(selected?.props.d).toBe(target?.props.d);
   }
   await act(async()=>{actual.unmount();expected.unmount();});
  }
  await act(async()=>tree.unmount());
 }
});


it('prepares food behind the resting drawing until the native handoff is ready',async()=>{
 const hero=buildScene(labFixtures['rig-meal']()).entities['character/0'];
 const meal={key:13,action:'eat' as const,food:instance('snack','mango',0,0)};
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<EntityArt prepareMeal entity={hero} meal={meal} mealVisible={false} reduced={false}/>);});
 expect(tree.root.findByProps({testID:'prepared-meal'}).props.style.opacity).toBe(0);
 await act(async()=>tree.update(<EntityArt prepareMeal entity={hero} meal={meal} mealVisible reduced={false}/>));
 expect(tree.root.findByProps({testID:'prepared-meal'}).props.style.opacity).toBe(1);
 await act(async()=>tree.unmount());
});


it('waits for visibility before playing a prepared meal, without repainting its body',async()=>{
 const frames:Array<()=>void>=[];vi.stubGlobal('requestAnimationFrame',(fn:()=>void)=>{frames.push(fn);return frames.length;});
 const input={slot:0 as const,base:'stand' as const,action:null,face:null,facing:'right' as const,size:224};
 const meal={key:100,action:'eat' as const,food:instance('snack','mango',0,0)},presented=vi.fn(),render=vi.fn(()=>React.createElement('body'));
 let tree!:ReturnType<typeof create>;clock.animations=0;
 await act(async()=>{tree=create(<MealArt input={input} meal={meal} visible={false} reduced={false} onPresented={presented} renderCharacter={render}/>);});
 await act(async()=>{tree.root.findByProps({testID:'meal-stage'}).props.onLayout();frames.shift()!();frames.shift()!();});
 expect(presented).toHaveBeenCalledOnce();expect(clock.animations).toBe(0);
 await act(async()=>tree.update(<MealArt input={{...input}} meal={meal} visible reduced={false} onPresented={presented} renderCharacter={render}/>));
 expect(clock.animations).toBe(1);expect(render).toHaveBeenCalledOnce();
 await act(async()=>tree.unmount());vi.stubGlobal('requestAnimationFrame',()=>1);
});


it('warms at most one hidden carry SVG per native frame, and prioritizes a visible held pose',async()=>{
 const {CarriedCharacter}=await import('../src/home/runtime/CarriedCharacter');
 const hero=buildScene(labFixtures['rig-meal']()).entities['character/0'];
 const slots={value:[{id:'',lag:0},{}]},interaction={slots,clock:{value:0}}as any;
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<CarriedCharacter entity={hero} interaction={interaction} index={0} reduced={false}/>);});
 const groups=()=>tree.root.findAll(n=>String(n.type)==='animated-g'&&String(n.props.testID).startsWith('carry-grip-'));
 const paint=()=>groups().map(n=>n.props.animatedProps.evaluate().opacity);
 let previous=paint();expect(previous).toHaveLength(60);
 await act(async()=>tree.update(<CarriedCharacter entity={{...hero,children:['cup']}} interaction={interaction} index={0} reduced={false}/>));
 const flush=()=>clock.reactions.forEach(e=>e.tick());flush();
 const changed=(next:number[])=>{const n=next.filter((p,i)=>p!==previous[i]).length;previous=next;return n;};
 expect(changed(paint())).toBeLessThanOrEqual(4);
 // The far-left carry frame has not warmed yet, but must be ready on its first visible tick.
 slots.value[0]={id:hero.id,lag:-10};flush();
 const first=groups().slice(0,4).map(n=>n.props.animatedProps.evaluate().opacity);
 expect(first).toEqual([0,1,0,1]);
 slots.value[0]={id:'',lag:0};flush();previous=paint();
 clock.deferJS=true;
 for(let i=0;i<16;i++){
  clock.frames.filter(e=>e.isActive).forEach(e=>e.tick(i===2?300:16.67));flush();
  expect(changed(paint())).toBeLessThanOrEqual(4);
 }
 expect(paint().filter((_,i)=>i%4===1||i%4===3).every(v=>v===1)).toBe(true);
 // A newer grip request must survive an older stop callback delayed on JS.
 await act(async()=>tree.update(<CarriedCharacter entity={hero} interaction={interaction} index={0} reduced={false}/>));flush();
 clock.js.splice(0).forEach(fn=>fn());clock.deferJS=false;
 expect(clock.frames.some(e=>e.isActive)).toBe(true);previous=paint();
 for(let i=0;i<16;i++){clock.frames.filter(e=>e.isActive).forEach(e=>e.tick());flush();expect(changed(paint())).toBeLessThanOrEqual(4);}
 expect(paint().filter((_,i)=>i%4===0||i%4===2).every(v=>v===1)).toBe(true);
 expect(clock.frames.every(e=>!e.isActive)).toBe(true);
 await act(async()=>tree.unmount());
});
