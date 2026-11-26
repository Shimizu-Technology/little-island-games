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
            asleep
              ? 'translate(0 8) rotate(0) scale(1 1)'
              : tucked
                ? 'translate(0 6) rotate(0) scale(1 1)'
                : 'translate(0 0) rotate(0) scale(1 1)'
          }
        >
          {/* Soft warm ground contact shadow when resting/standing */}
          {pose !== 'held' && (
            <Ellipse cx={60} cy={asleep ? 88 : tucked ? 90 : 96} rx={asleep ? 34 : 30} ry={4.5} fill={ink} opacity={0.14} stroke="none" />
          )}
          {/* Cozy crab legs — curled snug underneath when asleep or tucked */}
          {[0, 1, 2].map((n) => (
            <Path
              key={n}
              d={
                asleep
                  ? `M36 ${72 + n * 5}Q24 ${76 + n * 5} 28 ${84 + n * 2}M84 ${72 + n * 5}Q96 ${76 + n * 5} 92 ${84 + n * 2}`
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
              <Path d="M35 70Q25 76 31 82M85 70Q95 76 89 82" fill="none" stroke={shell} strokeWidth={7} />
              <Path d="M24 79Q18 68 32 68L30 76L38 74Q38 87 24 79ZM96 79Q102 68 88 68L90 76L82 74Q82 87 96 79Z" fill={shell} />
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
          <Ellipse cx={60} cy={73} rx={33} ry={23.5} fill={shell} />
          <Path d="M31 78Q60 99 89 78Q85 95 60 96Q35 95 31 78Z" fill={shellDark} stroke="none" opacity={0.45} />
          <Path d="M38 61Q60 51 82 61" fill="none" stroke={shellLight} strokeWidth={4} opacity={0.85} />
          {/* Warm golden-cream belly */}
          <Ellipse cx={60} cy={82} rx={22} ry={11.5} fill={belly} />
          <Ellipse cx={60} cy={80} rx={14} ry={5.5} fill={bellyShine} stroke="none" opacity={0.75} />
          {/* Eye stalks */}
          <Path d={asleep ? 'M46 56V47M74 56V47' : 'M45 55V42M75 55V42'} fill="none" stroke={ink} strokeWidth={10} />
          <Path d={asleep ? 'M46 56V47M74 56V47' : 'M45 55V42M75 55V42'} fill="none" stroke={shell} strokeWidth={6} />
          {/* Glossy dual-catchlight eyes or peaceful closed sleeping lids */}
          {[45, 75].map((x) => {
            const cy = asleep ? 44 : 37;
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
          <Ellipse cx={42} cy={72} rx={4.8} ry={3} fill="#FF9C90" stroke="none" opacity={0.75} />
          <Ellipse cx={78} cy={72} rx={4.8} ry={3} fill="#FF9C90" stroke="none" opacity={0.75} />
          <Path d={asleep ? 'M56 72Q60 75.5 64 72' : 'M53 71Q60 79 67 71'} fill="none" stroke={deepInk} strokeWidth={2.3} />
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
