import { expect, it } from 'vitest';
import { REVIEW_CONTEXT, REVIEW_PROMPT_VERSION } from '../scripts/words/review.mjs';
import { sha256, validateClue } from '../scripts/words/core.mjs';

// Prepared packets bind the reviewer context by value. Changing the context without a new prompt
// version made calibration-001's packets unreconcilable (13 Nov 2026), so each version pins its text.
const PINNED: Record<string, string> = {
  'family-words-blind-v1': 'f60e864f3ed25f0a3b18a79a7a80fc5474d494878bee368f084f37c2099cb621',
};

it('the reviewer context matches the text pinned for its prompt version', () => {
  expect(PINNED[REVIEW_PROMPT_VERSION], 'add a new prompt version when the context changes').toBe(sha256(REVIEW_CONTEXT));
});

const base = {schemaVersion:1,id:'rev-1-r2',wordId:'reef',answer:'REEF',meaning:'A ridge of coral in the sea',tier:'Little',text:'Coral builds this ridge under the sea.',candidates:['Coral builds this ridge under the sea.','A coral ridge under the waves.','A home for fish made of coral.'],provenance:{model:'reviewer-model',date:'2026-11-13T00:00:00Z',promptVersion:'blind-review-replacement-v1',promptSha256:'c'.repeat(64),webUsed:false,inputs:'answer,meaning,tier,tone'}};

it('a blind-review revision is labelled as having seen our own original clue and names it', () => {
  expect(() => validateClue({...base,provenance:{...base.provenance,inputs:'answer,meaning,tier,tone,own-original-clue',revisionOf:'rev-1'}})).not.toThrow();
  expect(() => validateClue({...base,provenance:{...base.provenance,inputs:'answer,meaning,tier,tone,own-original-clue'}})).toThrow('Clean-room');
  expect(() => validateClue({...base,provenance:{...base.provenance,inputs:'answer,meaning,tier,tone,own-original-clue',revisionOf:'rev-1-r2'}})).toThrow('Clean-room');
  expect(() => validateClue({...base,provenance:{...base.provenance,inputs:'answer,meaning,tier,tone,own-original-clue',revisionOf:'rev-1',webUsed:true}})).toThrow('Clean-room');
  expect(() => validateClue({...base,provenance:{...base.provenance,inputs:'answer,meaning,tier,tone,published-clues',revisionOf:'rev-1'}})).toThrow('Clean-room');
});
