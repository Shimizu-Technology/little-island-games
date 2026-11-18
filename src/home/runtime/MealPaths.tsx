import React from 'react';
import Animated, {useAnimatedProps, type SharedValue} from 'react-native-reanimated';
import {G,Path} from 'react-native-svg';
import type {MealPlayback} from '../../islander/rig/character';

type ShapeProps={children?:React.ReactNode;d?:string;[key:string]:unknown};
const AnimatedPath=Animated.createAnimatedComponent(Path);
function ChangingPath({nodes,current,index}:{nodes:readonly React.ReactElement<ShapeProps>[];current:SharedValue<number>;index:(value:number)=>number}) {
  const signature=JSON.stringify(nodes.map(n=>n.props.d));
  const paths=React.useMemo(()=>JSON.parse(signature) as string[],[signature]);
  const props=useAnimatedProps(()=>({d:paths[index(current.value)]}));
  return <AnimatedPath {...nodes[0].props} animatedProps={props}/>;
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
  if(changed.length || (first.type!==G && first.type!==React.Fragment && first.type!==Path))return fallback();
  const children=elements.map(n=>React.Children.toArray(n.props.children));
  if(children.some(c=>c.length!==children[0].length))return fallback();
  return React.cloneElement(first,undefined,children[0].map((_,i)=><React.Fragment key={i}>{mealPaths(children.map(c=>c[i]),current,index,layer)}</React.Fragment>));
}
