/**
 * Writes the Latin banks and contexts into the frozen save catalog, under the rule the edge writer
 * shares (../save-catalog-banks.ts): a slot any published tip's catalog holds must match every
 * published definition of it, tips that disagree stop the writer, and any other slot is this
 * branch's own and a re-bake replaces it. It stops, too, if a published ref is missing.
 */
import { kinds } from '../../../src/puzzles/latin/core';
import { latinRungs } from '../../../src/puzzles/latin/rungs';
import { writeSaveCatalogBanks } from '../save-catalog-banks';
import { latinFacts } from './facts';

writeSaveCatalogBanks({ families: kinds, facts: latinFacts(), tier: (family, band) => latinRungs[family as keyof typeof latinRungs].find(r => r.id === band)!.tier });
