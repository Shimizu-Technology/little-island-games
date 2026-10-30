import React, { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Islander, type IslanderLook } from '../islander';
import { Button, C, Chip, Copy, Heading, Sheet, PressableScale } from '../components/ui';
import { useStore } from '../state/Store';
import { activeLearner } from '../learn/learners';
import { lookWithStyle, canWear, categories, lockedReason, styleCatalog, type Category } from './catalog';
import { personFor } from './model';
import { StyleGrid } from './StyleGrid';
const steps: (Category | 'presentation' | 'face' | 'name')[] = ['presentation', 'skinTone', 'face', 'hairStyle', 'hairColor', 'outfit', 'top', 'bottom', 'palette', 'hat', 'accessory', 'name'];
const presets: Record<'boy' | 'girl' | 'me', Partial<IslanderLook>> = {
  boy: { hairStyle: 'crop', outfit: 'polo-shorts', brows: 'straight', lashes: 'none' },
  girl: { hairStyle: 'braids', outfit: 'sundress', brows: 'soft', lashes: 'lashes' },
  me: { hairStyle: 'crop', outfit: 'mix', top: 'tee', bottom: 'shorts', brows: 'soft', lashes: 'none' },
};
export function Creator({ onClose }: { onClose: () => void }) {
  const store = useStore(), learner = activeLearner(store.save.learning), person = personFor(store.save);
  const [look, setLook] = useState<IslanderLook>(person.look), [step, setStep] = useState(0), [done, setDone] = useState(false);
  const [expected] = useState({ learner: learner.id, epoch: store.epoch });
  const category = steps[step];
  const visibleSteps = steps.map((key, index) => ({key,index})).filter(({key}) => look.outfit === 'mix' || key !== 'top' && key !== 'bottom');
  const { height } = useWindowDimensions(), short = height < 500;
  const advance = () => { let next = step + 1; if (look.outfit !== 'mix' && (steps[next] === 'top' || steps[next] === 'bottom')) next = steps.indexOf('palette'); setStep(next); };
  const controls = done ? <Button onPress={onClose}>Let’s go</Button> : <>
    <View style={{ flexDirection: 'row', gap: 10 }}>{step > 0 && <Button quiet onPress={() => setStep(step === steps.indexOf('palette') && look.outfit !== 'mix' ? steps.indexOf('outfit') : step - 1)}>Back</Button>}<View style={{ flex: 1 }}><Button disabled={category === 'presentation' && !look.presentation || category === 'name' && !canWear(look, person.earned)} onPress={() => { if (step < steps.length - 1) advance(); else if (canWear(look, person.earned) && store.personalize({ look, made: true }, expected)) setDone(true); }}>{category === 'name' ? 'That’s me!' : 'Next →'}</Button></View></View>
    {step > 0 && step < steps.length - 1 && <Button quiet compact onPress={() => setStep(steps.length - 1)}>Skip to the end</Button>}
    {!canWear(look, person.earned) && <Copy>Choose an unlocked style to keep this look.</Copy>}
    <Button quiet compact onPress={onClose}>Make it later</Button>
  </>;
  const preview = <View testID="creator-preview" style={{ alignItems: 'center', backgroundColor: C.soft, borderRadius: 24, padding: 8 }}><Islander view="front" pose={done ? 'cheer' : category === 'name' ? 'wave' : 'idle'} look={look} size={short ? 110 : 180}/></View>;
  const choices = done ? <><Heading>That’s {learner.name}!</Heading><Copy>Your islander is ready for island adventures.</Copy></> : <>
    {short ? <Copy style={{ fontSize: 13 }}>Step {visibleSteps.findIndex(item => item.index === step) + 1} of {visibleSteps.length}</Copy> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{(look.presentation ? visibleSteps : visibleSteps.slice(0, 1)).map(({key,index}, i) => <Chip key={key} selected={step === index} onPress={() => setStep(index)}>{i + 1}</Chip>)}</View>}
    <Heading style={{ fontSize: 22 }}>{category === 'presentation' ? "Who's your islander?" : category === 'face' ? 'Make your face' : category === 'name' ? `Hello, ${learner.name}!` : `Choose your ${categories.find(c => c.key === category)!.label.toLowerCase()}`}</Heading>
    {category === 'presentation' ? <><View style={{ flexDirection: 'row', gap: 6 }}>{(['boy','girl','me'] as const).map(value => <PressableScale key={value} accessibilityRole="button" accessibilityLabel={value === 'me' ? 'Just me' : value === 'boy' ? 'Boy' : 'Girl'} accessibilityState={{ selected: look.presentation === value }} onPress={() => setLook({ ...look, ...presets[value], presentation: value })} style={{ flex: 1, alignItems: 'center', borderWidth: 2, borderColor: look.presentation === value ? C.teal : C.line, borderRadius: 18, padding: 4, backgroundColor: C.paper }}><Islander look={{ ...look, ...presets[value], presentation: value }} size={75}/><Copy style={{ fontWeight: '700', textAlign: 'center' }}>{value === 'me' ? 'Just me' : value === 'boy' ? 'Boy' : 'Girl'}</Copy></PressableScale>)}</View><Copy>Anyone can wear anything.</Copy></> : category === 'face' ? <View style={{ gap: 10 }}>{(['brows','lashes','freckles','cheeks'] as const).map(key => <View key={key} style={{ gap: 4 }}><Copy>{categories.find(c => c.key === key)!.label}</Copy><StyleGrid catalog={styleCatalog.filter(item => item.category === key)} category={key} look={look} equipped={person.look} earned={person.earned} unseen={[]} onChoose={item => setLook({ ...look, [item.category]: item.value })}/></View>)}</View> : category === 'name' ? <Copy>Is this you? A grown-up can change your name in Settings.</Copy> : <StyleGrid catalog={styleCatalog.filter(item => !lockedReason(item, person.earned))} category={category} look={look} equipped={person.look} earned={person.earned} unseen={[]} onChoose={item => setLook(lookWithStyle(look, item))}/>}
  </>;
  return <Sheet visible presence={false} title={person.made ? 'Change my look' : 'Make your islander'} onClose={onClose} footer={controls} scrollKey={`${step}:${done}`}>
    {short ? <View style={{ flexDirection: 'row', gap: 16, height: Math.max(130, height - 240) }}><View style={{ width: 100 }}>{preview}</View><ScrollView key={`${step}:${done}`} style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }} nestedScrollEnabled>{choices}</ScrollView></View> : <>{preview}{choices}</>}
  </Sheet>;
}
