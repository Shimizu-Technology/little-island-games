import { describe, expect, it } from 'vitest';
import { createRun, runStep, type RunState } from '../src/arcade/games/lagoon-run/engine';
import { runLevels } from '../src/arcade/games/scrolling/content';
import { runPoses, spritePoint } from '../src/arcade/games/scrolling/render';
import { runHud } from '../src/arcade/publication';
import { fixtureInput } from '../src/arcade/games/lagoon-run/fixtures';
import { runFrame } from '../src/arcade/games/scrolling/commands';
import { FRONT_FRAME, depthLayer, stableDrawOrder } from '../src/arcade/games/lagoon-run/drawOrder';
import { FADE_IN, HERO_ZOOM, SKY_LINE, TRACK_WIDTH, arrivalOpacity, projectTrack, stageLayout, stagePoint } from '../src/arcade/games/lagoon-run/camera';
import { FLOOR_BANDS, FLOOR_PERIOD, floorBandMatrix } from '../src/arcade/games/lagoon-run/floorBands';
import { mapPoint } from '../src/arcade/games/lagoon-run/quad';
import { CUE_MOVES } from '../src/arcade/games/lagoon-run/drawOrder';

const idle = { type: 'idle' } as const;
/** The legal W1-8/771 replay driver used by the meter. */
function replay(ticks: number, visit: (a: RunState, b: RunState) => void) {
  let s = createRun(runLevels[7], 771, false);
  for (let t = 0; t < ticks && s.status === 'playing'; t++) {
    const next = runFrame(s, { helper: false, serial: 0, queue: [{ id: s.command + 1, action: fixtureInput(s) }] }, 1 / 60);
    visit(s, next); s = next;
  }
}

describe('L2 pickup hitch: fixed draw order', () => {
  it('never changes an actor’s draw key when its row crosses the runner', () => {
    let crossings = 0;
    replay(2400, (a, b) => {
      const pa = runPoses(a), pb = runPoses(b);
      for (let i = 0; i < pa.length; i++) {
        const x = pa[i], y = pb[i];
        if (x.painterKey === undefined || y.painterKey === undefined || x.painterKey !== y.painterKey) continue;
        const crossed = ((x.frame ?? 0) >= FRONT_FRAME) !== ((y.frame ?? 0) >= FRONT_FRAME);
        if (crossed) {
          crossings++;
          // Same native z-order key on both sides; only the twins' opacity swaps.
          expect(stableDrawOrder(y.painterKey)).toBe(stableDrawOrder(x.painterKey));
          expect(depthLayer(x, false) > 0).toBe(true); expect(depthLayer(x, true)).toBe(0);
          expect(depthLayer(y, true) > 0).toBe(true); expect(depthLayer(y, false)).toBe(0);
        }
      }
    });
    expect(crossings).toBeGreaterThan(20);
  });
  it('keeps the stable key in painter order for every visible pair', () => {
    replay(1800, (_a, b) => {
      const p = runPoses(b).filter(p => p.painterDepth !== undefined && (p.opacity ?? 1) > 0);
      for (const x of p) for (const y of p) if (x.painterDepth! < y.painterDepth! - 1e-9 && Math.abs(x.painterDepth! - y.painterDepth!) > .002) expect(stableDrawOrder(x.painterKey!)).toBeLessThan(stableDrawOrder(y.painterKey!));
    });
  });
  it('carries the teaching move in the pose, so a crossing needs no React render', () => {
    let s = { ...createRun(runLevels[0], 42, false), learned: 0 };
    const seen = new Set<number>();
    for (let t = 0; t < 1500 && s.status === 'playing'; t++) {
      s = runStep(s, idle, 1 / 60);
      const cue = runPoses(s)[57], teaching = runHud(s).teaching;
      if ((cue.opacity ?? 1) > 0) { expect(CUE_MOVES[cue.frame!]).toBe(teaching); seen.add(cue.frame!); }
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });
});

describe('L2 camera and look', () => {
  it('fills the arena with no letterbox and puts the horizon at 34% on phone and iPad', () => {
    for (const [w, h] of [[393, 759], [744, 1090], [1133, 700], [390, 660]]) {
      const l = stageLayout(w, h);
      expect(l.width * l.scale).toBeCloseTo(w); expect(l.height * l.scale).toBeCloseTo(h);
      expect(l.width).toBeGreaterThanOrEqual(TRACK_WIDTH);
      const horizon = stagePoint(l, 195, projectTrack(1, -1.2).y);
      expect(horizon.y).toBeCloseTo(SKY_LINE * l.height);
      expect(horizon.x).toBeCloseTo(l.width / 2);
    }
    expect(HERO_ZOOM).toBe(1.25);
  });
  it('fades hazards only over the first 15% of the approach', () => {
    expect(arrivalOpacity(-1.2)).toBe(0);
    expect(arrivalOpacity(-1.2 + 2.2 * FADE_IN)).toBe(1);
    expect(arrivalOpacity(0)).toBe(1);
    const s = createRun(runLevels[0], 42, false);
    s.rows[0] = { ...s.rows[0], z: -.4, kind: 'crate', lane: 1 };
    expect(runPoses(s)[1].opacity).toBe(1);
  });
  it('keeps the next hazard in the runner’s own lane visible a second before contact, in every lane', () => {
    for (const level of [runLevels[0], runLevels[7], runLevels[40]]) for (const lane of [0, 1, 2]) for (const kind of ['crate', 'net', 'rock'] as const) {
      const s: RunState = { ...createRun(level, 7, false), lane, poseLane: lane };
      // One second of travel before contact at this level's speed.
      const z = 1 - level.speed;
      s.rows = s.rows.map((r, i) => i ? { ...r, z: -3 } : { ...r, z, kind, secondKind: kind, lane, second: -1, third: false, shellLane: lane, surface: 'sand', power: 'none' });
      const p = runPoses(s), hero = p[0], hz = p[1];
      const w = kind === 'net' ? 112 : 72, h = kind === 'crate' ? 72 : 129.6;
      const heroTop = spritePoint(hero, 80, 132, 40, 14).y; // top of the hair in the 80×132 frame
      const hazardTop = spritePoint(hz, w, h, w / 2, 0).y, hazardBottom = spritePoint(hz, w, h, w / 2, h).y;
      // At least the upper 60% of the hazard is above the runner's head.
      expect((heroTop - hazardTop) / (hazardBottom - hazardTop), `${level.id} lane ${lane} ${kind}`).toBeGreaterThan(.6);
    }
  });
});

describe('L2 scrolling deck bands', () => {
  it('maps every band within 0.7 camera units of the true projection, exact at its edges', () => {
    for (const band of FLOOR_BANDS) for (const travel of [0, .031, .077, .129]) {
      const m = floorBandMatrix(band, travel, 0, 0), h = [m[0], m[4], m[12], m[1], m[5], m[13], m[3], m[7], m[15]];
      const phase = ((travel % FLOOR_PERIOD) + FLOOR_PERIOD) % FLOOR_PERIOD, length = band.near - band.far, total = length + FLOOR_PERIOD;
      for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) {
        const u = band.u0 + (band.u1 - band.u0) * i / 8, z = band.far + length * j / 8;
        // Texture row for track depth w = z - phase; image top is far - period.
        const X = (u - band.u0) / (band.u1 - band.u0) * band.width, Y = (z - phase - (band.far - FLOOR_PERIOD)) / total * band.height;
        const a = mapPoint(h, X, Y), b = projectTrack(u, z);
        const error = Math.hypot(a.x - b.x, a.y - b.y);
        if (j === 0 || j === 8) expect(error).toBeLessThan(.01);
        else if (Math.abs(u - 1) <= 1.6) expect(Math.abs(a.y - b.y) + Math.abs(a.x - b.x)).toBeLessThan(.7);
      }
    }
  });
  it('locks seams to track depth: one period of travel returns the same matrix', () => {
    for (const band of FLOOR_BANDS) expect(floorBandMatrix(band, .2 + FLOOR_PERIOD, 0, 0).map(v => +v.toFixed(6))).toEqual(floorBandMatrix(band, .2, 0, 0).map(v => +v.toFixed(6)));
  });
});

describe('L2 native layer structure', () => {
  it('never lets Fabric flatten the behind, runner and front layers into one zIndex list', async () => {
    const { readFileSync } = await import('node:fs');
    const board = readFileSync('src/arcade/games/scrolling/Board.tsx', 'utf8');
    for (const id of ['run-behind', 'run-front']) expect(board).toMatch(new RegExp(`<View collapsable=\\{false\\} testID="${id}"`));
    const layer = board.slice(board.indexOf('export const RunLayer'), board.indexOf('function selectRun'));
    // Behind layer, effects, runner, front layer: in that document order.
    const order = ['testID="run-behind"', '<RunEffects', '{runner}', 'testID="run-front"'].map(k => layer.indexOf(k));
    expect(order.every(i => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
