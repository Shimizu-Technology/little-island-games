import React from 'react';
import { Redirect } from 'expo-router';
import { HomeScreen } from '../home/HomeScreen';
import { labHome } from '../home/runtime/lab';

/** Deliberately opt-in: excluded from the ordinary navigation and public build. */
export default function HomeLabRoute() {
  if (!__DEV__ && process.env.EXPO_PUBLIC_HOME_LAB !== '1') return <Redirect href="/" />;
  return <HomeScreen initialState={labHome()} lab />;
}
