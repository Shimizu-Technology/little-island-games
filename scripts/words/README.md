# Word pipeline (W1)

Build tooling only. No service, account, network call, list scan, clue model or generation runs in the app. `content/words/runtime.ts` is the small on-device interface for G6. No new bank is approved or registered by this slice.

## Sources and boundaries

| Source | Pinned use | Distribution terms / notice |
| --- | --- | --- |
| SCOWL 2020.12.07 | American candidate answers; British free-input variants | Permissive composite notices, reproduced in `notices/scowl-Copyright` |
| ENABLE | Checking and finite accidental-word census only | Public-domain statement in the SCOWL notice; credit originators |
| Open English WordNet 2024 | Private sense, form and topic triage; definitions never enter an app asset | CC BY 4.0 plus Princeton notice, both under `notices/` |
| CMUdict | Private pronunciation ambiguity flags | BSD-style notice under `notices/` |
| Local editorial supplement | 500 English candidates in `content/words/supplement.draft.json` | Original selection, still requires review |
| HåfaGPT canonical vocabulary | Exact source-backed teaching terms only, private family word search/matching | Local snapshot pinned; public permissions and fluent-reader acceptance remain separate |

`sources.lock.json` pins source bytes and notices. The [2026 SCOWL release](https://github.com/en-wl/wordlist/releases/tag/rel-2026.02.25) was checked: it is a dictionary-only release on the new database architecture. The stable size/category files are retained for reproducibility. A source upgrade requires new hashes, queues and reviews.

Wiktionary, wordfreq, Kuperman, FrequencyWords, Google/Norvig, SUBTLEX, Fry, commercial word-game lists and published clue databases are not answer sources. The research tiers used Kuperman gates, so they are **not copied**. Fresh candidate queues use permitted SCOWL levels/length and OEWN lemmas. Bands are provisional guesses for reviewers, not measured ages. Wiktionary category snapshots and public rude-word lists are private scan lookups only. Never copy the policy, its hashes, raw source files, packets, transcripts or private receipts into an app asset or source export.

## Prepare sources and queues

All private outputs must be outside this repository, including through symlink ancestors. Commands refuse existing output files/directories so retries preserve earlier evidence.

```sh
python3 -B scripts/words/acquire.py "$PRIVATE/sources"
python3 -B scripts/words/prepare-data.py "$PRIVATE/sources" "$PRIVATE/new-queues" "$HAFA_API"
node scripts/words/make-calibration.mjs "$PRIVATE/new-queues/tiers.queue.json" "$CALIBRATION"
node scripts/words/cli.mjs prepare "$CALIBRATION/clues.input.private.json" "$PRIVATE/new-queues/safety-policy.private.json" "$CALIBRATION/blind-batch" calibration-001
```

The local HåfaGPT canonical snapshot must be supplied as `sources/canonical-vocabulary.json` and match the lock. `prepare-data.py` also needs `sources/scan-sources.private.json` and its pinned private inputs. The executed W1 snapshot and exact paths are in the worker's external `REPORT.md`; source download URLs, revisions and content hashes stay beside those private inputs. Supply copies of their licences beside them. The scan manifest is a private build input, not a downloadable app dependency.

Queue outputs are `tiers.queue.json`, `local.queue.json`, `themes.queue.json`, `ladder.queue.json`, `census.queue.json`, `safety-policy.private.json` and `queue-receipt.private.json`. They contain **zero approvals**. The theme seed file supplies 85 editorial starting points; it does not prove all 2,500 candidates are semantically assigned. Read the receipt's distinct assignment count. The ladder component size is a candidate measurement, not a reviewed accept-list claim. Census rejects must be reconciled into the private policy; do not treat a machine flag as a final answer decision.

`prepare-words` uses the same CLI shape with an input `{words:[...]}`. It requires complete word records. Resolve provisional form/topic/policy errors before preparing a word batch; do not bypass validation to get a packet.

## Blind review and reconciliation

Give reviewer A only `review-a.packet.json` and reviewer B only `review-b.packet.json`, in independent sessions from different model families. Each packet has its own deterministic ordering. Do not give either reviewer the prepared bundle, pending sheet, lint report, raw drafting candidates, another review or existing approval state. The packet embeds the family context and a strict content projection.

Keep the actual provider/model/run transcript. A raw result must contain:

- `schemaVersion:1`, `fixture:false`, `batchSha256`, `packetSha256`, `slot` from its packet;
- `reviewer:{id,family,model}`, with the actual family `openai`, `anthropic` or `google`, and a unique actual `runId`;
- actual ISO `startedAt`, `finishedAt` and SHA-256 of the saved transcript as `transcriptSha256`;
- `items`, exactly once for every packet ID: `{id,verdict,reason}`. Verdict is `keep`, `revise`, `reject` or `call`. `revise` also needs `replacement`.

Use `digest(packet)` from `core.mjs` for the canonical JSON packet hash (not the formatted file's byte hash). The batch hash is already in the packet. Do not fabricate provider identity or timing. The tooling checks binding, coverage and distinct runs/families; the lead must verify the actual run provenance against the saved transcripts.

```sh
node scripts/words/cli.mjs import "$BATCH/review-a.packet.json" "$REVIEW_A_RESULT" "$REVIEW_A_TRANSCRIPT" "$RESULTS/a.import.json"
node scripts/words/cli.mjs import "$BATCH/review-b.packet.json" "$REVIEW_B_RESULT" "$REVIEW_B_TRANSCRIPT" "$RESULTS/b.import.json"
node scripts/words/cli.mjs reconcile "$BATCH/prepared.private.json" "$RESULTS/a.import.json" "$RESULTS/b.import.json" "$RESULTS/reconcile.json"
```

Imports reject missing/duplicate IDs, stale packets, wrong fixture mode, missing reasons or transcripts and invalid times. Reconciliation rejects altered projections, edited imports, duplicate transcripts/runs/identities or the same model family. Its rows show both actual verdicts and proposed agreement/disagreement, with empty lead decisions. Reviewer durations and disagreement rate are measured from the imported run data. Lead duration stays null until a real lead pass. No reconcile command approves content.

## Shipping evidence and bake

The lead supplies detached evidence per retained word/clue, keyed by record ID: `{prepared,reviews:[a,b],lead,familySample}`. `lead` has `schemaVersion:1`, `fixture:false`, the canonical `reconciliationSha256`, actual `reviewer`, `startedAt`, `finishedAt` and one `{id,decision,reason}` per original row. `familySample` has `fixture:false`, the current `batchSha256`, `decision:'keep'`, actual `reviewer`, ISO `date` and an evidence path/identifier for the device sample. These describe real actions and must never be filled in by a fixture generator.

Only content kept by both reviewers and the lead can bake. A change, rejected item or genuine call requires resolution and fresh review of the changed record. An inline `status:'approved'` has no effect. Every content hash is recomputed. Family sampling remains required before shipping.

A private bank input has `{words,clues,surfaces,evidence,canonicalTerms,policy,sourceDirectory,fixture:false}`. `sourceDirectory` points to verified pinned bytes. The Python membership check confirms the actual American answer and British variant membership; labelling a British answer `en-US` cannot bypass it. Supply the full pinned HåfaGPT entries for CHamoru. Record exact teaching spelling, source ID, `uses` restricted to word search/matching and `fluentReaderChecked:false`.

```sh
node scripts/words/cli.mjs bake "$PRIVATE/bank-input.json" "$PRIVATE/new-bake"
node scripts/words/cli.mjs guard dist "$PRIVATE/new-queues/safety-policy.private.json" "$PRIVATE/new-bake/receipt.private.json"
```

`bank.json` is an explicit runtime projection with no private policy, hashes or review state. Keep the receipt private. It records vocabulary and scan-list hashes, actual word/clue review IDs, rejected counts, scanned surfaces and the independent verifier's implementation hash/result. Only the lead integrates an admitted bank.

Normal `npm test` runs the word shipping admission test. New `content/words/banks/*.json` files fail without matching detached bake inputs under `LITTLE_ISLAND_WORD_RECEIPTS` using the same relative filename. Admission rebakes and compares the runtime asset. App imports of private tooling/draft data also fail. There are no W1 shipped banks today.

## Surface rules and limits

Word searches are baked, all eight directions, exact one physical location per listed word, no mixed alphabets. The primary scanner uses a trie; `verify.py` independently searches complete rays with Python string search. Both fold Å/Ñ only for scanning. Display and answer matching preserve them and the glota. CH and NG are single cells. Exemption applies only inside an explicitly validated listed-answer path: it preserves legitimate words containing broad-list fragments, as in the audit. A crossing or filler hit still fails. Zero means no unexempt string on the current list; unlisted slang can still escape.

Crosswords validate every across/down run against reviewed answers; diagonals are not crossword answers. Scrambles scan both directions and preserve the answer's letters. Builder grids reject traceable core words (eight touching neighbors, no reused cell), reject straight broad-list hits and require listed answers to be traceable. Wheels reject core letter multisets. Ladders accept any listed one-letter step. British variants are accepted only in the reviewed free-input list. All misses use the same neutral reply. Hints use only closed templates.

Exact/lemma answer blocks are distinct from the overinclusive scan union. No substring answer filter. All four tiers share the family safety standard, and engine difficulty is independent of reader level. The clue linter flags answer disclosure, length, out-of-tier vocabulary, one-home assumptions, colonial framing, brands, reading pressure and local/faith sensitivities for review. It does not run short-text readability formulae or reject God as profanity.

## Fixture proof

```sh
node scripts/words/smoke.mjs "$CALIBRATION/clues.input.private.json" "$POLICY" "$NEW_FIXTURE_DIR"
node scripts/words/probe.mjs "$POLICY" "$NEW_SCAN_PROOF_DIR"
npx vitest run tests/word-pipeline.test.ts
```

`smoke.mjs` labels every synthetic reviewer result, transcript and receipt TEST ONLY, sets `fixture:true`, and proves that it cannot ship. Its synthetic times/disagreement rate are transport assertions, not measured reviewer throughput. It never calls a reviewer. `probe.mjs` checks the actual 87-word policy probe and 32 unapproved scan-clean QA boards with both implementations. It does not reproduce the audit's 600,000-grid experiment. Real review/reconcile throughput remains unmeasured until the lead runs the calibration.
