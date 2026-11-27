import { describe, expect, it } from 'vitest';
import { learnIds } from '../src/learn/types';
import { engines } from '../src/learn/engines';
import { startSession, validLearnSession } from '../src/learn/session';
import { optionsAtLevel, levelNumbers } from '../src/learn/levelOptions';

// Production engines and options, including word games whose reviewed content
// may be unavailable. An unavailable-content state must remain a valid session.
describe('all School game entry states', () => {
  it.each(learnIds)('%s starts valid sessions at every offered School level', game => {
    const engine = engines[game];
    for (const level of levelNumbers) {
      const options = optionsAtLevel({ mode: engine.modes[0], pace: engine.paces?.[0] ?? 'easy' }, level);
      const session = startSession(game, { options }, {}, 7);
      expect(validLearnSession(session, game), `${game} level ${level}`).toBe(true);
      expect(() => engine.outcome(session.state, session.options)).not.toThrow();
    }
  });
});
