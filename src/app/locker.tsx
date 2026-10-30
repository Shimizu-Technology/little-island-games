import React, { useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Islander, type IslanderLook } from '../islander';
import { Button, C, Chip, Copy, Heading, styles, PressableScale } from '../components/ui';
import { Recovery } from '../components/Recovery';
import { SaveStatus } from '../components/SaveStatus';
import { useStore } from '../state/Store';
import { LearnerChip } from '../personalization/LearnerChip';
import { Creator } from '../personalization/Creator';
import { personFor } from '../personalization/model';
import { canWear, categories, lockedReason, type Category, type StyleItem, styleCatalog } from '../personalization/catalog';
import { StyleGrid } from '../personalization/StyleGrid';
export default function LockerRoute() {
  const store = useStore();
  if (!store.ready) return <SafeAreaView style={styles.page}><Heading>Opening your Locker…</Heading></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={styles.page}><Recovery/></SafeAreaView>;
  return <Locker key={`${store.save.learning?.active ?? 'family'}:${store.epoch}`}/>;
}
function Locker() {
  const params = useLocalSearchParams<{item?: string}>(), initialItem = styleCatalog.find(i => i.id === params.item);
  const store = useStore(), person = personFor(store.save), { width, height } = useWindowDimensions(), inset = useSafeAreaInsets();
  const [look, setLook] = useState<IslanderLook>(initialItem ? { ...person.look, [initialItem.category]: initialItem.value } : person.look), [category, setCategory] = useState<Category>(initialItem?.category ?? 'outfit'), [back, setBack] = useState(false), [creator, setCreator] = useState(!person.made), [detail, setDetail] = useState<StyleItem | undefined>(initialItem), [message, setMessage] = useState('');
  const [expected] = useState({ learner: store.save.learning?.active ?? 'family', epoch: store.epoch });
  const acknowledge = store.personalize;
  useEffect(() => {
    if (initialItem && person.unseen.includes(initialItem.id)) acknowledge({unseen:person.unseen.filter(id=>id!==initialItem.id)}, expected);
  }, [initialItem, person.unseen, acknowledge, expected]);
  const wide = width >= 700, short = height < 500, changed = JSON.stringify(look) !== JSON.stringify(person.look), reason = detail && lockedReason(detail, person.earned);
  function choose(item: StyleItem) {
    setLook({ ...look, [item.category]: item.value }); setDetail(item); setMessage('');
    if (person.unseen.includes(item.id)) store.personalize({ unseen: person.unseen.filter(id => id !== item.id) }, expected);
  }
  const preview = <View testID="locker-preview" style={{ alignItems: 'center', height: short ? 160 : wide ? undefined : (height - inset.top - inset.bottom) * .38, justifyContent: 'center', padding: short ? 4 : 10, borderRadius: 28, backgroundColor: '#E7EDE4', gap: 8 }}>
    <Islander view={back ? 'back' : 'front'} pose={back ? 0 : 'idle'} look={look} size={short ? 138 : wide ? 280 : Math.min(278, height * .34)}/>
    <PressableScale accessibilityRole="button" accessibilityLabel={back ? 'See the front' : 'See the back'} onPress={() => setBack(!back)} style={{ position: 'absolute', right: 8, top: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ fontSize: 24 }}>↻</Copy></PressableScale>
    {wide && !short && <Copy style={{ fontSize: 14 }}>{back ? 'Your Lagoon Run view' : 'Your dressing room'}</Copy>}
    <View style={{ position: 'absolute', bottom: 0, right: 8 }}><Button quiet compact onPress={() => router.push('/badges')}>My badges</Button></View>
  </View>;
  const dressingPreview = <View style={wide ? { width: '40%', gap: 12 } : { gap: 0 }}>{preview}{!short && <PressableScale accessibilityRole="button" onPress={() => setCreator(true)} style={{ position: wide ? 'relative' : 'absolute', bottom: 0, left: 8, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><Copy style={{ fontSize: 14, color: C.teal, textDecorationLine: 'underline' }}>Make your islander</Copy></PressableScale>}</View>;
  const choices = <>
<ScrollView horizontal contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>{categories.map(c => <Chip key={c.key} selected={category === c.key} onPress={() => { setCategory(c.key); setDetail(undefined); }}>{c.label}</Chip>)}</ScrollView>
        {wide && <Heading style={{ fontSize: 18 }}>{detail?.label ?? categories.find(c => c.key === category)!.label}</Heading>}
        {!!reason && <Copy>{reason}</Copy>}
        <StyleGrid compact={width < 600} category={category} look={look} equipped={person.look} earned={person.earned} unseen={person.unseen} onChoose={choose}/>
        {!!person.unseen.length && <Button quiet compact onPress={() => store.personalize({ unseen: [] }, expected)}>Mark all seen</Button>}
  </>;
  return <SafeAreaView style={styles.page}>
    <View style={{ padding: 8, gap: 4 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><Button quiet compact onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>Back</Button><Heading style={{ fontSize: 21 }}>My Locker</Heading><View style={{ maxWidth: '48%' }}><LearnerChip compact/></View>{short && <Button quiet compact onPress={() => setCreator(true)}>Make your islander</Button>}</View></View>
    {wide ? <View style={{ flex: 1, flexDirection: 'row', gap: 16, padding: short ? 8 : 16, maxWidth: 1100, width: '100%', alignSelf: 'center' }}>
      {dressingPreview}<ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>{choices}</ScrollView>
    </View> : <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
      {dressingPreview}<View style={{ gap: 6 }}>{choices}</View>
    </ScrollView>}
    <View testID="locker-save-bar" style={{ padding: 8, borderTopWidth: 1, borderColor: C.line, backgroundColor: C.cream, gap: 4 }}><Copy style={{ textAlign: 'center', fontSize: 14 }}>{message || (changed ? 'Trying it on · Wear this to keep it' : 'You’re wearing this')}</Copy><Button compact disabled={!changed || !canWear(look, person.earned)} onPress={() => { if (store.personalize({ look }, expected)) setMessage('Wearing your new look.'); }}>Wear this</Button><SaveStatus/></View>
    {creator && <Creator onClose={() => { setCreator(false); setLook(personFor(store.save).look); }}/>}
  </SafeAreaView>;
}
