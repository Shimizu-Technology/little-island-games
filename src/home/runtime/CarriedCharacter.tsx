import React from "react";
import Animated, { useAnimatedStyle, useAnimatedProps, useDerivedValue, useSharedValue, type SharedValue } from "react-native-reanimated";
import {G} from "react-native-svg";
import type {CarryGrip} from "../../islander/rig/character";
import type { Face, SceneEntity } from "../scene/types";
import { EntityArt, type CharacterRender } from "./EntityArt";
import { renderAnchors, carrySample } from "./rigGeometry";
import { carryDisplay } from "./handFeel";
import { faceSamples } from "./delight";
import type { Interaction } from "./useInteraction";
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
  carryGrip,
  reduced,
  renderCharacter,
}: {
  entity: SceneEntity;
  sample: number;
  /** HD-01: 0 the plain carry, 1 the glance, 2 the smile. */
  face?: 0 | 1 | 2;
  display: SharedValue<number>;
  carryGrip?:CarryGrip;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  const options = carrySample(sample),
    frame = renderAnchors(entity, true, options.tilt, options.limbLag).bounds;
  const code = sample * 3 + face;
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
  const held=props.entity.children.length>0;
  const holding=useSharedValue(held);
  const human=props.entity.character?.slot===0;
  React.useLayoutEffect(()=>{if(human)holding.set(held);},[holding,held,human]);
  const carryGrip=React.useMemo<CarryGrip>(()=>({renderLayer:(selected,children)=><GripLayer holding={holding} selected={selected}>{children}</GripLayer>}),[holding]);
  const grip=human?carryGrip:undefined;
  const samples = reduced ? [0] : [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  // The glance is brief and drawn only at rest limbs; the smile follows the legs at five levels.
  const faces: [number, 1 | 2][] = reduced ? [[0, 1], [0, 2]] : [[0, 1], ...faceSamples.map((s) => [s, 2] as [number, 2])];
  return (
    <>
      {samples.map((sample) => (
        <CarryFrame key={sample} sample={sample} carryGrip={grip} display={display} entity={props.entity} reduced={reduced} renderCharacter={props.renderCharacter} />
      ))}
      {faces.map(([sample, face]) => (
        <CarryFrame key={`${sample}:${face}`} sample={sample} face={face} carryGrip={grip} display={display} entity={props.entity} reduced={reduced} renderCharacter={props.renderCharacter} />
      ))}
    </>
  );
}
