import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, C, Copy, Sheet, font } from '../components/ui';
import { familyLearners } from '../learn/learners';
import { useStore } from '../state/Store';
import { selectedOwner } from '../state/challengeDrafts';
export function solvingPeople(save: ReturnType<typeof useStore>['save']) {
  return [...(save.learning ?? familyLearners()).people.map(p => ({ id: p.id, name: p.name })), ...Object.entries(save.cove?.people ?? {}).map(([id, p]) => ({ id, name: p.name }))];
}
export function PeoplePicker() {
  const store = useStore(), owner = selectedOwner(store.save), people = solvingPeople(store.save);
  const [open, setOpen] = useState(false), [name, setName] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function select(id: string) {
    if (busy) return; setBusy(true);
    try {
      if (id.startsWith('cove-')) { if (!await store.covePerson({ type: 'select', id }, store.epoch)) { setMessage('Could not switch. Your saved work is kept.'); return; } }
      else { if (!await store.covePerson({ type: 'select', id: null }, store.epoch)) { setMessage('Could not switch. Your saved work is kept.'); return; } store.selectLearner(id); }
      setOpen(false);
    } finally { setBusy(false); }
  }
  async function add() {
    if (busy || !name.trim()) return; setBusy(true);
    try {
      if (await store.covePerson({ type: 'add', name, id: `cove-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` }, store.epoch)) { setName(''); setMessage(''); setOpen(false); }
      else setMessage('Choose a different name, up to 24 characters. There is room for four Cove-only people.');
    } finally { setBusy(false); }
  }
  return <><Button quiet compact style={{ maxWidth: '100%' }} textStyle={{ flexShrink: 1 }} onPress={() => setOpen(true)} label={`Who is solving: ${people.find(p => p.id === owner)?.name ?? 'Family practice'}`}>{people.find(p => p.id === owner)?.name ?? 'Family practice'} ▾</Button>
    <Sheet visible={open} title="Who is solving?" onClose={() => setOpen(false)}><Copy>Each person keeps their own puzzles. Family practice is here for shared play.</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{people.map(p => <Button quiet compact style={{ maxWidth: '100%' }} key={p.id} selected={p.id === owner} onPress={() => { if (!busy) void select(p.id); }}>{p.name}</Button>)}</View>
      <Copy>Add a Cove-only person. They won’t appear in School or get a house.</Copy><TextInput accessibilityLabel="New Cove person's name" value={name} maxLength={48} onChangeText={setName} style={{ minHeight: 48, borderWidth: 1, borderColor: C.teal, borderRadius: 12, padding: 12, fontFamily: font, fontSize: 18, color: C.ink }}/><Button disabled={busy || Object.keys(store.save.cove?.people ?? {}).length >= 4 || !name.trim()} onPress={() => void add()}>Add person</Button>{!!message && <Copy accessibilityLiveRegion="polite">{message}</Copy>}
    </Sheet></>;
}
