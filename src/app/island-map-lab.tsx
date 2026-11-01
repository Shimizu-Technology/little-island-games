import React from 'react';
import { Redirect } from 'expo-router';
import IslandMapLab from '../hub-lab/IslandMapLab';

/** Opt in when exporting the private design lab. Never linked from the real Home. */
export default function IslandMapLabRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_ISLAND_MAP_LAB !== '1') return <Redirect href="/"/>;
  return <IslandMapLab/>;
}
