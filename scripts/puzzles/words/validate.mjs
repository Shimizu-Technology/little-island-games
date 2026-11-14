import { register } from 'node:module';
import { digest, requireThat } from '../../words/core.mjs';
register('../hooks.mjs', import.meta.url);
const { wordSearchAdapter } = await import('../../../src/puzzles/words/adapter.ts');
const adapter = wordSearchAdapter();
/** The same validator and codec that the app uses, before an external bake is published. */
export function validateProjection(payload) {
  requireThat(adapter.isPayload(payload), 'Runtime puzzle validation failed');
  requireThat(digest(adapter.decodePayload(adapter.encodePayload(payload))) === digest(payload), 'Runtime codec round-trip failed');
}
