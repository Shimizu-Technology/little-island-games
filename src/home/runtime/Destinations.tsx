import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { roomNames } from '../catalogMore';
import { resolve, type DropProposal } from '../scene/proposal';
import type { Scene } from '../scene/types';
/** Switch/keyboard/tap destinations call exactly the drag proposal engine. */
export function Destinations({ scene, selected, scale, onChoose, bottom }: { scene: Scene; selected?: string; scale: number; onChoose: (proposal: DropProposal) => void; bottom: number }) {
  const subject = selected ? scene.entities[selected] : undefined;
  if (!subject) return null;
  const choices = Object.values(scene.rooms).flatMap(index => index.targets.map(target => {
    const proposal = resolve(index, subject, target.contact, { scale, target: target.id, release: true });
    return proposal.target === target.id ? { target, proposal, room: index.room } : undefined;
  }).filter(choice => !!choice));
  if (!choices.length) return null;
  const symbols = { hand: '✋', mouth: '◡', socket: '◠', surface: '▱', container: '▣' };
  return <View testID="tap-destinations" style={{ position: 'absolute', bottom, left: 72, right: 72, maxHeight: 80, borderRadius: 18, backgroundColor: '#FFF8E9F5', padding: 6, zIndex: 35 }}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{choices.map(({ target, proposal, room }) => <Pressable key={`${room}:${target.id}`} accessibilityRole="button" accessibilityLabel={`${target.kind === 'mouth' ? 'Eat or drink' : target.kind === 'hand' ? 'Give' : target.kind === 'socket' ? proposal.base === 'lie' ? 'Lie' : proposal.base === 'bathe' ? 'Bathe' : 'Sit' : 'Put on'} in ${roomNames[room]}`} onPress={() => onChoose(proposal)} style={{ minWidth: 58, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#DDEACB' }}><Text allowFontScaling={false} style={{ fontSize: 25, color: '#284F4B' }}>{symbols[target.kind]}</Text></Pressable>)}</ScrollView></View>;
}
