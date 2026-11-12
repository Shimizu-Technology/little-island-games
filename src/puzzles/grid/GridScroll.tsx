import React, { forwardRef, useCallback, useState } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSoundControls } from '../../components/Audio';
import { useStore } from '../../state/Store';
import { GridFeedback, GridInteraction } from './preferences';

/**
 * A page that holds its own scrolling while a grid owns a touch, and gives accepted grid edits the
 * app's tap feedback. Any route that renders a grid adapter outside the Cove uses this. The ref is the
 * page's ScrollView, so a route can still move the page (for example back to the top).
 */
export const GridScroll = forwardRef<ScrollView, ScrollViewProps>(function GridScroll({ scrollEnabled = true, ...props }, ref) {
  const store = useStore(), sound = useSoundControls(store.save.settings.sound), [held, setHeld] = useState(false);
  const feedback = useCallback(() => sound.play('tap'), [sound]);
  return <GridInteraction.Provider value={setHeld}><GridFeedback.Provider value={feedback}><ScrollView {...props} ref={ref} scrollEnabled={scrollEnabled && !held}/></GridFeedback.Provider></GridInteraction.Provider>;
});
