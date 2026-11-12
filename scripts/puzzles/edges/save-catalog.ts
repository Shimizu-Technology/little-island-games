/**
 * Writes the G5 banks and contexts into the frozen save catalog, under the rule the Latin writer
 * shares (../save-catalog-banks.ts): a slot any published tip's catalog holds must match every
 * published definition of it, tips that disagree stop the writer, and any other slot is this
 * branch's own and a re-bake replaces it. It stops, too, if a published ref is missing.
 */
import { writeSaveCatalogBanks } from '../save-catalog-banks';
import { edgeFacts, edgeKinds } from './facts';
import { edgeGenerators } from './generators';

writeSaveCatalogBanks({ families: edgeKinds, facts: edgeFacts(), tier: (family, band) => edgeGenerators[family].rungs.find((r: { id: string }) => r.id === band)!.tier });
