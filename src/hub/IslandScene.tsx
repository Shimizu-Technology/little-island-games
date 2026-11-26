import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { Islander, type IslanderLook } from '../islander';
import { Text } from '../ui/Text';
import { theme } from '../ui/theme';
import { C } from '../components/ui';
import { Terrain } from './Terrain';
import { Landmark } from './Landmarks';
import { IslandLife } from './IslandLife';
import { createJourney, guideStartPoint, guideWaypoints, mapLayout, WALK_MS, ZOOM_MS, type PlaceId } from './model';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PlaceButton = memo(function PlaceButton({ id, name, width, height, labelHeight, left, top, reduced, visit }: { id: PlaceId; name: string; width: number; height: number; labelHeight: number; left: number; top: number; reduced: boolean; visit: (place: PlaceId) => void }) {
 const pressed = useSharedValue(1), [focused, setFocused] = useState(false);
 const style = useAnimatedStyle(() => ({ transform: [{ scale: pressed.get() }] }));
 const tight = width < 140;
 const labelFontSize = Math.min(tight ? 15 : 16, Math.max(8, (width - 15) / 5.4));
 return <AnimatedPressable testID={`place-${id}`} accessibilityRole="button" accessibilityLabel={`Visit ${name}`} onPress={() => visit(id)}
  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
  onPressIn={() => pressed.set(reduced ? 1 : withTiming(.97, { duration: 90 }))} onPressOut={() => pressed.set(withTiming(1, { duration: 150 }))}
  style={[{ position: 'absolute', left, top, width, height: height + labelHeight, alignItems: 'center', borderRadius: 18, ...(Platform.OS === 'web' ? {} : { outlineColor: C.blue, outlineWidth: focused ? 3 : 0, outlineStyle: 'solid' as const }) }, style]}>
   <View pointerEvents="none" style={{ width, height }}><Landmark id={id}/></View>
   <View testID={`place-label-${id}`} style={{ minHeight: labelHeight, width: width < 140 ? '100%' : undefined, maxWidth: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF7E4', paddingHorizontal: tight ? 2 : 12, paddingVertical: 3, borderRadius: 12, borderWidth: 1.5, borderColor: '#B59E76', boxShadow: '0px 3px 0px rgba(68,89,62,.16)' }}>
    <Text variant="section" maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: labelFontSize, lineHeight: labelFontSize + 4, color: theme.colors.ink, textAlign: 'center' }}>{name}</Text>
   </View>
 </AnimatedPressable>;
});
export function IslandScene({ width, height, fontScale, look, reduced, active, door, onArrive }: { width: number; height: number; fontScale: number; look: IslanderLook; reduced: boolean; active: boolean; door: PlaceId | null; onArrive: (place: PlaceId) => void }) {
 const layout = useMemo(() => mapLayout(width, height, fontScale), [width, height, fontScale]);
 const doorPlace = door ? layout.targets.find(place => place.id === door) ?? null : null;
 const start = doorPlace?.door ?? guideStartPoint(layout, width, height);
 const x = useSharedValue(start.x), y = useSharedValue(start.y), bob = useSharedValue(0), zoom = useSharedValue(1), cameraX = useSharedValue(0), cameraY = useSharedValue(0), opacity = useSharedValue(1);
 const [walking, setWalking] = useState(false);
 const departing = useRef(false), wasActive = useRef(active);
 const pathGap = layout.wide ? Infinity : Math.min(...layout.targets.filter(t => t.x > .5).map(t => t.left)) - Math.max(...layout.targets.filter(t => t.x < .5).map(t => t.left + t.width));
 const guideSize = Math.min(96, width * .24, height * .20, (pathGap - 8) / .607);
 const settle = useMemo(() => (place: PlaceId) => {
  const target = mapLayout(width, height, fontScale).targets.find(item => item.id === place)!.door;
  cancelAnimation(x); cancelAnimation(y); cancelAnimation(bob); cancelAnimation(zoom); cancelAnimation(cameraX); cancelAnimation(cameraY);
  departing.current = true;
  x.set(target.x); y.set(target.y); bob.set(0); setWalking(false); onArrive(place);
 }, [width, height, fontScale, x, y, bob, zoom, cameraX, cameraY, onArrive]);
 // eslint-disable-next-line react-hooks/refs -- createJourney stores settle for input/timer callbacks; it never calls it during render.
 const journey = useMemo(() => createJourney(settle), [settle]);
 useEffect(() => () => journey.cancel(), [journey]);
 useLayoutEffect(() => {
  const returning = active && !wasActive.current;
  wasActive.current = active;
  // A route push, app interruption, rotation or text resize cancels unfinished travel.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Interrupted travel settles at the last accepted door.
  setWalking(false); journey.cancel(); cancelAnimation(x); cancelAnimation(y); cancelAnimation(bob); cancelAnimation(zoom); cancelAnimation(cameraX); cancelAnimation(cameraY); cancelAnimation(opacity);
  // Updating the accepted door and losing focus both happen while the outgoing
  // map can still be visible. Freeze its camera until the next activation.
  if (departing.current && !returning) return;
  departing.current = false;
  x.set(start.x); y.set(start.y); bob.set(0); zoom.set(1); cameraX.set(0); cameraY.set(0); opacity.set(active && reduced ? withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 120 })) : 1);
 }, [active, width, height, reduced, start.x, start.y, journey, x, y, bob, zoom, cameraX, cameraY, opacity]);
 const visit = (place: PlaceId) => {
  // A just-dismissed sheet can retain its presence token briefly. Never drop a visible tap.
  if (!active) { settle(place); return; }
  if (!journey.visit(place, reduced)) return;
  const target = layout.targets.find(item => item.id === place)!.door;
  const waypoints = guideWaypoints({ x: x.get(), y: y.get() }, target, layout, width, height);
  setWalking(true);
  // Follow the exact shared sandy path waypoints from the current position to the chosen door.
  if (waypoints.length <= 1) {
   x.set(target.x); y.set(target.y);
  } else {
   const lengths = waypoints.slice(1).map((pt, i) => Math.hypot(pt.x - waypoints[i].x, pt.y - waypoints[i].y));
   const totalLength = lengths.reduce((sum, len) => sum + len, 0) || 1;
   let spent = 0;
   const durations = lengths.map((len, i) => {
    const duration = i === lengths.length - 1 ? Math.max(1, WALK_MS - spent) : Math.max(1, Math.round((len / totalLength) * WALK_MS));
    spent += duration;
    return duration;
   });
   const xSteps = durations.map((duration, i) => withTiming(waypoints[i + 1].x, { duration }));
   const ySteps = durations.map((duration, i) => withTiming(waypoints[i + 1].y, { duration }));
   x.set(xSteps.length === 1 ? xSteps[0] : withSequence(...xSteps));
   y.set(ySteps.length === 1 ? ySteps[0] : withSequence(...ySteps));
  }
  bob.set(withSequence(...Array.from({ length: 3 }, () => withSequence(withTiming(-4, { duration: 62 }), withTiming(0, { duration: 64 })))));
  zoom.set(withDelay(WALK_MS, withTiming(1.16, { duration: ZOOM_MS, easing: Easing.out(Easing.cubic) })));
  cameraX.set(withDelay(WALK_MS, withTiming((width/2-target.x)*.16, { duration: ZOOM_MS })));
  cameraY.set(withDelay(WALK_MS, withTiming((height/2-target.y)*.16, { duration: ZOOM_MS })));
 };
 const guide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get()-guideSize*.303 }, { translateY: y.get()-guideSize+bob.get() }] }));
 const camera = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: cameraX.get() }, { translateY: cameraY.get() }, { scale: zoom.get() }] }));
 return <Animated.View accessible={false} importantForAccessibility="no" testID={Platform.OS === "web" ? "island-scene" : undefined} style={[{ width, height }, camera]}>
  <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: 'absolute', width, height }}><Terrain layout={layout} wide={layout.wide} width={width} height={height}/></View>
  <IslandLife width={width} height={height} fontScale={fontScale} reduced={reduced} active={active}/>
  {layout.targets.map(place => <PlaceButton key={place.id} {...place} height={layout.artHeight} labelHeight={layout.labelHeight} reduced={reduced} visit={visit}/>)}
  <Animated.View pointerEvents="none" testID="island-guide" accessibilityRole="image" accessibilityLabel={doorPlace ? `Your Islander at ${doorPlace.name}` : 'Your Islander on the island path'} style={[{ position: 'absolute', left: 0, top: 0, width: guideSize*.607, height: guideSize }, guide]}>
   <Islander look={look} view={walking && active ? 'back' : 'front'} pose={walking && active ? 0 : 'idle'} size={guideSize} reduced={reduced}/>
  </Animated.View>
 </Animated.View>;
}
