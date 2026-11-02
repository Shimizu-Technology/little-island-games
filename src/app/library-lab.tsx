import React from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { LibraryLab } from '../library/LibraryLab';
/** Explicit opt-in for web design review. No hub/Explore production entry is changed. */
export default function LibraryLabRoute() {
  if (Platform.OS !== 'web' || process.env.EXPO_PUBLIC_LIBRARY_LAB !== '1') return <Redirect href="/"/>;
  return <LibraryLab/>;
}
