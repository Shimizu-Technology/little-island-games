import React from 'react';
import Animated, {useAnimatedProps, useDerivedValue, type SharedValue} from 'react-native-reanimated';
import {G,Path} from 'react-native-svg';
import type {MealPlayback} from '../../islander/rig/character';

type ShapeProps={children?:React.ReactNode;d?:string;[key:string]:unknown};
const AnimatedPath=Animated.createAnimatedComponent(Path);
const AnimatedGroup=Animated.createAnimatedComponent(G<{matrix?:number[]}>);
function ChangingPath({nodes,current,index}:{nodes:readonly React.ReactElement<ShapeProps>[];current:SharedValue<number>;index:(value:number)=>number}) {
  const signature=JSON.stringify(nodes.map(n=>n.props.d));
  const paths=React.useMemo(()=>JSON.parse(signature) as string[],[signature]);
  const path=useDerivedValue(()=>paths[index(current.value)]);
  const props=useAnimatedProps(()=>({d:path.value}));
  return <AnimatedPath {...nodes[0].props} animatedProps={props}/>;
}
/** Authored companion grips use translate followed by rotate. Keep unknown
 * transforms on the exact authored-layer fallback rather than guessing. */
export function gripMatrix(transform:unknown):number[]|undefined {
  if(typeof transform!=='string')return undefined;
  const match=/^translate\(([-+\d.eE]+) ([-+\d.eE]+)\) rotate\(([-+\d.eE]+)\)$/.exec(transform);
  if(!match)return undefined;
  const [x,y,angle]=match.slice(1).map(Number);
  if(![x,y,angle].every(Number.isFinite))return undefined;
  const theta=angle*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
  return [c,s,-s,c,x,y];
}
function ChangingGroup({nodes,current,index,matrices,children}:{nodes:readonly React.ReactElement<ShapeProps>[];current:SharedValue<number>;index:(value:number)=>number;matrices:number[][];children:React.ReactNode}) {
  const signature=JSON.stringify(matrices);
  const bank=React.useMemo(()=>JSON.parse(signature) as number[][],[signature]);
  const poseIds=React.useMemo(()=>bank.map(matrix=>bank.findIndex(other=>other.every((v,i)=>v===matrix[i]))),[bank]);
  const pose=useDerivedValue(()=>poseIds[index(current.value)]);
  const props=useAnimatedProps(()=>({matrix:bank[pose.value]}));
  return <AnimatedGroup {...nodes[0].props} animatedProps={props}>{children}</AnimatedGroup>;
}
/** Only path-data changes are morphed. Unsupported components/structures retain
 * the authored layer fallback (for example a child-chosen wrist accessory). */
export function mealPaths(nodes:readonly React.ReactNode[],current:SharedValue<number>,index:(value:number)=>number,layer:MealPlayback['renderLayer']):React.ReactNode {
  const first=nodes[0];
  if(nodes.every(n=>n===first))return first;
  const fallback=()=>nodes.map((node,i)=><React.Fragment key={i}>{layer(i,node)}</React.Fragment>);
  if(!React.isValidElement<ShapeProps>(first) || !nodes.every(n=>React.isValidElement(n) && n.type===first.type))return fallback();
  const elements=nodes as readonly React.ReactElement<ShapeProps>[];
  const keys=[...new Set(elements.flatMap(n=>Object.keys(n.props)))].filter(k=>k!=='children');
  const changed=keys.filter(k=>elements.some(n=>n.props[k]!==elements[0].props[k]));
  if(first.type===Path && changed.length===1 && changed[0]==='d' && elements.every(n=>typeof n.props.d==='string'))return <ChangingPath {...{nodes:elements,current,index}}/>;
  const matrices=first.type===G && changed.length===1 && changed[0]==='transform' ? elements.map(n=>gripMatrix(n.props.transform)) : undefined;
  const changingGroup=matrices?.every((matrix):matrix is number[]=>!!matrix);
  if(changed.length && !changingGroup || (first.type!==G && first.type!==React.Fragment && first.type!==Path))return fallback();
  const children=elements.map(n=>React.Children.toArray(n.props.children));
  if(children.some(c=>c.length!==children[0].length))return fallback();
  const nested=children[0].map((_,i)=><React.Fragment key={i}>{mealPaths(children.map(c=>c[i]),current,index,layer)}</React.Fragment>);
  return changingGroup ? <ChangingGroup nodes={elements} {...{current,index}} matrices={matrices! as number[][]}>{nested}</ChangingGroup> : React.cloneElement(first,undefined,nested);
}
