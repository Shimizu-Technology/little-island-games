import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import type { Kind } from './rules';

/**
 * Canoe Seats pictures, all original. Every friend, hat and fruit differs in shape as well as
 * colour, so no clue relies on colour alone. Drawn on a 100 x 100 box with the house ink outline.
 */
export const ink = '#20474A';
const line = { stroke: ink, strokeWidth: 3.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const hide = { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

function Eyes({ y = 40, dx = 11, r = 7, cx = 50 }: { y?: number; dx?: number; r?: number; cx?: number }) {
  return <>
    <Circle cx={cx - dx} cy={y} r={r} fill="#FFFDF6" {...line} strokeWidth={2.4} />
    <Circle cx={cx + dx} cy={y} r={r} fill="#FFFDF6" {...line} strokeWidth={2.4} />
    <Circle cx={cx - dx + 1} cy={y + 1} r={r * 0.48} fill={ink} />
    <Circle cx={cx + dx + 1} cy={y + 1} r={r * 0.48} fill={ink} />
    <Circle cx={cx - dx + 2.4} cy={y - 1.6} r={r * 0.17} fill="#FFFFFF" />
    <Circle cx={cx + dx + 2.4} cy={y - 1.6} r={r * 0.17} fill="#FFFFFF" />
  </>;
}
const Smile = ({ y = 54, w = 8, cx = 50 }: { y?: number; w?: number; cx?: number }) => <Path d={`M${cx - w} ${y}Q${cx} ${y + w * 0.9} ${cx + w} ${y}`} fill="none" {...line} strokeWidth={2.8} />;
const Shadow = () => <Ellipse cx="50" cy="93" rx="30" ry="5" fill="#1C4A4C" opacity={0.16} />;

/** The eight friends, as canoe passengers facing you. */
function Turtle() {
  return <>
    <Shadow />
    <Path d="M18 80C18 58 32 50 50 50C68 50 82 58 82 80Z" fill="#3E8A52" {...line} />
    <Path d="M38 56L50 52L62 56L64 68L50 74L36 68Z" fill="#79BE6E" stroke="#2C6A3D" strokeWidth={2.2} />
    <Path d="M24 76L34 66M76 76L66 66M36 68L28 80M64 68L72 80" stroke="#2C6A3D" strokeWidth={2.2} />
    <Path d="M14 82Q8 74 14 68Q22 70 24 78Z" fill="#8FCB72" {...line} strokeWidth={2.6} />
    <Path d="M86 82Q92 74 86 68Q78 70 76 78Z" fill="#8FCB72" {...line} strokeWidth={2.6} />
    <Path d="M30 40C30 22 40 14 50 14C60 14 70 22 70 40C70 52 61 56 50 56C39 56 30 52 30 40Z" fill="#8FCB72" {...line} />
    <Eyes y={34} dx={9} r={6.4} />
    <Smile y={46} w={7} />
  </>;
}
function Crab() {
  return <>
    <Shadow />
    <G stroke="#A83E2C" strokeWidth={6} strokeLinecap="round" fill="none"><Path d="M24 74Q12 76 8 88" /><Path d="M76 74Q88 76 92 88" /><Path d="M26 66Q12 64 6 74" /><Path d="M74 66Q88 64 94 74" /></G>
    <Path d="M20 40Q6 32 8 18Q14 12 20 18Q20 8 28 8Q36 16 32 30Q30 40 24 44Z" fill="#E8604A" {...line} />
    <Path d="M80 40Q94 32 92 18Q86 12 80 18Q80 8 72 8Q64 16 68 30Q70 40 76 44Z" fill="#E8604A" {...line} />
    <Path d="M50 38C74 38 84 52 82 66C80 82 64 88 50 88C36 88 20 82 18 66C16 52 26 38 50 38Z" fill="#E8604A" {...line} />
    <Path d="M28 54Q38 46 50 46" fill="none" stroke="#FFE2D6" strokeWidth={4.5} strokeLinecap="round" opacity={0.7} />
    <Path d="M40 40V28M60 40V28" {...line} strokeWidth={3.6} />
    <Eyes y={26} dx={10} r={7} />
    <Smile y={64} w={8} />
  </>;
}
function Fish() {
  return <>
    <Shadow />
    <Path d="M78 52L96 36L94 70Z" fill="#2B6FB8" {...line} />
    <Path d="M10 54C14 30 34 20 54 22C72 24 82 38 82 54C82 70 70 84 52 86C32 88 12 78 10 54Z" fill="#3E92DC" {...line} />
    <Path d="M18 62C26 76 44 82 58 78C46 72 30 70 18 62Z" fill="#DDF0FF" />
    <Path d="M44 22Q52 6 66 12Q62 20 60 26Z" fill="#2B6FB8" {...line} strokeWidth={2.6} />
    <Path d="M56 40Q64 50 56 62M64 42Q72 52 64 62" fill="none" stroke="#2B6FB8" strokeWidth={2.6} strokeLinecap="round" />
    <Circle cx="30" cy="44" r="8.4" fill="#FFFDF6" {...line} strokeWidth={2.4} />
    <Circle cx="31" cy="45" r="4.2" fill={ink} />
    <Circle cx="33" cy="42.6" r="1.4" fill="#FFF" />
    <Path d="M16 60Q22 64 28 60" fill="none" {...line} strokeWidth={2.6} />
  </>;
}
function Bird() {
  return <>
    <Shadow />
    <Path d="M46 14Q50 2 58 6Q56 12 52 16Z" fill="#E9713A" {...line} strokeWidth={2.4} />
    <Path d="M40 16Q38 4 46 4Q48 10 46 16Z" fill="#E9713A" {...line} strokeWidth={2.4} />
    <Path d="M50 16C72 16 84 34 84 56C84 76 70 88 50 88C30 88 16 76 16 56C16 34 28 16 50 16Z" fill="#F4C431" {...line} />
    <Path d="M16 58Q6 64 10 76Q20 74 26 66Z" fill="#E8A92A" {...line} strokeWidth={2.6} />
    <Path d="M84 58Q94 64 90 76Q80 74 74 66Z" fill="#E8A92A" {...line} strokeWidth={2.6} />
    <Path d="M34 66C38 80 62 80 66 66C60 72 40 72 34 66Z" fill="#FFF1B8" />
    <Eyes y={40} dx={12} r={7} />
    <Path d="M42 50L50 62L58 50Z" fill="#F08A2B" {...line} strokeWidth={2.6} />
  </>;
}
function Gecko() {
  return <>
    <Shadow />
    <Path d="M70 80Q94 84 90 64Q86 54 78 60Q86 64 82 72Q78 76 66 74Z" fill="#B7D84A" {...line} strokeWidth={2.8} />
    <Path d="M32 88C30 70 38 56 50 56C62 56 70 70 68 88Z" fill="#B7D84A" {...line} />
    <Path d="M28 74L18 70M72 74L82 70" {...line} strokeWidth={4} />
    <Circle cx="18" cy="70" r="3.6" fill="#B7D84A" {...line} strokeWidth={2} />
    <Circle cx="82" cy="70" r="3.6" fill="#B7D84A" {...line} strokeWidth={2} />
    <Path d="M20 38C20 22 34 14 50 14C66 14 80 22 80 38C80 54 66 60 50 60C34 60 20 54 20 38Z" fill="#B7D84A" {...line} />
    <Circle cx="44" cy="74" r="3.2" fill="#F08F3C" />
    <Circle cx="56" cy="80" r="2.8" fill="#F08F3C" />
    <Circle cx="38" cy="18" r="0" />
    <Eyes y={32} dx={15} r={9} />
    <Path d="M38 48Q50 56 62 48" fill="none" {...line} strokeWidth={2.8} />
    <Circle cx="30" cy="46" r="2.6" fill="#F08F3C" opacity={0.8} />
    <Circle cx="70" cy="46" r="2.6" fill="#F08F3C" opacity={0.8} />
  </>;
}
function FruitBat() {
  return <>
    <Shadow />
    <Path d="M50 46L6 34Q4 54 12 62Q16 54 22 60Q26 52 32 60Q36 52 42 62Z" fill="#5C4034" {...line} />
    <Path d="M50 46L94 34Q96 54 88 62Q84 54 78 60Q74 52 68 60Q64 52 58 62Z" fill="#5C4034" {...line} />
    <Path d="M36 88C32 70 38 54 50 54C62 54 68 70 64 88Z" fill="#7A5A48" {...line} />
    <Path d="M30 22L28 6L42 16Z" fill="#7A5A48" {...line} strokeWidth={2.6} />
    <Path d="M70 22L72 6L58 16Z" fill="#7A5A48" {...line} strokeWidth={2.6} />
    <Path d="M26 34C26 20 36 12 50 12C64 12 74 20 74 34C74 48 64 56 50 56C36 56 26 48 26 34Z" fill="#C98A4B" {...line} />
    <Path d="M50 36C58 36 64 42 62 50C58 54 42 54 38 50C36 42 42 36 50 36Z" fill="#E0B07A" />
    <Eyes y={30} dx={10} r={6.2} />
    <Ellipse cx="50" cy="42" rx="3.6" ry="2.6" fill={ink} />
    <Path d="M44 48Q50 52 56 48" fill="none" {...line} strokeWidth={2.4} />
  </>;
}
function Octopus() {
  return <>
    <Shadow />
    <G fill="#9A68D1" {...line} strokeWidth={2.8}>
      <Path d="M22 62Q10 74 16 88Q22 84 22 76Q26 70 30 66Z" />
      <Path d="M36 66Q30 80 36 92Q42 86 40 78Q42 72 44 68Z" />
      <Path d="M64 66Q70 80 64 92Q58 86 60 78Q58 72 56 68Z" />
      <Path d="M78 62Q90 74 84 88Q78 84 78 76Q74 70 70 66Z" />
    </G>
    <Path d="M18 46C18 22 32 10 50 10C68 10 82 22 82 46C82 62 70 70 50 70C30 70 18 62 18 46Z" fill="#9A68D1" {...line} />
    <Circle cx="34" cy="22" r="3.4" fill="#C9A8F0" />
    <Circle cx="64" cy="18" r="2.6" fill="#C9A8F0" />
    <Circle cx="72" cy="28" r="2" fill="#C9A8F0" />
    <Eyes y={42} dx={13} r={7.6} />
    <Smile y={56} w={7} />
  </>;
}
function Pig() {
  return <>
    <Shadow />
    <Path d="M28 88C24 70 34 58 50 58C66 58 76 70 72 88Z" fill="#F2A5B6" {...line} />
    <Path d="M24 24L18 8L36 16Z" fill="#E68AA0" {...line} strokeWidth={2.6} />
    <Path d="M76 24L82 8L64 16Z" fill="#E68AA0" {...line} strokeWidth={2.6} />
    <Path d="M18 40C18 22 32 12 50 12C68 12 82 22 82 40C82 58 68 66 50 66C32 66 18 58 18 40Z" fill="#F7B8C6" {...line} />
    <Eyes y={32} dx={14} r={6.4} />
    <Ellipse cx="50" cy="48" rx="13" ry="9" fill="#E8879E" {...line} strokeWidth={2.6} />
    <Ellipse cx="45" cy="48" rx="2.6" ry="3.4" fill={ink} />
    <Ellipse cx="55" cy="48" rx="2.6" ry="3.4" fill={ink} />
    <Circle cx="26" cy="46" r="3.4" fill="#F28AA0" opacity={0.7} />
    <Circle cx="74" cy="46" r="3.4" fill="#F28AA0" opacity={0.7} />
  </>;
}
const friendArt = [Turtle, Crab, Fish, Bird, Gecko, FruitBat, Octopus, Pig];
/** Each friend's look in words, for the contact sheet and the person check. */
export const friendLooks = ['green, with a shell', 'red-orange, claws up', 'blue, with a tail fin', 'yellow, with a crest and beak', 'lime green, big eyes, curly tail', 'brown, with wings and pointed ears', 'purple, with arms below', 'pink, with a snout'];

/** Hats, drawn on a 100 x 60 box to sit on a friend's head. */
function RedCap() {
  return <>
    <Path d="M50 50L96 50Q96 58 86 58L50 58Z" fill="#C0392B" {...line} strokeWidth={2.8} />
    <Path d="M14 52C14 26 30 14 50 14C70 14 86 26 86 52Z" fill="#E74C3C" {...line} />
    <Path d="M50 14V52M30 20Q34 36 32 52M70 20Q66 36 68 52" fill="none" stroke="#A93226" strokeWidth={2} />
    <Circle cx="50" cy="13" r="5" fill="#C0392B" {...line} strokeWidth={2.4} />
  </>;
}
function BucketHat() {
  return <>
    <Path d="M6 54L18 38H82L94 54Q94 58 88 58H12Q6 58 6 54Z" fill="#2E7BC4" {...line} />
    <Path d="M24 40L30 12H70L76 40Z" fill="#4A9BE6" {...line} />
    <Path d="M27 30H73" stroke="#1E5E9C" strokeWidth={4} />
    <Path d="M14 50Q50 44 86 50" fill="none" stroke="#1E5E9C" strokeWidth={2} strokeDasharray="4 4" />
  </>;
}
function StrawHat() {
  return <>
    <Ellipse cx="50" cy="48" rx="47" ry="10" fill="#E9B949" {...line} />
    <Path d="M28 46C28 22 36 12 50 12C64 12 72 22 72 46Z" fill="#F4CE62" {...line} />
    <Path d="M28 38H72V46H28Z" fill="#D35A3A" stroke={ink} strokeWidth={2.4} />
    <Path d="M36 18L40 36M50 13V36M64 18L60 36M16 46L22 52M84 46L78 52M38 52L36 57M62 52L64 57" stroke="#B88A24" strokeWidth={1.8} />
  </>;
}
function LeafHat() {
  return <>
    <G fill="#4FAE4A" {...line} strokeWidth={2.8}>
      <Path d="M14 54Q6 30 22 18Q28 36 30 54Z" />
      <Path d="M86 54Q94 30 78 18Q72 36 70 54Z" />
      <Path d="M30 54Q24 20 42 8Q48 30 46 54Z" fill="#6CC65F" />
      <Path d="M70 54Q76 20 58 8Q52 30 54 54Z" fill="#6CC65F" />
      <Path d="M44 54Q40 14 50 2Q60 14 56 54Z" fill="#3D9440" />
    </G>
    <Path d="M10 52H90V58H10Z" fill="#2F7D33" stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
  </>;
}
function BobbleHat() {
  return <>
    <Path d="M16 50C16 26 30 16 50 16C70 16 84 26 84 50Z" fill="#8E5BC8" {...line} />
    <Path d="M30 22Q34 36 32 50M50 16V50M70 22Q66 36 68 50" fill="none" stroke="#6E3FA6" strokeWidth={2.2} />
    <Rect x="12" y="46" width="76" height="12" rx="5" fill="#B48AE4" {...line} strokeWidth={2.6} />
    <Path d="M22 48V56M32 48V56M42 48V56M52 48V56M62 48V56M72 48V56M82 48V56" stroke="#8E5BC8" strokeWidth={2} />
    <Circle cx="50" cy="12" r="10" fill="#F2D6FF" {...line} strokeWidth={2.6} />
  </>;
}
const hatArt = [RedCap, BucketHat, StrawHat, LeafHat, BobbleHat];
export const hatLooks = ['red cap with a peak', 'blue bucket hat', 'gold straw hat with a wide brim', 'green hat of leaves', 'purple bobble hat with a pompom'];

/** Fruit, on a 100 x 100 box. */
function Banana() {
  return <>
    <Path d="M18 30Q20 76 64 86Q84 88 88 80Q60 80 44 62Q30 46 30 26Z" fill="#F6D33C" {...line} />
    <Path d="M30 26L26 14L34 12L34 26" fill="#8A6A2A" {...line} strokeWidth={2.4} />
    <Path d="M34 46Q42 66 70 78" fill="none" stroke="#D6A824" strokeWidth={2.4} />
    <Path d="M86 80L92 82" {...line} strokeWidth={4} />
  </>;
}
function Coconut() {
  return <>
    <Circle cx="50" cy="54" r="34" fill="#8B5A33" {...line} />
    <Path d="M24 40Q34 30 46 34M60 76Q72 72 78 60M30 66Q36 74 44 76" fill="none" stroke="#5E3A1E" strokeWidth={2.2} strokeLinecap="round" />
    <Circle cx="42" cy="46" r="4.6" fill="#4A2C15" />
    <Circle cx="58" cy="46" r="4.6" fill="#4A2C15" />
    <Circle cx="50" cy="60" r="4.6" fill="#4A2C15" />
  </>;
}
function Mango() {
  return <>
    <Path d="M30 30C48 16 82 28 84 54C86 78 64 92 44 86C22 80 12 46 30 30Z" fill="#F39A2E" {...line} />
    <Path d="M30 30C40 34 44 46 40 60C36 72 44 82 50 86C30 84 16 60 22 42Z" fill="#E4572E" opacity={0.7} />
    <Path d="M52 22Q50 14 56 8" fill="none" {...line} strokeWidth={3} />
    <Path d="M56 12Q72 2 86 10Q74 22 56 14Z" fill="#4FAE4A" {...line} strokeWidth={2.6} />
    <Path d="M66 38Q74 44 74 54" fill="none" stroke="#FFD58A" strokeWidth={4} strokeLinecap="round" />
  </>;
}
function StarFruit() {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 18 : 40; return `${50 + Math.cos(a) * r} ${54 + Math.sin(a) * r}`; }).join('L');
  return <>
    <Path d={`M${pts}Z`} fill="#D9E24A" {...line} />
    <Path d={`M50 54L50 14M50 54L88 42M50 54L74 86M50 54L26 86M50 54L12 42`} stroke="#A9B52A" strokeWidth={2.2} />
    <Circle cx="50" cy="54" r="5" fill="#F2F7A0" stroke="#A9B52A" strokeWidth={2} />
  </>;
}
function Pineapple() {
  return <>
    <G fill="#3D9A45" {...line} strokeWidth={2.6}>
      <Path d="M50 30L36 4L50 18L52 2L58 18L68 6L56 30Z" />
    </G>
    <Ellipse cx="51" cy="62" rx="27" ry="32" fill="#F2A93B" {...line} />
    <Path d="M30 46L70 82M28 64L58 92M40 34L76 66M72 46L32 82M74 64L44 92M62 34L26 66" stroke="#C47A1E" strokeWidth={2} />
  </>;
}
const fruitArt = [Banana, Coconut, Mango, StarFruit, Pineapple];
export const fruitLooks = ['yellow banana', 'brown coconut with three dots', 'orange mango with a leaf', 'yellow-green star fruit', 'pineapple with a leafy top'];

export const Friend = memo(function Friend({ pool, size }: { pool: number; size: number }) {
  const Art = friendArt[pool] ?? Turtle;
  return <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}><Art /></Svg>;
});
export const Hat = memo(function Hat({ pool, size }: { pool: number; size: number }) {
  const Art = hatArt[pool] ?? RedCap;
  return <Svg width={size} height={size * 0.6} viewBox="0 0 100 60" {...hide}><Art /></Svg>;
});
export const Fruit = memo(function Fruit({ pool, size }: { pool: number; size: number }) {
  const Art = fruitArt[pool] ?? Banana;
  return <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}><Art /></Svg>;
});
/** Any item at token size: friends fill the box, hats sit in its middle, fruit a little smaller. */
export function ItemArt({ attr, pool, size }: { attr: number; pool: number; size: number }) {
  if (attr === 0) return <Friend pool={pool} size={size} />;
  if (attr === 1) return <Svg width={size} height={size} viewBox="0 -20 100 100" {...hide}>{React.createElement(hatArt[pool] ?? RedCap)}</Svg>;
  return <Svg width={size} height={size} viewBox="-8 -8 116 116" {...hide}>{React.createElement(fruitArt[pool] ?? Banana)}</Svg>;
}

/** The canoe: bow (the front, seat 1) on the left with a carved prow, stern on the right, an outrigger float behind. */
export const Hull = memo(function Hull({ width, height, seats, seat, pad }: { width: number; height: number; seats: number; seat: number; pad: number }) {
  const top = height - seat * 0.42, h = seat * 0.42;
  return <Svg width={width} height={height} {...hide}>
    {/* outrigger float and its poles, behind the hull */}
    <Path d={`M${pad + seat * 0.4} ${top - 2}L${pad + seat * 0.2} ${top - seat * 0.12}M${width - pad - seat * 0.4} ${top - 2}L${width - pad - seat * 0.2} ${top - seat * 0.12}`} stroke="#7A4E2A" strokeWidth={4} strokeLinecap="round" />
    <Rect x={pad} y={top - seat * 0.2} width={width - pad * 2} height={seat * 0.1} rx={seat * 0.05} fill="#A8753F" stroke={ink} strokeWidth={2} />
    {/* water */}
    <Path d={`M0 ${height - 3}Q${width * 0.12} ${height - 9} ${width * 0.25} ${height - 3}T${width * 0.5} ${height - 3}T${width * 0.75} ${height - 3}T${width} ${height - 3}V${height}H0Z`} fill="#7FD0D8" />
    {/* hull */}
    <Path d={`M2 ${top}L${width - 6} ${top}Q${width - 2} ${top + h * 0.5} ${width - pad * 0.9} ${top + h}L${pad * 0.9} ${top + h}Q${pad * 0.25} ${top + h * 0.6} 2 ${top}Z`} fill="#C9833F" stroke={ink} strokeWidth={3} strokeLinejoin="round" />
    <Path d={`M${pad * 0.5} ${top + h * 0.36}H${width - pad * 0.5}`} stroke="#E8B06A" strokeWidth={Math.max(3, h * 0.14)} strokeLinecap="round" />
    <Path d={`M${pad * 0.9} ${top + h * 0.72}H${width - pad * 0.9}`} stroke="#9E5F2A" strokeWidth={2} strokeLinecap="round" />
    {/* carved prow at the front */}
    <Path d={`M4 ${top}Q-2 ${top - h * 0.9} ${pad * 0.5} ${top - h * 1.3}Q${pad * 0.55} ${top - h * 0.5} ${pad * 0.9} ${top}Z`} fill="#B06E30" stroke={ink} strokeWidth={2.6} strokeLinejoin="round" />
    <Circle cx={pad * 0.46} cy={top - h * 1.18} r={Math.max(3, h * 0.16)} fill="#F4D58D" stroke={ink} strokeWidth={2} />
    {/* seat planks with number pips: 1 at the front */}
    {Array.from({ length: seats }, (_, i) => {
      const x = pad + i * seat;
      return <G key={i}>
        <Rect x={x + seat * 0.08} y={top - seat * 0.08} width={seat * 0.84} height={seat * 0.14} rx={seat * 0.05} fill="#8C5A2E" stroke={ink} strokeWidth={2} />
        {Array.from({ length: i + 1 }, (_, k) => <Circle key={k} cx={x + seat / 2 + (k - i / 2) * Math.min(9, seat * 0.13)} cy={top + h * 0.56} r={Math.max(2.6, seat * 0.045)} fill="#FFF4DC" stroke={ink} strokeWidth={1.4} />)}
      </G>;
    })}
  </Svg>;
});

// ---------- Clue pictures ----------

const good = '#2E9D6A', bad = '#D24B3E';
/** A small canoe outline with `n` seats; the bow (front) points left. */
function MiniCanoe({ x, y, w, n, mark }: { x: number; y: number; w: number; n: number; mark?: (i: number) => 'pick' | 'no' | 'ghost' | null }) {
  const seatW = (w - 14) / n, h = 12;
  return <G transform={`translate(${x} ${y})`}>
    <Path d={`M0 0H${w}Q${w - 2} ${h * 0.9} ${w - 8} ${h}H8Q2 ${h * 0.9} 0 0Z`} fill="#D49250" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
    <Path d={`M1 0Q-4 -8 4 -12Q4 -5 7 0Z`} fill="#B06E30" stroke={ink} strokeWidth={1.6} strokeLinejoin="round" />
    {Array.from({ length: n }, (_, i) => {
      const m = mark?.(i) ?? null, sx = 7 + i * seatW;
      return <G key={i}>
        <Rect x={sx + 2} y={-12} width={seatW - 4} height={11} rx={3} fill={m === 'pick' ? '#FFE07A' : '#F7E9D2'} stroke={m === 'pick' ? '#C98A12' : ink} strokeWidth={m === 'pick' ? 2.4 : 1.4} />
        {m === 'no' && <Path d={`M${sx + 5} -10L${sx + seatW - 5} -3M${sx + seatW - 5} -10L${sx + 5} -3`} stroke={bad} strokeWidth={2.6} strokeLinecap="round" />}
      </G>;
    })}
  </G>;
}
/** One item drawn inside a clue: friends, hats or fruit at the given size, centred on (cx, cy). */
function Mini({ attr, pool, cx, cy, s }: { attr: number; pool: number; cx: number; cy: number; s: number }) {
  const Art = (attr === 0 ? friendArt : attr === 1 ? hatArt : fruitArt)[pool];
  if (!Art) return null;
  const k = s / 100, oy = attr === 1 ? 30 : 50;
  return <G transform={`translate(${cx - 50 * k} ${cy - oy * k}) scale(${k})`}><Art /></G>;
}
function NoSign({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <G><Circle cx={cx} cy={cy} r={r} fill="none" stroke={bad} strokeWidth={3.4} /><Line x1={cx - r * 0.7} y1={cy + r * 0.7} x2={cx + r * 0.7} y2={cy - r * 0.7} stroke={bad} strokeWidth={3.4} strokeLinecap="round" /></G>;
}
export type ClueItem = { attr: number; pool: number };
/**
 * Picture for one clue, on a 160 x 64 card. Every kind has its own shape: a seat in a little canoe,
 * two friends touching, a wall between them, an arrow to the bow, an empty seat between, or one seat
 * holding both. Negative clues add the same red "no" sign.
 */
export const CluePicture = memo(function CluePicture({ kind, x, y, seat, n, width, height }: { kind: Kind; x: ClueItem; y?: ClueItem; seat?: number; n: number; width: number; height: number }) {
  const body = (() => {
    switch (kind) {
      case 'at': return <><Mini {...x} cx={26} cy={34} s={46} /><MiniCanoe x={56} y={40} w={98} n={n} mark={i => (i === seat ? 'pick' : null)} /><Path d={`M${63 + ((seat ?? 0) + 0.5) * ((98 - 14) / n)} 8V20`} stroke="#C98A12" strokeWidth={3} strokeLinecap="round" /><Path d={`M${57 + ((seat ?? 0) + 0.5) * ((98 - 14) / n)} 15L${63 + ((seat ?? 0) + 0.5) * ((98 - 14) / n)} 22L${69 + ((seat ?? 0) + 0.5) * ((98 - 14) / n)} 15`} fill="none" stroke="#C98A12" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></>;
      case 'end': return <><Mini {...x} cx={26} cy={34} s={46} /><MiniCanoe x={56} y={40} w={98} n={n} mark={i => (i === 0 || i === n - 1 ? 'pick' : null)} /><Path d="M74 10L62 22M136 10L148 22" stroke="#C98A12" strokeWidth={3} strokeLinecap="round" /></>;
      case 'mid': return <><Mini {...x} cx={26} cy={34} s={46} /><MiniCanoe x={56} y={40} w={98} n={n} mark={i => (i === 0 || i === n - 1 ? 'no' : 'pick')} /></>;
      case 'next': return <><Rect x={34} y={46} width={44} height={13} rx={4} fill="#FFE07A" stroke="#C98A12" strokeWidth={2.2} /><Rect x={82} y={46} width={44} height={13} rx={4} fill="#FFE07A" stroke="#C98A12" strokeWidth={2.2} /><Mini {...x} cx={56} cy={26} s={44} /><Mini {...y!} cx={104} cy={26} s={44} /><Circle cx={74} cy={52} r={6} fill="none" stroke={good} strokeWidth={3} /><Circle cx={86} cy={52} r={6} fill="none" stroke={good} strokeWidth={3} /></>;
      case 'far': return <><Mini {...x} cx={34} cy={32} s={44} /><Mini {...y!} cx={126} cy={32} s={44} /><Rect x={74} y={8} width={12} height={48} rx={4} fill="#C9B79A" stroke={ink} strokeWidth={2} /><NoSign cx={80} cy={32} r={18} /></>;
      case 'ahead': return <><MiniCanoe x={8} y={56} w={146} n={2} /><Mini {...x} cx={40} cy={28} s={42} /><Mini {...y!} cx={122} cy={28} s={42} /><Path d="M96 26H70M78 16L68 26L78 36" fill="none" stroke="#2F7E8D" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></>;
      case 'gap': return <><Mini {...x} cx={28} cy={30} s={42} /><Rect x={60} y={12} width={40} height={36} rx={8} fill="#FFFFFF" stroke={ink} strokeWidth={2.2} strokeDasharray="5 4" /><Mini {...y!} cx={132} cy={30} s={42} /><Path d="M50 56H110" stroke="#2F7E8D" strokeWidth={2.6} strokeLinecap="round" /><Path d="M50 51V61M110 51V61" stroke="#2F7E8D" strokeWidth={2.6} strokeLinecap="round" /></>;
      case 'same':
      case 'diff': {
        const a = y && y.attr < x.attr ? y : x, b = a === x ? y! : x;
        return <><Rect x={44} y={4} width={72} height={56} rx={12} fill={kind === 'same' ? '#EAF7EF' : '#FBEDEB'} stroke={kind === 'same' ? good : bad} strokeWidth={2.6} />
          {a.attr === 0 ? <><Mini {...a} cx={80} cy={36} s={44} />{b.attr === 1 ? <Mini {...b} cx={80} cy={14} s={34} /> : <Mini {...b} cx={102} cy={46} s={24} />}</>
            : <><Mini {...a} cx={74} cy={22} s={36} /><Mini {...b} cx={88} cy={44} s={26} /></>}
          {kind === 'diff' && <NoSign cx={136} cy={32} r={14} />}</>;
      }
    }
  })();
  return <Svg width={width} height={height} viewBox="0 0 160 64" {...hide}>{body}</Svg>;
});

/** Shelf and card art: three friends paddling. */
export const ShelfArt = memo(function ShelfArt({ size }: { size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" {...hide}>
    <Rect x="0" y="0" width="100" height="100" rx="22" fill="#F6E4CF" />
    <Path d="M0 74Q25 68 50 74T100 74V100H0Z" fill="#7FD0D8" />
    <G transform="translate(16 30) scale(0.24)"><Turtle /></G>
    <G transform="translate(38 28) scale(0.24)"><Bird /></G>
    <G transform="translate(60 30) scale(0.24)"><Crab /></G>
    <Path d="M6 58H94Q92 70 84 72H16Q8 70 6 58Z" fill="#C9833F" stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
    <Path d="M8 58Q4 48 12 44Q12 52 16 58Z" fill="#B06E30" stroke={ink} strokeWidth="2" strokeLinejoin="round" />
    <Path d="M12 63H88" stroke="#E8B06A" strokeWidth="2.4" strokeLinecap="round" />
  </Svg>;
});
