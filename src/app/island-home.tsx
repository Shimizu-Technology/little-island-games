import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { homeCharacterPose } from '../home/characterPose';
import { HomeScreen } from '../home/HomeScreen';
import { Islander } from '../islander';
import { useStore } from '../state/Store';
import { personFor } from '../personalization/model';
import { Copy, styles } from '../components/ui';
import { SaveStatus } from '../components/SaveStatus';
import { Recovery } from '../components/Recovery';
import { arcadeLearner } from '../arcade/progress';
import { homeStickerItems } from '../home/catalog';
export default function IslandHomeRoute() {
  const store = useStore(), owner = store.save.learning?.active ?? 'family', person = personFor(store.save);
  if (!store.ready) return <SafeAreaView style={styles.page}><Copy>Opening your home…</Copy></SafeAreaView>;
  if (store.recovery) return <SafeAreaView style={styles.page}><Recovery/></SafeAreaView>;
  const expected = { learner: owner, epoch: store.epoch };
  return <HomeScreen key={`${owner}:${store.epoch}`} initialState={person.home}
    ownedItems={homeStickerItems(arcadeLearner(store.save.arcade, owner).stickers)}
    persist={home => store.personalize({ home }, expected)}
    saveStatus={<><Copy style={{ fontSize: 12, alignSelf: "flex-start", backgroundColor: "#FCFAF4", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>{store.error ? 'Room not saved' : store.saving ? 'Saving room…' : 'Room saved on this device'}</Copy><SaveStatus/></>}
    renderCharacter={(slot, pose) => slot === 0 ? <Islander view="front" pose={homeCharacterPose(pose)} look={person.look} size={86}/> : undefined}/>;
}
