import { floatyFrame } from "../floaty";
import { activityFaceOf } from "./expressions";
import { rigSlot } from "../family";
import { storageCapacity, storageOpen } from '../storage';
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
import Svg, { G, Path, Ellipse } from 'react-native-svg';
import { type HomeMood } from "./delight";
import { HandProp } from '../art/PropShape';
import { species } from '../scene/species';
import type { HoldableId } from '../art/living';
import { ItemArt } from "../art/Items";
import { MoreItemArt } from "../art/More";
import { moreCatalog } from "../catalogMore";
import { itemSize, characterSize } from "../geometry";
import { capabilityOf } from "../world";
import { renderAnchors } from "./rigGeometry";
import type { CharacterAction, SceneEntity } from "../scene/types";

export type CharacterRender = CharacterRenderer;
// Prewarm one small meal rig at scene load. It is hidden at rest and never clocks.
const chefSpoon = <G><Path d="M12 23L22 10" stroke="#99673E" strokeWidth={2.5} strokeLinecap="round"/><Ellipse cx={23} cy={6} rx={3.5} ry={5} fill="#D8B180" stroke="#99673E" strokeWidth={1.5}/></G>;
const preparedMeal: Meal = {key:0,action:'eat',offered:true,food:instance('prepared-food','mango',0,0)};
const preparedDrink: Meal = {key:0,action:'drink',offered:true,food:instance('prepared-drink','coconut-drink',0,0)};
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
    occupied: entity.children.some(id => id.startsWith('character/')),
    size: itemSize(item),
    rotation: item.rotation,
    mirrored: item.mirrored,
    tint: item.tint,
    layer,
    reduced,
    active: storageCapacity(item.item) ? storageOpen(item) : item.powered ?? item.state === "active",
    state: { on: storageCapacity(item.item) ? storageOpen(item) : item.powered ?? item.state === "active", empty: item.empty },
  };
  return moreCatalog[item.item] ? <MoreItemArt id={item.item} {...props} /> : <ItemArt item={item.item} {...props} />;
});

/** The art origin and hit geometry both use CORE's semantic contact. */
export function artFrame(entity: SceneEntity, carry = false) {
  if (entity.item && entity.attachment.kind === 'hand' && (entity.item.item === 'swim-ring' || capabilityOf(entity.item.item).edible === 'drink')) return entity.bounds;
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
  mealStandby,
  mealVisible = true,
  onMealPresented,
  onMealFinished,
  gaze,
}: {
  entity: SceneEntity;
  meal?: Meal;
  mealStandby?: Meal;
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
  faceOverride?: HomeMood;
}) {
  const frame = entity.character ? renderAnchors(carry && carryGrip && entity.character.slot === 1 ? {...entity,children:[]} : entity, carry, tilt, limbLag).bounds : artFrame(entity, carry);
  if (entity.item && entity.attachment.kind === 'hand' && capabilityOf(entity.item.item).edible === 'drink') {
    const slot = Number(entity.attachment.character.split('/').at(-1)) as 0 | 1 | 2;
    const unit = heldDrinkScale(species[slot].unit,slot);
    return <Svg width={frame.width} height={frame.height} style={{ overflow: 'visible' }} accessible={false}>
      <G transform={`translate(${-frame.left} ${-frame.top}) scale(${unit}) translate(-12 -12)`}>
        <HandProp longStraw={false} id={entity.item.item as HoldableId} tint={entity.item.tint} state={{ empty: entity.item.empty }}/>
      </G>
    </Svg>;
  }
  if (entity.item?.item === "swim-ring" && entity.attachment.kind === "hand") return null;
  if (entity.item) {
    const basket = entity.item.item === 'carry-basket';
    const peekWidth = frame.width * (basket ? .175 : .13);
    const pictureWidth = frame.width * (basket ? .34 : .13);
    return (
      <View style={{ width: frame.width, height: frame.height }}>
        <DecorArt
          entity={entity}
          layer={
            front ? "front" : capabilityOf(entity.item.item).sockets?.length ? "back" : "all"
          }
          reduced={reduced}
        />
        {!front && storageCapacity(entity.item.item) > 0 && entity.item.item !== 'fridge' && (storageOpen(entity.item) || basket) && !!entity.contents?.length && (
          <View testID="storage-peek" pointerEvents="none" accessible={false} style={{ position: 'absolute', left: frame.width * (basket ? .15 : .26), top: frame.height * (basket ? .25 : .43), width: frame.width * (basket ? .7 : .52), height: frame.height * .24, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' }}>
            {entity.contents.slice(0, 4).map(item => {
              const size = itemSize(item), width = peekWidth, scale = pictureWidth / size;
              return <View key={item.id} style={{ width, height: frame.height * .24 }}>
                <View style={{ position: 'absolute', left: (width - pictureWidth) / 2, top: 0, width: size, height: size, transform: [{ scale }], transformOrigin: 'left top' }}>
                  <DecorArt entity={{ ...entity, item, contents: undefined, children: [] }} reduced={reduced}/>
                </View>
              </View>;
            })}
          </View>
        )}
      </View>
    );
  }
  const character = entity.character!,
    base = carry ? "carry" : entity.base;
  const size = characterSize(character.slot);
  const ringFrame = entity.floaty ? floatyFrame(character.slot, base, entity.facing) : undefined;
  const ring = (layer: "back" | "front") => ringFrame && <View testID={`worn-floaty-${layer}-${character.slot}`} style={{ position: "absolute", left: ringFrame.left - frame.left, top: ringFrame.top - frame.top, width: ringFrame.width, height: ringFrame.height }}><View style={{ width: ringFrame.width, height: ringFrame.width, transformOrigin: "left top", transform: [{ scaleY: ringFrame.height / ringFrame.width }] }}><MoreItemArt id="swim-ring" size={ringFrame.width} layer={layer} occupied reduced={reduced} mirrored={entity.facing === "left"}/></View></View>;
  const chef = !carry && character.socket?.socketId.replace(/^pet-/, "") === "chef";
  faceOverride = activityFaceOf(entity, false, faceOverride, carry, !!meal);
  const input = {
    gaze: carry ? { x: 0, y: -1 } : gaze,
    slot: rigSlot(character.slot),
    familySlot: character.slot,
    base,
    ...(chef && !entity.children.length ? { held: chefSpoon } : {}),
    action: entity.floaty ? null : carry ? (carryGrip ? null : entity.children.length ? ("hold" as const) : null) : (actionOverride ?? (chef && !entity.action ? "hold" as const : entity.action)),
    face: preview ? ("anticipate" as const) : (faceOverride === 'proud' || faceOverride === 'cheer' || faceOverride === 'yum' ? null : faceOverride ?? (chef ? "happy" as const : null)),
    ...(faceOverride === 'proud' || faceOverride === 'yum' || faceOverride === 'cheer' ? { mood: faceOverride === 'cheer' ? 'happy' as const : faceOverride } : {}),
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
      {ring("back")}
      {!carry && !blink && !preview && (prepareMeal || meal) ? <>
        <View pointerEvents="none" style={{position:'absolute',left:0,top:0,right:0,bottom:0,opacity:meal && mealVisible?0:1}}>
          <Animated.View style={idleStyle}>
            <IdleDrawing input={input} mealActive={!!meal} renderCharacter={renderCharacter}/>
          </Animated.View>
        </View>
        <View testID="prepared-meal" pointerEvents="none" collapsable={false} style={{position:'absolute',left:0,top:0,right:0,bottom:0,opacity:meal && mealVisible?1:0}}>
          {/* Keep both bodies prepared: pickup changes two small food variants,
              never a whole eating/sipping SVG bank under the finger. */}
          {(['eat','drink'] as const).map(action => {
            const active = meal?.action === action;
            const recipe = active ? meal : mealStandby?.action === action ? mealStandby : action === 'eat' ? preparedMeal : preparedDrink;
            return <View key={action} testID={`prepared-meal-${action}`} pointerEvents="none"
              style={{position:'absolute',left:0,top:0,right:0,bottom:0,opacity:active ? 1 : 0}}>
              <MealArt input={input} visible={active && mealVisible} meal={recipe} reduced={reduced} renderCharacter={renderCharacter}
                onPresented={active ? onMealPresented : undefined} onFinished={active ? onMealFinished : undefined}/>
            </View>;
          })}
        </View>
      </> : <CharacterDrawing input={input} renderCharacter={renderCharacter}/> }
      {ring("front")}
    </View>
  );
}, (a, b) => a.onMealFinished === b.onMealFinished && a.onMealPresented === b.onMealPresented && a.meal === b.meal && a.mealStandby === b.mealStandby && a.mealVisible === b.mealVisible && a.idleStyle === b.idleStyle && a.gaze?.x === b.gaze?.x && a.gaze?.y === b.gaze?.y && a.carry === b.carry && a.front === b.front && a.reduced === b.reduced &&
  a.renderCharacter === b.renderCharacter && a.preview === b.preview && a.actionOverride === b.actionOverride &&
  a.faceOverride === b.faceOverride && a.blink === b.blink && a.prepareMeal === b.prepareMeal && a.carryGrip === b.carryGrip && a.tilt === b.tilt && a.limbLag === b.limbLag &&
  a.entity.attachment.kind === b.entity.attachment.kind && a.entity.floaty === b.entity.floaty && a.entity.base === b.entity.base && a.entity.facing === b.entity.facing && (a.carry && b.carry || a.entity.action === b.entity.action) &&
  a.entity.character?.socket?.socketId === b.entity.character?.socket?.socketId &&
  a.entity.character?.slot === b.entity.character?.slot && (a.entity.children.length === b.entity.children.length || !!a.carry && !!b.carry && !!a.carryGrip && a.carryGrip === b.carryGrip) &&
  JSON.stringify(a.entity.contents) === JSON.stringify(b.entity.contents) && JSON.stringify(a.entity.item) === JSON.stringify(b.entity.item));


const IdleDrawing=memo(function IdleDrawing({input,renderCharacter}:{input:Parameters<typeof CharacterDrawing>[0]['input'];mealActive:boolean;renderCharacter?:CharacterRender}) {
  return <CharacterDrawing input={input} renderCharacter={renderCharacter}/>;
},(_previous,next)=>next.mealActive);
