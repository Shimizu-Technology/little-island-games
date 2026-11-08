import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import { Button, Copy, Heading } from '../../components/ui';
import { tideDirections, type TideDirection, type PuzzleFailure } from '../flow';

export type TideSample = { id: string; label: string; sample: ReactNode };
/** Selection has no persistence side effect. The host starts only the puzzle the child taps. */
export function PickYourTide({ samples, onChoose, disabled = false }: {
  samples: readonly [TideSample, TideSample, TideSample]; onChoose: (id: string) => void; disabled?: boolean;
}) {
  return <View style={{ gap: 12 }} testID="pick-your-tide">
    <Heading>Pick your tide</Heading><Copy>Choose the puzzle that looks fun. You can try another whenever you like.</Copy>
    {samples.map(sample => <View key={sample.id} style={{ gap: 8 }}>
      {sample.sample}<Button quiet disabled={disabled} onPress={() => onChoose(sample.id)}>{sample.label}</Button>
    </View>)}
  </View>;
}
export function PuzzleFeedback({ failure }: { failure: PuzzleFailure | null }) {
  return failure ? <Copy accessibilityLiveRegion="polite">{failure.character}: “{failure.line}”</Copy> : null;
}
/** All three choices have the same visual weight and size; nothing changes until a tap. */
export function PuzzleEnding({ praise, roundDone = false, onChoose, onAnother, onRest, disabled = false }: {
  praise: string; roundDone?: boolean; onChoose: (direction: TideDirection) => void;
  onAnother: () => void; onRest: () => void; disabled?: boolean;
}) {
  return <View style={{ gap: 12 }} testID="puzzle-ending">
    <Heading style={{ fontSize: 22 }}>{praise}</Heading>
    {roundDone ? <><Copy>Four puzzles finished. A good place to stop.</Copy><Button quiet disabled={disabled} onPress={onRest}>Back to the island</Button></> : <>
      <View style={{ gap: 8 }} testID="tide-choices">{tideDirections.map(direction => <Button key={direction} quiet disabled={disabled} onPress={() => onChoose(direction)}>{direction === 'easier' ? 'Easier' : direction === 'same' ? 'Same' : 'Harder'}</Button>)}</View>
      <Button quiet disabled={disabled} onPress={onAnother}>Try another</Button>
      <Button quiet disabled={disabled} onPress={onRest}>Back to the island</Button>
    </>}
  </View>;
}
