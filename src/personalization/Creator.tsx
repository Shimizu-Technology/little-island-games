import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Islander, type IslanderLook } from '../islander';
import { Button, Copy, Heading, Sheet } from '../components/ui';
import { useStore } from '../state/Store';
import { activeLearner } from '../learn/learners';
import { useNunitoLoaded } from '../ui/fonts';
import { theme } from '../ui/theme';
import { canWear } from './catalog';
import { personFor } from './model';
import { StyleEditor } from './StyleEditor';

export function Creator({ onClose }: { onClose: () => void }) {
  const store = useStore(), learner = activeLearner(store.save.learning), person = personFor(store.save);
  const [look, setLook] = useState<IslanderLook>(person.look), [done, setDone] = useState(false);
  const { height } = useWindowDimensions();
  const nunitoLoaded = useNunitoLoaded();
  const [expected] = useState({ learner: learner.id, epoch: store.epoch });
  const finish = () => { if (look.presentation && canWear(look, person.earned) && store.personalize({ look, made: true }, expected)) setDone(true); };
  const titleFont = nunitoLoaded ? { fontFamily: theme.fontFamily['800'], fontWeight: 'normal' as const } : { fontWeight: '800' as const };
  return <Sheet visible presence={false} fill={!done} title={person.made ? 'Change my look' : 'Make your islander'} onClose={onClose} footer={done ? <Button maxFontSizeMultiplier={1.3} onPress={onClose}>Let’s go</Button> : <View style={{ flexDirection: height < 720 ? 'row' : 'column', gap: 8 }}><View style={height < 720 ? { flex: 1 } : undefined}><Button maxFontSizeMultiplier={1.3} disabled={!look.presentation || !canWear(look, person.earned)} onPress={finish}>Done!</Button></View><View style={height < 720 ? { flex: 1 } : undefined}><Button maxFontSizeMultiplier={1.3} quiet compact onPress={onClose}>{person.made ? 'Keep my look' : 'Make it later'}</Button></View></View>}>
    {done ? <View style={{ alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 24, backgroundColor: '#FFF8EC', borderWidth: 1.5, borderColor: '#EFE0C6' }}>
      <View style={{ width: 152, height: 152, borderRadius: 76, backgroundColor: '#E3F4EE', borderWidth: 3, borderColor: '#FF7A5C', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Islander view="front" pose="cheer" look={look} size={132}/>
      </View>
      <Heading style={{ textAlign: 'center', fontSize: 26, ...titleFont }}>That’s {learner.name}!</Heading>
      <Copy style={{ textAlign: 'center' }}>Your islander is ready for island adventures.</Copy>
    </View> : <StyleEditor creator look={look} equipped={person.look} earned={person.earned} unseen={[]} onChange={setLook}/>}
  </Sheet>;
}
