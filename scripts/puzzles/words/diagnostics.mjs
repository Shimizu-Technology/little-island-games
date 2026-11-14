/** Only fixed, content-free reasons may leave the private admission boundary. */
const safe = new Set([
  'Output exists', 'Bake output must be new', 'Staging exists', 'Real W2 input required',
  'At least four theme families are required in a band', 'Theme source binding changed',
  'Theme label input changed; refresh authored labels with review',
  'Not enough reviewed picture/audio or theme coverage for this band',
  'G6 bank slot must be unique and within 80–99', 'Invalid bank plan', 'Unknown reviewed answer ID',
  'Grid IDs must be unique', 'Grid needs reviewed answers', 'Picture banks need dictionary pictures and real recordings',
  'Word Search needs 512–2048 distinct grids', 'Theme family exceeds one quarter of a band',
  'Actual family sample required before shipping', 'Runtime puzzle validation failed', 'Runtime codec round-trip failed',
  'Plan binding mismatch', 'Fixtures cannot ship', 'Unknown bank file', 'Bank differs from fresh W1 bake',
  'Incomplete bake', 'Incomplete puzzle projection', 'Puzzle has no admitted surface', 'Grid plan mismatch',
  'Puzzle differs from admitted cells and answers', 'Duplicate semantic grids',
  'Existing immutable Word Search banks require a new append plan.', 'G6 slots already occupied.',
  'Refusing to overwrite a word bank.', 'Catalog output exists; use a fresh bake output.',
  'Packed bake did not fit the reserved slots.', 'The real bank exceeds the existing byte model; lead must resolve before adoption.',
  'Combined catalog collision.',
]);
export const safeReason = error => safe.has(error?.message) ? error.message : 'A private admission gate failed; inspect the private evidence.';
