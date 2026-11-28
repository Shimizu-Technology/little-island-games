import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { Islander, type IslanderLook } from '../islander';
import { Text } from '../ui/Text';
import { theme } from '../ui/theme';
import { C } from '../components/ui';
import { Terrain } from './Terrain';
import { Landmark } from './Landmarks';
import { IslandLife, type MapEasterEggEvent } from './IslandLife';
import { COCOS_SAIL_MS, createJourney, guideStartPoint, guideWaypoints, mapExtrasLayout, mapLayout, OCEAN_SPLASH_MS, WALK_MS, ZOOM_MS, type MapExcursionId, type PlaceId } from './model';
import { GlobalWeatherLayer } from '../atmosphere/GlobalWeatherLayer';
import { defaultAtmosphere, type Atmosphere } from '../atmosphere/palette';
import type { HomeSound } from '../home/runtime/homeSound';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PlaceButton = memo(function PlaceButton({ id, name, width, height, labelWidth, labelFontSize, labelHeight, left, top, reduced, visit, night = false }: { id: PlaceId; name: string; width: number; height: number; labelWidth: number; labelFontSize: number; labelHeight: number; left: number; top: number; reduced: boolean; visit: (place: PlaceId) => void; night?: boolean }) {
 const press = useSharedValue(0), [focused, setFocused] = useState(false);
 const style = useAnimatedStyle(() => ({
  opacity: 1 - press.get() * .16,
  transform: [{ scale: 1 - press.get() * (reduced ? 0 : .05) }],
 }), [reduced]);
 const boxWidth = Math.max(48, width, labelWidth);
 const pillPadX = labelWidth < 80 ? 2 : labelWidth < 110 ? 3 : labelWidth < 140 ? 5 : 12;
 return <AnimatedPressable testID={`place-${id}`} accessibilityRole="button" accessibilityLabel={`Visit ${name}`} onPress={() => visit(id)}
  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
  onPressIn={() => press.set(reduced ? 1 : withTiming(1, { duration: 40, easing: Easing.out(Easing.cubic) }))}
  onPressOut={() => press.set(reduced ? 0 : withTiming(0, { duration: 85, easing: Easing.out(Easing.cubic) }))}
  style={[{ position: 'absolute', left: left + (width - boxWidth) / 2, top, minWidth: 48, width: boxWidth, height: height + labelHeight, alignItems: 'center', borderRadius: 18, ...(Platform.OS === 'web' ? {} : { outlineColor: C.blue, outlineWidth: focused ? 3 : 0, outlineStyle: 'solid' as const }) }, style]}>
   <View pointerEvents="none" style={{ width, height, alignItems: 'center', justifyContent: 'flex-end' }}>
    <View style={{ width, height, transform: [{ scale: 1.14 }, { translateY: Math.round(height * .03) }] }}>{night && <View testID="island-lantern" style={{ position: 'absolute', left: width * .28, bottom: 0, width: width * .44, height: height * .3, borderRadius: 50, backgroundColor: '#FFD38370', boxShadow: '0 0 18px #FFD38399' }}/>}<Landmark id={id}/></View>
   </View>
   <View testID={`place-label-${id}`} style={{ minHeight: labelHeight, width: labelWidth, maxWidth: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF7E4', paddingHorizontal: pillPadX, paddingVertical: 3, borderRadius: 12, borderWidth: 1.5, borderColor: '#B59E76', boxShadow: '0px 3px 0px rgba(68,89,62,.16)' }}>
    <Text variant="section" maxFontSizeMultiplier={1.3} numberOfLines={2} style={{ fontSize: labelFontSize, lineHeight: labelFontSize + 4, color: theme.colors.ink, textAlign: 'center' }}>{name}</Text>
   </View>
 </AnimatedPressable>;
});
export function IslandScene({ width, height, fontScale, look, reduced, active, door, onArrive, onExcursion, onSound, atmosphere = defaultAtmosphere, weatherActive = active }: { width: number; height: number; fontScale: number; look: IslanderLook; reduced: boolean; active: boolean; door: PlaceId | null; onArrive: (place: PlaceId) => void; onExcursion?: (place: MapExcursionId) => void; onSound?: (sound: HomeSound) => void; atmosphere?: Atmosphere; weatherActive?: boolean }) {
 const layout = useMemo(() => mapLayout(width, height, fontScale), [width, height, fontScale]);
 const extras = useMemo(() => mapExtrasLayout(width, height, layout), [width, height, layout]);
 const doorPlace = door ? layout.targets.find(place => place.id === door) ?? null : null;
 const start = doorPlace?.door ?? guideStartPoint(layout, width, height);
 const x = useSharedValue(start.x), y = useSharedValue(start.y), bob = useSharedValue(0), zoom = useSharedValue(1), cameraX = useSharedValue(0), cameraY = useSharedValue(0), opacity = useSharedValue(1);
 const [walking, setWalking] = useState(false);
 const [easterEgg, setEasterEgg] = useState<MapEasterEggEvent | null>(null);
 const departing = useRef(false), wasActive = useRef(active), excursionPending = useRef(false);
 const eggSerial = useRef(0), eggTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), excursionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
 const guideSize = layout.guideSize;
 const cancelExcursion = useCallback(() => {
  if (excursionTimer.current !== undefined) {
   clearTimeout(excursionTimer.current);
   excursionTimer.current = undefined;
  }
  excursionPending.current = false;
 }, []);
 const triggerEgg = useCallback((kind: MapEasterEggEvent['kind'], ex: number, ey: number, toX?: number, toY?: number) => {
  clearTimeout(eggTimer.current);
  const id = ++eggSerial.current;
  setEasterEgg({ id, kind, x: ex, y: ey, toX, toY });
  eggTimer.current = setTimeout(() => { setEasterEgg(cur => (cur?.id === id ? null : cur)); }, reduced ? 550 : 1200);
 }, [reduced]);
 const settle = useMemo(() => (place: PlaceId) => {
  const target = layout.targets.find(item => item.id === place)!.door;
  cancelExcursion();
  cancelAnimation(x); cancelAnimation(y); cancelAnimation(bob); cancelAnimation(zoom); cancelAnimation(cameraX); cancelAnimation(cameraY);
  departing.current = true;
  x.set(target.x); y.set(target.y); bob.set(0); setWalking(false); onArrive(place);
 }, [layout, cancelExcursion, x, y, bob, zoom, cameraX, cameraY, onArrive]);
 // eslint-disable-next-line react-hooks/refs -- createJourney stores settle for input/timer callbacks; it never calls it during render.
 const journey = useMemo(() => createJourney(settle), [settle]);
 useEffect(() => () => { journey.cancel(); cancelExcursion(); clearTimeout(eggTimer.current); }, [journey, cancelExcursion]);
 useLayoutEffect(() => {
  const returning = active && !wasActive.current;
  wasActive.current = active;
  // A route push, app interruption, rotation or text resize cancels unfinished travel and one-shot eggs.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Interrupted travel settles at the last accepted door.
  setWalking(false); journey.cancel(); cancelExcursion(); clearTimeout(eggTimer.current); setEasterEgg(null); cancelAnimation(x); cancelAnimation(y); cancelAnimation(bob); cancelAnimation(zoom); cancelAnimation(cameraX); cancelAnimation(cameraY); cancelAnimation(opacity);
  // Updating the accepted door and losing focus both happen while the outgoing
  // map can still be visible. Freeze its camera until the next activation.
  if (departing.current && !returning) return;
  departing.current = false;
  x.set(start.x); y.set(start.y); bob.set(0); zoom.set(1); cameraX.set(0); cameraY.set(0); opacity.set(active && reduced ? withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 120 })) : 1);
 }, [active, width, height, reduced, start.x, start.y, journey, cancelExcursion, x, y, bob, zoom, cameraX, cameraY, opacity]);
 const visitExcursion = useCallback((place: MapExcursionId) => {
  const hadPending = journey.isPending() || excursionPending.current;
  journey.cancel();
  cancelExcursion();
  cancelAnimation(x); cancelAnimation(y); cancelAnimation(bob); cancelAnimation(zoom); cancelAnimation(cameraX); cancelAnimation(cameraY);
  const dest = place === 'cocos-island' ? extras.cocos : extras.ocean;
  const boatOrigin = extras.sailboat ?? { x: Math.max(24, extras.cocos.x - 42), y: extras.cocos.y };
  onSound?.(place === 'cocos-island' ? 'shell' : 'splash');
  if (!active || reduced || hadPending) {
   // Under Reduce Motion or immediate replacement, navigate right away with zero dangling fade animation.
   clearTimeout(eggTimer.current);
   setEasterEgg(null);
   departing.current = true;
   x.set(dest.x); y.set(dest.y); bob.set(0); setWalking(false);
   onExcursion?.(place);
   return;
  }
  if (place === 'cocos-island') triggerEgg('sail', boatOrigin.x, boatOrigin.y, extras.cocos.x, extras.cocos.y);
  else triggerEgg('splash', extras.ocean.x, extras.ocean.y);
  setWalking(true);
  excursionPending.current = true;
  const totalMs = place === 'cocos-island' ? COCOS_SAIL_MS : OCEAN_SPLASH_MS;
  const travelMs = Math.max(WALK_MS, totalMs - ZOOM_MS);
  if (place === 'cocos-island') {
   // Hop to the little sailboat first, then glide across Cocos Lagoon to Secret Cocos Island!
   const hopMs = Math.round(travelMs * 0.35);
   const glideMs = travelMs - hopMs;
   x.set(withSequence(withTiming(boatOrigin.x, { duration: hopMs }), withTiming(dest.x, { duration: glideMs })));
   y.set(withSequence(withTiming(boatOrigin.y, { duration: hopMs }), withTiming(dest.y, { duration: glideMs })));
  } else {
   x.set(withTiming(dest.x, { duration: travelMs }));
   y.set(withTiming(dest.y, { duration: travelMs }));
  }
  bob.set(withSequence(withTiming(-5, { duration: Math.round(WALK_MS / 2), easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: Math.round(WALK_MS / 2) })));
  zoom.set(withDelay(travelMs, withTiming(1.16, { duration: ZOOM_MS, easing: Easing.out(Easing.cubic) })));
  cameraX.set(withDelay(travelMs, withTiming((width / 2 - dest.x) * 0.16, { duration: ZOOM_MS, easing: Easing.out(Easing.cubic) })));
  cameraY.set(withDelay(travelMs, withTiming((height / 2 - dest.y) * 0.16, { duration: ZOOM_MS, easing: Easing.out(Easing.cubic) })));
  excursionTimer.current = setTimeout(() => {
   excursionTimer.current = undefined;
   excursionPending.current = false;
   departing.current = true;
   setWalking(false);
   onExcursion?.(place);
  }, totalMs);
 }, [active, reduced, extras, journey, cancelExcursion, onSound, onExcursion, triggerEgg, width, height, x, y, bob, zoom, cameraX, cameraY]);
 const visit = useCallback((place: PlaceId) => {
  const interruptedExcursion = excursionPending.current;
  cancelExcursion();
  setEasterEgg(cur => (cur && (cur.kind === 'sail' || cur.kind === 'splash') ? null : cur));
  // A just-dismissed sheet can retain its presence token briefly. Never drop a visible tap.
  if (!active || interruptedExcursion) { journey.cancel(); settle(place); return; }
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
  const hopUp = Math.round(WALK_MS / 2), hopDown = WALK_MS - hopUp;
  bob.set(withSequence(withTiming(-4, { duration: hopUp, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: hopDown })));
  zoom.set(withDelay(WALK_MS, withTiming(1.16, { duration: ZOOM_MS, easing: Easing.out(Easing.cubic) })));
  cameraX.set(withDelay(WALK_MS, withTiming((width/2-target.x)*.16, { duration: ZOOM_MS, easing: Easing.out(Easing.cubic) })));
  cameraY.set(withDelay(WALK_MS, withTiming((height/2-target.y)*.16, { duration: ZOOM_MS, easing: Easing.out(Easing.cubic) })));
 }, [active, settle, journey, cancelExcursion, reduced, layout, width, height, x, y, bob, zoom, cameraX, cameraY]);
 const guide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get()-guideSize*.303 }, { translateY: y.get()-guideSize+bob.get() }] }));
 const camera = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ translateX: cameraX.get() }, { translateY: cameraY.get() }, { scale: zoom.get() }] }));
 return <Animated.View accessible={false} importantForAccessibility="no" testID={Platform.OS === "web" ? "island-scene" : undefined} style={[{ width, height }, camera]}>
  <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ position: 'absolute', width, height }}><Terrain layout={layout} wide={layout.wide} width={width} height={height}/></View>
  {/* Open surrounding turquoise ocean tap surface behind the 6 buildings and special hotspots */}
  <Pressable testID="map-open-water" accessible={false} onPress={() => visitExcursion('tumon-beach')} style={{ position: 'absolute', width, height }} />
  <IslandLife atmosphere={atmosphere} width={width} height={height} fontScale={fontScale} reduced={reduced} active={active} extras={extras} easterEgg={easterEgg}/>
  <GlobalWeatherLayer atmosphere={atmosphere} width={width} height={height} active={weatherActive} reduced={reduced} sky/>
  {/* Calibrated ocean water, Secret Cocos Island boat trip, sailboat, and subtle Easter-egg hotspots */}
  <Pressable testID="map-ocean-hotspot" accessibilityRole="button" accessibilityLabel="Splash at Tumon Beach and Ocean" onPress={() => visitExcursion('tumon-beach')}
   style={{ position: 'absolute', left: extras.ocean.left, top: extras.ocean.top, width: extras.ocean.width, height: extras.ocean.height, borderRadius: 26 }} />
  <Pressable testID="map-cocos-hotspot" accessibilityRole="button" accessibilityLabel="Sail to secret Cocos Island" onPress={() => visitExcursion('cocos-island')}
   style={{ position: 'absolute', left: extras.cocos.left, top: extras.cocos.top, width: extras.cocos.width, height: extras.cocos.height, borderRadius: 28 }} />
  {extras.sailboat && (
   <Pressable testID="map-sailboat-hotspot" accessibilityRole="button" accessibilityLabel="Sail the little boat to Cocos Island" onPress={() => visitExcursion('cocos-island')}
    style={{ position: 'absolute', left: extras.sailboat.left, top: extras.sailboat.top, width: extras.sailboat.width, height: extras.sailboat.height, borderRadius: 24 }} />
  )}
  {extras.dolphinReef && (
   <Pressable testID="map-dolphin-hotspot" accessibilityRole="button" accessibilityLabel="Spot a playful lagoon dolphin" onPress={() => { onSound?.('splash'); triggerEgg('dolphin', extras.dolphinReef!.x, extras.dolphinReef!.y); }}
    style={{ position: 'absolute', left: extras.dolphinReef.left, top: extras.dolphinReef.top, width: extras.dolphinReef.width, height: extras.dolphinReef.height, borderRadius: 26 }} />
  )}
  {extras.northernIslet && (
   <Pressable testID="map-northern-islet-hotspot" accessibilityRole="button" accessibilityLabel="Flutter hibiscus petals at the northern islet" onPress={() => { onSound?.('rustle'); triggerEgg('hibiscus', extras.northernIslet!.x, extras.northernIslet!.y); }}
    style={{ position: 'absolute', left: extras.northernIslet.left, top: extras.northernIslet.top, width: extras.northernIslet.width, height: extras.northernIslet.height, borderRadius: 26 }} />
  )}
  {atmosphere.timeOfDay === 'night' && extras.nightMoon && (
   <Pressable testID="map-moon-hotspot" accessibilityRole="button" accessibilityLabel="Wish on a night sky shooting star" onPress={() => { onSound?.('shell'); triggerEgg('shooting-star', extras.nightMoon!.x, extras.nightMoon!.y); }}
    style={{ position: 'absolute', left: extras.nightMoon.left, top: extras.nightMoon.top, width: extras.nightMoon.width, height: extras.nightMoon.height, borderRadius: 26 }} />
  )}
  {layout.targets.map(place => <PlaceButton key={place.id} {...place} height={layout.artHeight} labelHeight={layout.labelHeight} reduced={reduced} night={atmosphere.timeOfDay === 'night'} visit={visit}/>)}
  <Animated.View pointerEvents="none" testID="island-guide" accessibilityRole="image" accessibilityLabel={doorPlace ? `Your Islander at ${doorPlace.name}` : 'Your Islander on the island path'} style={[{ position: 'absolute', left: 0, top: 0, width: guideSize*.607, height: guideSize }, guide]}>
   <Islander look={look} view={walking && active ? 'back' : 'front'} pose={walking && active ? 0 : 'idle'} size={guideSize} reduced={reduced}/>
  </Animated.View>
 </Animated.View>;
}
