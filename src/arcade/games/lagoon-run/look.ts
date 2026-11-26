import type { WorldId } from '../../types';

/**
 * Lagoon Run style guide data ("sunlit paper-cut"). One light source per world; three tones per
 * surface (lit, base, shade); ink only on things you can touch; air hazier with distance.
 * docs/lagoon/STYLE-GUIDE.md explains the rules. Original art: no reference to any existing runner.
 */
export type LagoonLook = {
  id: 'morning' | 'festival' | 'sunset' | 'mangrove' | 'rain' | 'headland' | 'learn';
  /** Sky top, middle, horizon. */
  sky: [string, string, string];
  /** Sun or moon: x as a fraction of stage width, y as a fraction of the sky band, core colour, glow colour. */
  sun: [number, number, string, string];
  /** Far, middle, near hill bands. */
  hills: [string, string, string];
  /** Water at the horizon and near the camera; glints. */
  water: [string, string, string];
  /** Deck plank tones (lit to shade), seam, side/skirt, lane cue paint. */
  planks: [string, string, string, string];
  seam: string; side: string; cue: string;
  /** Painted boards mixed into the deck (Village Festival). */
  paint?: string[];
  /** Haze colour and strength near the horizon; warm lamp glow. */
  haze: string; hazeOpacity: number; glow: string;
  /** Shade colour for contact shadows and the foreground frame. */
  shade: string;
  /** Overall tint laid over the far scenery props to push them back. */
  ink: string;
};

export const LOOKS: Record<LagoonLook['id'], LagoonLook> = {
  // W1 Morning Beach: clear blue, low sun from the right, long soft shadows, honey planks, turquoise water.
  morning: { id: 'morning', sky: ['#78BDD5', '#A6DAD9', '#FFF3D9'], sun: [.76, .62, '#FFF6CF', '#FFE6A0'], hills: ['#A9D3C6', '#79BCA3', '#4C977C'], water: ['#65CFC0', '#2A8C82', '#FFFDF8'], planks: ['#F5CF94', '#E4B176', '#C98C56', '#B87C48'], seam: '#7D4E2E', side: '#6C4630', cue: '#FFF4D6', haze: '#FFF3D2', hazeOpacity: .62, glow: '#FFE9A8', shade: '#1D5566', ink: '#2F4A55' },
  // W2 Village Festival: dusk purple, warm lamps, painted boards, deep teal water.
  festival: { id: 'festival', sky: ['#51466E', '#AA809A', '#F7BD8D'], sun: [.24, .78, '#FFD9A0', '#FF9E7A'], hills: ['#6D5A9C', '#4D4580', '#2E2D5C'], water: ['#2C8C95', '#123F57', '#FFD8A8'], planks: ['#D9A274', '#C08660', '#A86F50', '#8C5A40'], seam: '#4E2B34', side: '#3E2432', cue: '#FFE3A2', paint: ['#3E9C97', '#FF7A5C', '#EFD9A8', '#7E78C8'], haze: '#F7B98A', hazeOpacity: .3, glow: '#FFC46B', shade: '#211C47', ink: '#2B2347' },
  // W3–W6 keep their own sky and water until L3 draws them fully.
  sunset: { id: 'sunset', sky: ['#35306E', '#D9627A', '#FFC067'], sun: [.3, .86, '#FFD98A', '#FFB765'], hills: ['#7A4C86', '#553A70', '#2D2850'], water: ['#E87F6B', '#3A2F6B', '#FFD9A0'], planks: ['#D99062', '#C97C58', '#B96E50', '#A9604A'], seam: '#4A2734', side: '#3A2230', cue: '#FFE1B0', haze: '#FFC48A', hazeOpacity: .5, glow: '#FFB765', shade: '#2A1E48', ink: '#3A2340' },
  mangrove: { id: 'mangrove', sky: ['#2E6A5E', '#7DB59B', '#E3EBC0'], sun: [.7, .4, '#FFF3C4', '#E9F2B0'], hills: ['#6FA58A', '#3F7E66', '#245B4A'], water: ['#3E8C78', '#123E3A', '#D9F4D2'], planks: ['#C9A274', '#B58C62', '#A07A55', '#8A6648'], seam: '#4A3A2C', side: '#3A2E26', cue: '#F2F0C4', haze: '#DCEBC8', hazeOpacity: .6, glow: '#F7F0A0', shade: '#16352F', ink: '#1E3A33' },
  rain: { id: 'rain', sky: ['#3E5468', '#6D8795', '#A8BBB8'], sun: [.72, .3, '#D5E2DD', '#B9CCC8'], hills: ['#8AA3A4', '#62807F', '#3D5F60'], water: ['#4F8A92', '#1C4A5C', '#D6EEF0'], planks: ['#9E8270', '#8E7362', '#826A5C', '#786255'], seam: '#352B2F', side: '#2F2A30', cue: '#E6EFEA', haze: '#C7D6D3', hazeOpacity: .6, glow: '#FFD78F', shade: '#16303F', ink: '#22343F' },
  headland: { id: 'headland', sky: ['#4D7FB8', '#F2B66E', '#FFE2A0'], sun: [.82, .7, '#FFF0B8', '#FFC86E'], hills: ['#B88B6E', '#8C6A58', '#5D4A44'], water: ['#3BB7C9', '#11607E', '#FFF2D0'], planks: ['#D9B07C', '#C79C6A', '#B48858', '#9C744B'], seam: '#5A3F2C', side: '#4A3428', cue: '#FFF2CF', haze: '#FFE2B0', hazeOpacity: .55, glow: '#FFD78A', shade: '#2C3B52', ink: '#34394A' },
  learn: { id: 'learn', sky: ['#4B66B8', '#9AA8E0', '#FFE6B8'], sun: [.74, .55, '#FFF3CF', '#FFE2A0'], hills: ['#A6B5DE', '#7D8FCC', '#566BB0'], water: ['#45B9D6', '#1D5E8C', '#E8F8FF'], planks: ['#E9C38C', '#DCAE72', '#CC9B5E', '#B9864C'], seam: '#6B4A33', side: '#5A3E2D', cue: '#FFF5D8', haze: '#F4EEDC', hazeOpacity: .55, glow: '#FFE9A8', shade: '#253B66', ink: '#2E3D5E' },
};

export function lagoonLook(world: WorldId): LagoonLook {
  return world === 'w1' ? LOOKS.morning : world === 'w2' ? LOOKS.festival : world === 'w3' ? LOOKS.sunset : world === 'w4' ? LOOKS.mangrove : world === 'w5' ? LOOKS.rain : world === 'w6' ? LOOKS.headland : LOOKS.learn;
}
