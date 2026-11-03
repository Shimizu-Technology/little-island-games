import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeCharacter } from '../../home/characterRenderer';
import { HandProp } from '../../home/art/PropShape';
import { companionMatrix, rigMatrix, rigStoryboard, type ProofFrame } from './gallery';

function Card({ frame, zoom, reduced }: { frame: ProofFrame; zoom: number; reduced: boolean }) {
  const held = frame.input.action ? <HandProp id={frame.input.action === 'eat' ? 'mango' : 'juice'}/> : undefined;
  return <View style={[styles.card, { width: 166*zoom, minHeight: 145*zoom }]}>
    <View style={{ minHeight: 100*zoom, justifyContent: 'center', alignItems: 'center' }}>
      <HomeCharacter input={{ ...frame.input, size: frame.input.size*zoom, held, reduced }} look={frame.look}/>
    </View><Text style={styles.label}>{frame.label}</Text>
  </View>;
}
export function RigGallery() {
  const [section, setSection] = useState<'Story' | 'Islander' | 'Companions'>('Story');
  const [page, setPage] = useState(0), [zoom, setZoom] = useState(1), [reduced, setReduced] = useState(false), [step, setStep] = useState(0);
  const frames = section === 'Story' ? rigStoryboard : section === 'Islander' ? rigMatrix : companionMatrix;
  const pages = Math.ceil(frames.length/12), visible = section === 'Story' ? frames : frames.slice(page*12, page*12+12);
  const button = (label: string, onPress: () => void, selected = false) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.button, selected && styles.selected]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Island friends · Rig proof</Text><Text style={styles.note}>3.0 render contract · no save changes · caller-controlled still frames</Text>
    <View style={styles.controls}>{(['Story', 'Islander', 'Companions'] as const).map(value => button(value, () => { setSection(value); setPage(0); }, section === value))}</View>
    <View style={styles.controls}>{button('Phone size', () => setZoom(1), zoom === 1)}{button('3× zoom', () => setZoom(3), zoom === 3)}{button(reduced ? 'Reduced motion on' : 'Reduced motion off', () => setReduced(v => !v), reduced)}</View>
    {section === 'Story' ? <>
      <Text style={styles.note}>Scrub the interaction. Pickup switches to carry immediately; juice leaves the pelvis seated.</Text>
      <View style={styles.controls}>{button('Previous frame', () => setStep(n => (n+6)%7))}{button('Next frame', () => setStep(n => (n+1)%7))}<Text style={styles.note}>{step+1} / 7</Text></View>
      <View testID="rig-live-frame"><Card frame={rigStoryboard[step]} zoom={zoom} reduced={reduced}/></View>
      <Text style={styles.heading}>Bed → carry → chair → juice → drink → bed → sleep</Text>
    </> : <View style={styles.controls}>{button('Previous page', () => setPage(n => (n+pages-1)%pages))}<Text style={styles.note}>Page {page+1} / {pages} · {frames.length} frames</Text>{button('Next page', () => setPage(n => (n+1)%pages))}</View>}
    <View style={styles.grid}>{visible.map((frame, i) => <Card key={`${page}:${i}`} frame={frame} zoom={zoom} reduced={reduced}/>)}</View>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FCF8ED' }, content: { padding: 18, gap: 14 },
  title: { fontSize: 23, fontWeight: '700', color: '#284F4B' }, heading: { fontSize: 17, fontWeight: '600', color: '#284F4B' },
  note: { fontSize: 13, color: '#596C66', lineHeight: 19 }, controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#E7ECDD' }, selected: { backgroundColor: '#B8D8CA' }, buttonText: { color: '#284F4B', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, card: { backgroundColor: '#FFFDF7', borderWidth: 1, borderColor: '#E1D8C1', borderRadius: 16, padding: 10, gap: 8, alignItems: 'center' }, label: { fontSize: 11, color: '#493E38', textAlign: 'center', lineHeight: 16 },
});
