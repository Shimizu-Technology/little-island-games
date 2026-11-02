import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, Button, Copy, Heading, PressableScale } from '../components/ui';
import { IslandIcon, GameIcon } from '../components/GameIcon';
import { subjects } from './model';
import { Landmark } from './Landmarks';
export default function SchoolScreen() {
 const { width, fontScale } = useWindowDimensions();
 const columns = fontScale > 1.5 ? 1 : width > 650 ? 3 : 2;
 const tile = (Math.min(width-40, 900)-(columns-1)*12)/columns;
 return <SafeAreaView style={{ flex: 1, backgroundColor: '#F7EED7' }}><ScrollView contentContainerStyle={{ padding: 20, gap: 16, maxWidth: 940, width: '100%', alignSelf: 'center' }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Button quiet compact onPress={() => router.canGoBack() ? router.back() : router.replace('/')} label="Back to map">← Map</Button><Heading style={{ fontSize: 27 }}>School</Heading></View>
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}><View style={{ width: 110, height: 90 }}><Landmark id="school"/></View><View style={{ flex: 1 }}><Heading style={{ fontSize: 24 }}>What are you curious about?</Heading><Copy>Six little islands. Take your time.</Copy></View></View>
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{subjects.map(subject => <PressableScale key={subject.id} accessibilityRole="button" accessibilityLabel={`Open ${subject.name} island`} onPress={() => subject.id === 'chamoru' ? router.push({ pathname: '/learn', params: { game: 'hafa-adai' } }) : router.push({ pathname: '/shelf', params: { island: subject.id } })} style={{ width: tile, minHeight: 164, padding: 16, gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: subject.color, borderColor: '#C7CFBA', borderWidth: 1, boxShadow: '0px 4px 0px rgba(68,89,62,.12)' }}>
   {subject.id === 'chamoru' ? <GameIcon id="hafa-adai" size={86}/> : <IslandIcon island={subject.id} size={86}/>}<Heading style={{ fontSize: 21, textAlign: 'center' }}>{subject.name}</Heading>
  </PressableScale>)}</View>
  <Copy style={{ textAlign: 'center', color: C.teal }}>Choose a place to begin. Your work will be here when you return.</Copy>
 </ScrollView></SafeAreaView>;
}
