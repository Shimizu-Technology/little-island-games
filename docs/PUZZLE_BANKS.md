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
| `src/content/puzzles/slot-ranges.json` | The lead's bank-slot register (mirrors SLOTS.md). Never bundled; the lead edits it |
| `scripts/puzzles/` | Bake, verify and scale tools. `families/` is where owner slices register |
| `content/puzzles/receipts/<family>/` | Receipts. Outside the app, never bundled |

## Limits

512 bank slots, one slot per pack. Ordinals are allocated across the whole catalog and stay below 2,147,483,647. A pack holds at most 1,024 entries and 131,072 bytes. Root index and each family manifest are at most 16,384 bytes. The catalog, compatibility banks included, is at most 28 MiB. At most two packs are held at once.

## Formats

**Root.** `{format, revision, nextSlot, nextOrdinal, families}`. Each family is `[id, manifest asset, sha256, entries, packs, bytes]`. Replacing `root.json` is the single commit point of a bake.

**Family manifest.** `{format, family, engine, bands, packs, retired, daily, speech}`. Each pack is `[slot, first ordinal, entries, bytes, sha256, band index, rules, rng]`. `daily` holds Today's frozen pools, as `{version, bands: [[band, [[first ordinal, count], ...]], ...]}`. Each range must lie inside packs of its own band, across packs that touch, and a pool names a band once.

**Pack.** A header line, `{format, family, slot, first, count, band, rules, rng}`, then one row per line. One pack holds one band. A row stays as text until it is opened.

**Row.** `[seed, layout, template, payload, par|0, objectives|0, limits|0, teaches|0, speech|0]`, with trailing zeros dropped. `par` is `[metric, lower, upper]`, and `exact` is derived, so a row cannot claim a proof it lacks. `limits` is `[[metric, max], ...]`. `speech` is `[template, numbers, terms]`. An entry's hash is the SHA-256 of its row line, and that is the hash a saved `PuzzleRef` carries.

**Payload tuples.** Each adapter documents its own:

| Adapter | Tuple |
| --- | --- |
| `maze` | `[size, walls]`, one hex digit per cell: north 1, east 2, south 4, west 8 |
| `logic-lagoon` | `[level, engine seed, round index, givens, solution]`, one digit per cell, 0 for blank |

## Immutable, append-only

A published slot, its ordinal range, hash, and a daily pool never change. New content takes new slots. New Today entries take a new pool version. `npm run puzzles:verify` checks the current catalog against every committed root.

`catalogIssues` holds the rules no single manifest can see: slots are unique, ordinal ranges are disjoint across families, and `nextSlot` and `nextOrdinal` are past everything published. A bake checks it on the catalog it reads and on the complete candidate, before any file moves.

## Slot allocation

`nextSlot` and `nextOrdinal` are high-water marks. They never move backwards (`assertRootAppendOnly`), and a family never loses entries.

A bake gets its slots one of two ways:

- **Sequential (unregistered proof catalogs only).** Packs take `nextSlot` onward, with ordinals from `nextOrdinal` onward. A catalog with a slot register requires an explicit owner claim instead (lead-approved T1 round-2 fix, 16 Nov 2026).
- **Claimed (lead change, 15 Nov 2026).** The bake passes its own range and owner: `npm run puzzles -- bake --family <id> --range 260-279 --owner t1-logic-lagoon`, or the Latin and edge bakes' `--range` (each defaults to its family's run from its base). Packs take the range's slots in order from its first, even below `nextSlot`. Each claimed slot must be:
  - inside the caller's own reservation in `slot-ranges.json`. The reservation holding the range must be the caller's; a group cannot take a nested slice's slots, and a range may not cross another reservation;
  - never a pack of any family, retired packs included, in the working catalog;
  - not an inline bank in the working save catalog (a working packed bank only mirrors a pack, and may be stale during an in-place re-bake);
  - not a pack or bank at the tip of any published ref (`origin/program/4.0`, `origin/main`), so a slot a branch has dropped stays used once published. A ref that can't be read stops the claim;
  - above the family's own last pack, because a family's packs ascend.

  A claimed pack's ordinals start at its slot's own block, `slot × 1024`, so it can't meet another slot's ordinals. The counters then become `max(nextSlot, highest claimed + 1)` and `max(nextOrdinal, end of the highest block used)`. A claim below them leaves both unchanged. The first slot is checked before any search runs, and a refusal changes no file.

`scripts/puzzles/slots.ts` holds these rules. `npm run puzzles:verify` adds a catalog-wide invariant: every pack slot, and every save-catalog bank slot, lies inside a recorded reservation, and no inline bank sits on a pack's slot. Uniqueness across families stays with `catalogIssues`.

## Quality gates

`certify` runs on every candidate, and again on every shipped row during verify.

1. Strict decode, exact revisions, row round trip, no input mutation, replay twice with the same evidence.
2. A witness replayed through the real engine, through states its own `validState` accepts, inside the same limits a player gets. Every limit and the solver's metric must really be measured: a missing, negative or fractional value is `metric-missing`, never zero. The solver's bounds must contain the witness's measured cost. Where one answer is promised, two independent counts must both say exactly one.
3. A complete no-guess technique trace where the family requires one. A stall is a rejection, never a difficulty label. Hints must finish the puzzle inside its limits. A family with `hiddenInformation` must supply `adapter.hidden`, and its hints must match across every twin at each state of the hinted route, the witness and a wandering line.
4. Every "required" claim needs a proven counterfactual.
5. Exact and semantic hashes, unique across the family.
6. No template over 25% of a band, and no layout twice in a row inside a pack.
7. Provenance recorded in the receipt.
8. Human review and native QA recorded in the receipt. These are never assumed: `npm run puzzles -- verify --shipping` fails until they exist.

Dumb-player bots run on every entry. A bot meeting the objective rejects the entry only in a band marked `advanced`, and a bot that reaches a state `validState` refuses rejects it anywhere. Only `certify` can mark an entry as proven. A certified entry is deep-frozen and the packer refuses anything else, so a bake has no path that writes filler.

`verify` also requires every registered family to meet each band's floor, counting certified rows and leaving out retired packs. Registering a family promises those floors. `--shipping` additionally requires every family in `byte-model.ts` to be registered and at its floor, so the empty foundation catalog passes an ordinary check and still fails a shipping one.

A timeout is `budget-exhausted`. Only a search that emptied the reachable space may say `unsolved`. The solver reopens a state when a cheaper route reaches it, so any heuristic that never overestimates and is never negative gives an exact result. `par.exact` means the bounds agree. Word any other par as a budget to try: `parWording` returns which.

## Receipts

Each pack has one receipt, `content/puzzles/receipts/<family>/slot-NNNN.json`, with an exact schema. `verify` recomputes the family, slot, band, ordinals, rules, hash, byte counts, seeds, histograms, distinct counts, solve bounds, proof aggregates, bot results and speech count from the pack and its fresh certification, and fails on any difference. A gzip size only has to be close, because its exact length depends on the zlib build.

A bake leaves approval open: `review` is `{ids, complete: false, subject: null}`, `native` is empty and `allShippingGates` is false. A family-level review flag never approves a pack that did not exist yet. To record approval, edit the receipt:

| Field | Value |
| --- | --- |
| `review` | `{ids: [...], complete: true, subject: {family, slot, sha256, engine, rules, kit}}`. `subject` repeats this pack's facts, and `kit` is `hashes.kit` from the same receipt |
| `native[]`, one pack | `{id, build, sourceSha, scope: "pack", engine, rules, family, slot, sha256}` |
| `native[]`, shared | `{id, build, sourceSha, scope: "mechanic", engine, rules, maxPackBytes}`, for packs up to the largest one that QA actually ran |
| `allShippingGates` | `true`, only once both of the above are present |

`sourceSha` is the full commit of the tested build. Editing the kit does not void an approval, because every row is proved again by the current kit. A change to how an engine plays must bump `rules`, and that does void it.

## Baking

`npm run puzzles -- bake --family <id> [--range first-last --owner <reservation>] [--seed n] [--attempts n] [--hours n]`. Without `--range` only unregistered proof catalogs may allocate sequentially; registered catalogs refuse before generation. With it the slots are claimed (see "Slot allocation"). The run stops at the target, the attempt cap or the deadline. Its status is `complete` or `exhausted`. If any band ends below its floor, or an append cannot keep the whole band inside its template share, nothing is published and the accepted bank stays byte-identical. An attempt receipt is always written. A second bake needs a new `--seed`; repeats are rejected as duplicates.

## Adding a family

1. Write the adapter in `src/puzzles/adapters/`, calling the game's own pure engine. No `any`. `validState` must accept every state play can reach, through a JSON round trip, and refuse anything else. If the board holds facts the player cannot see, set `hiddenInformation` and supply `hidden`.
2. Add one file in `scripts/puzzles/families/` and list it in `index.ts`, with a row in `byte-model.ts`.
3. Bake, then run `npm run puzzles:verify`.
4. Commit the assets, root, generated table and receipts together.

## Today's Puzzle

`pickFromManifest` hashes `LI-TODAY-V1|game|tier|YYYY-MM-DD` with FNV-1a 32 and indexes the frozen pool. The date comes from the device's calendar fields. `keepActive` holds an active puzzle across midnight, a zone change or a clock change. There is no date history, no record of who played and no reward. Every puzzle stays open every day.

Registered catalogs require an explicit owner claim for new packs, including allocation at `nextSlot`. The sequential high-water counter never grants permission to use the reservation it points into. Only isolated catalogs without a slot register retain the sequential default. (Lead-approved T1 round-2 tooling fix, 16 November 2026.)
