/**
 * Planning model for one row per family, in bytes, at the ledger's BK-01 to BK-34 targets.
 * `verifyByteModel` compares it with what a real manifest actually holds.
 */
export type ByteModelRow = { family: string; target: number; floor: number; bands: number; rowBytes: number };
const r = (family: string, target: number, floor: number, bands: number, rowBytes: number): ByteModelRow => ({ family, target, floor, bands, rowBytes });
export const BYTE_MODEL: readonly ByteModelRow[] = [
  r('sudoku', 4096, 1024, 6, 256), r('picture-grid', 4096, 512, 6, 640), r('bridges', 2048, 512, 6, 320), r('cage-math', 3072, 768, 6, 512),
  r('cross-sums', 1024, 64, 6, 512), r('word-search', 2048, 512, 6, 512), r('fill-in', 1024, 256, 6, 640), r('crossword', 1792, 352, 4, 1408),
  r('word-ladder', 1024, 256, 6, 256), r('word-scramble', 1024, 256, 6, 128), r('solitaire', 2048, 512, 6, 128),
  r('slip-tide', 4096, 512, 7, 384), r('canoe-seats', 4096, 512, 8, 384), r('gate-crab', 384, 96, 6, 256), r('every-stone', 4096, 512, 7, 384),
  r('shell-scale', 32, 32, 6, 384), r('sail-fold', 2048, 256, 7, 512), r('crab-commands', 2048, 512, 6, 384), r('beep-bot', 240, 240, 5, 256),
  r('maze', 2048, 512, 6, 256), r('reef-sweep', 128, 128, 4, 256), r('turtle-draw', 320, 120, 6, 384), r('code-lab', 440, 140, 6, 640),
  r('tide-logic', 300, 100, 6, 384), r('pattern-path', 500, 150, 6, 256), r('shape-shift', 300, 100, 6, 384),
  r('star-numbers', 150, 45, 5, 256), r('food-numbers', 150, 45, 5, 256), r('weather-numbers', 125, 35, 5, 256),
  r('tide-pool', 36, 36, 5, 512), r('float-sink', 36, 36, 5, 512),
  r('market', 200, 60, 5, 256), r('reef-race', 150, 40, 5, 256),
  r('sound-boat', 300, 100, 5, 1024), r('which-one', 200, 70, 5, 1024), r('word-workshop', 200, 65, 5, 1024), r('story-studio', 200, 65, 5, 1024),
  r('turtle-tales', 40, 24, 5, 2048),
  r('rope-pairs', 2048, 372, 6, 384), r('rectangles', 1024, 186, 6, 320), r('two-shells', 2048, 372, 6, 320), r('one-in-each-cove', 1024, 186, 6, 320),
  r('tents', 1024, 186, 6, 320), r('charts', 1024, 186, 6, 320), r('greater-than', 1024, 186, 6, 320), r('skyline', 1024, 186, 6, 320), r('killer', 1024, 188, 6, 512),
  r('harbor-jam', 1024, 240, 6, 256), r('loop', 1024, 240, 6, 320), r('shell-stacks', 512, 120, 6, 256), r('word-builder', 512, 120, 6, 256),
  r('secret-code', 256, 60, 4, 512), r('logic-grid', 256, 60, 4, 640), r('pentomino', 512, 120, 6, 320), r('packs', 512, 60, 4, 320), r('old-toys', 12, 4, 1, 512),
  r('known-rolls', 256, 80, 3, 256), r('coconut', 24, 8, 1, 256), r('tic', 24, 8, 1, 128), r('checkers', 64, 22, 2, 256), r('nets', 64, 22, 2, 256),
  r('canoes', 64, 20, 2, 256), r('reef', 60, 20, 2, 256), r('cargo', 24, 10, 1, 256), r('dash', 24, 10, 1, 256),
];
export const modelEntries = () => BYTE_MODEL.reduce((n, m) => n + m.target, 0);
export const modelFloor = () => BYTE_MODEL.reduce((n, m) => n + m.floor, 0);
export const modelBytes = () => BYTE_MODEL.reduce((n, m) => n + m.target * m.rowBytes, 0);
export type FamilyActual = { family: string; entries: number; rowBytes: number };
/** A family over its modelled average is a size finding, reported the moment real data exists. */
export function verifyByteModel(actual: readonly FamilyActual[]): string[] {
  return actual.flatMap(a => {
    const model = BYTE_MODEL.find(m => m.family === a.family);
    if (!model) return [`${a.family}: not in the byte model.`];
    const average = a.entries ? a.rowBytes / a.entries : 0;
    const issues: string[] = [];
    if (a.entries > model.target) issues.push(`${a.family}: ${a.entries} entries is above the ${model.target} target.`);
    if (average > model.rowBytes) issues.push(`${a.family}: ${average.toFixed(1)} bytes per row is above the ${model.rowBytes} model.`);
    return issues;
  });
}
