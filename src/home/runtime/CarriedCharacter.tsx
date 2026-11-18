import React from "react";
import Animated, { useAnimatedStyle, useAnimatedProps, useDerivedValue, useSharedValue, useAnimatedReaction, useFrameCallback, runOnJS, runOnUI, type SharedValue } from "react-native-reanimated";
import {G} from "react-native-svg";
import type {CarryGrip} from "../../islander/rig/character";
import type { Face, SceneEntity } from "../scene/types";
import { EntityArt, type CharacterRender } from "./EntityArt";
import { renderAnchors, carrySample } from "./rigGeometry";
import { carryDisplay } from "./handFeel";
import { faceSamples } from "./delight";
import type { Interaction } from "./useInteraction";
type GripBank={requested:SharedValue<boolean>;cursor:SharedValue<number>;active:SharedValue<boolean>;display:SharedValue<number>};
const AnimatedGroup=Animated.createAnimatedComponent(G);
function GripLayer({holding,selected,children}:{holding:SharedValue<boolean>;selected:boolean;children:React.ReactNode}){
  const props=useAnimatedProps(()=>({opacity:holding.value===selected?1:0}));
  return <AnimatedGroup testID={`carry-grip-${selected}`} animatedProps={props}>{children}</AnimatedGroup>;
}
function CarryFrame({
  entity,
  sample,
  face = 0,
  display,
  bank,
  order,
  reduced,
  renderCharacter,
}: {
  entity: SceneEntity;
  sample: number;
  /** HD-01: 0 the plain carry, 1 the glance, 2 the smile. */
  face?: 0 | 1 | 2;
  display: SharedValue<number>;
  bank?:GripBank;
  order:number;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  const options = carrySample(sample),
    frame = renderAnchors(entity, true, options.tilt, options.limbLag).bounds;
  const code = sample * 3 + face;
  const holding=useSharedValue(entity.children.length>0);
  // Only the next hidden canvas warms. A visible frame always gets its grip
  // immediately, including a pickup that interrupts the preparation.
  useAnimatedReaction(()=>bank?{requested:bank.requested.value,turn:bank.cursor.value,visible:bank.active.value && bank.display.value===code}
    :{requested:false,turn:-1,visible:false},next=>{
      if(next.turn===order || next.visible)holding.set(next.requested);
    },[bank,order,code,holding]);
  const carryGrip=React.useMemo<CarryGrip|undefined>(()=>bank?{renderLayer:(selected,children)=><GripLayer holding={holding} selected={selected}>{children}</GripLayer>}:undefined,[bank,holding]);
  const style = useAnimatedStyle(() => ({ opacity: display.value === code ? 1 : 0 }));
  const faceOverride: Face | undefined = face === 1 ? "surprised" : face === 2 ? "happy" : undefined;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: frame.left,
          top: frame.top,
          transformOrigin: [-frame.left, -frame.top, 0],
          transform: [{ rotate: `${-options.tilt}deg` }],
        },
        style,
      ]}
    >
      <EntityArt
        entity={entity}
        carry
        carryGrip={carryGrip}
        reduced={reduced}
        renderCharacter={renderCharacter}
        tilt={options.tilt}
        limbLag={options.limbLag}
        faceOverride={faceOverride}
      />
    </Animated.View>
  );
}
/** Authored rig frames switch entirely on the UI thread. Primary motion remains continuous.
 * HD-01: the glance and the smile are pre-mounted frames too, so a reaction never re-renders an SVG. */
export function CarriedCharacter(props: {
  entity: SceneEntity;
  index: number;
  interaction: Interaction;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  const { slots, clock } = props.interaction, { index, reduced } = props;
  const display = useDerivedValue(() => {
    const d = carryDisplay(slots.value[index], clock.value, reduced);
    return d.sample * 3 + d.face;
  });
  const held=props.entity.children.length>0,human=props.entity.character?.slot===0,id=props.entity.id;
  const requested=useSharedValue(held),cursor=useSharedValue(15),cycle=useSharedValue(0);
  const cycleRef=React.useRef(0);
  const active=useDerivedValue(()=>slots.value[index].id===id);
  const samples = reduced ? [0] : [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const faces: [number, 1 | 2][] = reduced ? [[0, 1], [0, 2]] : [[0, 1], ...faceSamples.map((s) => [s, 2] as [number, 2])];
  const count=samples.length+faces.length;
  const stopRef=React.useRef<(()=>void)|undefined>(undefined);
  const stopWarm=React.useCallback((key:number)=>{if(cycleRef.current===key)stopRef.current?.();},[]);
  const tick=React.useCallback(()=>{
    'worklet';
    if(cursor.value>=count)return;
    cursor.set(cursor.value+1);
    if(cursor.value>=count)runOnJS(stopWarm)(cycle.value);
  },[cursor,count,stopWarm,cycle]);
  const warming=useFrameCallback(tick,false);
  React.useLayoutEffect(()=>{stopRef.current=()=>warming.setActive(false);return()=>{stopRef.current=undefined;};},[warming]);
  React.useEffect(()=>{
    if(!human)return;
    const key=++cycleRef.current;
    runOnUI((next:boolean,key:number)=>{'worklet';cursor.set(0);requested.set(next);cycle.set(key);})(held,key);
    warming.setActive(true);
  },[held,human,requested,cursor,warming,count,cycle]);
  const bank=React.useMemo<GripBank|undefined>(()=>human?{requested,cursor,active,display}:undefined,[human,requested,cursor,active,display]);
  return (
    <>
      {samples.map((sample) => (
        <CarryFrame key={sample} sample={sample} bank={bank} order={reduced?0:Math.abs(sample)*2-(sample>0?1:0)} display={display} entity={props.entity} reduced={reduced} renderCharacter={props.renderCharacter} />
      ))}
      {faces.map(([sample, face],i) => (
        <CarryFrame key={`${sample}:${face}`} sample={sample} face={face} bank={bank} order={samples.length+i} display={display} entity={props.entity} reduced={reduced} renderCharacter={props.renderCharacter} />
      ))}
    </>
  );
}
