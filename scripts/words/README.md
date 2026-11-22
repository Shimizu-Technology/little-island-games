# Word pipeline (W1)

Build tooling only. No service, account, network call, list scan, clue model or generation runs in the app. `content/words/runtime.ts` is the small on-device interface for G6. No new bank is approved or registered by this slice. The lead-approved Library alias correction is recorded separately; it creates no guard exception.

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
node scripts/words/make-calibration.mjs "$PRIVATE/new-queues/tiers.queue.json" "$CALIBRATION" "$AUTHORING_PROVENANCE"
node scripts/words/cli.mjs prepare "$CALIBRATION/clues.input.private.json" "$PRIVATE/new-queues/safety-policy.private.json" "$CALIBRATION/blind-batch" calibration-001
```

The local HåfaGPT canonical snapshot must be supplied as `sources/canonical-vocabulary.json` and match the lock. `prepare-data.py` also needs `sources/scan-sources.private.json` and its pinned private inputs. The executed W1 snapshot and exact paths are in the worker's external `REPORT.md`; source download URLs, revisions and content hashes stay beside those private inputs. Supply copies of their licences beside them. The scan manifest is a private build input, not a downloadable app dependency.

Dictionary scanning also requires an external `dictionary-sources.private.json` with `sha256` keyed by the three dictionary filenames and `minimumSensitiveHeadwords` greater than zero. Missing definitions, schema drift, changed bytes and an undersized census fail closed. Two-letter and multiword sensitive headwords remain in the exact CHamoru policy; only 3+ letter forms enter the broad grid scan.

Calibration authoring now requires five pipe-separated fields per source row: answer, meaning, selected clue, authored alternate A, authored alternate B. The legacy three-column draft does not meet that requirement: its generated padding is not an alternate draft. Supply real authoring metadata `{model,date,promptFile,webUsed:false,inputs:"answer,meaning,tier,tone"}` and preserve the actual prompt file externally. The tool hashes its bytes; it does not claim that a prompt label is a model transcript. The old calibration remains unapproved and needs genuine alternate drafting before regeneration.

Queue outputs are `tiers.queue.json`, `local.queue.json`, `themes.queue.json`, `ladder.queue.json`, `census.queue.json`, `safety-policy.private.json` and `queue-receipt.private.json`. They contain **zero approvals**. The theme seed file supplies 85 editorial starting points; it does not prove all 2,500 candidates are semantically assigned. Read the receipt's distinct assignment count. The ladder component size is a candidate measurement, not a reviewed accept-list claim. Census rejects must be reconciled into the private policy; do not treat a machine flag as a final answer decision.

`prepare-words` uses the same CLI shape with an input `{words:[up to 250 batch records], vocabulary:[optional full bank records], fixture:false}`. `prepare` takes `{clues:[up to 250 batch records], vocabulary:[optional full bank records], fixture:false}`. `vocabulary` is informational context hashed in the prepared batch; it is never confused with the records under review. It requires complete word records. Resolve provisional form/topic/policy errors before preparing a word batch; do not bypass validation to get a packet.

## Blind review and reconciliation

Give reviewer A only `review-a.packet.json` and reviewer B only `review-b.packet.json`, in independent, blind sessions on two different models (they may share a model family, by Leon's decision of 13 Nov 2026). Each packet has its own deterministic ordering. Do not give either reviewer the prepared bundle, pending sheet, lint report, raw drafting candidates, another review or existing approval state. The packet embeds the family context and a strict content projection. Word packets include British variants, lemma, form, proper-noun status, canonical ID, allowed uses, audio, word lengths and abbreviation/living-person fields. Each variant needs its own `{spelling,verdict,relation:"spelling-variant",reason}` in both review results. A keep on the parent word alone does not admit a variant.

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

## Reading records (lead contract change: W1 reading records)

Sound Boat word-parts records use the same detached admission with a smallest additive extension: `prepare-reading` (closed record keys, reading blind packets), the same `import`/`reconcile`, and `bake-reading` (`bake-reading.mjs`) for the runtime projection `{schemaVersion, kind:'reading-parts', words}`. A bank is registered in the manifest with `kind: "reading-parts"` and loads through `readingBankLoaders`; `check:words` rebakes it and the export guard runs it at every shipping gate. Records are validated by the kit's own `partsWordIssues` (`src/learn/reading/morphology.ts`, loaded by Node's default type stripping), so shipping and the app loader agree. The bake also scans every text that can be built in the boxes from tray pieces (`readingConstructions`, `scanTexts`, both directions). Reading-shaped data (two of `word`, `chunks`, `distractors`) anywhere in the app tree is an unadmitted bank, and `checkReadingPayloads` refuses any reading-shaped record in an export that is not exactly a registered bank's record. Both are supplementary: the boundary is provenance in the app. `src/learn/reading/tasks.ts` is the only maker of reading tasks, by id, from the registry door or pinned inherited words; `src/learn/reading/provenance.ts` is the only loader of inherited reading content, as a digest-checked, frozen, branded snapshot looked up by id; and `ReadingText`, `TapWords` and every reading board (GrowthBoard's reading tracks included) refuse a record that neither one branded. Reading content as data must flow through `provenance.ts`. A new reading game or board must use it, and a static test enforces this for registered reading routes and LearnFrame-selected boards. Hand-authored UI strings are covered by code review and W1's export string scan. Every inherited source (sentences, passages, ladders, words, picture words, the three moved banks, CHamoru reading items and the growth quiz's reading tracks) is anchored to the lead-owned baseline `tests/fixtures/reading-inherited-baseline.json`: editing a source and recomputing its pin fails unless the lead changes the baseline, and new content goes through detached admission instead. `mutation.mjs` covers these files (`bake-reading`, `registry`, the shared `morphology`), every clause of each new reading gate, the backstop's traversal (JSON array and object descent, export subdirectories, the JavaScript tree) and the tray scan's start offsets, and requires each mutation target to be unique. It also runs app-side mutants of the provenance checks (the inherited snapshot's digest check, copy, freeze and brand, and every reading consumer's check), the Sound Boat credit rule, the static import-graph backstop and the no-timer walk in a scratch copy of the app (`R1a app ...`), each against named Vitest cases whose unmutated selection must pass first. Details: `docs/READING_KIT.md`.

Node: `package.json` `engines.node` is `^22.18.0 || >=24.0.0`. Node 22.18 is the first Node 22 release that strips TypeScript types by default, which the reading validator's loader needs; Node 23 is left out because 23.0 to 23.5 lack default type stripping and 23 is not an LTS line. Supported LTS lines are Node 22 (22.18 or later) and Node 24; CI pins 22.22.3. On a Node without it the tools fail closed with the loader's error.

## Shipping evidence and bake

The lead supplies detached evidence per retained word/clue, keyed by record ID: `{prepared,reviews:[a,b],transcriptPaths:[actualA,actualB],lead,familySample}`. `lead` has `schemaVersion:1`, `fixture:false`, the canonical `reconciliationSha256`, actual `reviewer`, `startedAt`, `finishedAt` and one `{id,decision,reason}` per original row. `familySample` has `fixture:false`, the current `batchSha256`, `decision:'keep'`, actual `reviewer`, ISO `date` and an external evidence file path in `evidence` and its byte hash in `evidenceSha256` for the device sample. These describe real actions and must never be filled in by a fixture generator.

The bake rereads and hashes both transcript files and the family evidence file. Hash fields without those bytes cannot bake. It records those hashes only in the private receipt.

Only content kept by both reviewers and the lead can bake. A change, rejected item or genuine call requires resolution and fresh review of the changed record. An inline `status:'approved'` has no effect. Every content hash is recomputed. Family sampling remains required before shipping.

Set `LITTLE_ISLAND_WORD_POLICY_LOCK` to an operator-controlled external JSON file `{schemaVersion:1,policyFile,policySha256,scanListSha256}`. `policySha256` hashes the exact file bytes; `scanListSha256` is `digest([...policy.scan].sort())`. The policy requires nonempty scan/core/exact/lemmas/canaries and a nonempty sensitive-headword list for CHamoru. Canaries are private random nonsense terms generated with new queues. None of these hashes or lists belongs in Git. Bank input cannot select a different lock.

Every prepared batch binds the current scan-list hash and its own exact records. Bake checks each retained record against its original content hash, both verdicts and the lead decision. Separate batches can populate a larger bank. Dropping a rejected record does not edit any prepared batch or invalidate retained records, their transcripts or their family sample. A changed retained record or scan policy requires fresh review. The optional vocabulary hash records preparation context; it does not bind unrelated records into one review unit. Supply explicit `fixture:false` for real preparation and bake, or `fixture:true` for transport tests. Missing fixture flags are errors.

A private bank input has `{words,clues,surfaces,evidence,reviewBatches,canonicalTerms,policy,sourceDirectory,fixture:false}`. `sourceDirectory` points to verified pinned bytes. The Python membership check confirms the actual American answer and British variant membership; labelling a British answer `en-US` cannot bypass it. Supply the full pinned HåfaGPT entries for CHamoru. Use `reviewBatches:{batchId:evidenceBundle}` and `evidence:{recordId:"batchId"}` to store each batch once. Verification is cached only within the current bake; each record still needs matching content and keep decisions. Inline evidence remains supported for small inputs.

Record exact teaching spelling, source ID, `uses` restricted to word search/matching and `fluentReaderChecked:false`.

```sh
node scripts/words/cli.mjs bake "$PRIVATE/bank-input.json" "$PRIVATE/new-bake"
node scripts/words/cli.mjs guard dist "$PRIVATE/new-queues/safety-policy.private.json" "$PRIVATE/new-bake/receipt.private.json"
```

`bank.json` is an explicit runtime projection with no private policy, hashes or review state. Keep the receipt private. It records vocabulary and scan-list hashes, actual word/clue review IDs, rejected counts, scanned surfaces and the independent verifier's implementation hash/result. Only the lead integrates an admitted bank.

The single `content/words/registry.ts` loader exposes new banks through a statically generated, lazy require table. The checked table must exactly match `banks.manifest.json`; applications cannot import bank JSON directly. Regenerate the table with `registrySource(manifest)` from `scripts/words/registry.mjs` when integrating a bank. The unchanged inherited Word Rescue pack also passes through the registry; its frozen bytes cannot be extended to bypass review. Existing reading, Tide Pool and party data fragments are explicitly frozen in admission, without freezing unrelated code. No new content is approved by these inherited exceptions.

Normal `npm test` checks all `src/`, `content/`, `assets/` and `modules/` roots. TypeScript parses imports, re-exports, side effects, normalized paths and static template-literal require/import/require.resolve/require.context calls; computed dependency paths fail. Private tooling/draft imports fail. Symlinked app-content paths fail. Word/clue banks must be registered at `content/words/banks/<name>.json` in `content/words/banks.manifest.json` with `{path,sha256,bytes,words,clues,surfaces}`. CI verifies the committed byte hash, counts and closed runtime shape without private sources or review transcripts. Reserved bank paths, nested records, string arrays, clue arrays, literal arrays in word locations and text-list encodings fail outside the admitted bank directory. Do not encode bank data as app literals; the permitted bank directory contains JSON only. There are no W1 shipped banks today.

`npm run check:words` is the local full gate: it requires the private policy lock and matching bank inputs under `LITTLE_ISLAND_WORD_RECEIPTS`, rebakes each registered bank and compares the runtime digest. It does not change the manifest or approve a record.

`npm run check` ends with `check:words:export`. Every export guard performs full detached admission, so a matching manifest alone cannot ship a bank. CI runs `check:source`, then the export guard on actual `dist`, exposing the private policy only to that guard step. Locally it uses the external policy lock. CI can provision a gzip/base64 policy through the versioned `LITTLE_ISLAND_WORD_POLICY_V2_GZIP_BASE64` secret, mapped in the workflow onto the existing `LITTLE_ISLAND_WORD_POLICY_GZIP_BASE64` environment variable (optional `_V2_GZIP_BASE64_2` through `_V2_GZIP_BASE64_16` secrets continue the same gzip/base64 string in numeric order when it exceeds one secret; expose each required chunk only in the guard step; plain `LITTLE_ISLAND_WORD_POLICY_JSON` is also supported): the CLI writes mode-0600 external scratch files and removes them on exit. Before any bank exists, a policy-free structural export check reports `policyDataChecked:false`; the first registered bank requires the private policy and fails without it. Once banks exist, CI must be provisioned with detached review/source evidence via `LITTLE_ISLAND_WORD_RECEIPTS` and the pinned source paths referenced by those inputs. Missing evidence fails closed; manifest/hash checks alone are insufficient.

Before native delivery, run `npm run check:words:release -- <web-dist> <embedded-ios-directory> <new-private-receipt>`. The build must first produce a private compiler-capture receipt on the actual build host. Set `LITTLE_ISLAND_WORD_WEB_ARTIFACT`, `LITTLE_ISLAND_WORD_IOS_ARTIFACT`, a new `LITTLE_ISLAND_WORD_RELEASE_RECEIPT` path, and a new `LITTLE_ISLAND_WORD_NATIVE_COMPILER_RECEIPT` path. `npm run ios:preview-build -- <build command>` prepares the preview, runs the build through a recording compiler shim, validates admission while preview files remain in place, and restores the four default generated files in `finally`. The shim invokes the pinned `hermes-compiler` executable and records the hashes of its actual outputs. No observed matching invocation means no compiler receipt. The wrapper must run where compilation actually occurs; a remote build needs capture and admission on that host.

The release gate exports iOS JavaScript with `--no-bytecode --no-minify` and the same preview environment. It runs the full structural, normalized-content and density checks on that export, then compiles those exact hashed JS bytes with the captured compiler. Every shipped Hermes string-table entry, including identifiers, must exist in the compiler-derived table. Compiler-synthesized names and optimized string fragments therefore have a source-backed compiler view; no entries are skipped and no exceptions are introduced. The compiler package path, package version, executable hash and version output must match the native build capture, and any change during verification fails closed.

A schema-3 external receipt binds HEAD, policy bytes, both artifact trees, the native compiler capture, every scanned JS file hash, their aggregate digest and the compiler identity. Temporary exports and derived bytecode are removed on success or failure. `npm run check:words:receipt -- <private-receipt> <web-dist> <embedded-ios-directory>` verifies these bindings immediately before delivery. `deliver:web` and `deliver:ios` repeat admission and verification before invoking their delivery command. A dirty tree is accepted only for the four known preview-generated files, reproduced byte-for-byte in scratch. These checks do not build a native executable, sign, submit or publish an app and grant no new release authorization.

The guard keeps unconditional raw-byte checks for canaries, complete policy/list blobs, private hashes, filenames and symlinks. It checks Latin-1, UTF-8 and both UTF-16LE alignments, plus decoded strings, before accepting an artifact. Malformed JavaScript/JSON, unsupported Hermes bytecode and undecodable puzzle packs fail closed. These are build checks; they never approve vocabulary.

Blocked-word checks use Unicode letter/combining-mark boundaries. JavaScript is parsed with the pinned TypeScript parser: literals and templates supply word checks. Comments, regex patterns and homogeneous key tables also receive list-shaped partial-list checks; mixed UI keys remain advisory; variable names remain excluded. Regex patterns and unquoted property keys do not supply displayed-word checks; quoted keys are parsed as literals. Serialized Reanimated functions are parsed as code too. The [Hermes string-table format](https://github.com/facebook/hermes/blob/static_h/include/hermes/BCGen/HBC/BytecodeFileFormat.h) supplies each string's own length and encoding; v98 is supported, including overflow and UTF-16 strings. Identifiers remain in that table view because a displayed literal can share an identifier ID. Whole-word matching prevents longer identifier/style-key collisions and does not join adjacent storage entries. HTML checks visible text, accessible labels, metadata content, form values and both inline-script data views. SVG files and inline SVG literals expose visible labels and accessible text as separate strings; attribute lists and comments retain the partial-list check. The complete decoded vector remains in the unconditional hash/blob/canary view. Other printable UTF-8 files receive the same text checks, regardless of extension, including structured lists spanning CSV/TSV lines. Only content-sniffed binary media skips word checks. Generated Metro asset URIs and digest identifiers stay in the raw leak view, outside vocabulary checks. Binary media is scanned for private data rather than treated as displayed words.

The partial-list detector never accumulates terms across a file, bundle, sibling UI record or separate decoded row. Three distinct broad terms of at least five letters fail inside one list-shaped unit. Arrays contribute their plain-word entries even beside empty strings, counts, nulls and longer entries. Single-field record arrays, JSON-encoded lists, CSV, TSV, pipes, numbered lists and underscore-separated constants receive list checks. Nested containers are checked independently. Ordinary sentences require interleaved function words; a token array additionally needs at least 12 tokens, at least 25% function words, at least five content/function transitions and fewer than 20% broad hits among its content tokens. Prefix/suffix padding and repeated article affixes cannot establish prose.

Generated Library `terms` and `sounds` may trace to one source item. The exact catalog root must include `items`, `index`, `preview`, `bytes` and `fixtures`; a matching ID in a foreign feature is insufficient. Only the nearest directly attached item supplies provenance. The source bridge imports the exporting generator's `normalize`/`phonetic`, checks normalization parity and checks authored arrays as strict units before deriving tokens. Authored tags and aliases never exempt their own arrays. A mixed search array must still contain only tokens from that item’s authored fields. Only its body-derived tokens leave the list view; remaining metadata tokens stay strict. One unknown token keeps the whole original array strict. Legacy catalog tags that the existing generator uses to carry body paragraphs retain their body meaning. Another item's vocabulary, unattached/nested records, untraceable tokens or tokenizer drift retain strict rejection. Derived arrays never bypass hard literal checks. This is a derivation check, not a policy exception.

The public function-word vocabulary is disjoint from private broad/core lists; runtime subtraction also excludes every current private policy group so later policy changes cannot turn a blocked word into prose evidence. Core, exact and lemma terms still fail as whole words in displayed strings.

Broad matches in ordinary UI/prose are written to a mode-0600 `advisories.private.json` outside the repository and export, deduplicated by exact string hash, with the first artifact path and matched terms. Comments and code keys do not create advisories. Guard receipts contain only the advisory count and private path. Set `LITTLE_ISLAND_WORD_ADVISORY_DIR` to retain them with the private QA evidence; otherwise the guard uses an external temporary review directory. A passing build does not constitute content review.

Sensitive CHamoru headwords apply to statically tagged CHamoru surfaces and strings containing å or the modifier-letter glottal stop U+02BC. A typographic U+2019 apostrophe does not mark English contractions as CHamoru. Once a surface is CHamoru, sensitive matching folds accents and glottal marks consistently with the engine while preserving word boundaries. This repository scan found no raw ñ occurrences, so ñ is not a marker. Tags include `language`, `lang`, `locale`, `languages`, `ch-*`, `cha`, `chamoru` and `chamorro`. Source inspection resolves static constants, shorthand and spreads, rejects unresolved content-language tags and unknown spreads in tagged records, and scans every field of CHamoru teaching modules (including modules using `ChamoruWord`). Source, content and speech roots are inspected; English ASCII homographs remain allowed. Bundle scans require the exporting source companion. `checkExport`/`checkRelease` supply that exact source root; direct callers can pass `{sourceRoot}`.

Grids are case-insensitive, include CH/NG digraph cells, blank cells and rectangular row strings, and use all eight scan directions without word boundaries. Nested cell matrices count anywhere. Row-string matrices count under `cells`, `grid`, `board` or `rows`, or beneath a language declaration. Other flat word arrays retain strict list checks. A 1×1 single-letter matrix stays scanned but needs no declaration unless a puzzle discriminator identifies it. Digraphs, longer single-cell strings and every larger cell matrix still require a recognized container or language. Every puzzle grid must have a recognized container or a language declaration; a word-search/puzzle discriminator cannot hide a row-string grid under an unknown key. Unknown nested-grid containers without a language fail closed. Untagged recognized grids receive the sensitive-headword check as well as the normal grid check; explicitly English grids retain the English homograph rule. Numeric-only puzzle formats have no language surface. JavaScript literal grids receive the same word scan, with native grids covered by the independent iOS JavaScript export. Packs decode through the exporting tree's registered family adapters and `decodeRow`; unknown families, rules and encodings fail. Codec identifiers receive list checks while payload/speech values receive literal checks. No runtime codec or pack bytes change. An approved teaching allowance is separate: `chamoruTeachingAllowances:[{entryId,terms,reason}]` binds an exact entry ID and term string in `src/learn/content/chamoru.ts`. It applies only to that entry’s own teaching fields. Exported teaching records must match all approved source fields exactly. Other source modules, changed IDs/terms/fields, word banks, word-search generation, scramble and grids remain blocked. Hermes language-sensitive context comes from the source companion and mandatory native JavaScript export, because its deduplicated table cannot identify a teaching record’s field ownership.

Previously reviewed collisions may be narrowed in the **external** policy as:

```text
artifactStringExceptions: [{path, strings: [{sha256, occurrences, terms: [{term, check, reason, evidence}]}]}]
```

`sha256` binds the exact UTF-8 string, `occurrences` caps its count in one file, and paths are anchored (`*` matches within one segment). A changed string, an extra occurrence, another path or another term receives the full check. The reviewed 150-key library colour table uses the same exact unit hash and one occurrence per file on the two anchored paths `_expo/static/js/web/entry-*.js` and `_expo/static/js/ios/entry-*.js`; no other path or changed table is covered. Only broad terms are eligible; core, exact and lemma terms and `check:"literal"` are rejected. These rules never exempt grids, complete blobs, canaries, hashes or private filenames. A policy containing the legacy `artifactTermExceptions` field is rejected. Legacy whole-file hashes have no effect. Artifact exception metadata stays outside the content-policy digest, while the operator lock/release receipt bind the complete policy bytes. Updating artifact metadata therefore does not invalidate unchanged bank reviews.

Policy migration must use previously inspected W1 collision evidence and verified inherited artifacts. Do not whitelist a new failing export or count a real content hit as an encoding collision. Keep the new policy, context hashes, transport chunks and receipts outside Git/export; provision CI privately. The bounded decoder accepts at most 4 MiB after expansion. Whole-word matching requires policy authors to list every blocked inflection explicitly; there is no suffix fold. JavaScript comments, regexes and property keys receive leak checks but no literal word check; Hermes identifiers remain visible because they may share a literal string ID. A byte-identical string reused within its reviewed occurrence allowance is indistinguishable from the inherited string; Hermes also deduplicates its string table. Content admission and the separate reviews remain mandatory. `export-public.mjs` excludes this tooling and its tests. No guard result authorizes public export or publication.

## Surface rules and limits

Word searches are baked, all eight directions, exact one physical location per listed word, no mixed alphabets. The primary scanner uses a trie; `verify.py` independently searches complete rays with Python string search. Both fold Å/Ñ only for scanning. Display and answer matching preserve them and the glota. CH and NG are single cells. Exemption applies only inside an explicitly validated listed-answer path: it preserves legitimate words containing broad-list fragments, as in the audit. A crossing or filler hit still fails. Zero means no unexempt string on the current list; unlisted slang can still escape.

Crosswords validate every across/down run against reviewed answers; diagonals are not crossword answers. Scrambles scan both directions and preserve the answer's letters. Builder grids reject traceable core words (eight touching neighbors, no reused cell), reject straight broad-list hits and require listed answers to be traceable. Wheels reject core letter multisets. Python independently checks bent paths and wheel multisets as well as straight grid rays. Matching/crossword answers use reviewed membership; their receipts do not claim a diagonal filler scan. Ladders must form a connected component; population/size goals remain content acceptance after the actual read. Ladders accept any listed one-letter step. British variants are accepted only in the reviewed free-input list. All misses use the same neutral reply. Hints use only closed templates.

CHamoru answers also require the separate private sensitive-headword policy for matching as well as word search; a missing policy fails closed. Exact/lemma answer blocks are distinct from the overinclusive scan union. No substring answer filter. All four tiers share the family safety standard, and engine difficulty is independent of reader level. The clue linter flags answer disclosure, length, out-of-tier vocabulary, one-home assumptions, colonial framing, brands, reading pressure and local/faith sensitivities for review. It does not run short-text readability formulae or reject God as profanity.

## Fixture proof

```sh
node scripts/words/smoke.mjs "$CALIBRATION/clues.input.private.json" "$POLICY" "$NEW_FIXTURE_DIR"
node scripts/words/probe.mjs "$POLICY" "$NEW_SCAN_PROOF_DIR"
npx vitest run tests/word-pipeline.test.ts tests/word-pipeline-fixes.test.ts
node scripts/words/mutation.mjs
```

`smoke.mjs` labels every synthetic reviewer result, transcript and receipt TEST ONLY, sets `fixture:true`, and proves that it cannot ship. Its synthetic times/disagreement rate are transport assertions, not measured reviewer throughput. It never calls a reviewer. `probe.mjs` checks the actual 87-word policy probe and 32 unapproved scan-clean QA boards with both implementations. It does not reproduce the audit's 600,000-grid experiment. Real review/reconcile throughput remains unmeasured until the lead runs the calibration.

### Normalized density backstop and preview binding

Every exported text file also receives a structure-independent density pass over
its leniently decoded text, parsed/decoded strings (including each Hermes entry), and
the source-ordered decoded string sequence for JavaScript. Hermes entries are
scanned individually: the compiler deduplicates and reorders its string table,
so joining it creates artificial adjacency. Hermes proximity is enforced through
the bound iOS JavaScript export, not the string table. Binary media is content-sniffed and
keeps the raw blob/hash/canary checks. Text is NFKC-normalized, default-ignorable
characters are removed, case and diacritics are folded, and tokens split at every
non-letter and lower-to-upper camelCase boundary. Core/exact/lemma content checks use the same normalization and whole
word boundaries; they remain unconditional and cannot be excepted.

The broad leak vocabulary retains the existing minimum length of five letters
and exclusion of the CHamoru-sensitive-only group. Two moving windows count
**distinct** terms: a cap of **15 per 1,000 tokens** and **12 per 200 tokens**.
The cap passes; cap+1 fails. Repetition does not increase the count. There is no
density exception or Library-provenance bypass. The ten-snapshot calibration
records every real exported file and all its text views in the private worker
evidence. JavaScript views preserve source positions while decoding literals. The historical web matrix
peaks at 11 in the long window and 8 in the short window, leaving 36% and 50%
headroom there. The family preview previously peaked at 12/8: against caps 15/12, this leaves 3/4 additional terms (25%/50% above the measured peaks). Round-5 measurements for each build are recorded in the worker report. Earlier string-pool concatenations are
superseded by these source-order measurements.
The complete broad set, including short everyday words, reaches 42 in raw code;
the minimum length applies only to the broad detectors.

The long window guarantees detection of **16 qualifying distinct terms within
1,000 normalized letter tokens**; the short window guarantees **13 within 200**.
Neither guarantees an arbitrary five- or ten-term leak, padding beyond the window,
or an unrecognized runtime cipher. Synthetic five-, ten- and 25-term probes also
exercise structural rules for tuples, filenames, encoded JSON, regexes, record
maps, branch labels, enums and templates. New encoding units require at least
one quarter of their letter tokens to be broad vocabulary. Homogeneous record/object catalogs retain the measured 50% share to avoid treating UI metadata as word lists; sparse ordinary catalogs retain
the density check. Existing strict list units keep their original rule. Prose
requires interleaved function words and either content diversity or a finite verb.
Supplemental uppercase tile/row candidates receive hard core/exact/lemma scans;
existing declared puzzle grids retain their full scans and declaration rules.

Teaching entries require plain string literals in every field, including files
using the teaching type and the named JSON teaching sources. Unresolved or
computed fields and spreads fail closed. Tagged record keys are sensitive text.
NFD characters are recognized. A curly apostrophe marks CHamoru only inside a
word when its suffix is not an English contraction, or word-final after a letter
other than `s`; ordinary English contractions and plural possessives stay English.

The iOS preview wrapper validates **before restoring** the default generated
Library files. The gate regenerates the four known preview files to scratch for
byte equality, exports and scans iOS JavaScript, and compiles the exact scanned
bytes with the native build's captured compiler. Every Hermes entry must appear
in that compiler-derived table, with no skips. The receipt records compiler
identity and source hashes. Hermes still receives per-entry core/exact/lemma and
density checks. **Hermes proximity is enforced through the bound JavaScript
export, not the compiler's deduplicated and reordered string table.**

`CI=true` requires a nonempty, valid locked policy for `check:words:export`. Missing
or empty policy fails. Local policy-free export checks explicitly print
`policy not checked`; they do not establish private-policy acceptance.


## Generated-word admission and text decoding

`generated-admission.mjs` inventories speech maps/manifests, pictures, Library
search, admitted word banks and `scripts/puzzles/pipeline.ts`. A word puzzle
family must expose its decoded vocabulary and pass admission before staging any
pack. Word families with no exposed answers fail closed. Exported pack grids
retain the independent decoded-grid checks.

Vocabulary sources are admitted W1 banks, the byte-frozen legacy bank, the picture
allowlist, real Library input records, and app literals reachable through runtime
imports from the app entry. Expo Router routes seed that import graph. Unimported
`src` files, type-only imports, generated tables, import/require paths and map
property names supply no admission. All `src` content literals (including
unimported modules), speech JSON inputs and actual Library source records receive
core/exact, list-shape and density checks. Generated outputs are checked through
their exporting artifacts rather than used as authored sources.

Speech JSON files and generator literals cannot supply vocabulary for themselves
or other transcripts. A single-word or short word-like transcript must trace to
an admitted source; bare-word and `spell-<word>` keys must agree with it. Multiword
speech is authored prose and receives the normal source checks. Growth/Arcade
lines retain their stronger every-token derivation check. Validated speech IDs
supply only exact identifier provenance, never a vocabulary donation.

`published-speech.json` is a hash-only snapshot read from main commit
`0f428c2fef43a821bbea782823f7548b5d514971`, with its own pinned byte digest.
Per the lead's inherited-content decision, an otherwise untraced single-word
entry can use that frozen bank only if its source path, key and transcript match
the published pair exactly. New or changed entries still need authored sources.
The branch's speech files cannot extend the inherited bank. Receipts report the
masked inherited-entry count. This is inherited admission, not a policy exception.

Speech inputs are `scripts/learn/**/*.json`, the four named speech JSONs and the
literal `speech.update` maps in `generate-audio.py`. `library.json` is a retained
transcript input with no writer in this repository; its external producer remains
unidentified. Item speech bindings are validated by the Library pipeline.

The export guard creates detached admission receipts from its exact source
companion, including source paths/hashes and every traced vocabulary token in
map keys and asset basenames. Each normalized token matching a broad, core,
exact or lemma policy term must occur in `sources.words`; an exact whole-key
identifier match cannot satisfy that check. Other identifier tokens need no
vocabulary admission. Compound keys and stems use the same rule, including
prefixes, numeric suffixes, camelCase and normalized accents. Frozen inherited
single-word transcripts supply their verified vocabulary after all speech inputs
have been validated; their identifiers never supply component words. Generated
registry entries receive the same token check before artifact scanning.
Unknown tokens fail even when diluted across thousands of entries.
The receipts establish derivation, not family or distribution approval.

Binary classification validates media structure: PNG chunks/IHDR/CRC, complete
RIFF sizes/chunks, MP4/M4A boxes and `ftyp`, full ID3 headers, sfnt table ranges,
font container headers and Hermes tables. Other supported image/audio formats
also validate their container structure. A tag alone cannot skip text checks.
Text receives UTF-8 and Windows-1252/Latin-1 fallback, UTF-16 handling, ANSI
stripping and control cleanup. ZIP/gzip assets fail closed. Structural validation
does not establish media decoding quality or the safety of arbitrary metadata.

For preview IPA delivery, first run `npm run ios:preview-bundle-prep`, keep
`EXPO_PUBLIC_LIBRARY_PREVIEW=1` set for `npm run deliver:ios -- <command>`, then
run `npm run ios:restore-generated` after completion. The wrapper verifies fresh
preview JavaScript against embedded Hermes before any delivery command. A default
export does not validate a preview IPA. This worker does not authorize delivery.

### Reviewed source-unit collisions

A source list can contain ordinary authored words that also occur in the broad
scan policy. Review that complete unit instead of renaming content to avoid the
guard. The private policy accepts `sourceUnitExceptions`, an array of entries
with an exact repository-relative `path` under `src/` and a nonempty `units`
array. Each unit has `sha256` (SHA-256 of the exact source expression text),
`occurrences` (positive exact source count), and nonempty `terms`. Each term
requires `term`, `check: "broad"`, a specific `reason`, and review `evidence`.
Keep all real terms and unit hashes in private artifacts outside Git.

The operator must inspect the unit at the specified commit, verify each term's
review records, and update the locked policy bytes and policy hash. Core, exact,
and lemma terms cannot receive an exception, including normalized equivalents.
Every listed term must occur in the unit's broad finding, with no unreviewed
broad terms. Missing paths, edited text, changed counts, duplicate entries, and
unused entries fail closed. Remove obsolete exceptions when removing content.
These are collision annotations; they do not change bank content-policy hashes
or grant word, clue, grid, shipping, or family approval.

The guard checks the exact source unit first. Its full syntax and decoded literal
values then identify the corresponding JavaScript container in web and native
JavaScript exports, allowing formatting, quote, and trailing-comma changes. A
changed/reordered container or an extra copy receives the ordinary list check.
The occurrence limit applies independently to each export file. Hermes retains
its existing string-table checks and the release gate's companion native
JavaScript scan. Only that container's list finding is suppressed: strings,
other units, literals, density, grids, raw policy blobs/hashes, canaries, and
private filenames still get every check. The result reports
`sourceUnitExceptionsUsed` and `exportedSourceUnitExceptionsUsed` as matched
source/export container counts; no private terms are printed.

### Identifier provenance and opaque asset names

An exported identifier-map key can trace verbatim to one specific identifier
position in a repository source file that passes the source scan. Runtime
property and declaration names qualify. Map keys in the same shape as an export
map cannot donate provenance, and type declarations, ambient declarations,
type-only exports, displayed strings, comments and near matches are ineligible.
The generated Challenge registry receives its own source scan. A key containing
a normalized core, exact or lemma token must use ordinary vocabulary admission.
Keys with ordinary vocabulary admission use that path first. A map with at
least three distinct broad tokens among its identifier-traced keys
requires a `sourceUnitExceptions` binding for the exact source object and its
complete set of broad key tokens. The binding is checked against the full
exported object syntax, including function values. The result counts distinct
traced repository keys in `tracedIdentifiersUsed`. Identifier provenance
applies only to map keys and leaves the other artifact checks in force.

For third-party names the operator can supply private
`dependencyIdentifierProvenance` entries with `package`, exact `version`,
lockfile `integrity`, package-relative `path`, lowercase hexadecimal
`sha256` of the installed file bytes, verbatim `identifier`, source character
`offset` and a nonempty `reason`. Review each runtime property or export name in
the generated native/module map. The package's lockfile entry, installed
manifest, file bytes and exact identifier position must agree with the pin. The
source file must also pass the scan. Missing or symlinked files, changed bytes,
wrong positions, changed versions or integrity values, duplicate identifiers and
stale entries fail even if that export does not use the entry.
`dependencyIdentifiersUsed` reports distinct used entries; an intact
entry can legitimately be unused on another platform. There is no package-wide
allowance. Keep entries and their source evidence outside Git. This collision
metadata stays outside bank content-policy digests, while the operator lock
binds all policy bytes.

An opaque asset basename skips filename word checks only when its complete
extension-free name equals the MD5, SHA-1 or SHA-256 of its own bytes. Random hex,
wrong content hashes and renamed assets retain filename checks. The file's
contents still receive all ordinary checks.

Native export can also remove a puzzle pack's extension. Pack-shaped JSON
headers are detected from bytes and decoded through the exporting source's
registered codec before semantic scanning. Malformed or unknown codecs fail
closed. Decoded grids, literals and word admission retain the same checks as
named `.lipuzzle` files; raw private-byte and density checks still apply.

Run `LITTLE_ISLAND_WORD_POLICY_LOCK=<private-lock> npm run check:words:ios` to
validate Library inputs, regenerate the selected Library mode, export fresh iOS
JavaScript without bytecode/minification, and run the complete export guard. The
command requires a lock, reports `runtimeSeconds` and removes its temporary
export on success or failure. Restore default generated Library files after a
preview run. Measured runtimes and source commits belong in the external slice
report. This command does not establish Hermes, installed-device or family
acceptance; release retains its separate native compiler/bytecode binding gate.
