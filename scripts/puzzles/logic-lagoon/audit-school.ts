/** Read-only repeat/answer accounting; symmetries never add to certified supply. */
import { encodePuzzle } from '../../../src/puzzles/latin/core';
import { search } from '../../../src/puzzles/latin/solver';
import { schoolCage } from '../../../src/learn/games/logic-lagoon/school-cages';
const puzzles = new Set<string>(), answers = new Set<string>(), rounds = new Set<string>();
for (let seed = 0; seed < 3200; seed++) {
  const round: string[] = [];
  for (let index = 0; index < 4; index++) {
    const p = schoolCage(seed, index), text = JSON.stringify(encodePuzzle(p));
    puzzles.add(text); round.push(text); answers.add(search(p, 1).first!.join(''));
  }
  rounds.add(JSON.stringify(round));
}
console.log(JSON.stringify({ certifiedRows: 1600, rowsPerRound: 4, baseRoundBlocks: 400, sequentialBaseRepeatDistance: 400, seedLabelledTransformedRounds: 3200, distinctTransformedRounds: rounds.size, distinctTransformedPuzzles: puzzles.size, distinctAnswers: answers.size, exactSeedSchedulePeriod: 3200, randomSeedsCanRepeatEarlier: true }));
