import {instance} from '../model';
import {heldDrinkScale} from '../art/heldDrink';
import {CharacterDrawing} from "./CharacterDrawing";
import { MealArt } from "./MealArt";
import type { Meal } from "./meal";
import type { Gaze, CarryGrip } from "../../islander/rig/character";
import { type CharacterRenderer } from "../characterRenderer";
import React, { memo } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { G } from 'react-native-svg';
import { HandProp } from '../art/PropShape';
import { species } from '../scene/species';
import type { HoldableId } from '../art/living';
import { ItemArt } from "../art/Items";
import { MoreItemArt } from "../art/More";
import { moreCatalog } from "../catalogMore";
import { itemSize, characterSize } from "../geometry";
import { capabilityOf } from "../world";
import { renderAnchors } from "./rigGeometry";
import type { CharacterAction, Face, SceneEntity } from "../scene/types";

export type CharacterRender = CharacterRenderer;
// Prewarm one small meal rig at scene load. It is hidden at rest and never clocks.
const preparedMeal: Meal = {key:0,action:'eat',offered:true,food:instance('prepared-food','mango',0,0)};
export const DecorArt = memo(function DecorArt({
  entity,
  layer = "all",
  reduced,
}: {
  entity: SceneEntity;
  layer?: "back" | "front" | "all";
  reduced: boolean;
}) {
  const item = entity.item!;
  const props = {
    size: itemSize(item),
    rotation: item.rotation,
    mirrored: item.mirrored,
    tint: item.tint,
    layer,
    reduced,
    active: item.powered ?? item.state === "active",
    state: { on: item.powered ?? item.state === "active", empty: item.empty },
  };
  return moreCatalog[item.item] ? <MoreItemArt id={item.item} {...props} /> : <ItemArt item={item.item} {...props} />;
});

/** The art origin and hit geometry both use CORE's semantic contact. */
export function artFrame(entity: SceneEntity, carry = false) {
  if (entity.item && entity.attachment.kind === 'hand' && capabilityOf(entity.item.item).edible === 'drink') return entity.bounds;
  if (entity.item) {
    const size = itemSize(entity.item);
    return { left: -size / 2, top: -size * 0.85, width: size, height: size };
  }
  const anchors = renderAnchors(entity, carry);
  return anchors.bounds;
}
export const EntityArt = memo(function EntityArt({
  entity,
  carry = false,
  front = false,
  reduced,
  renderCharacter,
  preview = false,
  actionOverride,
  faceOverride,
  tilt = 0,
  limbLag = 0,
  blink = false,
  prepareMeal = false,
  idleStyle,
  carryGrip,
  meal,
  mealVisible = true,
  onMealPresented,
  onMealFinished,
  gaze,
}: {
  entity: SceneEntity;
  meal?: Meal;
  mealVisible?:boolean;
  onMealPresented?: () => void;
  onMealFinished?: () => void;
  gaze?: Gaze;
  /** HM-11: the closed-eye copy a resting friend swaps to by opacity. */
  blink?: boolean;
  /** Only the visible resting drawing owns a prewarmed meal stage. */
  prepareMeal?: boolean;
  idleStyle?: React.ComponentProps<typeof Animated.View>["style"];
  carryGrip?:CarryGrip;
  tilt?: number;
  limbLag?: number;
  carry?: boolean;
  front?: boolean;
  reduced: boolean;
  renderCharacter?: CharacterRender;
  preview?: boolean;
  actionOverride?: CharacterAction;
  faceOverride?: Face;
}) {
  const frame = entity.character ? renderAnchors(entity, carry, tilt, limbLag).bounds : artFrame(entity, carry);
  if (entity.item && entity.attachment.kind === 'hand' && capabilityOf(entity.item.item).edible === 'drink') {
    const slot = Number(entity.attachment.character.split('/').at(-1)) as 0 | 1 | 2;
    const unit = heldDrinkScale(species[slot].unit,slot);
    return <Svg width={frame.width} height={frame.height} style={{ overflow: 'visible' }} accessible={false}>
      <G transform={`translate(${-frame.left} ${-frame.top}) scale(${unit}) translate(-12 -12)`}>
        <HandProp longStraw={slot === 1} id={entity.item.item as HoldableId} tint={entity.item.tint} state={{ empty: entity.item.empty }}/>
      </G>
    </Svg>;
  }
  if (entity.item)
    return (
      <View style={{ width: frame.width, height: frame.height }}>
        <DecorArt
          entity={entity}
          layer={
            front ? "front" : capabilityOf(entity.item.item).sockets?.length ? "back" : "all"
          }
          reduced={reduced}
        />
      </View>
    );
  const character = entity.character!,
    base = carry ? "carry" : entity.base;
  const size = characterSize(character.slot);
  const input = {
    gaze: carry ? { x: 0, y: -1 } : gaze,
    slot: character.slot,
    base,
    action: carry ? (carryGrip ? null : entity.children.length ? ("hold" as const) : null) : (actionOverride ?? entity.action),
    face: preview ? ("anticipate" as const) : (faceOverride ?? null),
    facing: entity.facing === "left" ? ("left" as const) : ("right" as const),
    size,
    tilt,
    limbLag,
    carryGrip,
    reduced,
    // Every rig accepts RigLife; the route's renderer spreads input into it.
    ...(blink ? { blink: true } : {}),
  };
  return (
    <View pointerEvents="none" style={{ width: frame.width, height: frame.height }}>
      {!carry && !blink && !preview && (prepareMeal || meal) ? <>
        <View pointerEvents="none" style={{position:'absolute',left:0,top:0,right:0,bottom:0,opacity:meal && mealVisible?0:1}}>
          <Animated.View style={idleStyle}>
            <IdleDrawing input={input} mealActive={!!meal} renderCharacter={renderCharacter}/>
          </Animated.View>
        </View>
        <View testID="prepared-meal" pointerEvents="none" collapsable={false} style={{position:'absolute',left:0,top:0,right:0,bottom:0,opacity:meal && mealVisible?1:0}}>
          <MealArt input={input} visible={!meal || mealVisible} meal={meal ?? preparedMeal} reduced={reduced} renderCharacter={renderCharacter} onPresented={meal ? onMealPresented : undefined} onFinished={meal ? onMealFinished : undefined}/>
        </View>
      </> : <CharacterDrawing input={input} renderCharacter={renderCharacter}/> }
    </View>
  );
}, (a, b) => a.onMealFinished === b.onMealFinished && a.onMealPresented === b.onMealPresented && a.meal === b.meal && a.mealVisible === b.mealVisible && a.idleStyle === b.idleStyle && a.gaze?.x === b.gaze?.x && a.gaze?.y === b.gaze?.y && a.carry === b.carry && a.front === b.front && a.reduced === b.reduced &&
  a.renderCharacter === b.renderCharacter && a.preview === b.preview && a.actionOverride === b.actionOverride &&
  a.faceOverride === b.faceOverride && a.blink === b.blink && a.prepareMeal === b.prepareMeal && a.carryGrip === b.carryGrip && a.tilt === b.tilt && a.limbLag === b.limbLag &&
  a.entity.base === b.entity.base && a.entity.facing === b.entity.facing && (a.carry && b.carry || a.entity.action === b.entity.action) &&
  a.entity.character?.slot === b.entity.character?.slot && (a.entity.children.length === b.entity.children.length || !!a.carry && !!b.carry && !!a.carryGrip && a.carryGrip === b.carryGrip) &&
  JSON.stringify(a.entity.item) === JSON.stringify(b.entity.item));


const IdleDrawing=memo(function IdleDrawing({input,renderCharacter}:{input:Parameters<typeof CharacterDrawing>[0]['input'];mealActive:boolean;renderCharacter?:CharacterRender}) {
  return <CharacterDrawing input={input} renderCharacter={renderCharacter}/>;
},(_previous,next)=>next.mealActive);
