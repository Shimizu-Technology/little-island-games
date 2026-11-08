import React, { useCallback, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useIsFocused } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, Heading, PressableScale, font } from '../components/ui';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useReducedMotion } from '../components/motion';
import { useSheetsClear } from '../components/sheetPresence';
import { Settings } from '../components/Settings';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { LearnerChip } from '../personalization/LearnerChip';
import { Creator } from '../personalization/Creator';
import { personFor } from '../personalization/model';
import { activeLearner } from '../learn/learners';
import { homeContinue, shelfGames } from '../learn/home';
import { useStore } from '../state/Store';
import { IslandScene } from './IslandScene';
import { openGame, placeRoute } from './navigation';
import type { PlaceId } from './model';
import { coveContinue } from '../cove/HubCove';
import { infoFor } from '../cove/catalog';
function HeaderIcon({ lock = false }: { lock?: boolean }) {
 return <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>{lock ? <><Path d="M7 10V7a5 5 0 0110 0v3M5 10h14v11H5Z" fill="none" stroke={C.ink} strokeWidth={1.8}/><Circle cx={12} cy={15} r={1.5} fill={C.ink}/></> : <Path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" stroke={C.ink} strokeWidth={2} strokeLinecap="round"/>}</Svg>;
}
function FirstIslander({ allowed }: { allowed: boolean }) {
 const store = useStore(), person = personFor(store.save), clear = useSheetsClear(), [open, setOpen] = useState(!person.made);
 return open && allowed && clear ? <Creator onClose={() => setOpen(false)}/> : null;
}
export default function HubScreen() {
 const store = useStore(), { width, height, fontScale } = useWindowDimensions(), insets = useSafeAreaInsets();
 const focused = useIsFocused(), reduced = useReducedMotion(), clear = useSheetsClear();
 const [settings, setSettings] = useState(false), [door, setDoor] = useState<PlaceId | null>(null);
 const sceneWidth = Math.min(width-insets.left-insets.right, 1100);
 const sceneHeight = Math.max(height-insets.top-insets.bottom-134, 590);
 const learner = activeLearner(store.save.learning), resume = homeContinue(store.save), coveResume = coveContinue(store.save);
 const arrive = useCallback((place: PlaceId) => { setDoor(place); router.push(placeRoute(place)); }, []);
 if (!store.ready) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><Heading>Getting your island ready…</Heading></SafeAreaView>;
 if (store.recovery) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><Recovery/></SafeAreaView>;
 const dock = (label: string, icon: 'star' | 'refresh' | 'right', action: () => void, detail?: string) => <PressableScale accessibilityRole="button" accessibilityLabel={detail ? `${label}: ${detail}` : label} onPress={action} style={{ flex: 1, minHeight: 52, paddingVertical: 8, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center', gap: 4 }}><Icon name={icon} size={20} color={C.teal}/><Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font, fontSize: 15, fontWeight: '700', color: C.ink, textAlign: 'center' }}>{label}</Text></PressableScale>;
 return <SafeAreaView style={{ flex: 1, backgroundColor: '#AFDAD6' }} edges={['top', 'left', 'right', 'bottom']}>
  <View style={{ minHeight: 58, paddingHorizontal: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, backgroundColor: C.cream }}>
   <Text maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, flexShrink: 1, minWidth: width < 340 ? 48 : 80, fontFamily: font, fontSize: 17, fontWeight: '800', color: C.ink, maxWidth: 145 }}>little island</Text>
   <View style={{ flex: 1, flexShrink: 1, minWidth: 100, alignItems: 'flex-end' }}><LearnerChip compact/></View>
   <PressableScale accessibilityRole="button" accessibilityLabel="Everything: all places and games" onPress={() => router.push('/everything')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' }}><HeaderIcon/></PressableScale>
   <PressableScale accessibilityRole="button" accessibilityLabel="Open sound settings, practice and grown-up backups" onPress={() => setSettings(true)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0E8D7', alignItems: 'center', justifyContent: 'center' }}><HeaderIcon lock/></PressableScale>
  </View>
  <SaveStatus/>
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}>
   <IslandScene width={sceneWidth} height={sceneHeight} fontScale={Math.min(fontScale, 1.3)} look={personFor(store.save).look} reduced={reduced} active={focused && !settings && clear} door={door} onArrive={arrive}/>
  </ScrollView>
  <View style={{ paddingHorizontal: 18, paddingVertical: 8, backgroundColor: '#AFDAD6' }}><View style={{ flexDirection: 'row', maxWidth: 520, width: '100%', alignSelf: 'center', backgroundColor: '#FFFAEB', borderRadius: 24, borderWidth: 1, borderColor: '#91B7A9', boxShadow: '0px 4px 12px rgba(43,80,67,.1)' }}>
   {coveResume ? dock('Continue', 'right', () => router.push({ pathname: '/cove', params: { game: coveResume.game } }), infoFor(coveResume.game).name) : resume && dock('Continue', 'right', () => openGame(resume), shelfGames.find(game => game.id === resume)?.name)}
   {dock('Try today', 'refresh', () => router.push({ pathname: '/everything', params: { section: 'ideas' } }))}
   {dock('Favorites', 'star', () => router.push({ pathname: '/everything', params: { section: 'favorites' } }))}
  </View></View>
  <Settings visible={settings} onClose={() => setSettings(false)}/>
  <FirstIslander key={`${learner.id}:${store.epoch}`} allowed={focused && !settings}/>
 </SafeAreaView>;
}
