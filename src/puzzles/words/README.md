# Word Search (G6a)

This is an offline, baked-only Cove game. The production registration has no banks until W1 admits real content. The build family also remains inactive until the root manifest contains admitted Word Search packs; its real content floors are unchanged. `challengeFor` and `coveEntries` therefore omit it; fixture dares never enter the production catalog. Slots 80–99 and dare specifications 1500–1501 are reserved within G6's ranges.

`core.ts` owns straight paths, eight-direction snapping, one-find semantics, digraph cells and hidden-message leftovers. `game.ts` adds replay evidence, hearing versus help, undo and redo. `adapter.ts` binds the same rules to the packed puzzle kit. Its compact tuple stores row strings (lowercase c/g encode CH/NG cells), endpoint pairs and display spelling; duplicate answer IDs and matching recording keys use compact sentinels; decoding restores explicit cells and validates them. No generator or private policy is imported by the application.

Each iPad pointer owns a locked ray and a green solid or purple dotted trail. A phone admits one pointer and alternates hunters after a find. `CoveRound` serializes rapid accepted gestures while storage writes finish. A duplicate path is never a second find. Together uses the existing Store's atomic credit table; hearing a word does not set help. Finding with Help does.

The picture dictionary supplies original pictures. A bank must have a picture and an existing recording for every answer before using picture mode. Existing recording keys may be derived from an admitted English answer without changing its reviewed word record. Missing recordings are never synthesized. CHamoru uses only its bound canonical recording and source-backed teaching spelling.

## Test and dev fixtures

`tests/fixtures/word-search/bank.json` is labelled `fixture:true`, with no approval. It is imported only by tests and the separate `scripts/dev/word-search-entry.tsx` entry. Production Expo Router imports neither. Copying it into app content fails the existing W1 admission guard. There is no fixture switch on the shipping baker.

The dev entry is an interaction harness, not a shipping route or a proof of Store persistence. Store tests exercise the actual Cove round separately. The fixture dares are test-only examples of the staged 1500–1599 range.

## Real bake (lead)

After Leon attaches actual family evidence to each adopted W2 review batch, run from the private repository:

```sh
export LITTLE_ISLAND_WORD_POLICY_LOCK=/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/v4/w2-words/private/policy/policy-lock.private.json
W2=/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/v4/w2-words
G6=/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/v4/g6-words
node scripts/puzzles/words/plan.mjs "$W2/private/g6/theme-bank-input.private.json" "$W2/private/g6/theme-packs.json" "$G6/real-plan-family.private.json"
node scripts/puzzles/words/bake.mjs "$W2/private/g6/theme-bank-input.private.json" "$G6/real-plan-family.private.json" "$G6/real-bake-family"
node scripts/puzzles/words/check.mjs "$G6/real-bake-family"
node --import ./scripts/puzzles/register.mjs scripts/puzzles/words/install.ts "$G6/real-bake-family"
```

Use new plan/output paths on retries. `plan.mjs` proposes 2,040 grids across six bands and the actual W2 theme families. Its picture rung uses only existing pictures and recordings. The authored `themes.json` catalog binds the W2 pack order; six labels use a generic title pending the lead’s label review. New hidden-message phrases must also be present in an authored runtime source before packed vocabulary admission can accept them. Insufficient reviewed coverage fails. Reading level stays independent of the engine band. Plans can set an exact hidden message on a grid; the leftover cells must spell that exact message in row order. Adult bands request two fixed look-alike trails, and both scanners still check their letters.

The baker calls W1's `checkSurfaces` and `bakeBank` unchanged. Every final grid gets the trie scan, exact occurrence checks and independent Python scan. The real family-sample gate is mandatory. Any unsafe filler is repaired without changing answer or distractor cells, then checked again. A failed bank publishes nothing. A complete bake needs 512–2,048 distinct payloads and no theme family above a quarter of a band.

`check.mjs` rebakes the detached admissions. `install.ts` validates them again, admits the W1 word assets, certifies packed rows with the shared kit, checks slots and the existing byte budget, and then adopts the catalog and frozen refs. It rolls repository files back on error. The real bank's packed receipts provide semantic counts, template histograms and replay evidence; the earlier bake receipt's `distinctPayloads` is not a symmetry proof. The install refuses an existing Word Search family; subsequent append plans need a separate review.

After adoption the lead must retain `real-bake-family/admission` outside Git as `LITTLE_ISLAND_WORD_RECEIPTS`, regenerate/reconcile shared registries with the integration branch, activate only dares bound to actual refs, rotate W2's CI policy secret, run both full gates, and repeat native and family acceptance. No real bank has been baked by this slice. No sample or approval field has been filled by an agent.

Picture bindings are scoped to the admitted picture answers. Adoption writes `pictures.generated.ts` with those assets and their byte/hash bindings; the unpublished runtime table is empty. The test entry uses its own four-picture table. Loads verify the SVG bytes and use a bounded cache. The dictionary vocabulary index is build-time input.

When adopted picture banks exist, set `LITTLE_ISLAND_PICTURE_W1_QUEUES` to W1's private authoritative queue directory. The existing dictionary reachability check uses it to verify membership; keep the directory outside Git. Both gates retain `LITTLE_ISLAND_WORD_POLICY_LOCK` and the unchanged W1 export guard.
