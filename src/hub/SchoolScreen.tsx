import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, Button, Copy, Heading, PressableScale } from '../components/ui';
import { CHROME_MAX, LARGE_TEXT, TITLE_MAX, sharedWordFit, wordFitMultiplier } from '../components/wordFit';
import { IslandIcon, GameIcon } from '../components/GameIcon';
import { subjects } from './model';
import { Landmark } from './Landmarks';
const TILE_PADDING = 16, TILE_BORDER = 1, NAME_SIZE = 21;
export default function SchoolScreen() {
 const { width, fontScale } = useWindowDimensions();
 const columns = fontScale > 1.5 || width < 340 ? 1 : width > 650 ? 3 : 2, large = fontScale >= LARGE_TEXT;
 const tile = (Math.min(width-40, 900)-(columns-1)*12)/columns, line = Math.min(width-40, 900);
 // Every subject name shares one size that stops where its longest word still fits its tile (never past 2x), so no name breaks mid-word.
 const nameMax = sharedWordFit(subjects.map(subject => subject.name), NAME_SIZE, tile-2*TILE_PADDING-2*TILE_BORDER, TITLE_MAX);
 const fit = (text: string, size: number, room = line, ceiling = CHROME_MAX) => wordFitMultiplier(text, size, room, ceiling);
 return <SafeAreaView style={{ flex: 1, backgroundColor: '#F7EED7' }}><ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 940, width: '100%', alignSelf: 'center' }}>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}><Button quiet compact maxFontSizeMultiplier={1.3} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} label="Back to map">← Map</Button><Heading maxFontSizeMultiplier={fit('School', 27)} style={{ fontSize: 27 }}>School</Heading></View>
  <View style={{ flexDirection: large ? 'column' : 'row', alignItems: 'center', gap: 16 }}><View style={{ width: 110, height: 90 }}><Landmark id="school"/></View><View style={{ flex: 1, ...(large ? { alignSelf: 'stretch' as const } : {}) }}><Heading maxFontSizeMultiplier={fit('What are you curious about?', 24, large ? line : line-126)} style={{ fontSize: 24 }}>What are you curious about?</Heading><Copy maxFontSizeMultiplier={CHROME_MAX}>Six little islands. Take your time.</Copy></View></View>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{subjects.map(subject => <PressableScale key={subject.id} accessibilityRole="button" accessibilityLabel={`Open ${subject.name} island`} onPress={() => subject.id === 'chamoru' ? router.push({ pathname: '/learn', params: { game: 'hafa-adai' } }) : router.push({ pathname: '/shelf', params: { island: subject.id } })} style={{ width: tile, minHeight: 164, padding: TILE_PADDING, gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: subject.color, borderColor: '#C7CFBA', borderWidth: TILE_BORDER, boxShadow: '0px 4px 0px rgba(68,89,62,.12)' }}>
   {subject.id === 'chamoru' ? <GameIcon id="hafa-adai" size={86}/> : <IslandIcon island={subject.id} size={86}/>}<Heading maxFontSizeMultiplier={nameMax} style={{ fontSize: NAME_SIZE, textAlign: 'center' }}>{subject.name}</Heading>
  </PressableScale>)}</View>
  <Copy maxFontSizeMultiplier={CHROME_MAX} style={{ textAlign: 'center', color: C.teal }}>Choose a place to begin. Your work will be here when you return.</Copy>
 </ScrollView></SafeAreaView>;
}
