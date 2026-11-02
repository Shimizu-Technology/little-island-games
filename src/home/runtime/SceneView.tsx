import React, { memo, useMemo } from "react";
import { Platform, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { GestureDetector } from "react-native-gesture-handler";
import { roomIds, roomNames } from "../catalogMore";
import { RoomArt, ShoreArt } from "../art/Room";
import { RoomShellArt } from "../art/More";
import { BuildingArt, BuildingTrim, TerraceArt } from "../BuildingArt";
import { roomOrigin, type Building } from "../camera";
import { itemSpec } from "../catalog";
import type { HomeStateV2 } from "../model";
import type { Scene, SceneEntity } from "../scene/types";
import { paintEntries, restingVisible } from "./group";
import { TargetCue } from "./TargetCue";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { DragOverlay } from "./DragOverlay";
import { layoutToken } from "./layout";
import { isPortion } from "./portions";
import type { Interaction, Pickup, DragSlot } from "./useInteraction";
import type { Viewport } from "./CameraController";
import { poseToken, poseVariants } from "./poseBank";

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
  ownerKey,
  slots,
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
  ownerKey: string;
  slots: SharedValue<DragSlot[]>;
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
  const style = useAnimatedStyle(() => {
    if (front && slots.value.some((s) => s.id && s.ready && (s.settleAt > 0 || s.pausedElapsed > 0) &&
      (s.proposal?.attachment ?? s.subject?.attachment)?.kind === "socket" &&
      ((s.proposal?.attachment ?? s.subject?.attachment) as { item: string }).item === entity.id))
      return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }] };
    for (let i = 0; i < 2; i++) {
      const slot = slots.value[i];
      if (slot.id && owners.includes(slot.restId ?? slot.id))
        return {
          opacity: slot.ready && (slot.phase !== "pending" || slot.committed || slot.pausedElapsed > 0) ? 0 : 1,
          // Never translate the old supported pose while carry art mounts.
          transform: [{ translateX: 0 }, { translateY: 0 }],
        };
    }
    const elapsed = clock.value - (fixtureNudges.value[entity.id] ?? -1000);
    const angle = reduced || elapsed < 0 || elapsed >= 220 ? 0 :
      Math.sin(elapsed / 220 * Math.PI * 4) * 1.5 * (1 - elapsed / 220);
    return { opacity: 1, transform: [{ translateX: 0 }, { translateY: 0 }, { rotate: `${angle}deg` }] };
  });
  const normal = useAnimatedStyle(() => ({
    opacity:
      entity.character &&
      slots.value.some((s) => s.id && s.proposal?.target && anticipationTargets.includes(s.proposal.target))
        ? 0
        : 1,
  }));
  const anticipate = useAnimatedStyle(() => ({
    opacity:
      entity.character &&
      slots.value.some((s) => s.id && s.proposal?.target && anticipationTargets.includes(s.proposal.target))
        ? 1
        : 0,
  }));
  const name = entity.character ? ["Islander", "Pip", "Crab"][entity.character.slot] : itemSpec(entity.item!.item).name;
  return (
    <Animated.View
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
        style,
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
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View collapsable={false} pointerEvents="none" onLayout={() => { if (!front) acknowledgeLayout(entity.id, token); }}
        style={{ position: "absolute", opacity: 0, width: stamp.value, height: 1 }} />
      <Animated.View style={normal}>
        {entity.character ? <RestingPoses entity={entity} reduced={reduced} renderCharacter={renderCharacter}
          action={action} sleeping={sleeping} /> : <EntityArt
          entity={entity}
          actionOverride={action}
          faceOverride={sleeping ? "sleepy" : undefined}
          front={front}
          reduced={reduced}
          renderCharacter={renderCharacter}
        />}
      </Animated.View>
      {entity.character && (
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, anticipate]}>
          <RestingPoses entity={entity} preview reduced={reduced} renderCharacter={renderCharacter} />
        </Animated.View>
      )}
      </View>
    </Animated.View>
  );
});
function RestingPoses({ entity, reduced, renderCharacter, action, sleeping, preview = false }: {
  entity: SceneEntity; reduced: boolean; renderCharacter?: CharacterRender; action?: "eat" | "drink";
  sleeping?: boolean; preview?: boolean;
}) {
  const current = artFrame(entity);
  return <>{poseVariants(entity).map((variant) => {
    const frame = artFrame(variant), key = poseToken(variant.base, variant.facing, variant.action);
    return <View key={key} pointerEvents="none" style={{ position: "absolute", left: frame.left - current.left,
      top: frame.top - current.top, opacity: variant.base === entity.base &&
        (variant.facing === "left") === (entity.facing === "left") ? 1 : 0 }}>
      <EntityArt entity={variant} preview={preview} actionOverride={action} faceOverride={sleeping ? "sleepy" : undefined}
        reduced={reduced} renderCharacter={renderCharacter} />
    </View>;
  })}</>;
}
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
}: {
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
        testID="house-viewport"
        accessible={false}
        collapsable={false}
        style={{ width: viewport.width, height: viewport.height, overflow: "hidden", backgroundColor: "#BEE4DD" }}
      >
        <Animated.View
          testID="house-camera"
          accessible={false}
          style={[{ position: "absolute", width: building.width, height: building.height }, cameraStyle]}
        >
          <View pointerEvents="none" style={{ position: "absolute", width: building.width, height: building.height }}>
            <BuildingArt building={building} />
          </View>
          {roomIds.map((roomId, index) => {
            const origin = roomOrigin(index, building),
              room = state.rooms[roomId];
            const entities = Object.values(scene.rooms[roomId].entities)
              .filter((e) => restingVisible(e, scene))
              .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
            return (
              <View
                key={roomId}
                testID={`home-scene-${roomId}`}
                accessible={false}
                collapsable={false}
                pointerEvents="box-none"
                style={{ position: "absolute", left: origin.x, top: origin.y, width: 800, height: index < building.columns ? 740 : 560 }}
              >
                <View pointerEvents="none" style={{ width: 800, height: 560 }}>
                  {roomId === "home" ? (
                    <RoomArt theme={room.theme} reduced={reduced} />
                  ) : (
                    <RoomShellArt room={roomId} theme={room.theme} />
                  )}
                </View>
                <View pointerEvents="none" style={{ position: "absolute", top: 525, width: 800, height: index < building.columns ? 215 : 35 }}>
                  {index < building.columns ? <ShoreArt depth={215} /> : <TerraceArt />}
                </View>
                <View
                  pointerEvents="box-none"
                  style={{ position: "absolute", left: 8, top: 8, width: 784, height: 544, overflow: "hidden" }}
                >
                  <View pointerEvents="box-none" style={{ position: "absolute", left: -8, top: -8 }}>
                    {paintEntries(entities, scene).map(({ entity, front }) => (
                      <RestingEntity
                        key={front ? `front:${entity.id}` : entity.id}
                        front={front}
                        entity={entity}
                        onNode={onNode}
                        action={reactions[entity.id]}
                        sleeping={!!sleeping[entity.id]}
                        ownerKey={ancestors(entity, scene).join("|")}
                        targetKey={scene.rooms[roomId].targets
                          .filter((t) => t.owner === entity.id && (t.kind === "mouth" || t.kind === "hand"))
                          .map((t) => t.id)
                          .join("|")}
                        slots={interaction.slots}
                        fixtureNudges={interaction.fixtureNudges}
                        clock={interaction.clock}
                        acknowledgeLayout={interaction.acknowledgeLayout}
                        reduced={reduced}
                        renderCharacter={renderCharacter}
                        selected={!front && selected === entity.id}
                        onSelect={onSelect}
                        onMove={onMove}
                      />
                    ))}
                    {scene.rooms[roomId].targets.map((target) => (
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
          <View pointerEvents="none" style={{ position: "absolute", width: building.width, height: building.height }}>
            <BuildingTrim building={building} />
          </View>
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
    <View pointerEvents="none" style={{ position: "absolute" }}>
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
