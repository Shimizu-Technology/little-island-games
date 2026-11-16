import { MealArt } from "./MealArt";
import type { Meal } from "./meal";
import type { Gaze } from "../../islander/rig/character";
import { HomeCharacter, type CharacterRenderer } from "../characterRenderer";
import React, { memo } from "react";
import { View } from "react-native";
import { ItemArt } from "../art/Items";
import { MoreItemArt } from "../art/More";
import { moreCatalog } from "../catalogMore";
import { itemSize, characterSize } from "../geometry";
import { capabilityOf } from "../world";
import { renderAnchors } from "./rigGeometry";
import type { CharacterAction, Face, SceneEntity } from "../scene/types";

export type CharacterRender = CharacterRenderer;
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
  meal,
  gaze,
}: {
  entity: SceneEntity;
  meal?: Meal;
  gaze?: Gaze;
  /** HM-11: the closed-eye copy a resting friend swaps to by opacity. */
  blink?: boolean;
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
    action: carry ? (entity.children.length ? ("hold" as const) : null) : (actionOverride ?? entity.action),
    face: preview ? ("anticipate" as const) : (faceOverride ?? null),
    facing: entity.facing === "left" ? ("left" as const) : ("right" as const),
    size,
    tilt,
    limbLag,
    reduced,
    // Every rig accepts RigLife; the route's renderer spreads input into it.
    ...(blink ? { blink: true } : {}),
  };
  return (
    <View pointerEvents="none" style={{ width: frame.width, height: frame.height }}>
      {meal && !carry ? <MealArt key={meal.key} input={input} meal={meal} reduced={reduced} renderCharacter={renderCharacter}/> : renderCharacter?.(input) ?? <HomeCharacter input={input} />}
    </View>
  );
}, (a, b) => a.meal === b.meal && a.gaze?.x === b.gaze?.x && a.gaze?.y === b.gaze?.y && a.carry === b.carry && a.front === b.front && a.reduced === b.reduced &&
  a.renderCharacter === b.renderCharacter && a.preview === b.preview && a.actionOverride === b.actionOverride &&
  a.faceOverride === b.faceOverride && a.blink === b.blink && a.tilt === b.tilt && a.limbLag === b.limbLag &&
  a.entity.base === b.entity.base && a.entity.facing === b.entity.facing && a.entity.action === b.entity.action &&
  a.entity.character?.slot === b.entity.character?.slot && a.entity.children.length === b.entity.children.length &&
  JSON.stringify(a.entity.item) === JSON.stringify(b.entity.item));
