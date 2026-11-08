import React from 'react';
import { View } from 'react-native';
import { Button, Copy } from '../../components/ui';
/** The board receives its neutral draft separately, with cellFeedback('whole', ...) returning null. */
export function WholeAnswerControls({ canCheck, incorrect, needsVariant, onCheck, onVariant, disabled = false }: {
  canCheck: boolean; incorrect: boolean; needsVariant: boolean; onCheck: () => void; onVariant: () => void; disabled?: boolean;
}) {
  return <View style={{ gap: 10 }} testID="whole-answer-controls">
    {incorrect && <Copy accessibilityLiveRegion="polite">Not quite yet. Your answer is still here.</Copy>}
    {needsVariant ? <><Copy>Try a fresh puzzle with the same idea.</Copy><Button quiet disabled={disabled} onPress={onVariant}>Try another</Button></> :
      <Button disabled={disabled || !canCheck} onPress={onCheck}>Check</Button>}
  </View>;
}
