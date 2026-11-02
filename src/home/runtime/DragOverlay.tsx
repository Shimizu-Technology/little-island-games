import React, { useLayoutEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { roomIds } from "../catalogMore";
import { roomOrigin, type Building } from "../camera";
import { anchorsFor } from "../scene/species";
import type { Scene, SceneEntity } from "../scene/types";
import { groupIds } from "./group";
import { SettleArt } from "./SettleArt";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import type { Interaction, Pickup } from "./useInteraction";

function OverlayGroup({
  pickup,
  interaction,
  building,
  reduced,
  renderCharacter,
}: {
  pickup: Pickup;
  interaction: Interaction;
  building: Building;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  const { scene, id, slot: index } = pickup;
  const { slots, camera, clock } = interaction;
  const root = scene.entities[id],
    origin = roomOrigin(roomIds.indexOf(root.room), building);
  const ids = groupIds(scene, id);
  const destination =
    pickup.destination &&
    Object.values(pickup.destination.entities).find((e) =>
      root.character ? e.character?.slot === root.character.slot : e.item?.id === root.item?.id
    );
  const entities = ids.map((key) => scene.entities[key]).sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
  useLayoutEffect(() => interaction.ready(index, id), [interaction, index, id]);
  const style = useAnimatedStyle(() => {
    const slot = slots.value[index];
    const lift = reduced ? 0 : Math.min(1, Math.max(0, (clock.value - slot.liftedAt) / 90));
    const settling = (slot.phase === "settling" && slot.settleAt > 0) || (slot.phase === "pending" && slot.committed);
    const blend = settling
      ? Math.max(0, 1 - (slot.phase === "pending" ? slot.pausedElapsed : clock.value - slot.settleAt) / 140)
      : 1;
    const elapsed = settling ? (slot.phase === "pending" ? slot.pausedElapsed : clock.value - slot.settleAt) : 0;
    const accent =
      !reduced && settling && slot.proposal?.kind === "floor" && elapsed < 160
        ? Math.max(0, elapsed < 60 ? elapsed / 60 : (160 - elapsed) / 100)
        : 0;
    const propOffset = root.item && !root.children.length && root.bounds.height < 100 ? 18 / camera.value.a : 0;
    return {
      opacity: slot.id === id && slot.ready ? 1 : 0,
      transformOrigin: [slot.gripX, slot.gripY, 0],
      transform: [
        { translateX: slot.x - origin.x - root.contact.x },
        {
          translateY:
            slot.y -
            origin.y -
            root.contact.y -
            (reduced ? 0 : (Math.min(10 / camera.value.a, root.bounds.height * 0.04) + propOffset) * lift * blend),
        },
        { rotate: `${reduced ? 0 : slot.tilt}deg` },
        { scaleX: 1 + (reduced ? 0 : 0.04 * lift * blend) + 0.02 * accent },
        { scaleY: 1 + (reduced ? 0 : 0.04 * lift * blend) - 0.02 * accent },
      ],
    };
  });
  const shadow = useAnimatedStyle(() => {
    const slot = slots.value[index];
    const p = slot.proposal,
      dest = p ? roomOrigin(roomIds.indexOf(p.room), building) : origin;
    let groundX = p ? dest.x + p.contact.x : slot.x,
      groundY = p ? dest.y + p.contact.y : slot.y;
    if (p && p.attachment.kind === "socket") {
      const owner = scene.entities[p.attachment.item];
      if (owner) {
        groundX = dest.x + owner.contact.x;
        groundY = dest.y + owner.contact.y;
      }
    }
    const lift = reduced
      ? 0
      : slot.phase === "settling" && slot.settleAt
        ? Math.max(0, 1 - (clock.value - slot.settleAt) / 140)
        : Math.min(1, (clock.value - slot.liftedAt) / 90);
    return {
      opacity: slot.id === id && slot.ready ? 0.18 - 0.06 * lift : 0,
      transform: [{ translateX: groundX - 24 }, { translateY: groundY - 5 }, { scale: 1 - 0.15 * lift }],
    };
  });
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            width: 48,
            height: 10,
            borderRadius: 30,
            backgroundColor: "#284F4B",
          },
          shadow,
        ]}
      />
      <Animated.View
        testID={`drag-overlay-${index}`}
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: origin.x + root.contact.x,
            top: origin.y + root.contact.y,
            width: 1,
            height: 1,
          },
          style,
        ]}
      >
        {entities.map((entity) => {
          const frame = artFrame(entity, entity.id === root.id && !!root.character);
          let dx = entity.contact.x - root.contact.x,
            dy = entity.contact.y - root.contact.y;
          if (root.character && entity.attachment.kind === "hand") {
            const from = anchorsFor(root.character.slot, root.base, root.facing).hand;
            const to = anchorsFor(root.character.slot, "carry", root.facing).hand;
            dx += to.x - from.x;
            dy += to.y - from.y;
          }
          if (entity.id === root.id && root.character)
            return (
              <SettleArt
                key={entity.id}
                source={root}
                destination={destination}
                interaction={interaction}
                index={index}
                reduced={reduced}
                renderCharacter={renderCharacter}
              />
            );
          return (
            <View
              key={entity.id}
              style={{
                position: "absolute",
                left: dx + frame.left,
                top: dy + frame.top,
                width: frame.width,
                height: frame.height,
              }}
            >
              <EntityArt
                entity={entity}
                carry={entity.id === root.id && !!root.character}
                reduced={reduced}
                renderCharacter={renderCharacter}
              />
            </View>
          );
        })}
        {entities
          .filter(
            (entity) =>
              entity.item && entity.children.some((child) => scene.entities[child]?.attachment.kind === "socket")
          )
          .map((entity) => (
            <Front key={`front-${entity.id}`} entity={entity} root={root} reduced={reduced} />
          ))}
      </Animated.View>
    </>
  );
}
function Front({ entity, root, reduced }: { entity: SceneEntity; root: SceneEntity; reduced: boolean }) {
  const frame = artFrame(entity);
  return (
    <View
      style={{
        position: "absolute",
        left: entity.contact.x - root.contact.x + frame.left,
        top: entity.contact.y - root.contact.y + frame.top,
      }}
    >
      <EntityArt entity={entity} front reduced={reduced} />
    </View>
  );
}
/** This sibling follows BuildingTrim and every room clip. */
export function DragOverlay(props: {
  pickups: (Pickup | undefined)[];
  interaction: Interaction;
  building: Building;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  return (
    <View
      testID="building-drag-overlay"
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
    >
      {props.pickups.map(
        (pickup, index) => pickup && <OverlayGroup key={`${index}:${pickup.id}`} pickup={pickup} {...props} />
      )}
    </View>
  );
}
