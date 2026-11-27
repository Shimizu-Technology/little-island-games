import { familySlots } from "../family";
import React, { memo, useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { anchorsFor } from "../scene/species";
import { restFrom, restTransform } from "./restFrom";
import type { Meal } from "./meal";
import Animated, { cancelAnimation, runOnJS, useAnimatedReaction, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming, Easing, type SharedValue } from "react-native-reanimated";
import { capabilityOf } from '../world';
import { itemSize } from '../geometry';
import { GestureDetector } from "react-native-gesture-handler";
import { roomIds, roomNames, type RoomId } from "../catalogMore";
import { RoomArt, ShoreArt, SkyArt } from "../art/Room";
import { RoomShellArt } from "../art/More";
import { BuildingArt, BuildingTrim, TerraceArt } from "../BuildingArt";
import { roomOrigin, type Building } from "../camera";
import type { BadgeId } from "../../badges/engine";
import { tracks } from "../../badges/engine";
import type { HomeStateV2 } from "../model";
import type { Scene, SceneEntity } from "../scene/types";
import { type HomeMood, lampShadow, litLamps, NOTICE_DEGREES, type LampShadow } from "./delight";
import { Effects, type Effect } from "./Effects";
import { type Poke } from "./SetPieces";
import { paintEntries, restingVisible } from "./group";
import { SeatRimCue, TargetCue } from "./TargetCue";
import { EntityArt, artFrame, type CharacterRender } from "./EntityArt";
import { DragOverlay } from "./DragOverlay";
import { layoutToken } from "./layout";
import { anyIn, firstFollow, firstRest } from "./restingState";
import { BREATH_SCALE, lifeBlink, lifeBreath, lifeSeed, nextLifeTick } from "./life";
import { isPortion, SHORE_TOP } from "./portions";
import { entityLabels, storageDescription } from "../scene/labels";
import type { Interaction, Pickup } from "./useInteraction";
import type { Viewport } from "./CameraController";

const ZERO_OFFSET = { x: 0, y: 0 };

function ancestors(entity: SceneEntity, scene: Scene): string[] {
  const result = [entity.id];
  let parent = entity.parent;
  while (parent && !result.includes(parent)) {
    result.push(parent);
    parent = scene.entities[parent]?.parent;
  }
  return result;
}
/** A displaced cup gets a fresh zero-valued native style on its first paint.
 * Reusing the resting entity's finished clock can show the floor pose before
 * the new worklet and clock reset arrive, then jump back into the tween. */
function SetDownMotion({id,from,frame,reduced,onFinished,shadow,children}:{id:string;from:NonNullable<ReturnType<typeof restFrom>>;frame:{left:number;top:number;width:number;height:number};reduced:boolean;onFinished:()=>void;shadow?:React.ComponentProps<typeof View>['style'];children:React.ReactNode}) {
  const elapsed=useSharedValue(0);
  const start=restTransform(from,0,reduced);
  const motion=useAnimatedStyle(()=>{
    const pose=restTransform(from,elapsed.value,reduced);
    return {transform:[{translateX:(pose.dx-start.dx)/start.scale},{translateY:(pose.dy-start.dy)/start.scale},{scale:pose.scale/start.scale}]};
  });
  const shade=useAnimatedStyle(()=>({opacity:.16*(reduced?1:Math.max(0,Math.min(1,(elapsed.value-120)/100)))}));
  const started=React.useRef(false),request=React.useRef<number|undefined>(undefined);
  const begin=React.useCallback(()=>{
    if(started.current)return;
    started.current=true;
    request.current=requestAnimationFrame(()=>{
      elapsed.set(withTiming(220,{duration:reduced?0:220,easing:Easing.linear},done=>{if(done)runOnJS(onFinished)();}));
    });
  },[elapsed,reduced,onFinished]);
  React.useLayoutEffect(()=>()=>{
    if(request.current!==undefined)cancelAnimationFrame(request.current);
    cancelAnimation(elapsed);
  },[elapsed]);
  return <>
    {shadow && <Animated.View testID={`drink-ground-shadow-${id}`} pointerEvents="none" accessible={false} style={[shadow,shade]}/>}
    {/* The native layout starts in the hand even before Reanimated attaches.
        The animated child starts at identity and cancels this basis on arrival. */}
    <View testID={`rest-set-down-origin-${id}`} pointerEvents="none" accessible={false}
      style={{width:frame.width,height:frame.height,transformOrigin:[-frame.left,-frame.top,0],transform:[{translateX:start.dx},{translateY:start.dy},{scale:start.scale}]}}>
      <Animated.View collapsable={false} onLayout={begin} testID={`rest-set-down-${id}`} pointerEvents="none" style={[{width:frame.width,height:frame.height,transformOrigin:[-frame.left,-frame.top,0]},motion]}>{children}</Animated.View>
    </View>
  </>;
}
/** Hidden copies retain their last idle props until the visible meal finishes. */
const IdleEntityDrawing=memo(function IdleEntityDrawing({mealActive:_mealActive,...props}:React.ComponentProps<typeof EntityArt>&{mealActive:boolean}) {
  return <EntityArt {...props}/>;
},(_previous,next)=>next.mealActive);
const RestingEntity = memo(function RestingEntity({
  entity,
  name,
  ownerKey,
  restingFlags,
  restingMotion,
  landingKey,
  acknowledgeLayout,
  reduced,
  renderCharacter,
  onSelect,
  onMove,
  selected,
  designing = false,
  targetKey,
  action,
  meal,
  mealStandby,
  mealVisible = true,
  onMealPresented,
  onMealFinished,
  mealHeld = false,
  cacheBlink = false,
  sleeping,
  front = false,
  onNode,
  life,
  mood,
  shadow,
  ownerId,
  ownerPivot,
}: {
  /** Fix round 1: a held thing takes its owner's whole presentation (lean, wiggle, hop, stir)
   * about the owner's own pivot, so it never comes away from the hand. */
  ownerId?: string;
  /** The owner's pivot (its contact) in this entity's frame. */
  ownerPivot?: { x: number; y: number };
  /** HM-11: the shared life clock, given only to friends at rest in the room on screen. */
  life?: SharedValue<number>;
  /** Keep the visible room's static closed-eye drawing mounted across meals. */
  cacheBlink?: boolean;
  /** H4: a short expression after eating, a greeting or a burp. */
  mood?: HomeMood;
  /** HD-08: a soft shadow thrown by a lit lamp nearby. */
  shadow?: LampShadow;
  onNode: (id: string, node: View | null) => void;
  entity: SceneEntity;
  /** Accessible name; numbered when the room holds several of the same thing. */
  name: string;
  ownerKey: string;
  restingFlags: Interaction["restingFlags"];
  restingMotion: Interaction["restingMotion"];
  landingKey: string;
  acknowledgeLayout: Interaction["acknowledgeLayout"];
  reduced: boolean;
  renderCharacter?: CharacterRender;
  selected: boolean;
  designing?: boolean;
  targetKey: string;
  action?: "eat" | "drink";
  meal?: Meal;
  mealStandby?: Meal;
  mealVisible?:boolean;
  onMealPresented?: (id: string, key: number) => void;
  onMealFinished?: (id: string, key: number) => void;
  mealHeld?: boolean;
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
  const presented = React.useCallback(() => {
    if (meal) onMealPresented?.(entity.id, meal.key);
  }, [meal, entity.id, onMealPresented]);
  const finished = React.useCallback(() => {
    if (meal) onMealFinished?.(entity.id, meal.key);
  }, [meal, entity.id, onMealFinished]);
  const [restState, setRestState] = React.useState<{entity:SceneEntity;from:ReturnType<typeof restFrom>}>({entity,from:undefined});
  // Derive the new transition on this render too. A worklet initializer must
  // never observe the previous entity's absent transition on a render retry.
  const from = restState.entity !== entity ? restFrom(restState.entity,entity) : restState.from;
  if (restState.entity !== entity) setRestState({entity,from});
  const finishSetDown=React.useCallback(()=>setRestState(current=>current.entity===entity && current.from ? {entity,from:undefined} : current),[entity]);
  const frame = artFrame(entity);
  const floorDrink=entity.item && entity.attachment.kind==='floor' && capabilityOf(entity.item.item).edible==='drink';
  const drinkSize=entity.item ? itemSize(entity.item) : 0;
  const groundShadow={position:'absolute' as const,left:drinkSize*.32,top:drinkSize*.71,width:drinkSize*.36,height:drinkSize*.08,borderRadius:drinkSize*.1,backgroundColor:'#385451'};
  const token = layoutToken(entity);
  // A tiny native layout stamp acknowledges the commit without remounting SVGs.
  const [stamp, setStamp] = React.useState({ token, value: 1 });
  if (stamp.token !== token) setStamp({ token, value: stamp.value + 1 });
  const owners = useMemo(() => ownerKey.split("|"), [ownerKey]);
  const anticipationTargets = useMemo(() => targetKey.split("|"), [targetKey]);
  const landingTargets = useMemo(() => landingKey.split("|"), [landingKey]);
  // HM-13: one shared resting state, changed only on pickup, press, target and front edges.
  // The motion channel carries per-frame values only while art follows before its overlay
  // is ready, or while something wobbles; otherwise nothing here runs during a drag.
  const seed = entity.character ? lifeSeed(entity.character.slot) : 0;
  // HD-06: lean toward food or a friend carried near. The flag changes only on entering or
  // leaving; the lean eases on the UI thread and then nothing runs.
  const character = !!entity.character, id = entity.id;
  // The friend whose lean this art shows: itself, or the friend holding it.
  const leaner = character ? id : ownerId;
  const lean = useSharedValue(0);
  const [gazeCode, setGazeCode] = React.useState(0);
  const gazeRef = React.useRef(0);
  const publishGaze = React.useCallback((code: number) => {
    if (gazeRef.current === code) return;
    gazeRef.current = code;
    setGazeCode(code);
  }, []);
  useAnimatedReaction(() => {
    if (!character || sleeping) return 0;
    const notice = restingFlags.value.notice.find(n => n.id === id);
    return notice ? notice.dir * 4 + (notice.vertical ?? 0) : 0;
  }, (dir, before) => { if (dir !== before) runOnJS(publishGaze)(dir); }, [character, sleeping, id]);
  const gazeDir = Math.round(gazeCode / 4);
  const gaze = { x: gazeDir * (entity.facing === "left" ? -1 : 1), y: gazeCode - gazeDir * 4 };
  useAnimatedReaction(() => {
    if (!leaner || sleeping || reduced) return 0;
    for (const n of restingFlags.value.notice) if (n.id === leaner) return n.dir;
    return 0;
  }, (dir, previous) => {
    if (dir !== previous) lean.set(withTiming(dir * NOTICE_DEGREES, { duration: 180 }));
  }, [leaner, sleeping, reduced]);
  const style = useAnimatedStyle(() => {
    const flags = restingFlags.value, motion = restingMotion.value;
    const rest = firstRest(flags, owners);
    const follow = firstFollow(motion, owners);
    const pressed = anyIn(flags.pressed, owners);
    const landing = anyIn(flags.dragTargets, landingTargets);
    // A held thing moves with its owner whenever the owner reacts; otherwise it has its own.
    const owned = !!ownerId && !!ownerPivot && ((motion.wobble[ownerId] ?? 0) !== 0 || !!motion.bob[ownerId] || lean.value !== 0);
    const presenter = owned ? ownerId! : entity.id;
    const wobble = reduced ? 0 : (motion.wobble[presenter] ?? 0) + (owned || character ? lean.value : 0);
    const bob = reduced ? undefined : motion.bob[presenter];
    const hidden = (front && flags.fronts.includes(entity.id)) || (rest?.hide ?? false);
    const dim = motion.dim[presenter] ?? 1;
    return { opacity: hidden ? 0 : dim,
      transformOrigin: rest ? [rest.gx - frame.left, rest.gy - frame.top, 0]
        : owned ? [ownerPivot!.x, ownerPivot!.y, 0] : [-frame.left, -frame.top, 0],
      transform: [
        { translateX: follow ? follow.dx : 0 },
        { translateY: follow ? follow.dy : (landing && !reduced ? -3 : 0) + (bob?.dy ?? 0) },
        { rotate: `${follow ? follow.tilt : wobble}deg` },
        { scaleX: follow ? follow.sx : (pressed || landing ? 1.02 : 1) },
        { scaleY: follow ? follow.sy : (pressed ? entity.character ? .99 : 1.02 : landing ? 1.02 :
          (life && !rest ? 1 + BREATH_SCALE * lifeBreath(life.value, seed) : 1) * (bob?.sy ?? 1)) },
      ] };
  });
  // The mouth opens for food aimed at it, and (HD-06) for food carried close by.
  const anticipating = useDerivedValue(() => {
    if (!character || action || entity.action === "eat" || entity.action === "drink") return 0;
    if (anyIn(restingFlags.value.targets, anticipationTargets)) return 1;
    if (sleeping) return 0;
    for (const n of restingFlags.value.notice) if (n.id === id && n.food) return 1;
    return 0;
  });
  // A lingering native anticipation or blink must never cover the meal layer.
  const idleStyle = useAnimatedStyle(() => ({
    opacity: !meal && life && lifeBlink(life.value, seed) ? 0 : 1 - anticipating.value,
  }));
  const closed = useAnimatedStyle(() => ({
    opacity: !meal && life && lifeBlink(life.value, seed) ? 1 - anticipating.value : 0,
  }));
  const anticipate = useAnimatedStyle(() => ({ opacity: anticipating.value }));
  const mealShowing = !!meal && mealVisible;
  const drawing=(<Animated.View style={style} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View collapsable={false} pointerEvents="none" onLayout={() => { if (!front) acknowledgeLayout(entity.id, token); }}
          style={{ position: "absolute", opacity: 0, width: stamp.value, height: 1 }} />
        {shadow && !front && <ShadowCast shadow={shadow} x={-frame.left} y={-frame.top} reduced={reduced} />}
        <View collapsable={ownerId ? false : undefined} style={character ? undefined : { opacity: mealHeld ? 0 : 1 }}>
          {/* Keep the saved cup painted under the transient sip so the final
              frame can reveal it without mounting a new native SVG. */}
          <EntityArt
            entity={entity}
            actionOverride={action}
            prepareMeal={!!entity.character}
            idleStyle={character ? idleStyle : undefined}
            meal={meal}
            mealStandby={mealStandby}
            mealVisible={mealVisible}
            onMealPresented={presented}
            onMealFinished={finished}
            gaze={gaze}
            faceOverride={sleeping ? "sleepy" : mood}
            front={front}
            reduced={reduced}
            renderCharacter={renderCharacter}
          />
        </View>
        {cacheBlink && (
          <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, opacity: mealShowing ? 0 : 1 }}>
            <Animated.View style={[{ position: "absolute", left: 0, top: 0 }, closed]}>
              <IdleEntityDrawing mealActive={!!meal} entity={entity} gaze={gaze} faceOverride={mood} reduced={reduced} renderCharacter={renderCharacter} blink />
            </Animated.View>
          </View>
        )}
        {character && (
          <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, opacity: mealShowing ? 0 : 1 }}>
            <Animated.View style={anticipate}>
              <IdleEntityDrawing mealActive={!!meal} entity={entity} gaze={gaze} preview reduced={reduced} renderCharacter={renderCharacter} />
            </Animated.View>
          </View>
        )}
      </Animated.View>);
  return (
    <View
      ref={bindNode}
      testID={front ? undefined : entity.character ? `character-${entity.character.slot}` : `object-${entity.item!.id}`}
      accessible={!front}
      focusable={!front}
      tabIndex={front ? -1 : 0}
      accessibilityRole="button"
      accessibilityLabel={front ? undefined : `${name}, ${roomNames[entity.room]}${entity.character ? `, ${entity.base}` : storageDescription(entity) ? `, ${storageDescription(entity)}` : ""}`}
      accessibilityElementsHidden={front}
      importantForAccessibility={front ? "no-hide-descendants" : "auto"}
      accessibilityState={{ selected: selected }}
      accessibilityHint={entity.body?.container ? "Select or use Open or close. Choose an item picture to take it out." : "Select, then choose a place."}
      accessibilityActions={[
        { name: "activate", label: entity.body?.container && !designing && !entity.body.portable ? "Open or close" : "Select" },
        ...(entity.body?.container ? [{ name: "open", label: "Open or close" }] : []),
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
          // A displaced cup crosses the actor's silhouette. Keep it in front
          // until it is down, then return to ordinary floor depth.
          zIndex: from ? 1000 : undefined,
        },
      ]}
    >
      {!from && floorDrink && <View testID={`drink-ground-shadow-${entity.id}`} pointerEvents="none" accessible={false} style={[groundShadow,{opacity:.16}]}/>}
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
      {from ? <SetDownMotion key={token} id={entity.id} from={from} frame={frame} reduced={reduced} onFinished={finishSetDown} shadow={floorDrink?groundShadow:undefined}>{drawing}</SetDownMotion> : drawing}
    </View>
  );
});
/** Fix round 1: the friend holding this thing, and that friend's pivot in this thing's frame. */
function heldBy(entity: SceneEntity, scene: Scene): { ownerId?: string; ownerPivot?: { x: number; y: number } } {
  if (entity.attachment.kind !== "hand") return {};
  const owner = scene.entities[entity.attachment.character];
  if (!owner) return {};
  const frame = artFrame(entity);
  return { ownerId: owner.id, ownerPivot: { x: owner.contact.x - entity.contact.x - frame.left, y: owner.contact.y - entity.contact.y - frame.top } };
}
/** HD-08: a warm pool of light around a lit lamp and on the floor below it. Fades in once. */
function LampGlow({ lamp, reduced }: { lamp: SceneEntity; reduced: boolean }) {
  const shown = useSharedValue(reduced ? 1 : 0);
  React.useEffect(() => { if (!reduced) shown.set(withTiming(1, { duration: 240 })); }, [reduced, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));
  const bulb = lamp.contact.y + lamp.bounds.top + lamp.bounds.height * 0.35, x = lamp.contact.x;
  const floor = lamp.attachment.kind === "surface" ? lamp.contact.y + 80 : lamp.contact.y;
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, style]}>
    <View style={{ position: "absolute", left: x - 150, top: bulb - 150, width: 300, height: 300, borderRadius: 150, backgroundColor: "#FFE7A0", opacity: 0.16 }} />
    <View style={{ position: "absolute", left: x - 95, top: bulb - 95, width: 190, height: 190, borderRadius: 95, backgroundColor: "#FFE7A0", opacity: 0.18 }} />
    <View style={{ position: "absolute", left: x - 170, top: floor - 34, width: 340, height: 68, borderRadius: 170, backgroundColor: "#F6CD71", opacity: 0.2 }} />
  </Animated.View>;
}
/** HD-08: a lamp's soft shadow from a friend's feet, away from the light. Fades in once. */
function ShadowCast({ shadow, x, y, reduced }: { shadow: LampShadow; x: number; y: number; reduced: boolean }) {
  const shown = useSharedValue(reduced ? 1 : 0);
  React.useEffect(() => { if (!reduced) shown.set(withTiming(1, { duration: 220 })); }, [reduced, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shadow.opacity * shown.value }));
  const height = 30;
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - 10, top: y - height / 2, width: shadow.length,
    height, borderRadius: height, backgroundColor: "#284F4B", transformOrigin: [0, height / 2, 0],
    transform: [{ rotate: `${shadow.angle}deg` }] }, style]} />;
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
  designing = false,
  onSelect,
  onMove,
  stress = false,
  reactions,
  meals = {},
  mealReady,
  onMealPresented,
  onMealFinished,
  sleeping,
  onNode,
  badges = [],
  onBadges,
  debugLayer,
  liveRoom,
  moods = {},
  effects = [],
  poke: _poke,
}: {
  /** HC-01: the painted piece that was last touched. */
  poke?: Poke;
  /** H4: short expressions on friends at rest (after eating, greeting, a burp). */
  moods?: Record<string, HomeMood>;
  /** H4: crumbs, bubbles, splashes and steam, drawn above the room's things. */
  effects?: readonly Effect[];
  /** HM-11: friends at rest in this room blink and breathe. None in the overview. */
  liveRoom?: string;
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
  designing?: boolean;
  stress?: boolean;
  reactions: Record<string, "eat" | "drink">;
  meals?: Record<string, Meal>;
  mealReady?:Record<string,number>;
  onMealPresented?: (id: string, key: number) => void;
  onMealFinished?: (id: string, key: number) => void;
  sleeping: Record<string, boolean>;
  onSelect: (id: string) => void;
  onMove: (id: string, action: string) => void;
}) {
  const { camera,completeMealHandoff } = interaction;
  React.useLayoutEffect(() => {
    if (!completeMealHandoff) return;
    const ready = Object.entries(meals).flatMap(([id, meal]) =>
      meal.source && meal.capture && (!mealReady || mealReady[id] === meal.key)
        ? [{ source: meal.source, capture: meal.capture }]
        : []);
    if (!ready.length) return;
    // React changes both layers' opacity together. A worklet must keep the
    // carry slot alive until that native commit has had a frame to paint.
    let retire: number | undefined;
    const publish = requestAnimationFrame(() => {
      retire = requestAnimationFrame(() => {
        for (const { source, capture } of ready) completeMealHandoff(source, capture);
      });
    });
    return () => {
      cancelAnimationFrame(publish);
      if (retire !== undefined) cancelAnimationFrame(retire);
    };
  }, [completeMealHandoff, meals, mealReady]);
  // Use the existing hidden meal stage to prepare a sip while the cup is
  // already being carried. Key zero prepares art without starting playback.
  const offered = pickups.map(pickup => pickup && {pickup, entity:pickup.scene.entities[pickup.id]})
    .find(value => value?.entity?.body?.edible === "drink" && !value.entity.item?.empty);
  const offeredId = offered?.entity.id, offeredGeneration = offered?.pickup.generation;
  const [standbyId, setStandbyId] = React.useState<string>();
  const standbyKey = `${offeredId}:${offeredGeneration}`;
  React.useEffect(() => {
    if (!offeredId) return;
    // Two callbacks guarantee a presented lift frame before constructing the sip bank.
    let second: number | undefined;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setStandbyId(standbyKey)); });
    return () => { cancelAnimationFrame(first); if (second !== undefined) cancelAnimationFrame(second); };
  }, [offeredId, standbyKey]);
  const offeredEntity = offered?.entity;
  const standbyCandidates = useMemo(() => Object.values(scene.entities).filter(e => e.character && !sleeping[e.id])
    .map(e => {
      const face=anchorsFor(e.character!.slot,e.base,e.facing,e.action).head;
      return {id:e.id,room:e.room,x:e.contact.x+face.x,y:e.contact.y+face.y};
    }), [scene,sleeping]);
  const foodOffset = offeredEntity?.visual ?? ZERO_OFFSET;
  const initialStandbyOwner = offeredEntity && standbyCandidates.filter(e => e.room === offeredEntity.room)
    .sort((a,b) => Math.hypot(a.x-offeredEntity.contact.x-foodOffset.x,a.y-offeredEntity.contact.y-foodOffset.y) -
      Math.hypot(b.x-offeredEntity.contact.x-foodOffset.x,b.y-offeredEntity.contact.y-foodOffset.y))[0]?.id;
  const [approachChoice, setApproachChoice] = React.useState<{key:string;owner:string}>();
  const publishStandbyOwner = React.useCallback((owner:string) => setApproachChoice({key:standbyKey,owner}),[standbyKey]);
  const dragSlots = interaction.slots;
  useAnimatedReaction(() => {
    const slot = dragSlots.value.find(s => s.id === offeredId && s.phase === "dragging");
    if (!slot) return undefined;
    const room = slot.proposal?.room ?? offeredEntity?.room;
    const origin = room ? roomOrigin(roomIds.indexOf(room),building) : {x:0,y:0};
    let closest: string | undefined, distance = Infinity;
    for (const actor of standbyCandidates) {
      const d = Math.hypot(actor.x-slot.x+origin.x-foodOffset.x,actor.y-slot.y+origin.y-foodOffset.y);
      if (actor.room === room && d < distance) { closest=actor.id; distance=d; }
    }
    return closest;
  }, (owner,before) => { if(owner && owner !== before) runOnJS(publishStandbyOwner)(owner); }, [offeredId,offeredEntity?.room,standbyCandidates,building,publishStandbyOwner,foodOffset]);
  const standbyOwner = approachChoice?.key === standbyKey ? approachChoice.owner : initialStandbyOwner;
  const mealStandby = useMemo<Meal | undefined>(() =>
    standbyId === standbyKey && offeredEntity?.item ? { key: 0, action: "drink", offered: true, food: offeredEntity.item } : undefined,
    [standbyId, standbyKey, offeredEntity]);
  // HD-08: lamp shadows change only when the room's contents do.
  // Keyed by their contents, so an edit elsewhere never hands a resting friend a new shadow object.
  const shadowKey = useMemo(() => JSON.stringify(Object.fromEntries(Object.values(scene.entities).flatMap((e) => {
    const shadow = lampShadow(scene, e);
    return shadow ? [[e.id, shadow]] : [];
  }))), [scene]);
  const shadows = useMemo(() => JSON.parse(shadowKey) as Record<string, LampShadow>, [shadowKey]);
  // One UI-thread clock for every friend on screen; nothing re-renders an SVG.
  const lifeClock = useSharedValue(0);
  // R3: the clock runs only while a friend on screen actually blinks and breathes with it.
  const alive = (entity: SceneEntity) => !!entity.character && entity.room === liveRoom && !sleeping[entity.id] &&
    !reactions[entity.id] && !entity.action && restingVisible(entity, scene);
  const living = !reduced && !!liveRoom && Object.values(scene.rooms[liveRoom as RoomId]?.entities ?? {}).some(alive);
  React.useEffect(() => {
    if (!living) return;
    // A timer that wakes only at blink edges and breath steps, not a per-frame animation.
    const start = Date.now(), seeds = familySlots.map(lifeSeed);
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const clock = Date.now() - start;
      lifeClock.set(clock);
      timer = setTimeout(tick, nextLifeTick(clock, seeds));
    };
    tick();
    return () => clearTimeout(timer);
  }, [living, lifeClock]);
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
        style={{ width: viewport.width, height: viewport.height }}
      >
        {/* The rooms are clipped to the play area; the carried layer below is not, so a thing
            carried onto a room button or the Friends button stays visible above the bar. */}
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0, width: viewport.width, height: viewport.height,
          overflow: "hidden", backgroundColor: "#BEE4DD" }}>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}><SkyArt /></View>
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
            const all = Object.values(scene.rooms[roomId].entities)
              .filter((e) => restingVisible(e, scene))
              .sort((a, b) => a.depth - b.depth || a.id.localeCompare(b.id));
            // HC-02: beach shells lie on the sand, outside the room's clip.
            const entities = all.filter((e) => e.contact.y <= SHORE_TOP), shore = all.filter((e) => e.contact.y > SHORE_TOP);
            const names = entityLabels(all);
            const resting = (entity: SceneEntity, front: boolean) => (
              <RestingEntity
                key={front ? `front:${entity.id}` : entity.id}
                front={front}
                cacheBlink={!front && !!entity.character && entity.room === liveRoom && !reduced}
                entity={entity}
                name={names[entity.id]}
                onNode={onNode}
                action={reactions[entity.id]}
                meal={meals[entity.id]}
                mealStandby={entity.id === standbyOwner ? mealStandby : undefined}
                mealVisible={!mealReady || mealReady[entity.id]===meals[entity.id]?.key}
                onMealPresented={onMealPresented}
                onMealFinished={onMealFinished}
                mealHeld={entity.attachment.kind === "hand" && meals[entity.attachment.character]?.action === "drink"}
                sleeping={!!sleeping[entity.id]}
                ownerKey={ancestors(entity, scene).join("|")}
                targetKey={scene.rooms[roomId].targets
                  .filter((t) => t.owner === entity.id && (t.kind === "mouth" || t.kind === "hand"))
                  .map((t) => t.id)
                  .join("|")}
                restingFlags={interaction.restingFlags}
                restingMotion={interaction.restingMotion}
                landingKey={scene.rooms[roomId].targets.filter(t => t.owner === entity.id && t.kind !== "mouth" && t.kind !== "hand").map(t => t.id).join("|")}
                acknowledgeLayout={interaction.acknowledgeLayout}
                reduced={reduced}
                renderCharacter={renderCharacter}
                selected={!front && selected === entity.id}
                designing={designing}
                onSelect={onSelect}
                onMove={onMove}
                life={living && !front && alive(entity) ? lifeClock : undefined}
                mood={front ? undefined : moods[entity.id]}
                shadow={front ? undefined : shadows[entity.id]}
                {...heldBy(entity, scene)}
              />
            );
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
                    <RoomArt theme={room.theme} badges={[...badges]} reduced={reduced} live />
                  ) : (
                    <RoomShellArt room={roomId} theme={room.theme} live />
                  )}
                </View>
                {/* Painted room set dressing stays registered to the room; movable props are separate entities. */}
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
                    {litLamps(scene, roomId).map((lamp) => <LampGlow key={`glow:${lamp.id}`} lamp={lamp} reduced={reduced} />)}
                    {paintEntries(entities, scene).flatMap(({ entity, front }, order, entries) => [
                      ...(order === entries.findIndex((entry) => entry.entity.item?.layer !== "ground")
                        ? scene.rooms[roomId].targets.filter((target) => target.rim && scene.entities[target.owner]?.item?.layer === "ground").map((target) => <SeatRimCue key={`rim:${target.id}`} target={target} interaction={interaction} />)
                        : []),
                      resting(entity, front),
                    ])}
                    {scene.rooms[roomId].targets.filter((target) => !target.rim || scene.entities[target.owner]?.item?.layer !== "ground").map((target) => (
                      <TargetCue key={target.id} target={target} interaction={interaction} />
                    ))}
                    {effects.some((e) => e.room === roomId) && <Effects effects={effects.filter((e) => e.room === roomId)} reduced={reduced} />}
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
                {shore.length > 0 && (
                  <View pointerEvents="box-none" style={{ position: "absolute", left: 0, top: 0 }}>
                    {shore.map((entity) => resting(entity, false))}
                  </View>
                )}
              </View>
            );
          })}
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: "absolute", width: building.width, height: building.height }}>
            <BuildingTrim building={building} />
          </View>
          {debugLayer}
        </Animated.View>
        </View>
        <Animated.View accessible={false} importantForAccessibility="no" pointerEvents="none"
          style={[{ position: "absolute", width: building.width, height: building.height }, cameraStyle]}>
          <DragOverlay
            activeRoom={state.current}
            scene={scene}
            pickups={pickups}
            hiddenByMeal={Object.entries(meals).flatMap(([id,m])=>m.source && (!mealReady || mealReady[id]===m.key)?[m.source]:[])}
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
