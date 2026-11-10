import React, { useCallback, useState } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSoundControls } from '../../components/Audio';
import { useStore } from '../../state/Store';
import { GridFeedback, GridInteraction } from './preferences';

/**
 * A page that holds its own scrolling while a grid owns a touch, and gives accepted grid edits the
 * app's tap feedback. Any route that renders a grid adapter outside the Cove uses this.
 */
export function GridScroll({ scrollEnabled = true, ...props }: ScrollViewProps) {
  const store = useStore(), sound = useSoundControls(store.save.settings.sound), [held, setHeld] = useState(false);
  const feedback = useCallback(() => sound.play('tap'), [sound]);
  return <GridInteraction.Provider value={setHeld}><GridFeedback.Provider value={feedback}><ScrollView {...props} scrollEnabled={scrollEnabled && !held}/></GridFeedback.Provider></GridInteraction.Provider>;
}
