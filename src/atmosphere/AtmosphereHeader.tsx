import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useIslandAtmosphere, atmosphereHeaderAccent, type Atmosphere } from './useIslandAtmosphere';
import { GlobalWeatherLayer } from './GlobalWeatherLayer';
/** Confined to the header, below its content. Never placed over reading or game boards. */
export function AtmosphereHeader() {
  const { atmosphere } = useIslandAtmosphere();
  if (atmosphere.timeOfDay === 'day' && atmosphere.weather === 'clear') return null;
  return <HeaderField atmosphere={atmosphere}/>;
}
function HeaderField({ atmosphere }: { atmosphere: Atmosphere }) {
  const active = useIsFocused();
  const [size, setSize] = useState({ width: 390, height: 90 });
  return <View testID="atmosphere-header" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={e => setSize(e.nativeEvent.layout)} style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 12, backgroundColor: atmosphereHeaderAccent(atmosphere) }]}>
    <GlobalWeatherLayer atmosphere={atmosphere} {...size} active={active} tint={false} subtle/>
  </View>;
}
