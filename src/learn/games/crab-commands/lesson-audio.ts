import { proofContent } from './challenge-content';
// Lesson audio follows the puzzle, never a beach id that several puzzles share.
const lessonKeys = new Map<string, string>([
  ...proofContent.debug.map((p, i) => [p.descriptor.lesson, `c1-crab-lesson-fix-${i + 1}`] as const),
  ...proofContent.mud.map((p, i) => [p.descriptor.lesson, `c1-crab-lesson-mud-${i + 1}`] as const),
]);
export const lessonAudio = (lesson: string) => lessonKeys.get(lesson);
