/** L2 fix round: full-width washes (deck haze, near light) must reach the edges of the widest stage. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FOV_KICK, HERO_ZOOM, TRACK_WIDTH, WASH_SPAN, stageLayout } from '../src/arcade/games/lagoon-run/camera';

describe('Lagoon backdrop washes', () => {
  it('cover every stage edge in camera units, at the widest FOV kick and lane follow', () => {
    // iPhone 15 portrait/landscape arenas, iPad mini and iPad 13 in both orientations (points).
    const arenas: [number, number][] = [[393, 760], [852, 300], [852, 393], [744, 1090], [1133, 700], [1032, 1300], [1376, 980]];
    const zoom = HERO_ZOOM * (1 - FOV_KICK), follow = 60, cx = TRACK_WIDTH / 2;
    for (const [w, h] of arenas) {
      const l = stageLayout(w, h);
      // Camera view: 390 wide, scaled about its centre and offset by stage.x plus follow.
      const left = cx + (0 - l.x - follow - cx) / zoom, right = cx + (l.width - l.x + follow - cx) / zoom;
      expect(WASH_SPAN.x, `${w}×${h}`).toBeLessThan(left - 20);
      expect(WASH_SPAN.x + WASH_SPAN.width, `${w}×${h}`).toBeGreaterThan(right + 20);
    }
  });
  it('the haze and near-light washes stretch a 390-wide Svg (it clips to its frame) about the camera centre', () => {
    expect(WASH_SPAN.x + WASH_SPAN.width / 2).toBe(TRACK_WIDTH / 2);
    const source = readFileSync('src/arcade/games/lagoon-run/Backdrop.tsx', 'utf8');
    const wash = source.slice(source.indexOf('function Wash('), source.indexOf('/** Near-deck light falloff'));
    expect(wash).toMatch(/<Svg width=\{390\}[^>]*transform: \[\{ scaleX: WASH_SPAN\.width \/ 390 \}\]/);
    expect(wash).toMatch(/<Rect x=\{0\} y=\{y\} width=\{390\}/);
    for (const id of ['lr-near', 'lr-deckhaze']) expect(source).toContain(`<Wash id="${id}"`);
  });
});
