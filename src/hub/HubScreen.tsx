import React, { useCallback, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useIsFocused } from 'expo-router';
import { Heading, PressableScale } from '../components/ui';
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
import { Icon as KitIcon, type IconGlyph } from '../ui/Icon';
import { BookOpen, GridFour, LockSimple, Play, Sparkle, Star } from '../ui/icons';
import { Text } from '../ui/Text';
import { theme } from '../ui/theme';
import { IslandScene } from './IslandScene';
import { openGame, placeRoute } from './navigation';
import type { PlaceId } from './model';
import { coveContinue, CovePersonResume } from '../cove/HubCove';
import { infoFor } from '../cove/catalog';

function FirstIslander({ allowed }: { allowed: boolean }) {
 const store = useStore(), person = personFor(store.save), clear = useSheetsClear(), [open, setOpen] = useState(!person.made);
 return open && allowed && clear ? <Creator onClose={() => setOpen(false)}/> : null;
}

export default function HubScreen() {
 const store = useStore(), { width, height, fontScale } = useWindowDimensions(), insets = useSafeAreaInsets();
 const focused = useIsFocused(), reduced = useReducedMotion(), clear = useSheetsClear();
 const [settings, setSettings] = useState(false), [door, setDoor] = useState<PlaceId | null>(null);
 const narrow = width < 360;
 const sceneWidth = Math.min(width - insets.left - insets.right, 1100);
 const sceneHeight = Math.max(height - insets.top - insets.bottom - 134, 590);
 const learner = activeLearner(store.save.learning), resume = homeContinue(store.save), coveResume = coveContinue(store.save);
 const arrive = useCallback((place: PlaceId) => { setDoor(place); router.push(placeRoute(place)); }, []);
 if (!store.ready) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}><Heading>Getting your island ready…</Heading></SafeAreaView>;
 if (store.recovery) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}><Recovery/></SafeAreaView>;
 const dock = (label: string, glyph: IconGlyph, action: () => void, detail?: string, testID?: string, primary = false) => (
  <PressableScale
   testID={testID}
   accessibilityRole="button"
   accessibilityLabel={detail ? `${label}: ${detail}` : label}
   onPress={action}
   style={[
    { flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 18, justifyContent: 'center', alignItems: 'center', gap: 3 },
    primary && { backgroundColor: theme.colors.lagoonSoft },
   ]}
  >
   <KitIcon glyph={glyph} size={20} tone="lagoon" weight={primary ? 'fill' : 'bold'}/>
   <Text variant="section" maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={{ fontSize: narrow ? 13 : 14, lineHeight: 18, color: theme.colors.ink, textAlign: 'center' }}>{label}</Text>
  </PressableScale>
 );
 return <SafeAreaView style={{ flex: 1, backgroundColor: '#AFDAD6' }} edges={['top', 'left', 'right', 'bottom']}>
  <View style={{ minHeight: 58, paddingHorizontal: narrow ? 10 : 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.hairline }}>
   <Text variant="display" maxFontSizeMultiplier={1.3} numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1, flexShrink: 1, minWidth: width < 340 ? 48 : 80, fontSize: 18, lineHeight: 22, color: theme.colors.ink, maxWidth: 150 }}>little island</Text>
   <View style={{ flex: 1, flexShrink: 1, minWidth: 92, alignItems: 'flex-end' }}><LearnerChip compact/></View>
   <PressableScale testID="hub-everything" accessibilityRole="button" accessibilityLabel="Everything: all places and games" onPress={() => router.push('/everything')} style={{ width: theme.target.min, height: theme.target.min, borderRadius: theme.radius.full, backgroundColor: theme.colors.lagoonSoft, alignItems: 'center', justifyContent: 'center' }}><KitIcon glyph={GridFour} size={22} tone="ink"/></PressableScale>
   <PressableScale testID="hub-settings" accessibilityRole="button" accessibilityLabel="Open sound settings, practice and grown-up backups" onPress={() => setSettings(true)} style={{ width: theme.target.min, height: theme.target.min, borderRadius: theme.radius.full, backgroundColor: theme.pastels.arcade, alignItems: 'center', justifyContent: 'center' }}><KitIcon glyph={LockSimple} size={22} tone="ink"/></PressableScale>
  </View>
  <SaveStatus/>
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}>
   <IslandScene width={sceneWidth} height={sceneHeight} fontScale={Math.min(fontScale, 1.3)} look={personFor(store.save).look} reduced={reduced} active={focused && !settings && clear} door={door} onArrive={arrive}/>
  </ScrollView>
  <CovePersonResume/>
  <View style={{ paddingHorizontal: narrow ? 10 : 18, paddingVertical: 8, backgroundColor: '#AFDAD6' }}>
   <View style={{ flexDirection: 'row', gap: 4, padding: 4, maxWidth: 540, width: '100%', alignSelf: 'center', backgroundColor: theme.colors.bg, borderRadius: theme.radius.tile, borderWidth: 1, borderColor: '#91B7A9', ...theme.shadow }}>
    {coveResume ? dock('Continue', Play, () => router.push({ pathname: '/cove', params: { game: coveResume.game, resume: '1' } }), infoFor(coveResume.game).name, 'hub-dock-continue', true) : null}
    {resume && dock('School', BookOpen, () => openGame(resume), shelfGames.find(game => game.id === resume)?.name, 'hub-dock-school')}
    {dock('Try today', Sparkle, () => router.push({ pathname: '/everything', params: { section: 'ideas' } }), undefined, 'hub-dock-ideas')}
    {dock('Favorites', Star, () => router.push({ pathname: '/everything', params: { section: 'favorites' } }), undefined, 'hub-dock-favorites')}
   </View>
  </View>
  <Settings visible={settings} onClose={() => setSettings(false)}/>
  <FirstIslander key={`${learner.id}:${store.epoch}`} allowed={focused && !settings}/>
 </SafeAreaView>;
}
