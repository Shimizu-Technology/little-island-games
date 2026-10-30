import React, { useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { type IslanderLook } from '../islander';
import { Button, C, Copy, Heading, styles } from '../components/ui';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { useStore } from '../state/Store';
import { LearnerChip } from '../personalization/LearnerChip';
import { Creator } from '../personalization/Creator';
import { useSheetsClear } from '../components/sheetPresence';
import { personFor } from '../personalization/model';
import { lookWithStyle, canWear, type Category, styleCatalog } from '../personalization/catalog';
import { StyleEditor } from '../personalization/StyleEditor';

export default function LockerRoute() {
  const store = useStore();
  if (!store.ready) return <SafeAreaView style={styles.page}><Heading>Opening your Locker…</Heading></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={styles.page}><Recovery/></SafeAreaView>;
  return <Locker key={`${store.save.learning?.active ?? 'family'}:${store.epoch}`}/>;
}
function Locker() {
  const params = useLocalSearchParams<{ item?: string }>(), initialItem = styleCatalog.find(i => i.id === params.item);
  const store = useStore(), person = personFor(store.save), { height } = useWindowDimensions();
  const sheetsClear = useSheetsClear();
  const [look, setLook] = useState<IslanderLook>(initialItem ? lookWithStyle(person.look, initialItem) : person.look);
  const [creator, setCreator] = useState(!person.made), [message, setMessage] = useState('');
  const [expected] = useState({ learner: store.save.learning?.active ?? 'family', epoch: store.epoch });
  const acknowledge = store.personalize;
  useEffect(() => {
    if (initialItem && person.unseen.includes(initialItem.id)) acknowledge({ unseen: person.unseen.filter(id => id !== initialItem.id) }, expected);
  }, [initialItem, person.unseen, acknowledge, expected]);
  const changed = JSON.stringify(look) !== JSON.stringify(person.look);
  const initialTab = initialItem?.category ?? 'outfit';
  return <SafeAreaView style={styles.page}>
    <View style={{ paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Button quiet compact onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>Back</Button><Heading style={{ fontSize: 21, flex: 1 }}>My Locker</Heading><LearnerChip compact/></View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20, gap: 12 }}>
      <StyleEditor initialTab={initialTab as Category} look={look} equipped={person.look} earned={person.earned} unseen={person.unseen} onChange={next => { setLook(next); setMessage(''); }} onSeen={id => { if (person.unseen.includes(id)) store.personalize({ unseen: person.unseen.filter(item => item !== id) }, expected); }} onBadges={() => router.push('/badges')}/>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}><Button quiet compact onPress={() => setCreator(true)}>{person.made ? 'Change my look' : 'Make your islander'}</Button>{!!person.unseen.length && <Button quiet compact onPress={() => store.personalize({ unseen: [] }, expected)}>Mark all seen</Button>}</View>
    </ScrollView>
    <View testID="locker-save-bar" style={{ padding: height < 500 ? 5 : 8, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.cream, gap: 3 }}><Copy style={{ textAlign: 'center', fontSize: 13 }}>{message || (changed ? 'Trying it on · Wear this to keep it' : 'You’re wearing this')}</Copy><Button compact disabled={!changed || !canWear(look, person.earned)} onPress={() => { if (store.personalize({ look }, expected)) setMessage('Wearing your new look.'); }}>Wear this</Button><SaveStatus/></View>
    {creator && sheetsClear && <Creator onClose={() => { setCreator(false); setLook(personFor(store.save).look); }}/>}
  </SafeAreaView>;
}
