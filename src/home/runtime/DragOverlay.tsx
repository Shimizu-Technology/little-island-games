import React, { useMemo } from "react";
import { Platform, View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue } from "react-native-reanimated";
import { paintedBounds } from "../art/silhouettes";
import { roomIds } from "../catalogMore";
import { roomOrigin, type Building } from "../camera";
import { anchorsFor } from "../scene/species";
import { renderAnchors, carryBinding, carrySample } from "./rigGeometry";
import { settleProgress } from "./settle";
import type { Scene, SceneEntity } from "../scene/types";
import { groupIds, restingVisible } from "./group";
import { SettleArt } from "./SettleArt";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { emptyDragSlot, type Interaction, type Pickup } from "./useInteraction";
import { capabilityOf } from "../world";

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
  const globalSlots = interaction.slots, globalClock = interaction.clock;
  const idle = useMemo(() => [emptyDragSlot(), emptyDragSlot()], []);
  // Publish only this actor's active channel. Hidden, pre-mounted characters do
  // not enqueue native prop updates for another child's drag.
  const channel = useDerivedValue(() => globalSlots.value[index].id === id
    ? globalSlots.value.map((s, i) => i === index ? { ...s } : idle[i]) : idle);
  const channelClock = useDerivedValue(() => channel.value[index].id ? globalClock.value : 0);
  const visualInteraction = { ...interaction, slots: channel, clock: channelClock } as Interaction;
  const { slots, camera, clock } = visualInteraction;
  const root = scene.entities[id],
    origin = roomOrigin(roomIds.indexOf(root.room), building);
  const supportPlanes = useMemo(() => Object.fromEntries(Object.values(scene.entities).flatMap((entity) => {
    if (!entity.item || !capabilityOf(entity.item.item).sockets?.length) return [];
    const frame = artFrame(entity), hull = paintedBounds(entity) ?? {
      left: entity.contact.x + frame.left, top: entity.contact.y + frame.top, width: frame.width, height: frame.height };
    const origin = roomOrigin(roomIds.indexOf(entity.room), building);
    return [[entity.id, { ...hull, left: hull.left + origin.x, top: hull.top + origin.y,
      base: hull.top + origin.y + hull.height }]];
  })), [scene, building]);
  const ids = groupIds(scene, id);
  const destination =
    (pickup.destination &&
      pickup.destination.entities[pickup.committedId ?? pickup.identities?.[root.id] ?? root.id]) ??
    root;
  const entities = ids
    .map((key) => scene.entities[key])
    .filter((e) => restingVisible(e, scene, root.id))
    .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
  const acknowledge = () => {
    const bounds = root.character ? renderAnchors(root, true).bounds : undefined;
    const binding = root.character ? carryBinding(root, pickup.grip ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
    interaction.ready(index, id, bounds && { ...bounds, left: bounds.left + binding.x, top: bounds.top + binding.y });
  };
  const style = useAnimatedStyle(() => {
    const slot = slots.value[index];
    const lift = reduced ? 0 : Math.min(1, Math.max(0, (clock.value - slot.liftedAt) / 90));
    const settling = (slot.phase === "settling" && slot.settleAt > 0) || (slot.phase === "pending" && slot.pausedElapsed > 0);
    const blend = settling
      ? Math.max(0, 1 - (slot.phase === "pending" ? slot.pausedElapsed : clock.value - slot.settleAt) / 140)
      : 1;
    const elapsed = settling ? (slot.phase === "pending" ? slot.pausedElapsed : clock.value - slot.settleAt) : 0;
    const accent =
      !reduced && settling && slot.proposal?.kind === "floor" && elapsed < 160
        ? Math.max(0, elapsed < 60 ? elapsed / 60 : (160 - elapsed) / 100)
        : 0;
    const propOffset = root.item && !root.children.length && root.bounds.height < 100 ? 18 / camera.value.a : 0;
    const propScale = root.character ? (reduced ? 0 : .04 * lift * blend)
      : .2 * (settling ? (reduced ? 0 : blend) : (reduced ? 1 : lift));
    return {
      opacity: slot.id === id && slot.ready && (slot.phase !== "pending" || slot.committed || slot.pausedElapsed > 0) ? 1 : 0,
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
        { scaleX: 1 + propScale + 0.02 * accent },
        { scaleY: 1 + propScale - 0.02 * accent },
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
    const settling = slot.phase === "settling" && slot.settleAt > 0 || slot.phase === "pending" && slot.pausedElapsed > 0;
    const fade = settling ? 1 - settleProgress(slot.phase === "pending" ? slot.pausedElapsed : clock.value - slot.settleAt, reduced) : 1;
    return {
      opacity: slot.id === id && slot.ready && (slot.phase !== "pending" || slot.committed || slot.pausedElapsed > 0) ? (0.18 - 0.06 * lift) * fade : 0,
      transform: [{ translateX: groundX - 24 }, { translateY: groundY - 5 }, { scale: 1 - 0.15 * lift }],
    };
  });
  return (
    <>
      <Animated.View
        testID={`drag-shadow-${id}`}
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
        collapsable={false}
        onLayout={acknowledge}
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
        {root.character && <View collapsable={false} onLayout={acknowledge}
          style={{ position: "absolute", opacity: 0, width: 1 + pickup.generation, height: 1 }} />}
        {entities.map((entity) => {
          const frame = artFrame(entity, entity.id === root.id && !!root.character);
          const dx = entity.contact.x - root.contact.x,
            dy = entity.contact.y - root.contact.y;
          if (root.character && entity.attachment.kind === "hand")
            return (
              <CarriedProp
                key={entity.id}
                entity={entity}
                root={root}
                destination={destination}
                pickup={pickup}
                interaction={visualInteraction}
                reduced={reduced}
              />
            );
          if (entity.id === root.id && root.character)
            return (
              <SettleArt
                key={entity.id}
                source={root}
                supportPlanes={supportPlanes}
                destination={destination}
                grip={pickup.grip}
                interaction={visualInteraction}
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
              entity.item && capabilityOf(entity.item.item).sockets?.length
          )
          .map((entity) => (
            <Front key={`front-${entity.id}`} entity={entity} root={root} reduced={reduced} />
          ))}
      </Animated.View>
    </>
  );
}
function CarriedProp({
  entity,
  root,
  destination,
  pickup,
  interaction,
  reduced,
}: {
  entity: SceneEntity;
  root: SceneEntity;
  destination: SceneEntity;
  pickup: Pickup;
  interaction: Interaction;
  reduced: boolean;
}) {
  const { slots, clock } = interaction,
    index = pickup.slot;
  const frame = artFrame(entity),
    grip = pickup.grip ?? { x: 0, y: 0 },
    start = carryBinding(root, grip),
    end = carryBinding(destination, grip, start.marker);
  const hands = Array.from({ length: 9 }, (_, i) => {
    const opts = carrySample(i - 4),
      hand = renderAnchors(root, true, opts.tilt, opts.limbLag).hand;
    const radians = (-opts.tilt * Math.PI) / 180;
    return {
      x: hand.x * Math.cos(radians) - hand.y * Math.sin(radians),
      y: hand.x * Math.sin(radians) + hand.y * Math.cos(radians),
    };
  });
  const final = anchorsFor(destination.character!.slot, destination.base, destination.facing, destination.action).hand;
  const style = useAnimatedStyle(() => {
    const s = slots.value[index],
      elapsed = s.phase === "pending" ? s.pausedElapsed : clock.value - s.settleAt;
    const settling = (s.phase === "settling" && s.settleAt) || (s.phase === "pending" && s.settleAt);
    const p = settling ? settleProgress(elapsed, reduced) : 0,
      blend = p;
    const hand = hands[(reduced ? 0 : Math.max(-4, Math.min(4, Math.round(s.lag / 2.5)))) + 4];
    const x = hand.x + start.x + (end.x - start.x) * p,
      y = hand.y + start.y + (end.y - start.y) * p;
    return { transform: [{ translateX: x + (final.x - x) * blend }, { translateY: y + (final.y - y) * blend }] };
  });
  return (
    <Animated.View
      style={[
        { position: "absolute", left: frame.left, top: frame.top, width: frame.width, height: frame.height },
        style,
      ]}
    >
      <EntityArt entity={entity} reduced={reduced} />
    </Animated.View>
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
  scene: Scene;
  pickups: (Pickup | undefined)[];
  interaction: Interaction;
  building: Building;
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  return (
    <View
      testID={Platform.OS === "web" ? "building-drag-overlay" : undefined}
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
    >
      {Object.values(props.scene.entities).filter((e) => e.character).map((entity) => {
        const pickup = props.pickups.find((p) => p?.id === entity.id) ??
          { id: entity.id, slot: 0, scene: props.scene, generation: 0, epoch: 0 };
        return <OverlayGroup key={entity.id} pickup={pickup} {...props} />;
      })}
      {props.pickups.map((pickup, index) => pickup && !pickup.scene.entities[pickup.id]?.character &&
        <OverlayGroup key={`${index}:${pickup.id}`} pickup={pickup} {...props} />)}
      <SupportFronts scene={props.scene} interaction={props.interaction} building={props.building} reduced={props.reduced} />
    </View>
  );
}

/** The same pre-mounted furniture front replaces its room pass on the release
 * frame. It stays in house space, so the moving actor passes behind it naturally. */
function SupportFronts({ scene, interaction, building, reduced }: {
  scene: Scene; interaction: Interaction; building: Building; reduced: boolean;
}) {
  return <>{Object.values(scene.entities)
    .filter((entity) => entity.item && capabilityOf(entity.item.item).sockets?.length)
    .map((entity) => <SupportFront key={entity.id} entity={entity}
      interaction={interaction} building={building} reduced={reduced} />)}</>;
}
function SupportFront({ entity, interaction, building, reduced }: {
  entity: SceneEntity; interaction: Interaction; building: Building; reduced: boolean;
}) {
  const frame = artFrame(entity), origin = roomOrigin(roomIds.indexOf(entity.room), building);
  const { slots } = interaction;
  const visible = useDerivedValue(() => slots.value.some((s) => {
      const attachment = s.proposal?.attachment ?? s.subject?.attachment;
      return s.id && s.ready && (s.settleAt > 0 || s.pausedElapsed > 0) &&
        attachment?.kind === "socket" && attachment.item === entity.id;
    }) ? 1 : 0);
  const style = useAnimatedStyle(() => ({ opacity: visible.value }));
  return <Animated.View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[{ position: "absolute", left: origin.x + entity.contact.x + frame.left,
      top: origin.y + entity.contact.y + frame.top }, style]}>
    <EntityArt entity={entity} front reduced={reduced} />
  </Animated.View>;
}
