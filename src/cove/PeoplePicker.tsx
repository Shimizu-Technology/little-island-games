import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { familyLearners } from '../learn/learners';
import { Portrait } from '../personalization/Portrait';
import { personFor } from '../personalization/model';
import { useStore } from '../state/Store';
import { selectedOwner } from '../state/challengeDrafts';
import { Button, PressTarget, ProfilePill, Sheet, Text, theme } from '../ui';

type Save = ReturnType<typeof useStore>['save'];
export function solvingPeople(save: Save) {
  return [...(save.learning ?? familyLearners()).people.map(p => ({ id: p.id, name: p.name })), ...Object.entries(save.cove?.people ?? {}).map(([id, p]) => ({ id, name: p.name }))];
}
export const isCoveOnly = (id: string) => id.startsWith('cove-');

/** A person's face: their Islander for learners and Family, a lettered circle for a Puzzles-only grown-up. Decorative. */
export function Face({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  const store = useStore();
  if (!isCoveOnly(id)) return <View accessible={false} importantForAccessibility="no-hide-descendants"><Portrait look={personFor(store.save, id).look} size={size}/></View>;
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.letter, { width: size, height: size }]}>
    <Text variant={size >= 56 ? 'title' : 'body'} tone="lagoon" style={styles.initial}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
  </View>;
}

/** One big face with the name under it. */
export function FaceButton({ id, name, selected, disabled, onPress, label = name }: { id: string; name: string; selected?: boolean; disabled?: boolean; onPress: () => void; label?: string }) {
  return <PressTarget target="child" haptic selected={selected} disabled={disabled} accessibilityLabel={label} onPress={onPress} style={[styles.face, selected && styles.selected]}>
    <Face id={id} name={name} size={56}/>
    <Text variant="caption" numberOfLines={1} style={styles.name}>{name}</Text>
  </PressTarget>;
}

/**
 * The compact profile pill and its "Who's playing?" sheet. Learners and Family come first; grown-ups who only play
 * Puzzles sit in their own row. Choosing a Puzzles-only person leaves the learner selection alone. Adding one is one
 * quiet button at the end.
 */
export function PeoplePicker() {
  const store = useStore(), owner = selectedOwner(store.save), people = solvingPeople(store.save);
  const [open, setOpen] = useState(false), [adding, setAdding] = useState(false), [name, setName] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const current = people.find(p => p.id === owner) ?? { id: 'family', name: 'Family' };
  const learners = people.filter(p => !isCoveOnly(p.id)), grownUps = people.filter(p => isCoveOnly(p.id)), room = grownUps.length < 4;
  const close = () => { setOpen(false); setAdding(false); setMessage(''); };
  async function select(id: string) {
    if (busy) return; setBusy(true);
    try {
      if (isCoveOnly(id)) { if (!await store.covePerson({ type: 'select', id }, store.epoch)) { setMessage('Could not switch. Your saved work is kept.'); return; } }
      else { if (!await store.covePerson({ type: 'select', id: null }, store.epoch)) { setMessage('Could not switch. Your saved work is kept.'); return; } store.selectLearner(id); }
      close();
    } finally { setBusy(false); }
  }
  async function add() {
    if (busy || !name.trim()) return; setBusy(true);
    try {
      if (await store.covePerson({ type: 'add', name, id: `cove-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }, store.epoch)) { setName(''); close(); }
      else setMessage('Try a different name, up to 24 letters.');
    } finally { setBusy(false); }
  }
  // A valid name can be 24 wide letters: faces keep one line each and the full name stays in the spoken label.
  return <>
    <ProfilePill compact name={current.name} avatar={<Face id={current.id} name={current.name} size={36}/>} label={`Who's playing: ${current.name}. Switch`} onPress={() => setOpen(true)}/>
    <Sheet visible={open} title="Who's playing?" onClose={close}>
      <View style={styles.row}>{learners.map(p => <FaceButton key={p.id} id={p.id} name={p.name} selected={p.id === owner} disabled={busy} onPress={() => void select(p.id)}/>)}</View>
      {(grownUps.length > 0 || adding) && <Text variant="caption" tone="muted" accessibilityRole="header">Puzzles only</Text>}
      {grownUps.length > 0 && <View style={styles.row}>{grownUps.map(p => <FaceButton key={p.id} id={p.id} name={p.name} selected={p.id === owner} disabled={busy} onPress={() => void select(p.id)}/>)}</View>}
      {adding ? <View style={styles.add}>
        <TextInput accessibilityLabel="Name" placeholder="Name" value={name} maxLength={24} onChangeText={setName} onSubmitEditing={() => void add()} style={styles.input}/>
        <Button label="Add" target="adult" disabled={busy || !name.trim()} onPress={() => void add()}/>
      </View> : room && <Button variant="quiet" target="adult" label="Add a Puzzles-only grown-up" onPress={() => setAdding(true)}/>}
      {!!message && <Text variant="caption" accessibilityLiveRegion="polite">{message}</Text>}
    </Sheet>
  </>;
}

/** Plain style objects (React Native accepts them as they are). */
const styles = {
  letter: { borderRadius: theme.radius.full, backgroundColor: theme.colors.lagoonSoft, alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  face: { width: 88, alignItems: 'center', gap: theme.space.xs, padding: theme.space.xs, borderRadius: theme.radius.tile },
  selected: { backgroundColor: theme.colors.lagoonSoft },
  name: { textAlign: 'center', fontWeight: '700', alignSelf: 'stretch' },
  add: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  input: { flex: 1, minHeight: theme.target.adult, paddingHorizontal: theme.space.md, borderRadius: theme.radius.full, backgroundColor: theme.colors.bg, color: theme.colors.ink, fontFamily: theme.fontFamily['600'], fontSize: theme.type.body.fontSize },
} as const;
