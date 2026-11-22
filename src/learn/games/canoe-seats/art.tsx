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
    {/* a big tan-rimmed shell with plates: the turtle's own shape, even at token size */}
    <Path d="M10 84C10 56 28 44 50 44C72 44 90 56 90 84Z" fill="#B98A4E" {...line} />
    <Path d="M16 82C16 60 31 50 50 50C69 50 84 60 84 82Z" fill="#3E8A52" stroke="#2C6A3D" strokeWidth={2} />
    <Path d="M36 58L50 54L64 58L66 70L50 76L34 70Z" fill="#79BE6E" stroke="#2C6A3D" strokeWidth={2.2} />
    <Path d="M22 78L34 70M78 78L66 70M34 70L30 82M66 70L70 82M50 76V82" stroke="#2C6A3D" strokeWidth={2.2} />
    <Path d="M32 38C32 22 40 14 50 14C60 14 68 22 68 38C68 48 60 52 50 52C40 52 32 48 32 38Z" fill="#6CC6A6" {...line} />
    <Eyes y={32} dx={8.6} r={6.2} />
    <Smile y={43} w={6} />
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
    {/* long curled tail and round toe pads: a gecko, not a turtle */}
    <Path d="M66 84Q92 90 94 70Q96 52 82 50Q72 52 76 62Q80 68 86 64" fill="none" stroke={ink} strokeWidth={9} strokeLinecap="round" />
    <Path d="M66 84Q92 90 94 70Q96 52 82 50Q72 52 76 62Q80 68 86 64" fill="none" stroke="#C9E03C" strokeWidth={5} strokeLinecap="round" />
    <Path d="M34 90C30 72 38 58 50 58C62 58 70 72 66 90Z" fill="#C9E03C" {...line} />
    <Path d="M30 72L16 64M70 72L84 64" {...line} strokeWidth={4.4} />
    <Circle cx="14" cy="63" r="5" fill="#C9E03C" {...line} strokeWidth={2.2} />
    <Circle cx="86" cy="63" r="5" fill="#C9E03C" {...line} strokeWidth={2.2} />
    <Path d="M18 36C18 22 32 12 50 12C68 12 82 22 82 36C82 52 68 60 50 60C32 60 18 52 18 36Z" fill="#C9E03C" {...line} />
    <Circle cx="44" cy="74" r="3.4" fill="#F08F3C" />
    <Circle cx="56" cy="82" r="3" fill="#F08F3C" />
    <Circle cx="54" cy="68" r="2.4" fill="#F08F3C" />
    <Eyes y={30} dx={16} r={10} />
    <Path d="M36 47Q50 55 64 47" fill="none" {...line} strokeWidth={2.8} />
  </>;
}
function FruitBat() {
  return <>
    <Shadow />
    <Path d="M50 46L6 34Q4 54 12 62Q16 54 22 60Q26 52 32 60Q36 52 42 62Z" fill="#8A6250" {...line} />
    <Path d="M50 46L94 34Q96 54 88 62Q84 54 78 60Q74 52 68 60Q64 52 58 62Z" fill="#8A6250" {...line} />
    <Path d="M36 88C32 70 38 54 50 54C62 54 68 70 64 88Z" fill="#9C7258" {...line} />
    <Path d="M30 22L28 6L42 16Z" fill="#C98A4B" {...line} strokeWidth={2.6} />
    <Path d="M70 22L72 6L58 16Z" fill="#C98A4B" {...line} strokeWidth={2.6} />
    <Path d="M26 34C26 20 36 12 50 12C64 12 74 20 74 34C74 48 64 56 50 56C36 56 26 48 26 34Z" fill="#E0A562" {...line} />
    <Eyes y={30} dx={10} r={6.6} />
    <Ellipse cx="50" cy="40" rx="3.4" ry="2.4" fill={ink} />
    <Path d="M42 45Q50 52 58 45" fill="none" {...line} strokeWidth={2.6} />
    <Circle cx="34" cy="42" r="3" fill="#F2A07A" opacity={0.8} />
    <Circle cx="66" cy="42" r="3" fill="#F2A07A" opacity={0.8} />
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
    {/* a soft, drooping brim all round */}
    <Path d="M4 50Q10 38 22 38H78Q90 38 96 50Q90 60 76 56Q50 50 24 56Q10 60 4 50Z" fill="#2E7BC4" {...line} />
    <Path d="M24 42C24 22 34 12 50 12C66 12 76 22 76 42Z" fill="#4A9BE6" {...line} />
    <Path d="M25 34H75" stroke="#1E5E9C" strokeWidth={4} />
    <Path d="M36 18Q50 14 64 18" fill="none" stroke="#9CCBF4" strokeWidth={3} strokeLinecap="round" />
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
    {/* a woven band and brim, with leaves standing up out of it */}
    <G fill="#4FAE4A" {...line} strokeWidth={2.6}>
      <Path d="M22 40Q14 20 26 8Q32 24 32 40Z" />
      <Path d="M78 40Q86 20 74 8Q68 24 68 40Z" />
      <Path d="M36 40Q32 14 44 2Q50 22 48 40Z" fill="#6CC65F" />
      <Path d="M64 40Q68 14 56 2Q50 22 52 40Z" fill="#3D9440" />
    </G>
    <Path d="M20 38H80V48H20Z" fill="#C9A15A" stroke={ink} strokeWidth={2.6} strokeLinejoin="round" />
    <Path d="M28 38V48M40 38V48M52 38V48M64 38V48M76 38V48" stroke="#9C7A3A" strokeWidth={1.8} />
    <Ellipse cx="50" cy="51" rx="46" ry="7" fill="#2F7D33" {...line} />
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
    {/* half a coconut: brown husk, white inside */}
    <Path d="M14 46H86C86 70 70 88 50 88C30 88 14 70 14 46Z" fill="#8B5A33" {...line} />
    <Path d="M22 58Q30 64 34 74M78 58Q70 64 66 74M50 62V82" fill="none" stroke="#5E3A1E" strokeWidth={2.2} strokeLinecap="round" />
    <Ellipse cx="50" cy="46" rx="36" ry="12" fill="#FFF8EC" {...line} />
    <Ellipse cx="50" cy="46" rx="25" ry="7" fill="#EDE3CF" />
  </>;
}
function Mango() {
  return <>
    {/* a kidney shape with a red blush and a leaf */}
    <Path d="M26 40C30 18 60 14 76 30C92 46 88 76 66 86C48 94 30 84 30 70C30 60 40 58 40 50C40 42 24 50 26 40Z" fill="#F7B733" {...line} />
    <Path d="M64 24C82 30 90 52 82 70C78 52 72 36 64 24Z" fill="#E4572E" opacity={0.85} />
    <Path d="M44 24Q44 14 50 10" fill="none" {...line} strokeWidth={3} />
    <Path d="M50 12Q66 2 80 10Q68 22 50 14Z" fill="#4FAE4A" {...line} strokeWidth={2.6} />
    <Path d="M40 66Q46 78 58 80" fill="none" stroke="#FFE4A0" strokeWidth={4} strokeLinecap="round" />
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

/** Dice-style pips for seat numbers 1-5, centred in a square of side `d`. Children already read dice faces. */
export function Pips({ cx, cy, d, k, fill = ink }: { cx: number; cy: number; d: number; k: number; fill?: string }) {
  const o = d * 0.27, r = Math.max(1.8, d * 0.11);
  const at: [number, number][] = k === 1 ? [[0, 0]] : k === 2 ? [[-o, -o], [o, o]] : k === 3 ? [[-o, -o], [0, 0], [o, o]] : k === 4 ? [[-o, -o], [o, -o], [-o, o], [o, o]] : [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]];
  return <G>{at.map(([x, y], i) => <Circle key={i} cx={cx + x} cy={cy + y} r={r} fill={fill} />)}</G>;
}
/** The canoe: bow (the front, seat 1) on the left with a carved prow and its eye, a wake trailing behind the stern. */
export const Hull = memo(function Hull({ width, height, seats, seat, pad }: { width: number; height: number; seats: number; seat: number; pad: number }) {
  const h = seat * 0.42, top = height - h - 4, badge = Math.min(seat * 0.34, h * 0.86);
  return <Svg width={width} height={height} {...hide}>
    <Path d={`M0 ${height - 4}Q${width * 0.12} ${height - 10} ${width * 0.25} ${height - 4}T${width * 0.5} ${height - 4}T${width * 0.75} ${height - 4}T${width} ${height - 4}V${height}H0Z`} fill="#7FD0D8" />
    {/* wake behind the stern: the canoe is going left */}
    <Path d={`M${width - 2} ${top + h * 0.7}Q${width - pad * 0.6} ${top + h * 0.95} ${width - pad * 1.4} ${top + h * 1.05}M${width - 2} ${top + h * 0.4}Q${width - pad * 0.3} ${top + h * 0.6} ${width - pad * 0.9} ${top + h * 0.7}`} stroke="#FFFFFF" strokeWidth={2.6} fill="none" strokeLinecap="round" />
    <Path d={`M${pad * 0.6} ${top}L${width - pad * 0.3} ${top}Q${width - pad * 0.15} ${top + h * 0.55} ${width - pad * 0.95} ${top + h}L${pad * 1.1} ${top + h}Q${pad * 0.4} ${top + h * 0.7} ${pad * 0.6} ${top}Z`} fill="#C9833F" stroke={ink} strokeWidth={3} strokeLinejoin="round" />
    <Path d={`M${pad * 0.9} ${top + h * 0.3}H${width - pad * 0.5}`} stroke="#E8B06A" strokeWidth={Math.max(3, h * 0.12)} strokeLinecap="round" />
    {/* carved prow at the front, with an eye to show which way it faces */}
    <Path d={`M${pad * 0.7} ${top + 2}Q${pad * -0.2} ${top - h * 0.6} ${pad * 0.15} ${top - h * 1.2}Q${pad * 0.85} ${top - h * 0.7} ${pad * 1.15} ${top}Z`} fill="#B06E30" stroke={ink} strokeWidth={2.6} strokeLinejoin="round" />
    <Circle cx={pad * 0.38} cy={top - h * 0.62} r={Math.max(3, h * 0.17)} fill="#FFFDF6" stroke={ink} strokeWidth={1.8} />
    <Circle cx={pad * 0.32} cy={top - h * 0.62} r={Math.max(1.5, h * 0.08)} fill={ink} />
    {Array.from({ length: seats }, (_, i) => {
      const x = pad + i * seat, cx = x + seat / 2, by = top + h * 0.56;
      return <G key={i}>
        <Rect x={x + seat * 0.08} y={top - seat * 0.08} width={seat * 0.84} height={seat * 0.14} rx={seat * 0.05} fill="#8C5A2E" stroke={ink} strokeWidth={2} />
        <Rect x={cx - badge / 2} y={by - badge / 2} width={badge} height={badge} rx={badge * 0.22} fill="#FFF8E8" stroke={ink} strokeWidth={1.6} />
        <Pips cx={cx} cy={by} d={badge} k={i + 1} />
      </G>;
    })}
  </Svg>;
});

// ---------- Clue pictures ----------

const good = '#2E9D6A', bad = '#D24B3E';
/** One seat tile, the same plank-and-cushion as the real canoe. */
function Tile({ x, y, w, mark }: { x: number; y: number; w: number; mark?: 'pick' | 'no' | 'ghost' | null }) {
  return <G>
    <Rect x={x} y={y} width={w} height={9} rx={3} fill={mark === 'pick' ? '#FFE07A' : '#F7E9D2'} stroke={mark === 'pick' ? '#C98A12' : ink} strokeWidth={mark === 'pick' ? 2.4 : 1.4} />
    <Rect x={x + 2} y={y + 9} width={w - 4} height={4} rx={1.5} fill="#8C5A2E" />
    {mark === 'no' && <Path d={`M${x + 4} ${y - 2}L${x + w - 4} ${y + 11}M${x + w - 4} ${y - 2}L${x + 4} ${y + 11}`} stroke={bad} strokeWidth={2.8} strokeLinecap="round" />}
  </G>;
}
/** A small copy of the game canoe with `n` seat tiles: the curled prow with its eye on the left. */
function MiniCanoe({ x, y, w, n, mark }: { x: number; y: number; w: number; n: number; mark?: (i: number) => 'pick' | 'no' | 'ghost' | 'skip' | null }) {
  const tileW = (w - 16) / n;
  return <G>
    <Path d={`M${x + 8} ${y + 12}H${x + w}Q${x + w - 1} ${y + 20} ${x + w - 7} ${y + 22}H${x + 12}Q${x + 6} ${y + 20} ${x + 8} ${y + 12}Z`} fill="#C9833F" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
    <Path d={`M${x + 10} ${y + 13}Q${x - 2} ${y + 6} ${x + 1} ${y - 6}Q${x + 9} ${y + 2} ${x + 15} ${y + 13}Z`} fill="#B06E30" stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
    <Circle cx={x + 4.4} cy={y + 1} r={2.4} fill="#FFFDF6" stroke={ink} strokeWidth={1.1} />
    <Circle cx={x + 3.8} cy={y + 1} r={1.1} fill={ink} />
    {Array.from({ length: n }, (_, i) => { const m = mark?.(i) ?? null; return m === 'skip' ? null : <Tile key={i} x={x + 12 + i * tileW + 1.5} y={y} w={tileW - 3} mark={m === 'ghost' ? null : m} />; })}
  </G>;
}
const tileCentre = (x: number, w: number, n: number, i: number) => x + 12 + ((w - 16) / n) * (i + 0.5);
/** A piece cut from the middle of a canoe: `k` tiles on a plank whose ends fade out, so no seat number is implied. */
function Segment({ x, y, w, k }: { x: number; y: number; w: number; k: number }) {
  const tileW = w / k;
  return <G>
    <Rect x={x - 6} y={y + 12} width={w + 12} height={8} rx={3} fill="#C9833F" stroke={ink} strokeWidth={1.8} />
    <Path d={`M${x - 14} ${y + 16}H${x - 9}M${x + w + 9} ${y + 16}H${x + w + 14}`} stroke={ink} strokeWidth={2} strokeLinecap="round" strokeDasharray="2 3" />
    {Array.from({ length: k }, (_, i) => <Tile key={i} x={x + i * tileW + 1.5} y={y} w={tileW - 3} />)}
  </G>;
}
/** "Someone": a friendly blue-grey friend with a question mark, for a seat whose sitter does not matter. */
function Someone({ cx, bottom, s }: { cx: number; bottom: number; s: number }) {
  const k = s / 100;
  return <G transform={`translate(${cx - 50 * k} ${bottom - 92 * k}) scale(${k})`}>
    <Path d="M28 92C26 70 36 56 50 56C64 56 74 70 72 92Z" fill="#B9C9D6" {...line} />
    <Circle cx="50" cy="36" r="24" fill="#CAD8E3" {...line} />
    <Path d="M42 30Q42 20 51 20Q60 20 60 28Q60 34 52 37V42" fill="none" stroke="#5E7487" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="52" cy="50" r="3.2" fill="#5E7487" />
  </G>;
}
/** One item drawn inside a clue, its feet (or base) at `bottom`. A hat or fruit on its own is worn or held by "someone". */
function Mini({ attr, pool, cx, bottom, s, opacity = 1, alone = false }: { attr: number; pool: number; cx: number; bottom: number; s: number; opacity?: number; alone?: boolean }) {
  const Art = (attr === 0 ? friendArt : attr === 1 ? hatArt : fruitArt)[pool];
  if (!Art) return null;
  if (alone && attr === 1) return <G opacity={opacity}><Someone cx={cx} bottom={bottom} s={s * 0.92} /><Mini attr={1} pool={pool} cx={cx} bottom={bottom - s * 0.66} s={s * 0.74} /></G>;
  if (alone && attr === 2) return <G opacity={opacity}><Someone cx={cx - s * 0.08} bottom={bottom} s={s * 0.92} /><Mini attr={2} pool={pool} cx={cx + s * 0.34} bottom={bottom - s * 0.02} s={s * 0.56} /></G>;
  const k = s / 100, base = attr === 1 ? 58 : 92;
  return <G opacity={opacity} transform={`translate(${cx - 50 * k} ${bottom - base * k}) scale(${k})`}><Art /></G>;
}
/** The one red "no" sign every negative clue uses. */
function NoSign({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <G><Circle cx={cx} cy={cy} r={r} fill="#FFFFFF" stroke={bad} strokeWidth={Math.max(2.6, r * 0.24)} /><Line x1={cx - r * 0.68} y1={cy + r * 0.68} x2={cx + r * 0.68} y2={cy - r * 0.68} stroke={bad} strokeWidth={Math.max(2.6, r * 0.24)} strokeLinecap="round" /></G>;
}
/** A friend wearing a hat or holding fruit on one seat tile; two non-friends ride with "someone". */
function Together({ a, b, cx, bottom }: { a: ClueItem; b: ClueItem; cx: number; bottom: number }) {
  if (a.attr === 0) return <><Mini {...a} cx={cx} bottom={bottom} s={48} />{b.attr === 1 ? <Mini {...b} cx={cx} bottom={bottom - 33} s={36} /> : <Mini {...b} cx={cx + 21} bottom={bottom - 1} s={26} />}</>;
  return <><Someone cx={cx - 3} bottom={bottom} s={44} /><Mini {...a} cx={cx - 3} bottom={bottom - 30} s={32} /><Mini {...b} cx={cx + 20} bottom={bottom - 1} s={26} /></>;
}
const frame = (yes: boolean, x: number, w: number) => <Rect x={x} y={3} width={w} height={64} rx={12} fill={yes ? '#EAF7EF' : '#FBEDEB'} stroke={yes ? good : bad} strokeWidth={2.6} />;
export type ClueItem = { attr: number; pool: number };
/** Clue pictures are drawn on a 160 x 70 box. */
export const CLUE_RATIO = 160 / 70;
/**
 * Picture for one clue. Position clues use the game canoe's own seat tiles: a seat in a little canoe,
 * two friends on side-by-side seats, someone in the seat between, arrows to the prow for "in front",
 * or one seat holding both. "Yes" pictures sit in a green frame; every "no" picture has a red frame and
 * the same red sign.
 */
export const CluePicture = memo(function CluePicture({ kind, x, y, seat, n, width, height }: { kind: Kind; x: ClueItem; y?: ClueItem; seat?: number; n: number; width: number; height: number }) {
  const body = (() => {
    switch (kind) {
      case 'at': {
        const cx = tileCentre(54, 104, n, seat ?? 0);
        return <><Mini {...x} cx={27} bottom={64} s={50} alone /><MiniCanoe x={54} y={42} w={104} n={n} mark={i => (i === seat ? 'pick' : null)} />
          <Rect x={cx - 11} y={4} width={22} height={22} rx={5} fill="#FFF8E8" stroke={ink} strokeWidth={1.8} /><Pips cx={cx} cy={15} d={22} k={(seat ?? 0) + 1} />
          <Path d={`M${cx} 28V37M${cx - 4.5} 33L${cx} 38L${cx + 4.5} 33`} fill="none" stroke="#C98A12" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" /></>;
      }
      case 'end': {
        const l = tileCentre(54, 104, n, 0), r = tileCentre(54, 104, n, n - 1);
        return <><Mini {...x} cx={27} bottom={64} s={50} alone /><MiniCanoe x={54} y={42} w={104} n={n} mark={i => (i === 0 || i === n - 1 ? 'pick' : null)} />
          {[l, r].map(cx => <Path key={cx} d={`M${cx} 14V36M${cx - 5} 31L${cx} 37L${cx + 5} 31`} fill="none" stroke="#C98A12" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />)}</>;
      }
      case 'mid': return <><Mini {...x} cx={27} bottom={64} s={50} alone /><MiniCanoe x={54} y={42} w={104} n={n} mark={i => (i === 0 || i === n - 1 ? 'no' : null)} />
        {[0, n - 1].map(i => <NoSign key={i} cx={tileCentre(54, 104, n, i)} cy={24} r={10} />)}</>;
      case 'next': return <><Segment x={36} y={46} w={88} k={2} /><Mini {...x} cx={58} bottom={46} s={44} alone /><Mini {...y!} cx={102} bottom={46} s={44} alone />
        {/* a green link under the two seats: side by side */}
        <Path d="M50 64Q80 72 110 64" fill="none" stroke={good} strokeWidth={3.6} strokeLinecap="round" /><Path d="M50 59V65M110 59V65" stroke={good} strokeWidth={3.6} strokeLinecap="round" /></>;
      case 'far': return <><Segment x={14} y={46} w={132} k={2} /><Mini {...x} cx={40} bottom={46} s={44} alone /><Mini {...y!} cx={120} bottom={46} s={44} alone /><NoSign cx={80} cy={30} r={14} /></>;
      case 'ahead': {
        // Two seats with an open stretch between: "somewhere in front", however far. Chevrons point at the prow.
        const a = tileCentre(4, 154, 3, 0), b = tileCentre(4, 154, 3, 2), m = tileCentre(4, 154, 3, 1);
        return <><MiniCanoe x={4} y={50} w={154} n={3} mark={i => (i === 1 ? 'skip' : null)} /><Mini {...x} cx={a} bottom={50} s={44} alone /><Mini {...y!} cx={b} bottom={50} s={44} alone />
          <Path d={`M${m - 14} 55h3M${m - 4} 55h3M${m + 6} 55h3`} stroke={ink} strokeWidth={3} strokeLinecap="round" />
          <Path d={`M${m - 4} 14L${m - 12} 22L${m - 4} 30M${m + 6} 14L${m - 2} 22L${m + 6} 30M${m + 16} 14L${m + 8} 22L${m + 16} 30`} fill="none" stroke="#2F7E8D" strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" /></>;
      }
      case 'gap': return <><Segment x={14} y={46} w={132} k={3} /><Mini {...x} cx={36} bottom={46} s={40} alone /><Someone cx={80} bottom={46} s={36} /><Mini {...y!} cx={124} bottom={46} s={40} alone />
        <Path d="M36 64H124M36 58V69M124 58V69" stroke="#2F7E8D" strokeWidth={3.6} strokeLinecap="round" fill="none" /></>;
      case 'same':
      case 'diff': {
        const a = y && y.attr < x.attr ? y : x, b = a === x ? y! : x;
        return <>{frame(kind === 'same', 44, 72)}<Tile x={54} y={50} w={52} /><Together a={a} b={b} cx={78} bottom={50} />
          {kind === 'diff' && <NoSign cx={113} cy={13} r={12} />}</>;
      }
    }
  })();
  return <Svg width={width} height={height} viewBox="0 0 160 70" {...hide}>{body}</Svg>;
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
