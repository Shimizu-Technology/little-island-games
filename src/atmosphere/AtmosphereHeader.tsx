import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useIslandAtmosphere, atmosphereHeaderAccent, type Atmosphere } from './useIslandAtmosphere';
import { GlobalWeatherLayer } from './GlobalWeatherLayer';
/** Confined to the header, below its content. Never placed over reading or game boards. */
export function AtmosphereHeader({ rounded = false }: { rounded?: boolean }) {
  const { atmosphere } = useIslandAtmosphere();
  if (atmosphere.timeOfDay === 'day' && atmosphere.weather === 'clear') return null;
  return <HeaderField atmosphere={atmosphere} rounded={rounded}/>;
}
function HeaderField({ atmosphere, rounded }: { atmosphere: Atmosphere; rounded: boolean }) {
  const active = useIsFocused();
  const [size, setSize] = useState({ width: 390, height: 90 });
  return <View testID="atmosphere-header" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" onLayout={e => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== size.width || height !== size.height)) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
  }} style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: rounded ? 12 : 0, backgroundColor: atmosphereHeaderAccent(atmosphere) }]}>
    <GlobalWeatherLayer atmosphere={atmosphere} {...size} active={active} tint={false} subtle/>
  </View>;
}
