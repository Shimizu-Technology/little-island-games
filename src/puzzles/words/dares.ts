import type { RegisteredDare } from '../../challenge/types';
/** Staged specifications only: no ref, catalog mark or shelf exists before real banks are admitted. */
export const stagedSearchDares: readonly RegisteredDare[] = [
  { slot: 1500, id: 'search-all-found', label: 'Find every word', rule: { kind: 'pick-up', objective: 'all-found' }, help: 'allowed' },
  { slot: 1501, id: 'search-own-hunt', label: 'Hunt on my own', rule: { kind: 'clean' }, help: 'independent' },
];
