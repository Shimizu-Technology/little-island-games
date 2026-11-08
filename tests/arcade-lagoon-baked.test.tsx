import React from 'react';
import {act,create} from 'react-test-renderer';
import {useAnimatedReaction} from 'react-native-reanimated';
import {createRequire} from 'node:module';
import {expect,it,vi} from 'vitest';
import type {SharedValue} from 'react-native-reanimated';
import type {SpritePose} from '../src/arcade/poses';
import {BakedDeck} from '../src/arcade/games/lagoon-run/Baked';
import {RAMP_SECTIONS} from '../src/arcade/games/lagoon-run/surface';
vi.mock('react-native',()=>({Image:'Image'}));
vi.mock('react-native-reanimated',()=>({default:{View:'AnimatedView'},useAnimatedReaction:vi.fn(),useSharedValue:vi.fn(),useAnimatedStyle:vi.fn()}));
it('mounts both side skirts and a shadow for every rendered incline section',()=>{
 const component=(BakedDeck as unknown as {type:(props:unknown)=>React.ReactNode}).type;
 const extensions=createRequire(import.meta.url).extensions,old=extensions['.png'];
 extensions['.png']=module=>{module.exports=1;};
 let node:React.ReactNode;
 try {node=component({poses:{} as SharedValue<SpritePose[]>,index:179,surface:'ramp',incline:true});}finally{if(old)extensions['.png']=old;else delete extensions['.png'];}
 const sides:Record<string,number[]>={left:[],right:[],shadow:[]};
 function walk(node:React.ReactNode){React.Children.forEach(node,n=>{if(!React.isValidElement(n))return;const props=n.props as {side?:string;segment:number;children?:React.ReactNode};if(props.side)sides[props.side].push(179+props.segment*4);walk(props.children);});}
 walk(node);
 for(const side of ['left','right','shadow'])expect(sides[side]).toEqual(Array.from({length:RAMP_SECTIONS},(_,i)=>Array.from({length:side==='shadow'?1:2},()=>179+i*4)).flat());
});

it('takes one shared pose snapshot for all deck faces instead of repeating it per face',async()=>{
 const extensions=createRequire(import.meta.url).extensions,old=extensions['.png'];extensions['.png']=module=>{module.exports=1;};
 (globalThis as Record<string,unknown>).IS_REACT_ACT_ENVIRONMENT=true;vi.mocked(useAnimatedReaction).mockClear();
 let tree:ReturnType<typeof create>|undefined;
 try{await act(async()=>{tree=create(<BakedDeck poses={{} as SharedValue<SpritePose[]>} index={179} surface="ramp" incline/>);});expect(useAnimatedReaction).toHaveBeenCalledTimes(1);}
 finally{if(tree)await act(async()=>tree!.unmount());if(old)extensions['.png']=old;else delete extensions['.png'];}
});
