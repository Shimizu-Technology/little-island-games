import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { companionContacts, crabAnchors, crabOrigin, pipAnchors, pipOrigin, rigTransform } from './anchors';
import { clampRig, rigFace, rigIdle, type CharacterAction, type CharacterBase, type CharacterFace, type Facing, type RigLife } from './character';

export type CompanionProps = RigLife & {
  base?: CharacterBase;
  action?: CharacterAction;
  face?: CharacterFace | null;
  facing?: Facing;
  size?: number;
  held?: React.ReactNode;
  tilt?: number;
  limbLag?: number;
  reduced?: boolean;
};
const ink = '#493E38';
function PetEyes({ x, y, face, blink, r = 3 }: { x: number; y: number; face: string; blink: boolean; r?: number }) {
  return face === 'sleepy' || blink ? <Path d={`M${x-r-1} ${y}q${r+1} ${r+1} ${2*r+2} 0`} fill="none" strokeWidth={1.8}/> : <G><Circle cx={x} cy={y} r={face === 'surprised' ? r+1 : r} fill={ink} strokeWidth={0}/><Circle cx={x-1} cy={y-1} r={1} fill="#FFF8E9" strokeWidth={0}/></G>;
}
function PetMouth({ x, y, face }: { x: number; y: number; face: string }) {
  return <G data-expression={face}>{face === 'anticipate' || face === 'surprised' ? <Ellipse cx={x} cy={y} rx={face === 'anticipate' ? 4.5 : 3} ry={4.5} fill="#865555" strokeWidth={1.3}/> : <Path d={face === 'sleepy' || face === 'neutral' ? `M${x-3} ${y}h6` : face === 'chew' ? `M${x-4} ${y}q4 3 8 0m1-2q4 1 3 4` : `M${x-6} ${y-1}q6 8 12 0`} fill="none" strokeWidth={1.8}/>}</G>;
}
function Held({ at, facing, children }: { at: readonly [number, number]; facing: Facing; children?: React.ReactNode }) {
  return <G data-layer="held" transform={`translate(${at[0]} ${at[1]}) scale(${facing === 'left' ? -1 : 1} 1) translate(-12 -12)`}>{children}</G>;
}

/** Pure coral crab puppet. Legs hang in carry; feeding moves one claw only. */
export function RigCrab({ base = 'stand', action = null, face, facing = 'right', size = 120, held, tilt, limbLag, reduced = false, mood, clock, seed, blink, breath }: CompanionProps) {
  const life = rigIdle(clock, seed, reduced), options = { action, tilt, limbLag, reduced, breath: breath ?? life.breath };
  const box = crabAnchors(base, facing, options).bounds, origin = crabOrigin(base);
  const c = companionContacts('crab', base, action), expression = rigFace(face, mood, action);
  const carry = base === 'carry', tucked = base === 'sit' || base === 'bathe' || base === 'lie';
  const lag = reduced ? 0 : -clampRig(limbLag, 0, 1) * clampRig(tilt, -6, 6) / 6 * 10 * (facing === 'left' ? -1 : 1);
  return <Svg style={{overflow:'visible'}} width={box.width*size/120} height={box.height*size/120} viewBox={`${box.left} ${box.top} ${box.width} ${box.height}`} accessible={false}>
    <G data-rig="crab" data-base={base} data-action={action ?? 'none'} transform={rigTransform(facing, options)} stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <G transform={`translate(${-origin[0]} ${-origin[1]})`}>
        <G data-joint="legs" transform={`rotate(${lag} 60 73)`}>{[0,1,2].map(n => <Path key={n} d={`M37 ${68+n*6}L${carry ? 26+n*2 : tucked ? 29 : 18-n*2} ${carry ? 82+n*3 : 75+n*7}l${tucked ? 5 : carry ? 1 : -6} ${carry ? 12 : 9}M83 ${68+n*6}L${carry ? 94-n*2 : tucked ? 91 : 102+n*2} ${carry ? 82+n*3 : 75+n*7}l${tucked ? -5 : carry ? -1 : 6} ${carry ? 12 : 9}`} fill="none"/>)}</G>
        <G data-joint="left-claw" transform={`rotate(${carry ? -90+lag : 0} 35 66)`}><Path d="M35 66L23 53" stroke="#EC9989" strokeWidth={8}/><Path d="M23 56Q8 56 10 38L22 46L28 34Q40 51 23 56Z" fill="#EC9989"/></G>
        <Ellipse cx={60} cy={73} rx={32} ry={23} fill="#EC9989"/><Ellipse cx={60} cy={81} rx={22} ry={12} fill="#F4CC76"/>
        <Path d="M45 55V42M75 55V42" stroke="#EC9989" strokeWidth={8}/>
        {[45,75].map(x => <G key={x}><Circle cx={x} cy={38} r={9} fill="#FFF1D3"/><PetEyes x={x} y={38} face={expression} blink={!reduced && (blink ?? life.blink)}/></G>)}
        <PetMouth x={60} y={73} face={expression}/>
        <Path d={`M85 66Q${carry ? 98 : 92} ${carry ? 76 : 64} ${c.hand[0]} ${c.hand[1]}`} fill="none" stroke="#EC9989" strokeWidth={8}/>
        <G data-joint="right-claw" transform={`translate(${c.hand[0]} ${c.hand[1]}) rotate(${carry ? 35+lag : action ? -50 : 0})`}><Path d="M0 3Q-17-2-5-19L1-7L13-15Q15 3 0 3Z" fill="#EC9989"/></G>
        <Held at={c.hand} facing={facing}>{held}</Held>
        {held && <Path d={`M${c.hand[0]-4} ${c.hand[1]+3}q4 5 8 0`} fill="none" stroke="#EC9989" strokeWidth={4}/ >}
      </G>
    </G>
  </Svg>;
}

/** Pip keeps ReefFish's honey body, coral tail, two pale stripes and one eye.
 * Stand=float, sit/bathe=tucked bowl posture, lie=rest curl, carry=loose fins. */
export function Pip({ base = 'stand', action = null, face, facing = 'right', size = 120, held, tilt, limbLag, reduced = false, mood, clock, seed, blink, breath }: CompanionProps) {
  const life = rigIdle(clock, seed, reduced), options = { action, tilt, limbLag, reduced, breath: breath ?? life.breath };
  const box = pipAnchors(base, facing, options).bounds, origin = pipOrigin(base);
  const c = companionContacts('pip', base, action), expression = rigFace(face, mood, action);
  const carry = base === 'carry', rest = base === 'lie', tucked = base === 'sit' || base === 'bathe';
  const lag = reduced ? 0 : -clampRig(limbLag, 0, 1) * clampRig(tilt, -6, 6) / 6 * 10 * (facing === 'left' ? -1 : 1);
  return <Svg style={{overflow:'visible'}} width={box.width*size/160} height={box.height*size/160} viewBox={`${box.left} ${box.top} ${box.width} ${box.height}`} accessible={false}>
    <G data-rig="pip" data-base={base} data-action={action ?? 'none'} transform={rigTransform(facing, options)} stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <G transform={`translate(${-origin[0]} ${-origin[1]}) rotate(${rest ? -18 : 0} ${origin[0]} ${origin[1]})`}>
        <G data-joint="tail" transform={`rotate(${carry ? 12+lag : rest ? 20 : tucked ? 8 : 0} 110 85)`}><Path d="M106 81L147 54Q153 80 147 109Z" fill="#DA7C61"/><Path d="M126 77l15-12m-13 22 14 9" stroke="#EC9989" fill="none"/></G>
        <Path d={carry ? 'M66 64Q66 45 81 45L92 65M68 101Q69 126 82 122L91 102' : tucked ? 'M66 64Q71 54 91 58L103 71M68 101Q76 114 96 110L99 96' : 'M66 64Q67 42 91 48L103 71M68 101Q75 124 96 112L99 96'} fill="#D89843"/>
        <Ellipse cx={75} cy={85} rx={49} ry={32} fill="#F0C36A"/>
        <Path d="M94 63Q77 84 94 108M109 69Q94 86 108 102" fill="none" stroke="#FFE2A0" strokeWidth={7}/>
        <Circle cx={48} cy={78} r={8} fill="#FFF9E8" strokeWidth={0}/><PetEyes x={47} y={79} r={4} face={expression} blink={!reduced && (blink ?? life.blink)}/>
        <Ellipse cx={49} cy={95} rx={7} ry={4} fill="#E6986B" strokeWidth={0}/><PetMouth x={34} y={94} face={expression}/>
        <Path data-joint="fin" d={`M73 91Q${action ? 57 : 78} ${action ? 100 : 115} ${c.hand[0]} ${c.hand[1]}Q${action ? 46 : 57} ${action ? 90 : 99} 73 91Z`} fill="#D89843"/>
        <Held at={c.hand} facing={facing}>{held}</Held>
        {held && <Path d={`M${c.hand[0]-3} ${c.hand[1]+4}q5 4 8-1`} fill="none" stroke="#D89843" strokeWidth={4}/ >}
      </G>
    </G>
  </Svg>;
}
