import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../state/Store';
import { pendingAssignments } from '../state/profiles';
import { Button, Chip, Copy, Heading, styles } from '../components/ui';
import { familyLearners } from './learners';
/** Rendered only inside the existing unlocked grown-up Settings section. */
export function EarlierWorkSettings({ disabled }: { disabled: boolean }) {
  const store = useStore(), rows = pendingAssignments(store.save), people = store.save.learning ?? familyLearners();
  const [target, setTarget] = useState('family'), [selected, setSelected] = useState<string | null>(null), [busy, setBusy] = useState(false), [message,setMessage] = useState('');
  const entry = rows.find(row => row.key === selected);
  if (!rows.length && !message) return null;
  return <View style={{ gap: 10 }}>
    <Heading style={{ fontSize: 19 }}>Whose earlier work is this?</Heading>
    <Copy>These older saves did not record a clear owner. Choose a learner for each one, or leave it here until you know. Names and the selected learner are never used to guess.</Copy>
    <Copy>Assignment keeps a full previous save first. A learner’s newer paused round and Library work are kept. Existing badges stay with their current learner.</Copy>
    {rows.map(row => <Button key={row.key} quiet compact selected={row.key === selected} disabled={disabled || busy} onPress={() => { setSelected(row.key); setMessage(''); }}>{row.label}</Button>)}
    {entry && <View style={{ gap: 10 }}>
      <Heading style={{ fontSize: 17 }}>Assign {entry.label.toLowerCase()}</Heading>
      <View style={[styles.row,{flexWrap:'wrap'}]}>{people.people.map(p => <Chip key={p.id} selected={target === p.id} onPress={() => { if (!busy) setTarget(p.id); }}>{p.name}</Chip>)}</View>
      <Button disabled={disabled || busy} onPress={() => {
        setBusy(true); const name = people.people.find(p => p.id === target)?.name ?? 'Family practice';
        void store.assignEarlier(entry.key,target,store.epoch).then(ok => {
          if (ok) { setSelected(null); setMessage(`Assigned to ${name}. The previous save is kept in backups.`); }
          else setMessage('This learner already has a different round in this game, or the assignment could not be saved. Their work is kept. Choose another learner, or set this aside.');
        }).catch(() => setMessage('The recovery copy could not be saved. Nothing was assigned. Try again.')).finally(() => setBusy(false));
      }}>{busy ? 'Keeping a recovery copy…' : `Assign to ${people.people.find(p => p.id === target)?.name ?? 'Family practice'}`}</Button>
      <Button quiet disabled={busy} onPress={() => setSelected(null)}>Decide later</Button>
      <Button quiet disabled={disabled || busy} onPress={() => {
        setBusy(true);
        void store.assignEarlier(entry.key,null,store.epoch).then(ok => {
          if (ok) { setSelected(null); setMessage('Set aside. The previous save is kept in backups.'); }
          else setMessage('This could not be saved. Nothing changed. Try again.');
        }).catch(() => setMessage('The recovery copy could not be saved. Nothing changed. Try again.')).finally(() => setBusy(false));
      }}>Not needed</Button>
    </View>}
    {!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
  </View>;
}
