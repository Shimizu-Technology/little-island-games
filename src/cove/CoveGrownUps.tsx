import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { makeGate, gateAccepts } from '../state/grownUpGate';
import { Button, Sheet, Text, ToggleRow, theme } from '../ui';
import { readers, type Reader } from './catalog';
import { Chip } from './ChooseGrid';
import type { Preferences } from './local';

/**
 * Puzzles' grown-up choices behind the existing multiplication gate: reader level, fill notes, and hiding the
 * current puzzle on this device. They move into the app's Grown-ups sheet when it lands.
 */
export function CoveGrownUps({ visible, onClose, adult, onAdult, preferences, onPreferences, canHide, onHide, hiddenCount, onUnhide, error }: {
  visible: boolean;
  onClose: () => void;
  adult: boolean;
  onAdult: () => void;
  preferences: Preferences;
  onPreferences: (value: Partial<Preferences>) => void;
  canHide: boolean;
  onHide: () => void;
  hiddenCount: number;
  onUnhide: () => void;
  error?: string;
}) {
  const [gate, setGate] = useState(makeGate), [answer, setAnswer] = useState(''), [wrong, setWrong] = useState(false);
  const check = () => { if (gateAccepts(gate, answer)) { setWrong(false); onAdult(); } else { setGate(makeGate()); setWrong(true); } setAnswer(''); };
  return <Sheet visible={visible} title="Grown-ups" onClose={() => { setAnswer(''); onClose(); }}>
    {!!error && <Text variant="caption" accessibilityLiveRegion="polite">{error}</Text>}
    {adult ? <>
      <Text variant="caption" tone="muted" accessibilityRole="header">Reader level</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Reader level" style={styles.chips}>{readers.map((reader: Reader) => <Chip key={reader} label={reader} selected={preferences.reader === reader} onPress={() => onPreferences({ reader, fillNotes: reader === 'Grown-up' && preferences.fillNotes })}/>)}</View>
      {/* Fill notes stay behind the gate, and only for a Grown-up reader. */}
      {adult && preferences.reader === 'Grown-up' && <ToggleRow label="Fill notes" value={preferences.fillNotes} onChange={fillNotes => onPreferences({ fillNotes })}/>}
      {canHide && <Button label="Hide this puzzle on this device" variant="secondary" target="adult" onPress={onHide}/>}
      {hiddenCount > 0 && <Button label={`Show hidden puzzles (${hiddenCount})`} variant="quiet" target="adult" onPress={onUnhide}/>}
    </> : <>
      <Text variant="body">What is {gate.a} × {gate.b}?</Text>
      <View style={styles.gate}>
        <TextInput accessibilityLabel="Grown-up answer" keyboardType="number-pad" value={answer} onChangeText={setAnswer} onSubmitEditing={check} style={styles.input}/>
        <Button label="Open" target="adult" onPress={check}/>
      </View>
      {wrong && <Text variant="caption" accessibilityLiveRegion="polite">Try a new question.</Text>}
    </>}
  </Sheet>;
}

/** Plain style objects (React Native accepts them as they are). */
const styles = {
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },
  gate: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  input: { flex: 1, minHeight: theme.target.adult, paddingHorizontal: theme.space.md, borderRadius: theme.radius.full, backgroundColor: theme.colors.bg, color: theme.colors.ink, fontFamily: theme.fontFamily['600'], fontSize: theme.type.body.fontSize },
} as const;
