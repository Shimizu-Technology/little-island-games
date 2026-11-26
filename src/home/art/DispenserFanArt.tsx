import React from 'react';
import Svg, { Circle, G } from 'react-native-svg';
import type { ItemId } from '../catalog';
import type { ItemVisualState } from '../world';
import { dispenserFan } from './living';
import { HandProp } from './PropShape';
import type { HoldableId } from './living';

/** Visual only: engine supplies labelled 48-unit tap/drag targets at the same offsets. */
export function DispenserFanArt({ item, state }: { item: ItemId; state?: ItemVisualState }) {
  return (
    <Svg width={224} height={120} viewBox="-112 -120 224 120" accessible={false}>
      {dispenserFan(item, state).map(slot => (
        <G key={slot.item} transform={`translate(${slot.x} ${slot.y})`}>
          {/* Soft warm storybook drop shadow */}
          <Circle cy={2.5} r={24} fill="#4A3328" opacity={0.14} />
          {/* Tactile sunlit ivory bubble chip with crisp lagoon rim */}
          <Circle r={24} fill="#FFF7E6" stroke="#4FA99F" strokeWidth={2.2} />
          <Circle r={20.8} fill="none" stroke="#FFFDF7" strokeWidth={1.6} opacity={0.9} />
          <G transform="translate(-15 -15) scale(1.25)">
            <HandProp id={slot.item as HoldableId} />
          </G>
        </G>
      ))}
    </Svg>
  );
}
