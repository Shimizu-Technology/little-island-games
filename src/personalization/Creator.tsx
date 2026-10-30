import React, { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Islander, type IslanderLook } from '../islander';
import { Button, C, Chip, Copy, Heading, Sheet } from '../components/ui';
import { useStore } from '../state/Store';
import { activeLearner } from '../learn/learners';
import { canWear, categories, lockedReason, styleCatalog, type Category } from './catalog';
import { personFor } from './model';
import { StyleGrid } from './StyleGrid';
const steps: (Category | 'name')[] = ['skinTone', 'hairStyle', 'hairColor', 'outfit', 'palette', 'hat', 'accessory', 'name'];
export function Creator({ onClose }: { onClose: () => void }) {
  const store = useStore(), learner = activeLearner(store.save.learning), person = personFor(store.save);
  const [look, setLook] = useState<IslanderLook>(person.look), [step, setStep] = useState(0), [done, setDone] = useState(false);
  const [expected] = useState({ learner: learner.id, epoch: store.epoch });
  const category = steps[step];
  const { height } = useWindowDimensions(), short = height < 500;
  const controls = done ? <Button onPress={onClose}>Let’s go</Button> : <>
    <View style={{ flexDirection: 'row', gap: 10 }}>{step > 0 && <Button quiet onPress={() => setStep(step - 1)}>Back</Button>}<View style={{ flex: 1 }}><Button disabled={category === 'name' && !canWear(look, person.earned)} onPress={() => { if (step < steps.length - 1) setStep(step + 1); else if (canWear(look, person.earned) && store.personalize({ look, made: true }, expected)) setDone(true); }}>{category === 'name' ? 'That’s me!' : 'Next →'}</Button></View></View>
    {!canWear(look, person.earned) && <Copy>Choose an unlocked style to keep this look.</Copy>}
    <Button quiet compact onPress={onClose}>Make it later</Button>
  </>;
  const preview = <View testID="creator-preview" style={{ alignItems: 'center', backgroundColor: C.soft, borderRadius: 24, padding: 8 }}><Islander view="front" pose={done ? 'cheer' : category === 'name' ? 'wave' : 'idle'} look={look} size={short ? 110 : 180}/></View>;
  const choices = done ? <><Heading>That’s {learner.name}!</Heading><Copy>Your islander is ready for island adventures.</Copy></> : <>
    {short ? <Copy style={{ fontSize: 13 }}>Step {step + 1} of {steps.length}</Copy> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{steps.map((key, i) => <Chip key={key} selected={step === i} onPress={() => setStep(i)}>{i + 1}</Chip>)}</View>}
    <Heading style={{ fontSize: 22 }}>{category === 'name' ? `Hello, ${learner.name}!` : `Choose your ${categories.find(c => c.key === category)!.label.toLowerCase()}`}</Heading>
    {category === 'name' ? <Copy>Is this you? A grown-up can change your name in Settings.</Copy> : <StyleGrid catalog={styleCatalog.filter(item => !lockedReason(item, person.earned))} category={category} look={look} equipped={person.look} earned={person.earned} unseen={[]} onChoose={item => setLook({ ...look, [item.category]: item.value })}/>}
  </>;
  return <Sheet visible presence={false} title="Make your islander" onClose={onClose} footer={controls} scrollKey={`${step}:${done}`}>
    {short ? <View style={{ flexDirection: 'row', gap: 16, height: Math.max(130, height - 240) }}><View style={{ width: 100 }}>{preview}</View><ScrollView key={`${step}:${done}`} style={{ flex: 1 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }} nestedScrollEnabled>{choices}</ScrollView></View> : <>{preview}{choices}</>}
  </Sheet>;
}
