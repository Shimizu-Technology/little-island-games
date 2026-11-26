import { pictureGridAdapter } from '../../../src/puzzles/picture-grid/adapter';
import { CROSS, FILL, PICTURE_GRID, cluesOf, pictureBands, type PictureGrid } from '../../../src/puzzles/picture-grid/engine';
import type { FamilySpec } from '../../../src/puzzles/types';
import { easyArt, expertArt, hardArt, mediumArt, type Drawing } from './picture-grid-art';

export const artByBand = { easy: easyArt, medium: mediumArt, hard: hardArt, expert: expertArt };
export const pictureGridArtSeed = 1;

export function unpackDrawing([name, palette, artwork]: Drawing) {
  const rows = artwork.split(' ');
  if (rows.some(row => row.length !== rows.length || !/^[.#]+$/.test(row))) throw new Error(`Malformed picture: ${name}`);
  const marks = Array.from(rows.join(''), pixel => pixel === '#' ? FILL : CROSS);
  return { picture: { ...cluesOf(rows.length, marks), name, palette }, marks };
}

/** Add to the family index, then use the normal bake with seed 1 and the lead's reserved bank range.
 * Seeds select drawings in source order. Keep published entries append-only.
 */
export const pictureGridFamily: FamilySpec<PictureGrid> = {
  id: PICTURE_GRID,
  sources: [
    'scripts/puzzles/families/picture-grid.ts', 'scripts/puzzles/families/picture-grid-art.ts',
    'src/puzzles/picture-grid/adapter.ts', 'src/puzzles/picture-grid/engine.ts', 'src/puzzles/picture-grid/help.ts',
    'src/puzzles/picture-grid/independent.ts', 'src/puzzles/picture-grid/solver.ts',
  ],
  adapter: pictureGridAdapter,
  bands: pictureBands.map(band => {
    const count = artByBand[band.id].length;
    return { id: band.id, target: count, floor: count, advanced: band.tier >= 3 };
  }),
  provenance: { source: 'original', note: 'Original pixel drawings. Exact line deductions and independently enumerated line placements certify each puzzle.' },
  review: { ids: [], complete: false },
  maxRowBytes: 1024, requiresUnique: true, requiresTrace: true, hiddenInformation: false,
  generate: (seed, band) => {
    const index = pictureBands.findIndex(entry => entry.id === band.id);
    if (index < 0) return null;
    const drawing = artByBand[pictureBands[index].id][seed - index * 0x1000000 - pictureGridArtSeed];
    if (!drawing) return null;
    const { picture, marks } = unpackDrawing(drawing);
    const id = picture.name.toLowerCase().replace(/ /g, '-');
    const filled = marks.filter(mark => mark === FILL).length;
    return { format: 1, seed, rng: 1, band: band.id, layout: id, template: id, payload: picture,
      objectives: [], limits: [], par: { metric: 'placements', lower: filled, upper: filled, exact: true }, teaches: ['line-logic'], speech: null };
  },
};
