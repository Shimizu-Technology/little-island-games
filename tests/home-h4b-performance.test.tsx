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
const clock=vi.hoisted(()=>({shared:undefined as any}));
vi.mock('react-native-gesture-handler',()=>({Gesture:{Manual:()=>({})}}));
vi.mock('react-native',()=>({View:'view',Platform:{OS:'ios'}}));
vi.mock('react-native-svg',()=>Object.fromEntries(['G','Circle','Ellipse','Rect','Path','Defs','ClipPath','Text','LinearGradient','Stop','Pattern'].map(k=>[k,k.toLowerCase()]).concat([['default','svg']])));
vi.mock('react-native-reanimated',()=>({default:{View:'animated-view',createAnimatedComponent:()=> 'animated-g'},Easing:{linear:(t:number)=>t},ReduceMotion:{Never:'never'},withTiming:(v:number)=>v,useAnimatedReaction:()=>{},cancelAnimation:()=>{},runOnJS:(fn:any)=>fn,
 useSharedValue:(v:number)=>{const shared=React.useRef({value:v,set(n:number){this.value=n;}}).current;clock.shared=shared;return shared;},
 useDerivedValue:(fn:any)=>({get value(){return fn();}}),useAnimatedStyle:(fn:any)=>({evaluate:fn}),useAnimatedProps:(fn:any)=>({evaluate:fn})}));
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
 expect(inputs[0].carryGrip.renderLayer(true,null).props.holding.value).toBe(true);
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
   await act(async()=>{reference=create(<EntityArt entity={{...hero,facing,children:held?['cup']:[]}} carry reduced={false} tilt={lean*6} limbLag={Math.abs(lean)}/>);});
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
