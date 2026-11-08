import React, { memo, useMemo } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, type SharedValue } from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { roomIds, roomNames } from "../catalogMore";
import { RoomArt, ShoreArt } from "../art/Room";
import { RoomShellArt } from "../art/More";
import { BuildingArt, BuildingTrim, TerraceArt } from "../BuildingArt";
import { roomOrigin, type Building } from "../camera";
import type { BadgeId } from "../../badges/engine";
import { tracks } from "../../badges/engine";
import type { HomeStateV2 } from "../model";
import type { Scene, SceneEntity } from "../scene/types";
import { paintEntries, restingVisible } from "./group";
import { SeatRimCue, TargetCue } from "./TargetCue";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { DragOverlay } from "./DragOverlay";
import { layoutToken } from "./layout";
import { pickupTransform } from "./handFeel";
import { isPortion } from "./portions";
import { entityLabels } from "../scene/labels";
import type { Interaction, Pickup, DragSlot } from "./useInteraction";
import type { Viewport } from "./CameraController";

function ancestors(entity: SceneEntity, scene: Scene): string[] {
  const result = [entity.id];
  let parent = entity.parent;
  while (parent && !result.includes(parent)) {
    result.push(parent);
    parent = scene.entities[parent]?.parent;
  }
  return result;
}
const RestingEntity = memo(function RestingEntity({
  entity,
  name,
  ownerKey,
  slots,
  controller,
  camera,
  landingKey,
  fixtureNudges,
  clock,
  acknowledgeLayout,
  reduced,
  renderCharacter,
  onSelect,
  onMove,
  selected,
  targetKey,
  action,
  sleeping,
  front = false,
  onNode,
}: {
  onNode: (id: string, node: View | null) => void;
  entity: SceneEntity;
  /** Accessible name; numbered when the room holds several of the same thing. */
  name: string;
  ownerKey: string;
  slots: SharedValue<DragSlot[]>;
  controller?: Interaction["controller"];
  camera: Interaction["camera"];
  landingKey: string;
  fixtureNudges: Interaction["fixtureNudges"];
  clock: Interaction["clock"];
  acknowledgeLayout: Interaction["acknowledgeLayout"];
  reduced: boolean;
  renderCharacter?: CharacterRender;
  selected: boolean;
  targetKey: string;
  action?: "eat" | "drink";
  sleeping: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, action: string) => void;
  front?: boolean;
}) {
  const bindNode = React.useCallback(
    (node: View | null) => {
      if (!front) onNode(entity.id, node);
    },
    [entity.id, front, onNode]
  );
  const frame = artFrame(entity);
  const token = layoutToken(entity);
  // A tiny native layout stamp acknowledges the commit without remounting SVGs.
  const [stamp, setStamp] = React.useState({ token, value: 1 });
  if (stamp.token !== token) setStamp({ token, value: stamp.value + 1 });
  const owners = useMemo(() => ownerKey.split("|"), [ownerKey]);
  const anticipationTargets = useMemo(() => targetKey.split("|"), [targetKey]);
  const visible = useDerivedValue(() => {
    if (front && slots.value.some((s) => s.id && s.ready && (s.settleAt > 0 || s.pausedElapsed > 0) &&
      (s.proposal?.attachment ?? s.subject?.attachment)?.kind === "socket" &&
      ((s.proposal?.attachment ?? s.subject?.attachment) as { item: string }).item === entity.id)) return 0;
    for (const slot of slots.value) if (slot.id && owners.includes(slot.restId ?? slot.id))
      return slot.ready && slot.painted !== false && (slot.phase !== "pending" || slot.committed || slot.pausedElapsed > 0) ? 0 : 1;
    return 1;
  });
  const wobble = useDerivedValue(() => {
    const at = fixtureNudges.value[entity.id];
    if (!at || reduced) return 0;
    const elapsed = clock.value - at;
    return elapsed < 0 || elapsed >= 220 ? 0 : Math.sin(elapsed / 220 * Math.PI * 4) * 1.5 * (1 - elapsed / 220);
  });
  const landingTargets = useMemo(() => landingKey.split("|"), [landingKey]);
  const landing = useDerivedValue(() => slots.value.some(s => s.id && s.phase === "dragging" && s.proposal?.target && landingTargets.includes(s.proposal.target)));
  const style = useAnimatedStyle(() => {
    const slot = slots.value.find(s => s.id && owners.includes(s.restId ?? s.id));
    const moving = slot && slot.phase !== "pending" && !(slot.ready && slot.painted !== false);
    const motion = moving ? pickupTransform(slot, slot.subject ?? entity, camera.value.a, clock.value, reduced) : undefined;
    const pressed = controller?.value.pointers.some(p => p.phase === "pending" && p.entity && owners.includes(p.entity));
    return { opacity: visible.value,
      transformOrigin: [slot ? slot.gripX - frame.left : -frame.left, slot ? slot.gripY - frame.top : -frame.top, 0],
      transform: [
        { translateX: moving ? slot.x - slot.sourceX : 0 },
        { translateY: moving ? slot.y - slot.sourceY - (motion?.lift ?? 0) : landing.value && !reduced ? -3 : 0 },
        { rotate: `${motion?.tilt ?? wobble.value}deg` },
        { scaleX: motion?.scaleX ?? (pressed || landing.value ? 1.02 : 1) },
        { scaleY: motion?.scaleY ?? (pressed ? entity.character ? .99 : 1.02 : landing.value ? 1.02 : 1) },
      ] };
  });
  const rimStyle = useAnimatedStyle(() => ({ opacity: landing.value ? 1 : 0 }));
  const anticipating = useDerivedValue(() => entity.character &&
    slots.value.some((s) => s.id && s.proposal?.target && anticipationTargets.includes(s.proposal.target)) ? 1 : 0);
  const normal = useAnimatedStyle(() => ({ opacity: 1 - anticipating.value }));
  const anticipate = useAnimatedStyle(() => ({ opacity: anticipating.value }));
  return (
    <View
      ref={bindNode}
      testID={front ? undefined : entity.character ? `character-${entity.character.slot}` : `object-${entity.item!.id}`}
      accessible={!front}
      focusable={!front}
      tabIndex={front ? -1 : 0}
      accessibilityRole="button"
      accessibilityLabel={front ? undefined : `${name}, ${roomNames[entity.room]}${entity.character ? `, ${entity.base}` : ""}`}
      accessibilityElementsHidden={front}
      importantForAccessibility={front ? "no-hide-descendants" : "auto"}
      accessibilityState={{ selected: selected }}
      accessibilityHint="Select, then choose a place."
      accessibilityActions={[
        { name: "activate", label: "Select" },
        ...["left", "right", "back", "forward", ...(!isPortion(entity.id) ? ["store"] : [])].map((name) => ({
          name,
          label: name,
        })),
      ]}
      onAccessibilityAction={(event) =>
        event.nativeEvent.actionName === "activate"
          ? onSelect(entity.id)
          : onMove(entity.id, event.nativeEvent.actionName)
      }
      {...(Platform.OS === "web"
        ? {
            onKeyDown: (event: { nativeEvent: { key: string }; preventDefault: () => void }) => {
              const action = (
                {
                  ArrowLeft: "left",
                  ArrowRight: "right",
                  ArrowUp: "back",
                  ArrowDown: "forward",
                  Enter: "activate",
                  " ": "activate",
                } as Record<string, string>
              )[event.nativeEvent.key];
              if (action) {
                event.preventDefault();
                if (action === "activate") onSelect(entity.id);
                else onMove(entity.id, action);
              }
            },
          }
        : {})}
      pointerEvents={front ? "none" : "auto"}
      style={[
        {
          position: "absolute",
          left: entity.contact.x + frame.left,
          top: entity.contact.y + frame.top,
          width: frame.width,
          height: frame.height,
        },
      ]}
    >
      {selected && !front && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: "12%",
            right: "12%",
            bottom: 0,
            height: 12,
            borderRadius: 50,
            borderWidth: 3,
            borderColor: "#61AB8D",
            backgroundColor: "#D8EFBA88",
          }}
        />
      )}
      <Animated.View style={style} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View collapsable={false} pointerEvents="none" onLayout={() => { if (!front) acknowledgeLayout(entity.id, token); }}
        style={{ position: "absolute", opacity: 0, width: stamp.value, height: 1 }} />
      {!entity.character && !front && <Animated.View testID={`landing-rim-${entity.id}`} pointerEvents="none"
        style={[{ position: "absolute", left: "8%", right: "8%", top: "8%", bottom: "4%", borderRadius: 18,
          borderWidth: 4, borderColor: "#78B693", backgroundColor: "#E8F7C822" }, rimStyle]} />}
      <Animated.View style={normal}>
        <EntityArt
          entity={entity}
          actionOverride={action}
          faceOverride={sleeping ? "sleepy" : undefined}
          front={front}
          reduced={reduced}
          renderCharacter={renderCharacter}
        />
      </Animated.View>
      {entity.character && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, anticipate]}>
          <EntityArt entity={entity} preview reduced={reduced} renderCharacter={renderCharacter} />
        </Animated.View>
      )}
      </Animated.View>
    </View>
  );
});
export function SceneView({
  state,
  scene,
  building,
  viewport,
  interaction,
  pickups,
  reduced,
  renderCharacter,
  selected,
  onSelect,
  onMove,
  stress = false,
  reactions,
  sleeping,
  onNode,
  badges = [],
  onBadges,
  debugLayer,
}: {
  /** Lab-only layer in house space, under the carried object. */
  debugLayer?: React.ReactNode;
  badges?: readonly BadgeId[];
  onBadges?: () => void;
  onNode: (id: string, node: View | null) => void;
  state: HomeStateV2;
  scene: Scene;
  building: Building;
  viewport: Viewport;
  interaction: Interaction;
  pickups: (Pickup | undefined)[];
  reduced: boolean;
  renderCharacter?: CharacterRender;
  selected?: string;
  stress?: boolean;
  reactions: Record<string, "eat" | "drink">;
  sleeping: Record<string, boolean>;
  onSelect: (id: string) => void;
  onMove: (id: string, action: string) => void;
}) {
  const { camera } = interaction;
  const cameraStyle = useAnimatedStyle(() => ({
    transformOrigin: "left top",
    transform: [{ translateX: camera.value.tx }, { translateY: camera.value.ty }, { scale: camera.value.a }],
  }));
  return (
    <GestureDetector gesture={interaction.gesture} touchAction="none">
      <View
        testID={Platform.OS === "web" ? "house-viewport" : undefined}
        accessible={false}
        collapsable={false}
        style={{ width: viewport.width, height: viewport.height, overflow: "hidden", backgroundColor: "#BEE4DD" }}
      >
        <Animated.View
          testID={Platform.OS === "web" ? "house-camera" : undefined}
          accessible={false}
          importantForAccessibility="no"
          style={[{ position: "absolute", width: building.width, height: building.height }, cameraStyle]}
        >
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: "absolute", width: building.width, height: building.height }}>
            <BuildingArt building={building} />
          </View>
          {roomIds.map((roomId, index) => {
            const origin = roomOrigin(index, building),
              room = state.rooms[roomId];
            const entities = Object.values(scene.rooms[roomId].entities)
              .filter((e) => restingVisible(e, scene))
              .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
            const names = entityLabels(entities);
            return (
              <View
                key={roomId}
                testID={Platform.OS === "web" ? `home-scene-${roomId}` : undefined}
                accessible={false}
                collapsable={false}
                pointerEvents="box-none"
                style={{ position: "absolute", left: origin.x, top: origin.y, width: 800, height: index < building.columns ? 740 : 560 }}
              >
                <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ width: 800, height: 560 }}>
                  {roomId === "home" ? (
                    <RoomArt theme={room.theme} badges={[...badges]} reduced={reduced} />
                  ) : (
                    <RoomShellArt room={roomId} theme={room.theme} />
                  )}
                </View>
                <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: "absolute", top: 525, width: 800, height: index < building.columns ? 215 : 35 }}>
                  {index < building.columns ? <ShoreArt depth={215} /> : <TerraceArt />}
                </View>
                {roomId === "home" && <Pressable accessible accessibilityRole="button"
                  accessibilityLabel={`Badge board, ${badges.length} of ${tracks.length * 4} earned. Open My badges`}
                  onPress={onBadges} style={{ position: "absolute", left: 524, top: 26, width: 178, height: 172 }} />}
                <View
                  pointerEvents="box-none"
                  style={{ position: "absolute", left: 8, top: 8, width: 784, height: 544, overflow: "hidden" }}
                >
                  <View pointerEvents="box-none" style={{ position: "absolute", left: -8, top: -8 }}>
                    {paintEntries(entities, scene).flatMap(({ entity, front }, order, entries) => [
                      ...(order === entries.findIndex((entry) => entry.entity.item?.layer !== "ground")
                        ? scene.rooms[roomId].targets.filter((target) => target.rim).map((target) => <SeatRimCue key={`rim:${target.id}`} target={target} interaction={interaction} />)
                        : []),
                      <RestingEntity
                        key={front ? `front:${entity.id}` : entity.id}
                        front={front}
                        entity={entity}
                        name={names[entity.id]}
                        onNode={onNode}
                        action={reactions[entity.id]}
                        sleeping={!!sleeping[entity.id]}
                        ownerKey={ancestors(entity, scene).join("|")}
                        targetKey={scene.rooms[roomId].targets
                          .filter((t) => t.owner === entity.id && (t.kind === "mouth" || t.kind === "hand"))
                          .map((t) => t.id)
                          .join("|")}
                        slots={interaction.slots}
                        controller={interaction.controller}
                        camera={interaction.camera}
                        landingKey={scene.rooms[roomId].targets.filter(t => t.owner === entity.id && t.kind !== "mouth" && t.kind !== "hand").map(t => t.id).join("|")}
                        fixtureNudges={interaction.fixtureNudges}
                        clock={interaction.clock}
                        acknowledgeLayout={interaction.acknowledgeLayout}
                        reduced={reduced}
                        renderCharacter={renderCharacter}
                        selected={!front && selected === entity.id}
                        onSelect={onSelect}
                        onMove={onMove}
                      />,
                    ])}
                    {scene.rooms[roomId].targets.filter((target) => !target.rim).map((target) => (
                      <TargetCue key={target.id} target={target} interaction={interaction} />
                    ))}
                    {stress && roomId === "home" && (
                      <StressCopies
                        extraProps={Math.max(0, 150 - Object.values(scene.entities).filter((e) => e.item).length)}
                        entities={entities}
                        reduced={reduced}
                        renderCharacter={renderCharacter}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: "absolute", width: building.width, height: building.height }}>
            <BuildingTrim building={building} />
          </View>
          {debugLayer}
          <DragOverlay
            scene={scene}
            pickups={pickups}
            interaction={interaction}
            building={building}
            reduced={reduced}
            renderCharacter={renderCharacter}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
/** Render-only stress fixture: never bypasses production save identity/capacity limits. */
function StressCopies({
  entities,
  extraProps,
  reduced,
  renderCharacter,
}: {
  extraProps: number;
  entities: SceneEntity[];
  reduced: boolean;
  renderCharacter?: CharacterRender;
}) {
  const actors = entities.filter((e) => e.character),
    props = entities.filter((e) => e.item && !e.children.length);
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: "absolute" }}>
      {Array.from({ length: actors.length ? 9 : 0 }, (_, i) => (
        <View
          key={`actor-${i}`}
          style={{ position: "absolute", left: 50 + (i % 6) * 110, top: 170 + Math.floor(i / 6) * 80 }}
        >
          <EntityArt entity={actors[i % actors.length]} reduced={reduced} renderCharacter={renderCharacter} />
        </View>
      ))}
      {Array.from({ length: props.length ? extraProps : 0 }, (_, i) => (
        <View
          key={`prop-${i}`}
          style={{ position: "absolute", left: 30 + (i % 12) * 60, top: 320 + Math.floor(i / 12) * 55 }}
        >
          <EntityArt entity={props[i % props.length]} reduced={reduced} />
        </View>
      ))}
    </View>
  );
}
