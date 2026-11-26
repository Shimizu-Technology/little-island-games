import React, { useContext } from 'react';
import { ScrollView, View } from 'react-native';
import { AudioPreferences, useSoundControls } from '../../../components/Audio';
import type { ChallengeViewProps } from '../../../challenge/types';
import type { Action, State } from './challenge-engine';
import { ProgramPanel } from './ProgramPanel';
export function ChallengeBoard({ state, dispatch, active, width, header, footer }: ChallengeViewProps<State, Action>) {
  const prefs = useContext(AudioPreferences), { play } = useSoundControls(prefs.sound ?? true);
  const panel = <ProgramPanel d={state.descriptor} state={state} active={active} width={width} send={a => { dispatch(a); play('tap', true); }} />;
  return header !== undefined ? <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 8, paddingBottom: 12 }} accessibilityLabel="Code Lab program and controls">{header}{panel}{footer}</ScrollView> : <View style={{ gap: 8 }}>{panel}</View>;
}
