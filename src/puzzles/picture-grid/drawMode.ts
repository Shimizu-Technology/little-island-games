import { EMPTY, FILL, cluesOf, type LineAxis, type PictureGrid } from './engine';
import { editPicture, freshPicture, type Paint, type PictureDraft } from './checkpoint';
import { provePicture } from './solver';

export const drawingSizes = [5, 8, 10] as const;
export type DrawingSize = (typeof drawingSizes)[number];
export type DrawingCheck =
  | { kind: 'empty' }
  | { kind: 'ready'; puzzle: PictureGrid }
  | { kind: 'open'; puzzle: PictureGrid; line: { axis: LineAxis; index: number } };
type Drawing = { phase: 'draw'; draft: PictureDraft };
type Cover = { phase: 'cover'; puzzle: PictureGrid };
type FamilyPuzzle = { phase: 'solve'; puzzle: PictureGrid; draft: PictureDraft };
export type DrawMode = Drawing | Cover | FamilyPuzzle;

export const newDrawing = (size: DrawingSize = 5): Drawing => ({ phase: 'draw', draft: freshPicture(size) });
export function checkDrawing(draft: PictureDraft): DrawingCheck {
  if (!draft.marks.includes(FILL)) return { kind: 'empty' };
  const puzzle: PictureGrid = { ...cluesOf(draft.size, draft.marks), name: 'Your picture', palette: 4 };
  const proof = provePicture(puzzle);
  if (proof.status === 'unique') return { kind: 'ready', puzzle };
  return { kind: 'open', puzzle, line: { axis: 'row', index: Math.floor(proof.marks.indexOf(EMPTY) / draft.size) } };
}

export function paintDrawing(state: Drawing, event: Paint | { type: 'undo' }): Drawing {
  if (event.type === 'paint' && event.mark !== EMPTY && event.mark !== FILL) return state;
  const draft = editPicture(state.draft, event);
  return draft === state.draft ? state : { phase: 'draw', draft };
}

export function passDrawing(state: Drawing): DrawMode {
  const check = checkDrawing(state.draft);
  // The original artwork is discarded here. For open drawings any clue-matching picture can win.
  return check.kind === 'empty' ? state : { phase: 'cover', puzzle: check.puzzle };
}
export const revealDrawing = (cover: Cover): FamilyPuzzle =>
  ({ phase: 'solve', puzzle: cover.puzzle, draft: freshPicture(cover.puzzle.size) });
