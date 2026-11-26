type ActorArt = {
  source: () => number;
  /** Square source size and visible alpha bounds in source pixels. */
  pixels: number;
  ink: readonly [left: number, top: number, width: number, height: number];
};

type GroundActorArt = ActorArt & { contactHeight: number };
type BannerArt = GroundActorArt & { buntingBottom: number };

type LagoonIllustrations = {
  canoe: ActorArt;
  crate: GroundActorArt;
  crab: GroundActorArt;
  shell: ActorArt;
  log: GroundActorArt;
  banner: BannerArt;
  cooler: GroundActorArt;
  rock: GroundActorArt;
  runner?: () => number;
  horizonMorning: () => number;
};

// Each source stays lazy and statically resolvable by Metro. `runner` intentionally stays
// unset so Lagoon Run renders the player's personalized 24-frame animated Islander.
export const illustrated: LagoonIllustrations = {
  canoe: { source: () => require('../../../../assets/arcade/lagoon/illustrated/canoe.webp'), pixels: 384, ink: [24, 21, 335, 342] },
  crate: { source: () => require('../../../../assets/arcade/lagoon/illustrated/crate.webp'), pixels: 256, ink: [13, 19, 230, 217], contactHeight: 41 },
  crab: { source: () => require('../../../../assets/arcade/lagoon/illustrated/crab.webp'), pixels: 256, ink: [13, 41, 230, 174], contactHeight: 41 },
  shell: { source: () => require('../../../../assets/arcade/lagoon/illustrated/shell.webp'), pixels: 192, ink: [9, 13, 174, 166] },
  log: { source: () => require('../../../../assets/arcade/lagoon/illustrated/log.webp'), pixels: 320, ink: [17, 62, 286, 195], contactHeight: 42 },
  // The lowest bunting pixel (row 121) has about 56 pt of deck clearance at contact.
  banner: { source: () => require('../../../../assets/arcade/lagoon/illustrated/banner.webp'), pixels: 384, ink: [21, 51, 342, 282], contactHeight: 74, buntingBottom: 121 },
  cooler: { source: () => require('../../../../assets/arcade/lagoon/illustrated/cooler.webp'), pixels: 256, ink: [16, 36, 224, 183], contactHeight: 42 },
  rock: { source: () => require('../../../../assets/arcade/lagoon/illustrated/rock.webp'), pixels: 320, ink: [20, 45, 280, 230], contactHeight: 104 },
  horizonMorning: () => require('../../../../assets/arcade/lagoon/illustrated/horizon-morning.webp'),
};

export function illustratedHazard(kind: string): GroundActorArt | undefined {
  switch (kind) {
    case 'crate': return illustrated.crate;
    case 'crab': return illustrated.crab;
    case 'log': return illustrated.log;
    case 'banner': return illustrated.banner;
    case 'cooler': return illustrated.cooler;
    case 'rock': return illustrated.rock;
    default: return undefined;
  }
}

/** Fit visible ink uniformly, centred across the box and planted on its contact line. */
export function actorImageFrame(art: ActorArt, width: number, height: number, bottom: number) {
  const [left, top, inkWidth, inkHeight] = art.ink;
  const scale = Math.min(width / inkWidth, height / inkHeight);
  return {
    left: (width - inkWidth * scale) / 2 - left * scale,
    top: bottom - (top + inkHeight) * scale,
    width: art.pixels * scale,
    height: art.pixels * scale,
  };
}

/** The bow occupies the original projected lane span. The rear corners still define the waterline. */
export function canoeBow(a: { x: number; y: number }, b: { x: number }) {
  'worklet';
  const width = b.x - a.x;
  return { x: a.x, y: a.y, scale: width / 72 };
}
