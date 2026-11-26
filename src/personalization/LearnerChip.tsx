import React, { useState } from 'react';
import { View } from 'react-native';
import { Islander } from '../islander';
import { activeLearner, familyLearners } from '../learn/learners';
import { useStore } from '../state/Store';
import { C, Copy, Heading, PressableScale, Sheet } from '../components/ui';
import { Portrait } from './Portrait';
import { personFor } from './model';
export function LearnerChip({ compact = false }: { compact?: boolean }) {
  const store = useStore(), learner = activeLearner(store.save.learning), [open, setOpen] = useState(false);
  return <>
    <PressableScale testID="learner-chip" accessibilityRole="button" accessibilityLabel={`Who is playing: ${learner.name}. Switch learner`} onPress={() => setOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, gap: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#FFF8EC', borderWidth: 1.5, borderColor: '#EFE0C6', borderRadius: 24, maxWidth: '100%' }}>
      <Portrait look={personFor(store.save).look} size={compact ? 36 : 44}/>
      <Copy maxFontSizeMultiplier={compact ? 1.3 : undefined} numberOfLines={compact ? 1 : undefined} style={{ fontSize: compact ? 13 : 16, fontWeight: '700', color: C.ink, flexShrink: 1 }}>{learner.name} ▾</Copy>
    </PressableScale>
    <Sheet visible={open} title="Who is playing?" onClose={() => setOpen(false)}>
      <Copy>Pick your islander. Your place here stays open.</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{(store.save.learning ?? familyLearners()).people.map(p => <PressableScale key={p.id} accessibilityRole="button" accessibilityLabel={`Play as ${p.name}`} accessibilityState={{ selected: p.id === learner.id }} onPress={() => { store.selectLearner(p.id); setOpen(false); }} style={{ alignItems: 'center', width: 140, padding: 12, borderRadius: 24, backgroundColor: p.id === learner.id ? '#FFF1E9' : '#FFFDF8', borderWidth: p.id === learner.id ? 2.5 : 1.5, borderColor: p.id === learner.id ? '#FF7A5C' : '#EFE0C6' }}>
        <Islander view="front" pose="idle" look={personFor(store.save, p.id).look} size={100}/><Heading style={{ fontSize: 17, textAlign: 'center', marginTop: 4 }}>{p.name}</Heading>{p.id === learner.id && <View style={{ marginTop: 4, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12, backgroundColor: '#FFE1D4' }}><Copy style={{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: '#173330' }}>Playing now</Copy></View>}
      </PressableScale>)}</View><Copy>A grown-up can add or change learners in Settings.</Copy>
    </Sheet>
  </>;
}
