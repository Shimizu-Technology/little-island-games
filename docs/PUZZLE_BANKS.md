# Puzzle banks

The offline puzzle catalog. Banks are generated and proven at build time. The device only chooses, loads and replays them. Save rules are in `SAVE_CONTRACT.md`.

## Files

| Path | What it is |
| --- | --- |
| `src/puzzles/` | The kit: descriptor, RNG, attempt log, solver, gates, bank format, loader, Today |
| `src/puzzles/adapters/` | One adapter per real engine |
| `src/content/puzzles/root.json` | Boot directory, at most 16 KiB. The only puzzle data read at launch |
| `src/content/puzzles/assets/*.lipuzzle` | Family manifests (`f-<id>-<hash>`) and packs (`p<slot>`), read lazily |
| `src/content/puzzles/assets.generated.ts` | Generated map of asset names to `require` thunks |
| `scripts/puzzles/` | Bake, verify and scale tools. `families/` is where owner slices register |
| `content/puzzles/receipts/<family>/` | Receipts. Outside the app, never bundled |

## Limits

512 bank slots, one slot per pack. A pack holds at most 1,024 entries and 131,072 bytes. Root index and each family manifest are at most 16,384 bytes. The catalog, compatibility banks included, is at most 28 MiB. At most two packs are held at once.

## Formats

**Root.** `{format, revision, nextSlot, nextOrdinal, families}`. Each family is `[id, manifest asset, sha256, entries, packs, bytes]`. Replacing `root.json` is the single commit point of a bake.

**Family manifest.** `{format, family, engine, bands, packs, retired, daily, speech}`. Each pack is `[slot, first ordinal, entries, bytes, sha256, band index, rules, rng]`. `daily` holds Today's frozen pools, as `{version, bands: [[band, [[first ordinal, count], ...]], ...]}`.

**Pack.** A header line, `{format, family, slot, first, count, band, rules, rng}`, then one row per line. One pack holds one band. A row stays as text until it is opened.

**Row.** `[seed, layout, template, payload, par|0, objectives|0, limits|0, teaches|0, speech|0]`, with trailing zeros dropped. `par` is `[metric, lower, upper]`, and `exact` is derived, so a row cannot claim a proof it lacks. `limits` is `[[metric, max], ...]`. `speech` is `[template, numbers, terms]`. An entry's hash is the SHA-256 of its row line, and that is the hash a saved `PuzzleRef` carries.

**Payload tuples.** Each adapter documents its own:

| Adapter | Tuple |
| --- | --- |
| `maze` | `[size, walls]`, one hex digit per cell: north 1, east 2, south 4, west 8 |
| `logic-lagoon` | `[level, engine seed, round index, givens, solution]`, one digit per cell, 0 for blank |

## Immutable, append-only

A published slot, its ordinal range, hash, and a daily pool never change. New content takes new slots. New Today entries take a new pool version. `npm run puzzles:verify` checks the current catalog against every committed root.

## Quality gates

`certify` runs on every candidate, and again on every shipped row during verify.

1. Strict decode, exact revisions, row round trip, no input mutation, replay twice with the same evidence.
2. A witness replayed through the real engine, inside the same limits a player gets. Where one answer is promised, two independent counts must both say exactly one.
3. A complete no-guess technique trace where the family requires one. A stall is a rejection, never a difficulty label. Hints must finish the puzzle inside its limits and must not vary with hidden information.
4. Every "required" claim needs a proven counterfactual.
5. Exact and semantic hashes, unique across the family.
6. No template over 25% of a band, and no layout twice in a row inside a pack.
7. Provenance recorded in the receipt.
8. Human review and native QA recorded in the receipt. These are never assumed: `npm run puzzles -- verify --shipping` fails until they exist.

Dumb-player bots run on every entry. A bot meeting the objective rejects the entry only in a band marked `advanced`. Only `certify` can mark an entry as proven, and the packer refuses anything else, so a bake has no path that writes filler.

A timeout is `budget-exhausted`. Only a search that emptied the reachable space may say `unsolved`. `par.exact` means the bounds agree. Word any other par as a budget to try: `parWording` returns which.

## Baking

`npm run puzzles -- bake --family <id> [--seed n] [--attempts n] [--hours n]`. The run stops at the target, the attempt cap or the deadline. Its status is `complete` or `exhausted`. If any band ends below its floor, nothing is published and the accepted bank stays byte-identical. An attempt receipt is always written. A second bake needs a new `--seed`; repeats are rejected as duplicates.

## Adding a family

1. Write the adapter in `src/puzzles/adapters/`, calling the game's own pure engine. No `any`.
2. Add one file in `scripts/puzzles/families/` and list it in `index.ts`, with a row in `byte-model.ts`.
3. Bake, then run `npm run puzzles:verify`.
4. Commit the assets, root, generated table and receipts together.

## Today's Puzzle

`pickFromManifest` hashes `LI-TODAY-V1|game|tier|YYYY-MM-DD` with FNV-1a 32 and indexes the frozen pool. The date comes from the device's calendar fields. `keepActive` holds an active puzzle across midnight, a zone change or a clock change. There is no date history, no record of who played and no reward. Every puzzle stays open every day.
