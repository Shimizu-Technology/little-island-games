import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { RigCrab, type CompanionProps } from '../../islander/rig/Companions';

export type CrabPose = 'stand' | 'sit' | 'lie' | 'held';

const ink = '#4A3328';
const deepInk = '#3D2B24';
const shell = '#F26F55';
const shellLight = '#FF9C84';
const shellDark = '#D44D36';
const belly = '#FAD27A';
const bellyShine = '#FFF2C2';
const cream = '#FFFDF7';

/** Original coral crab, with a ground contact at (60, 96), in a 120×110 box. */
export const CrabFriend = memo(function CrabFriend({ pose = 'stand', size = 120, mirrored = false, reduced = false, ...rig }: CompanionProps & { pose?: CrabPose; mirrored?: boolean }) {
  if (rig.base) return <RigCrab {...rig} size={size} reduced={reduced} facing={rig.facing ?? (mirrored ? 'left' : 'right')} />;
  const asleep = pose === 'lie', tucked = pose === 'sit' || pose === 'held';
  return (
    <Svg width={size} height={(size * 110) / 120} viewBox="0 0 120 110" accessible={false}>
      <G
        transform={mirrored ? 'translate(120 0) rotate(0) scale(-1 1)' : 'translate(0 0) rotate(0) scale(1 1)'}
        stroke={ink}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <G
          transform={
            tucked
              ? 'translate(0 6) rotate(0) scale(1 1)'
              : 'translate(0 0) rotate(0) scale(1 1)'
          }
        >
          {/* Soft warm ground contact shadow when resting/standing */}
          {pose !== 'held' && (
            <Ellipse cx={60} cy={tucked ? 90 : 96} rx={asleep ? 36 : 30} ry={4.5} fill={ink} opacity={0.14} stroke="none" />
          )}
          {/* Cozy crab legs — curled snug underneath when asleep or tucked */}
          {[0, 1, 2].map((n) => (
            <Path
              key={n}
              d={
                asleep
                  ? `M${32 + n * 2} ${76 + n * 4.5}Q${21 + n * 2} ${80 + n * 4.5} ${25 + n * 2.5} ${87 + n * 3.5}M${88 - n * 2} ${76 + n * 4.5}Q${99 - n * 2} ${80 + n * 4.5} ${95 - n * 2.5} ${87 + n * 3.5}`
                  : `M37 ${68 + n * 6}L${tucked ? 29 : 18 - n * 2} ${75 + n * 7}l${tucked ? 5 : -6} 9M83 ${68 + n * 6}L${tucked ? 91 : 102 + n * 2} ${75 + n * 7}l${tucked ? -5 : 6} 9`
              }
              fill="none"
              stroke={ink}
              strokeWidth={2.6}
            />
          ))}
          {/* Claw arms + expressive plump claws */}
          {asleep ? (
            <>
              <Path d="M34 72Q24 77 29 83M86 72Q96 77 91 83" fill="none" stroke={shell} strokeWidth={7} />
              <Path d="M22 80Q16 69 30 69L28 77L36 75Q36 88 22 80ZM98 80Q104 69 90 69L92 77L84 75Q84 88 98 80Z" fill={shell} />
            </>
          ) : (
            <>
              <Path d="M35 66L23 53M85 66L97 53" fill="none" stroke={ink} strokeWidth={10.5} />
              <Path d="M35 66L23 53M85 66L97 53" fill="none" stroke={shell} strokeWidth={6.5} />
              <Path d="M23 56Q8 56 10 38L22 46L28 34Q40 51 23 56ZM97 56Q80 51 92 34L98 46L110 38Q112 56 97 56Z" fill={shell} />
              <Path d="M13 43Q14 49 20 52M107 43Q106 49 100 52" fill="none" stroke={shellLight} strokeWidth={2.2} />
            </>
          )}
          {/* Plump warm coral-orange shell with sunlit highlight & deep under-shade */}
          <Ellipse cx={60} cy={asleep ? 74.5 : 73} rx={asleep ? 34 : 33} ry={asleep ? 20.5 : 23.5} fill={shell} />
          <Path
            d={asleep ? 'M30 80Q60 97 90 80Q85 94.5 60 95Q35 94.5 30 80Z' : 'M31 78Q60 99 89 78Q85 95 60 96Q35 95 31 78Z'}
            fill={shellDark}
            stroke="none"
            opacity={0.45}
          />
          <Path d={asleep ? 'M37 64Q60 55 83 64' : 'M38 61Q60 51 82 61'} fill="none" stroke={shellLight} strokeWidth={4} opacity={0.85} />
          {/* Warm golden-cream belly */}
          <Ellipse cx={60} cy={asleep ? 83 : 82} rx={22} ry={asleep ? 10 : 11.5} fill={belly} />
          <Ellipse cx={60} cy={asleep ? 81 : 80} rx={14} ry={asleep ? 4.8 : 5.5} fill={bellyShine} stroke="none" opacity={0.75} />
          {/* Eye stalks */}
          <Path d={asleep ? 'M46 59V50M74 59V50' : 'M45 55V42M75 55V42'} fill="none" stroke={ink} strokeWidth={10} />
          <Path d={asleep ? 'M46 59V50M74 59V50' : 'M45 55V42M75 55V42'} fill="none" stroke={shell} strokeWidth={6} />
          {/* Glossy dual-catchlight eyes or peaceful closed sleeping lids */}
          {[45, 75].map((x) => {
            const cy = asleep ? 47 : 37;
            return (
              <G key={x}>
                <Circle cx={x} cy={cy} r={10} fill={cream} />
                {asleep ? (
                  <Path d={`M${x - 4.5} ${cy + 0.5}q4.5 4.5 9 0`} fill="none" stroke={deepInk} strokeWidth={2.2} />
                ) : (
                  <>
                    <Circle cx={x} cy={cy} r={4.5} fill={deepInk} stroke="none" />
                    <Circle cx={x - 1.6} cy={cy - 1.8} r={1.8} fill="#FFFFFF" stroke="none" />
                    <Circle cx={x + 1.8} cy={cy + 1.6} r={0.95} fill="#FFFFFF" stroke="none" />
                  </>
                )}
              </G>
            );
          })}
          {/* Cute rosy coral-pink cheeks & cheerful smile */}
          <Ellipse cx={42} cy={asleep ? 74.5 : 72} rx={4.8} ry={3} fill="#FF9C90" stroke="none" opacity={0.75} />
          <Ellipse cx={78} cy={asleep ? 74.5 : 72} rx={4.8} ry={3} fill="#FF9C90" stroke="none" opacity={0.75} />
          <Path d={asleep ? 'M56 74.5Q60 78 64 74.5' : 'M53 71Q60 79 67 71'} fill="none" stroke={deepInk} strokeWidth={2.3} />
        </G>
        {asleep && !reduced && (
          <G stroke="#4FA99F" strokeWidth={2.4} fill="none">
            <Path d="M87 27h9l-9 9h9" />
            <Path d="M101 16h6.5l-6.5 6.5h6.5" stroke="#F5C249" strokeWidth={2.1} />
          </G>
        )}
      </G>
    </Svg>
  );
});
