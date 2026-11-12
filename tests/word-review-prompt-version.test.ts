import { expect, it } from 'vitest';
import { REVIEW_CONTEXT, REVIEW_PROMPT_VERSION } from '../scripts/words/review.mjs';
import { sha256 } from '../scripts/words/core.mjs';

// Prepared packets bind the reviewer context by value. Changing the context without a new prompt
// version made calibration-001's packets unreconcilable (13 Nov 2026), so each version pins its text.
const PINNED: Record<string, string> = {
  'family-words-blind-v1': 'f60e864f3ed25f0a3b18a79a7a80fc5474d494878bee368f084f37c2099cb621',
};

it('the reviewer context matches the text pinned for its prompt version', () => {
  expect(PINNED[REVIEW_PROMPT_VERSION], 'add a new prompt version when the context changes').toBe(sha256(REVIEW_CONTEXT));
});
