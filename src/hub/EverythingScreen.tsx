import { WordGamesCards } from '../wordgames/WordGamesCards';
import { AtmosphereHeader } from '../atmosphere/AtmosphereHeader';
import { C as BaseC, Heading as BaseHeading, Copy as BaseCopy, Button as BaseButton , IconButton, PressableScale } from "../components/ui";
import { useNunitoLoaded } from "../ui/fonts";

import React, { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { TextFit, entryRegion } from '../components/Text';
import { LARGE_TEXT } from '../components/wordFit';
import { GameIcon } from '../components/GameIcon';
import { SaveStatus } from '../components/SaveStatus';
import { Recovery } from '../components/Recovery';
import { Settings } from '../components/Settings';
import { useStore } from '../state/Store';
import { dailySuggestions, homeContinue, shelfGames, type ShelfGame } from '../learn/home';
import { returnLabel } from '../arcade/presentation';
import { Landmark } from './Landmarks';
import { homeShortcuts, places } from './model';
import { openGame, placeRoute } from './navigation';
import { CoveLists } from '../cove/HubCove';
export default function EverythingScreen() {
 const { section } = useLocalSearchParams<{ section?: string }>(), store = useStore();
 const { width, fontScale } = useWindowDimensions(), narrow = width < 340 || fontScale > 1.5;
 // At accessibility sizes every title, game name and sentence stops at 1.5x and fits its line (the list text sits beside a 52-pt star).
 const region = entryRegion(fontScale, Math.min(width, 760) - 40 - 52);
 // The title bar scrolls away with the page at accessibility sizes instead of holding a fifth of the screen.
 const scrollBar = fontScale >= LARGE_TEXT;
 const [shuffle, setShuffle] = useState(0), [settings, setSettings] = useState(false);
 const favorites = store.save.favoriteGames ?? [], resume = homeContinue(store.save);
 const ideas = dailySuggestions(store.save, undefined, shuffle).map(id => shelfGames.find(game => game.id === id)!);
 const rows = (games: ShelfGame[]) => games.map(game => <View key={game.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.line, backgroundColor: C.paper, borderRadius: 22, padding: 12, marginTop: 10 }}>
  <PressableScale accessibilityRole="button" accessibilityLabel={`Play ${game.name}`} onPress={() => openGame(game.id)} style={{ flex: 1, flexDirection: narrow ? 'column' : 'row', gap: 12, alignItems: narrow ? 'flex-start' : 'center', paddingVertical: 6 }}><GameIcon id={game.id} size={52}/><View style={{ flex: 1, ...(narrow ? { width: '100%' as const } : {}) }}><Heading style={{ fontSize: 18 }}>{game.name}</Heading><Copy style={{ fontSize: 15, lineHeight: 21 }}>{game.description}</Copy></View></PressableScale>
  <IconButton icon={favorites.includes(game.id) ? 'star-filled' : 'star'} selected={favorites.includes(game.id)} label={`${favorites.includes(game.id) ? 'Remove favorite' : 'Favorite'} ${game.name}`} onPress={() => store.toggleGameFavorite(game.id)}/>
 </View>);
 const fav = <View style={{ gap: 8 }}><Heading style={{ fontSize: 24 }}>Favorites</Heading>{favorites.length ? rows(shelfGames.filter(game => favorites.includes(game.id))) : <Copy>Tap a star beside a game to keep it here.</Copy>}</View>;
 const suggestions = <View style={{ gap: 8 }}><View style={{ flexDirection: narrow ? 'column' : 'row', alignItems: narrow ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 8 }}><Heading style={{ fontSize: 24 }}>Try today</Heading><Button quiet compact onPress={() => setShuffle(value => value+1)} label="Shuffle today's three game suggestions">Shuffle</Button></View>{rows(ideas)}</View>;
 const pocket = section === 'favorites' || section === 'ideas';
 const bar = <View style={{ padding: 16, gap: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}><AtmosphereHeader/><Button quiet compact onPress={() => router.canGoBack() ? router.back() : router.replace('/')} label="Back to map">← Map</Button><Heading style={{ fontSize: 26, flex: 1, ...(narrow ? { flexBasis: '100%' as const } : {}) }}>{pocket ? 'Your pocket' : 'Everything'}</Heading></View>
 if (!store.ready) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><Heading>Getting your island ready…</Heading></SafeAreaView>;
 if (store.recovery) return <SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}><Recovery/></SafeAreaView>;
 return <TextFit.Provider value={region}><SafeAreaView style={{ flex: 1, backgroundColor: C.cream }}>
  {!scrollBar && bar}
  {!scrollBar && <SaveStatus/>}
  <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 32 }}>
   {scrollBar && <>{bar}<SaveStatus/></>}
   <WordGamesCards/>
   {section === 'favorites' ? <>{fav}<CoveLists favorites/></> : section === 'ideas' ? suggestions : <>
    <View style={{ gap: 8 }}><Heading style={{ fontSize: 24 }}>Continue</Heading>{resume ? <><Copy>{returnLabel(resume)}</Copy>{rows([shelfGames.find(game => game.id === resume)!])}</> : <Copy>Saved games will be here when you’re ready.</Copy>}</View>
    {suggestions}{fav}<CoveLists/>
    <View style={{ gap: 8 }}>
     <Heading style={{ fontSize: 24 }}>Places</Heading>
     {places.map(place => <PressableScale key={place.id} accessibilityRole="button" accessibilityLabel={`Visit ${place.name}`} onPress={() => router.push(placeRoute(place.id))} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8, borderBottomColor: C.line, borderBottomWidth: 1 }}><View style={{ width: 84, height: 66 }}><Landmark id={place.id}/></View><View style={{ flex: 1 }}><Heading style={{ fontSize: 20 }}>{place.name}</Heading><Copy>{place.hint}</Copy></View></PressableScale>)}
     <View style={{ gap: 6, marginTop: 6 }}>
      <Heading style={{ fontSize: 18 }}>Inside Home</Heading>
      {homeShortcuts.map(item => <PressableScale key={item.id} testID={`home-shortcut-${item.id}`} accessibilityRole="button" accessibilityLabel={`Open ${item.name} in Home`} onPress={() => router.push(item.route)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#FFE3D6' }}><View style={{ flex: 1 }}><Heading style={{ fontSize: 18 }}>{item.name}</Heading><Copy style={{ fontSize: 15, lineHeight: 21 }}>{item.hint}</Copy></View></PressableScale>)}
     </View>
    </View>
    <View testID="all-games"><Heading style={{ fontSize: 24 }}>All games</Heading>{rows(shelfGames)}</View>
   </>}
   {pocket && <Button quiet onPress={() => router.setParams({ section: 'all' })}>Everything →</Button>}
   <Button quiet onPress={() => setSettings(true)}>Sound, practice and grown-up settings</Button>
   <Copy style={{ fontSize: 13, textAlign: 'center' }}>Offline · No ads · Made for little moments together.</Copy>
   <Copy style={{ fontSize: 13, textAlign: 'center' }}>Made with aloha by Shimizu Technology</Copy>
  </ScrollView><Settings visible={settings} onClose={() => setSettings(false)}/>
 </SafeAreaView></TextFit.Provider>;
}

const C = { ...BaseC, cream: '#FFF6E5', paper: '#FFFDF8', line: '#E8D8BE', ink: '#3D2B24', muted: '#665247', teal: '#9A641A', soft: '#FFF0D2', coral: '#FF7A5C' };
function Heading(props: React.ComponentProps<typeof BaseHeading>) {
 const loaded = useNunitoLoaded();
 return <BaseHeading {...props} style={[{ color: '#3D2B24' }, props.style, loaded ? {fontFamily: 'Nunito_800ExtraBold', fontWeight: 'normal'} : {fontWeight: '800'}]}/>;
}
function Copy(props: React.ComponentProps<typeof BaseCopy>) {
 const loaded = useNunitoLoaded();
 return <BaseCopy {...props} style={[{ color: '#665247' }, props.style, loaded && {fontFamily: 'Nunito_600SemiBold', fontWeight: 'normal'}]}/>;
}
function Button(props: React.ComponentProps<typeof BaseButton>) {
 const loaded = useNunitoLoaded();
 return <BaseButton {...props} style={{...props.style, backgroundColor: props.quiet ? '#FFFDF8' : '#FF7A5C', borderWidth: props.quiet ? (props.selected ? 2 : 1) : 0, borderColor: props.selected ? '#3D2B24' : props.quiet ? '#E8D8BE' : 'transparent'}} textStyle={{...props.textStyle, color: '#3D2B24', ...(loaded ? {fontFamily: 'Nunito_800ExtraBold', fontWeight: 'normal'} : {})}}/>;
}
