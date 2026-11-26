type ActorArt = {
  source: () => number;
  /** Square source size and visible alpha bounds in source pixels. */
  pixels: number;
  ink: readonly [left: number, top: number, width: number, height: number];
};

type GroundActorArt = ActorArt & { contactHeight: number };

type LagoonIllustrations = {
  canoe: ActorArt;
  crate: GroundActorArt;
  crab: GroundActorArt;
  shell: ActorArt;
  log: GroundActorArt;
  banner: GroundActorArt;
  cooler?: GroundActorArt;
  rock?: GroundActorArt;
  runner?: () => number;
  horizonMorning?: () => number;
};

// Each source stays lazy and statically resolvable by Metro. The optional slots use the
// current baked hazards, personalized vector runner and layered horizon until populated.
export const illustrated: LagoonIllustrations = {
  canoe: { source: () => require('../../../../assets/arcade/lagoon/illustrated/canoe.webp'), pixels: 384, ink: [25, 21, 334, 342] },
  crate: { source: () => require('../../../../assets/arcade/lagoon/illustrated/crate.webp'), pixels: 256, ink: [13, 20, 230, 216], contactHeight: 41 },
  crab: { source: () => require('../../../../assets/arcade/lagoon/illustrated/crab.webp'), pixels: 256, ink: [13, 41, 230, 174], contactHeight: 41 },
  shell: { source: () => require('../../../../assets/arcade/lagoon/illustrated/shell.webp'), pixels: 192, ink: [10, 13, 172, 165] },
  log: { source: () => require('../../../../assets/arcade/lagoon/illustrated/log.webp'), pixels: 320, ink: [17, 63, 286, 194], contactHeight: 42 },
  banner: { source: () => require('../../../../assets/arcade/lagoon/illustrated/banner.webp'), pixels: 384, ink: [21, 51, 342, 282], contactHeight: 118 },
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

/** Place visible ink inside the requested contact rectangle, compensating for alpha gutters. */
export function actorImageFrame(art: ActorArt, width: number, height: number, bottom: number) {
  const [left, top, inkWidth, inkHeight] = art.ink;
  const sx = width / inkWidth, sy = height / inkHeight;
  return { left: -left * sx, top: bottom - (top + inkHeight) * sy, width: art.pixels * sx, height: art.pixels * sy };
}

/** The bow occupies the original projected lane span. The rear corners still define the waterline. */
export function canoeBow(a: { x: number; y: number }, b: { x: number }) {
  'worklet';
  const width = b.x - a.x;
  return { x: a.x, y: a.y, scale: width / 72 };
}
