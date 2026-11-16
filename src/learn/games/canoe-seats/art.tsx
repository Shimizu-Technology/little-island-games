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
/** A small whole canoe with `n` seat tiles; the prow (front) on the left. Returns tile centres for placing friends. */
function MiniCanoe({ x, y, w, n, mark }: { x: number; y: number; w: number; n: number; mark?: (i: number) => 'pick' | 'no' | 'ghost' | null }) {
  const tileW = (w - 16) / n;
  return <G>
    <Path d={`M${x + 4} ${y + 12}H${x + w}Q${x + w - 1} ${y + 20} ${x + w - 7} ${y + 22}H${x + 10}Q${x + 5} ${y + 20} ${x + 4} ${y + 12}Z`} fill="#D49250" stroke={ink} strokeWidth={2} strokeLinejoin="round" />
    <Path d={`M${x + 6} ${y + 13}Q${x - 2} ${y + 4} ${x + 3} ${y - 3}Q${x + 7} ${y + 5} ${x + 12} ${y + 13}Z`} fill="#B06E30" stroke={ink} strokeWidth={1.6} strokeLinejoin="round" />
    <Circle cx={x + 4.6} cy={y + 4} r={1.8} fill="#FFFDF6" stroke={ink} strokeWidth={1} />
    {Array.from({ length: n }, (_, i) => <Tile key={i} x={x + 12 + i * tileW + 1.5} y={y} w={tileW - 3} mark={mark?.(i) ?? null} />)}
  </G>;
}
const tileCentre = (x: number, w: number, n: number, i: number) => x + 12 + ((w - 16) / n) * (i + 0.5);
/** A piece cut from the middle of a canoe: `k` tiles on a plank whose ends fade out, so no seat number is implied. */
function Segment({ x, y, w, k }: { x: number; y: number; w: number; k: number }) {
  const tileW = w / k;
  return <G>
    <Rect x={x - 6} y={y + 12} width={w + 12} height={8} rx={3} fill="#D49250" stroke={ink} strokeWidth={1.8} />
    <Path d={`M${x - 14} ${y + 16}H${x - 9}M${x + w + 9} ${y + 16}H${x + w + 14}`} stroke={ink} strokeWidth={2} strokeLinecap="round" strokeDasharray="2 3" />
    {Array.from({ length: k }, (_, i) => <Tile key={i} x={x + i * tileW + 1.5} y={y} w={tileW - 3} />)}
  </G>;
}
/** One item drawn inside a clue: friends, hats or fruit at the given size, its feet (or base) at y. */
function Mini({ attr, pool, cx, bottom, s, opacity = 1 }: { attr: number; pool: number; cx: number; bottom: number; s: number; opacity?: number }) {
  const Art = (attr === 0 ? friendArt : attr === 1 ? hatArt : fruitArt)[pool];
  if (!Art) return null;
  const k = s / 100, base = attr === 1 ? 58 : 92;
  return <G opacity={opacity} transform={`translate(${cx - 50 * k} ${bottom - base * k}) scale(${k})`}><Art /></G>;
}
function NoSign({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <G><Circle cx={cx} cy={cy} r={r} fill="#FFFFFF" fillOpacity={0.6} stroke={bad} strokeWidth={3.6} /><Line x1={cx - r * 0.7} y1={cy + r * 0.7} x2={cx + r * 0.7} y2={cy - r * 0.7} stroke={bad} strokeWidth={3.6} strokeLinecap="round" /></G>;
}
/** "Someone sits here": a grey friend shape, for the seat between two friends. */
const Someone = ({ cx, bottom, s }: { cx: number; bottom: number; s: number }) => <G opacity={0.5}><Circle cx={cx} cy={bottom - s * 0.62} r={s * 0.2} fill="#9AA6A4" /><Path d={`M${cx - s * 0.26} ${bottom}C${cx - s * 0.26} ${bottom - s * 0.3} ${cx + s * 0.26} ${bottom - s * 0.3} ${cx + s * 0.26} ${bottom}Z`} fill="#9AA6A4" /></G>;
/** One item worn or held by another, on a single seat tile. */
function Together({ a, b, cx, bottom }: { a: ClueItem; b: ClueItem; cx: number; bottom: number }) {
  if (a.attr === 0) return <><Mini {...a} cx={cx} bottom={bottom} s={40} />{b.attr === 1 ? <Mini {...b} cx={cx} bottom={bottom - 28} s={30} /> : <Mini {...b} cx={cx + 17} bottom={bottom - 1} s={20} />}</>;
  return <><Mini {...a} cx={cx - 8} bottom={bottom - 14} s={32} /><Mini {...b} cx={cx + 10} bottom={bottom - 1} s={22} /></>;
}
export type ClueItem = { attr: number; pool: number };
/**
 * Picture for one clue, on a 160 x 64 card. Every position clue uses the same seat tiles as the canoe:
 * a seat in a little canoe, two friends on side-by-side seats, a seat with someone between, the prow
 * for "in front", or one seat holding both. Negative clues cross out the same picture in red.
 */
/** Clue pictures are drawn on a 160 x 70 box. */
export const CLUE_RATIO = 160 / 70;
export const CluePicture = memo(function CluePicture({ kind, x, y, seat, n, width, height }: { kind: Kind; x: ClueItem; y?: ClueItem; seat?: number; n: number; width: number; height: number }) {
  const body = (() => {
    switch (kind) {
      case 'at': {
        const cx = tileCentre(54, 102, n, seat ?? 0);
        return <><Mini {...x} cx={26} bottom={58} s={46} /><MiniCanoe x={54} y={38} w={102} n={n} mark={i => (i === seat ? 'pick' : null)} />
          <Rect x={cx - 10} y={4} width={20} height={20} rx={5} fill="#FFF8E8" stroke={ink} strokeWidth={1.8} /><Pips cx={cx} cy={14} d={20} k={(seat ?? 0) + 1} />
          <Path d={`M${cx} 26V34M${cx - 4} 30L${cx} 35L${cx + 4} 30`} fill="none" stroke="#C98A12" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></>;
      }
      case 'end': {
        const l = tileCentre(8, 148, n, 0), r = tileCentre(8, 148, n, n - 1);
        return <><MiniCanoe x={8} y={44} w={148} n={n} mark={i => (i === 0 || i === n - 1 ? 'pick' : null)} />
          <Mini {...x} cx={l} bottom={44} s={36} /><Mini {...x} cx={r} bottom={44} s={36} opacity={0.35} />
          <Path d={`M${l + 16} 14Q${(l + r) / 2} 2 ${r - 16} 14`} fill="none" stroke="#C98A12" strokeWidth={2.4} strokeDasharray="4 4" strokeLinecap="round" /></>;
      }
      case 'mid': return <><Mini {...x} cx={26} bottom={58} s={46} /><MiniCanoe x={54} y={38} w={102} n={n} mark={i => (i === 0 || i === n - 1 ? 'no' : 'pick')} /></>;
      case 'next':
      case 'far': {
        // The same two side-by-side seats; "not next to" pushes the friends apart and crosses out the join.
        const far = kind === 'far', lx = far ? 50 : 62, rx = far ? 110 : 98;
        return <><Rect x={far ? 24 : 36} y={4} width={far ? 112 : 88} height={58} rx={12} fill={far ? '#FFFFFF' : '#EAF7EF'} stroke={far ? '#C9B79A' : good} strokeWidth={2.4} />
          <Segment x={far ? 32 : 44} y={44} w={far ? 96 : 72} k={2} /><Mini {...x} cx={lx} bottom={44} s={38} /><Mini {...y!} cx={rx} bottom={44} s={38} />
          {far && <NoSign cx={80} cy={30} r={13} />}</>;
      }
      case 'ahead': return <><MiniCanoe x={14} y={38} w={140} n={3} mark={i => (i === 1 ? 'ghost' : null)} />
        <Mini {...x} cx={tileCentre(14, 140, 3, 0)} bottom={38} s={36} /><Mini {...y!} cx={tileCentre(14, 140, 3, 2)} bottom={38} s={36} />
        <Path d={`M${tileCentre(14, 140, 3, 1) - 6} 28h2M${tileCentre(14, 140, 3, 1)} 28h2M${tileCentre(14, 140, 3, 1) + 6} 28h2`} stroke={ink} strokeWidth={3} strokeLinecap="round" />
        {/* the way the canoe goes: toward the prow */}
        <Path d="M150 63H10M18 57L10 63L18 69" fill="none" stroke="#2F7E8D" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></>;
      case 'gap': return <><Segment x={24} y={40} w={112} k={3} /><Mini {...x} cx={42.7} bottom={40} s={36} /><Someone cx={80} bottom={40} s={30} /><Mini {...y!} cx={117.3} bottom={40} s={36} />
        <Path d="M42 60H118M42 55V64M118 55V64" stroke="#2F7E8D" strokeWidth={2.4} strokeLinecap="round" fill="none" /></>;
      case 'same':
      case 'diff': {
        const a = y && y.attr < x.attr ? y : x, b = a === x ? y! : x;
        return <><Rect x={50} y={3} width={60} height={58} rx={12} fill={kind === 'same' ? '#EAF7EF' : '#FBEDEB'} stroke={kind === 'same' ? good : bad} strokeWidth={2.4} />
          <Tile x={58} y={44} w={44} /><Together a={a} b={b} cx={80} bottom={44} />
          {kind === 'diff' && <Line x1={52} y1={58} x2={108} y2={6} stroke={bad} strokeWidth={4.4} strokeLinecap="round" />}</>;
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
