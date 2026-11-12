import { proofContent } from './challenge-content';
// Lesson audio follows the puzzle, never a beach id that several puzzles share. A revised lesson
// gets a new key, so speech recorded for the earlier text is never played for the new one.
const mudKeys = ['c1-crab-lesson-mud-1', 'c1-crab-lesson-mud-2', 'c1-crab-lesson-mud-3', 'c1-crab-lesson-mud-4', 'c1-crab-lesson-mud-5', 'c1b-crab-lesson-mud-6', 'c1-crab-lesson-mud-7'];
const lessonKeys = new Map<string, string>([
  ...proofContent.debug.map((p, i) => [p.descriptor.lesson, `c1-crab-lesson-fix-${i + 1}`] as const),
  ...proofContent.mud.map((p, i) => [p.descriptor.lesson, mudKeys[i]] as const),
]);
export const lessonAudio = (lesson: string) => lessonKeys.get(lesson);
