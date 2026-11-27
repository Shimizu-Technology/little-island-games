import React, { memo } from 'react';
import { Image, View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { RigCrab, type CompanionProps } from '../../islander/rig/Companions';
import { illustratedProps } from './illustrated';
export function crabPaintLayout(pose: CrabPose, size = 120) {
  const unit = size / 120, tucked = pose === 'sit' || pose === 'held';
  const width = pose === 'lie' ? 108 : tucked ? 102 : 120, height = pose === 'lie' ? 88 : tucked ? 106 : 120;
  return { left: (60-width/2)*unit, top: (96-height*319/384)*unit, width: width*unit, height: height*unit };
}
export type CrabPose = 'stand' | 'sit' | 'lie' | 'held';

/** 120×110 box and invariant ground contact (60,96), including lie and held. */
export const CrabFriend = memo(function CrabFriend({ pose = 'stand', size = 120, mirrored = false, reduced = false, ...rig }: CompanionProps & { pose?: CrabPose; mirrored?: boolean }) {
  if (rig.base) return <RigCrab {...rig} size={size} reduced={reduced} facing={rig.facing ?? (mirrored ? 'left' : 'right')} />;
  const asleep = pose === 'lie', unit = size / 120;
  const layout = crabPaintLayout(pose, size);
  return <View pointerEvents="none" accessible={false} style={{ width: size, height: 110*unit, transform: [{ scaleX: mirrored ? -1 : 1 }] }}>
    <Image testID={`painted-crab-${pose}`} source={illustratedProps.crab()} resizeMode="contain" fadeDuration={0} accessible={false}
      style={{ position:'absolute', ...layout }}/>
    <Svg width={size} height={110*unit} viewBox="0 0 120 110" style={{ position:'absolute' }} accessible={false}>
      {pose !== 'held' && <Ellipse cx={60} cy={96} rx={30} ry={3} fill="#4A3328" opacity={.12}/>}
      {asleep && <G fill="#F27654" stroke="#4A3328" strokeWidth={1.2}>
        <Ellipse cx={49} cy={64} rx={7} ry={6} stroke="none"/><Ellipse cx={73} cy={64} rx={7} ry={6} stroke="none"/>
        <Path d="M44 64q5 5 10 0m14 0q5 5 10 0" fill="none"/>
      </G>}
      {asleep && !reduced && <G stroke="#4FA99F" strokeWidth={2} fill="none"><Path d="M90 38h8l-8 8h8m5-22h6l-6 6h6"/></G>}
    </Svg>
  </View>;
});
