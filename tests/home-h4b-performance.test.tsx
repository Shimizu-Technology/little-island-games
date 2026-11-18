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
vi.mock('react-native',()=>({View:'view'}));
vi.mock('react-native-svg',()=>Object.fromEntries(['G','Circle','Ellipse','Rect','Path','Defs','ClipPath','Text','LinearGradient','Stop','Pattern'].map(k=>[k,k.toLowerCase()]).concat([['default','svg']])));
vi.mock('react-native-reanimated',()=>({default:{View:'animated-view',createAnimatedComponent:()=> 'animated-g'},Easing:{linear:(t:number)=>t},ReduceMotion:{Never:'never'},withTiming:(v:number)=>v,cancelAnimation:()=>{},runOnJS:(fn:any)=>fn,
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
it('retains the mounted body when a meal starts and finishes',async()=>{
 let mounts=0,unmounts=0;
 function Body(){React.useEffect(()=>{mounts++;return()=>{unmounts++;};},[]);return React.createElement('body');}
 const renderer=()=> <Body/>;
 const scene=buildScene(labFixtures['rig-meal']()),entity=scene.entities['character/0'];
 let tree!:ReturnType<typeof create>;
 await act(async()=>{tree=create(<EntityArt entity={entity} reduced={false} renderCharacter={renderer}/>);});
 const meal={key:1,action:'eat' as const,food:instance('snack','mango',0,0)};
 await act(async()=>tree.update(<EntityArt entity={entity} meal={meal} reduced={false} renderCharacter={renderer}/>));
 expect({mounts,unmounts}).toEqual({mounts:1,unmounts:0});
 await act(async()=>tree.update(<EntityArt entity={entity} reduced={false} renderCharacter={renderer}/>));
 expect({mounts,unmounts}).toEqual({mounts:1,unmounts:0});
 await act(async()=>tree.unmount());
 expect(unmounts).toBe(1);
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
