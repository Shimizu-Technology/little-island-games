import React, { memo } from 'react';
import { IllustratedArt, MAP_DOOR_ART, type MapDoor } from '../art/illustrated';
import type { PlaceId } from './model';

/** All six Island Map doors render their approved Warm Island Storybook WebPs. */
export const DOOR_ART: Record<PlaceId, MapDoor> = {
  home: 'home',
  school: 'learn',
  arcade: 'arcade',
  cove: 'puzzles',
  hall: 'game-hall',
  library: 'library',
};

/** Renders the approved storybook illustration for a core map door. */
export const Landmark = memo(function Landmark({ id }: { id: PlaceId }) {
  return <IllustratedArt source={MAP_DOOR_ART[DOOR_ART[id]]}/>;
});
