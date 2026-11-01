import React, { memo, type ReactNode } from "react";
import { View } from "react-native";
import { ReefFish } from "../../arcade/Art";
import { CrabCompanion } from "../CrabCompanion";
import { ItemArt } from "../art/Items";
import { MoreItemArt } from "../art/More";
import { moreCatalog } from "../catalogMore";
import { itemSize, characterSize } from "../geometry";
import { capabilityOf } from "../world";
import { anchorsFor } from "../scene/species";
import type { CharacterBase, CharacterAction, Face, Facing, SceneEntity } from "../scene/types";
import type { Character } from "../model";
import { Islander } from "../../islander";
import { homeCharacterPose } from "../characterPose";

export type CharacterRender = (input: {
  slot: Character["slot"];
  base: CharacterBase;
  action: CharacterAction;
  face: Face;
  facing: Facing;
  size: number;
  held?: ReactNode;
  tilt: number;
  limbLag: number;
  reduced: boolean;
}) => ReactNode;
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
  const anchors = anchorsFor(entity.character!.slot, carry ? "carry" : entity.base, entity.facing);
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
}: {
  entity: SceneEntity;
  carry?: boolean;
  front?: boolean;
  reduced: boolean;
  renderCharacter?: CharacterRender;
  preview?: boolean;
  actionOverride?: CharacterAction;
}) {
  const frame = artFrame(entity, carry);
  if (entity.item)
    return (
      <View style={{ width: frame.width, height: frame.height }}>
        <DecorArt
          entity={entity}
          layer={
            front ? "front" : entity.children.length && capabilityOf(entity.item.item).sockets?.length ? "back" : "all"
          }
          reduced={reduced}
        />
      </View>
    );
  const character = entity.character!,
    base = carry ? "carry" : entity.base;
  const size = characterSize(character.slot);
  const rendered = renderCharacter?.({
    slot: character.slot,
    base,
    action: actionOverride ?? entity.action,
    face: preview ? "anticipate" : "neutral",
    facing: entity.facing,
    size,
    tilt: 0,
    limbLag: 0,
    reduced,
  });
  return (
    <View
      pointerEvents="none"
      style={{ width: frame.width, height: frame.height, transform: [{ scaleX: entity.facing === "left" ? -1 : 1 }] }}
    >
      {rendered ??
        (character.slot === 0 ? (
          <Islander
            pose={homeCharacterPose(base === "carry" ? "stand" : base, actionOverride ?? entity.action ?? undefined)}
            size={size}
            reduced={reduced}
          />
        ) : character.slot === 1 ? (
          <ReefFish size={size} />
        ) : (
          <CrabCompanion
            pose={base === "lie" ? "lie" : base === "stand" || base === "carry" ? "stand" : "sit"}
            size={size}
            reduced={reduced}
            clacking={false}
          />
        ))}
    </View>
  );
});
