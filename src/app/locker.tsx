import React, { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Islander, type IslanderLook } from '../islander';
import { Button, C, Chip, Copy, Heading, styles } from '../components/ui';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { useStore } from '../state/Store';
import { LearnerChip } from '../personalization/LearnerChip';
import { Creator } from '../personalization/Creator';
import { personFor } from '../personalization/model';
import { canWear, categories, lockedReason, type Category, type StyleItem } from '../personalization/catalog';
import { StyleGrid } from '../personalization/StyleGrid';
export default function LockerRoute() {
  const store = useStore();
  if (!store.ready) return <SafeAreaView style={styles.page}><Heading>Opening your Locker…</Heading></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={styles.page}><Recovery/></SafeAreaView>;
  return <Locker key={`${store.save.learning?.active ?? 'family'}:${store.epoch}`}/>;
}
function Locker() {
  const store = useStore(), person = personFor(store.save), { width, height } = useWindowDimensions();
  const [look, setLook] = useState<IslanderLook>(person.look), [category, setCategory] = useState<Category>('outfit'), [back, setBack] = useState(false), [creator, setCreator] = useState(!person.made), [detail, setDetail] = useState<StyleItem>(), [message, setMessage] = useState('');
  const [expected] = useState({ learner: store.save.learning?.active ?? 'family', epoch: store.epoch });
  const wide = width >= 700, short = height < 500, changed = JSON.stringify(look) !== JSON.stringify(person.look), reason = detail && lockedReason(detail, person.earned);
  function choose(item: StyleItem) {
    setLook({ ...look, [item.category]: item.value }); setDetail(item); setMessage('');
    if (person.unseen.includes(item.id)) store.personalize({ unseen: person.unseen.filter(id => id !== item.id) }, expected);
  }
  const preview = <View testID="locker-preview" style={{ alignItems: 'center', padding: short ? 4 : 16, borderRadius: 28, backgroundColor: '#E7EDE4', gap: 8 }}>
    <Islander view={back ? 'back' : 'front'} pose={back ? 0 : 'idle'} look={look} size={short ? 100 : wide ? 280 : 170}/>
    <Button quiet compact onPress={() => setBack(!back)}>{back ? 'See the front' : 'See the back'}</Button>
    {!short && <Copy style={{ fontSize: 14 }}>{back ? 'Your Lagoon Run view' : 'Your dressing room'}</Copy>}
  </View>;
  const dressingPreview = <View style={wide ? { width: '40%', gap: 12 } : { gap: 12 }}>{preview}{!short && <Button quiet compact onPress={() => setCreator(true)}>Make your islander</Button>}</View>;
  const choices = <>
<ScrollView horizontal contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>{categories.map(c => <Chip key={c.key} selected={category === c.key} onPress={() => { setCategory(c.key); setDetail(undefined); }}>{c.label}</Chip>)}</ScrollView>
        <Heading style={{ fontSize: 20 }}>{detail?.label ?? categories.find(c => c.key === category)!.label}</Heading>
        {!!reason && <Copy>{reason}</Copy>}
        <StyleGrid category={category} look={look} equipped={person.look} earned={person.earned} unseen={person.unseen} onChoose={choose}/>
        {!!person.unseen.length && <Button quiet compact onPress={() => store.personalize({ unseen: [] }, expected)}>Mark all seen</Button>}
  </>;
  return <SafeAreaView style={styles.page}>
    <View style={{ padding: 12, gap: 8 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><Button quiet compact onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>Back</Button><Heading style={{ fontSize: 25 }}>My Locker</Heading>{short && <Button quiet compact onPress={() => setCreator(true)}>Make your islander</Button>}</View><LearnerChip compact/></View>
    {wide ? <View style={{ flex: 1, flexDirection: 'row', gap: 16, padding: short ? 8 : 16, maxWidth: 1100, width: '100%', alignSelf: 'center' }}>
      {dressingPreview}<ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>{choices}</ScrollView>
    </View> : <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {dressingPreview}<View style={{ gap: 12 }}>{choices}</View>
    </ScrollView>}
    <View testID="locker-save-bar" style={{ padding: 12, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.cream, gap: 4 }}><Copy style={{ textAlign: 'center', fontSize: 14 }}>{message || (changed ? 'Trying it on · Wear this to keep it' : 'You’re wearing this')}</Copy><Button disabled={!changed || !canWear(look, person.earned)} onPress={() => { if (store.personalize({ look }, expected)) setMessage('Wearing your new look.'); }}>Wear this</Button><SaveStatus/></View>
    {creator && <Creator onClose={() => { setCreator(false); setLook(personFor(store.save).look); }}/>}
  </SafeAreaView>;
}
