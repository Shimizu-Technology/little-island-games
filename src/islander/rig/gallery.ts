import { defaultLook, type IslanderLook } from '../look';
import { rigActions, rigBases, rigFaces, type CharacterRenderInput } from './character';
export const rigProofLooks: readonly IslanderLook[] = [
  { ...defaultLook, skinTone: 'cocoa', hairStyle: 'afro-puffs', hairColor: 'espresso', outfit: 'sundress', hat: 'woven-sunhat', shoes: 'rain-boots' },
  { ...defaultLook, skinTone: 'shell', hairStyle: 'long-wavy', hairColor: 'auburn', outfit: 'lab-coat', hat: 'captain-cap', accessory: 'coder-headset', shoes: 'boots' },
  { ...defaultLook, skinTone: 'earth', hairStyle: 'pigtails', hairColor: 'silver', outfit: 'space-suit', hat: 'flower-crown', accessory: 'backpack', shoes: 'sneakers' },
];
export type ProofFrame = { label: string; input: CharacterRenderInput; look: IslanderLook };
export const rigMatrix: ProofFrame[] = rigBases.flatMap(base => rigActions.flatMap(action => rigFaces.flatMap(face => (['right', 'left'] as const).flatMap(facing => rigProofLooks.map((look, i) => ({ label: `${base} · ${action ?? 'rest'} · ${face} · ${facing} · look ${i+1}`, input: { slot: 0, base, action, face, facing, size: 80 }, look }))))));
export const companionMatrix: ProofFrame[] = ([1,2] as const).flatMap(slot => rigBases.flatMap(base => rigActions.flatMap(action => rigFaces.flatMap(face => (['right','left'] as const).map(facing => ({ label: `${slot === 1 ? 'Pip' : 'Crab'} · ${base} · ${action ?? 'rest'} · ${face} · ${facing}`, input: { slot, base, action, face, facing, size: slot === 1 ? 120 : 100 }, look: rigProofLooks[0] }))))));
export const rigStoryboard: ProofFrame[] = [
  { label: '1 · Picked up from bed', input: { slot: 0, base: 'lie', action: null, face: 'neutral', facing: 'right', size: 90 }, look: rigProofLooks[1] },
  { label: '2 · Carried, tilted 6°', input: { slot: 0, base: 'carry', action: null, face: 'happy', facing: 'right', size: 90, tilt: 6, limbLag: .8 }, look: rigProofLooks[1] },
  { label: '3 · Dropped on chair', input: { slot: 0, base: 'sit', action: null, face: 'happy', facing: 'right', size: 90 }, look: rigProofLooks[1] },
  { label: '4 · Given juice', input: { slot: 0, base: 'sit', action: 'hold', face: 'anticipate', facing: 'right', size: 90 }, look: rigProofLooks[1] },
  { label: '5 · Drinking while seated', input: { slot: 0, base: 'sit', action: 'drink', face: 'anticipate', facing: 'right', size: 90 }, look: rigProofLooks[1] },
  { label: '6 · Back in bed, chewing', input: { slot: 0, base: 'lie', action: null, face: 'chew', facing: 'right', size: 90 }, look: rigProofLooks[1] },
  { label: '7 · Asleep', input: { slot: 0, base: 'lie', action: null, face: 'sleepy', facing: 'right', size: 90 }, look: rigProofLooks[1] },
];
