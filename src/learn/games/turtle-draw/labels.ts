import type { Block } from './engine';
/** The words on the buttons, shared by the board, hints and VoiceOver labels. */
export const blockLabel = (b: Block): string => b.kind === 'forward' ? `Forward ${b.n}` : b.kind === 'turn' ? `Turn ${b.angle}°` : b.kind === 'color' ? `${b.color} pen` : b.kind === 'grow' ? 'Grow +10' : `Repeat ×${b.times}`;
