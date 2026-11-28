# Build 11 Wave 4: Word Hunt and Anagrams

Implementation base: `db4d0ef15df451e77b361099e22c34ac905cdcbf`, `program/4.0`. Draft integration only; public distribution and family-device acceptance remain separate gates.

## Product and scope

Kami asked for finger-traced word finding, and Leon approved Word Hunt and Anagrams. Both are offline activities for family solo play or two people sharing a device. They use the Game Hall and Everything shelves and the existing guarded activity-save path. Context: `docs/PRD.md`, `docs/QA.md`, the Wave 4 brief, and the Brain Dump portfolio audit dated 2026-11-26. That audit's historical release information is not treated as the current deployed build.

The visual direction follows the existing cream, honey wood and lagoon palette. A traced word gives immediate color and score feedback; successful finds settle into a short word ribbon. Invalid traces shake gently and duplicate words pulse. Reduced Motion keeps feedback still. The header uses the global atmosphere. Existing sound controls supply the word/finish chimes.

## Vocabulary and engines

The lazy lexicon reads explicit answers and prose fields from the eight inherited reading modules, the inherited Word Rescue pack through its admitted registry re-export, and Library catalog prose. It never traverses technical IDs, URL fields, speech keys, review metadata or object keys. No dictionary literal, dependency, policy exception or word-bank edit was added. The private policy file was not accessed.

This pinned shipping catalog contains 50 legacy Library entries and no authored Library items. Strict extraction yields **1,544** unique uppercase 3–8 letter words, rather than the approximately 2,300 in the planning estimate. The minimum acceptance requirement is 1,500. Changing which Library items ship may change the derived vocabulary.

A trie solves all eight directions without reusing tiles. Every returned 4×4 board has at least 25 answers and a five-letter answer; every 5×5 board has at least 45 answers. Seeded racks derive from a real six/seven-letter word and contain at least 12 answers. Generation refuses an uncertified board/rack. Both games share the scoring ladder and round state machine. Missed Word Hunt words retain canonical paths for interactive review.

A local benchmark of 40 uncached board solves (seeds 100–119 at both sizes, reversed after generation to avoid cache hits) measured 0.046 ms mean and 0.132 ms maximum; board generation maximum was 4.862 ms on this Mac. These figures do not establish performance on family hardware.

## Saves and privacy

Each activity has a bounded, strictly validated v1 session containing seed, exact letters, selected tile identities, rack ordering, two separate word sets, player, phase, remaining time, revision, round identity and personal best. New saves are additive. All 180 published save banks remain unchanged.

Rush lasts 80 seconds in Word Hunt and 60 seconds in Anagrams. Chill has no timer and optional hints. Pass & Play uses the same letters and a fresh timer for each player, with words and scores hidden behind the handoff card. The scorecard compares score, count, unique words and longest word. Restored running sessions open paused; backgrounding or leaving hides the board and pauses time. Rematches keep letters and use a new round identity; new games use a new seed. Restore epochs and revision guards reject stale callbacks.

## Acceptance ledger

Automated checks target `d3195ba920259f8377c8ec57e8a1cd51f281e30a`. Executor: implementation agent, isolated local browser storage. Affected flows only. Native touch, VoiceOver and physical family acceptance remain not run. The final browser evidence is bound to this source in `browser-results.json`.

| Case | Starting fixture and action | Expected visible and saved outcome | Status |
| --- | --- | --- | --- |
| W01 | Open Game Hall and Everything | Both illustrated entries open their activity routes | Passed |
| W02 | Fresh Word Hunt, trace diagonally, step back, release; repeat via taps | Exact letters follow finger; undo pops; score once; duplicates show Found | Passed |
| W03 | Chill, request hint; pause/reload/resume | Starting tile highlighted; board concealed while paused; exact progress restored | Passed |
| W04 | Finish Word Hunt; tap found/missed word; rematch | Summary/replay above fold; canonical ribbon path; exact same board with clean score | Passed |
| W05 | Seven-tile Anagrams, build/remove/shuffle/clear/enter; reload | Rack multiset enforced; words score once; saved progress resumes behind pause | Passed |
| W06 | Finish both Pass & Play turns | Private handoff; identical rack; fresh timer; correct winner and scorecard | Passed |
| W07 | Seeded engine/state/save tests and affected regressions | Richness, legality, scoring, clock, match, restore and immutable-save checks pass | Passed — 192 tests / 16 files |
| W08 | iOS/Android touch, VoiceOver, sound and physical family play | Comfortable tracing, audible feedback and accessible independent play | Not run; device acceptance required |

Screenshots and logs: sibling `little-island-games-artifacts/v4/b11-word-hunt/`. Browser coverage uses 320×667, 390×844 and 1280×800 with mouse, Chromium touch events and keyboard. Both board sizes and rack sizes passed. The six-tile Rush round also accepted and saved a word with the browser offline after initial loading; cold offline installation is not claimed. Browser dimensions do not establish native behavior.

The T3 browser snapshot tool timed out twice, so browser journeys use isolated bundled Chromium. Browser QA exposed and corrected React Native Web automatically enabling tap mode, disabled tile buttons swallowing mouse-down, and an ambiguous match summary that showed only the last player's score. Passive drag tiles, synchronous board-local coordinates and explicit web tap mode fix the input boundary. The earlier touch test failure is preserved as `before-touch-first-move-fix.png`. Both player scores and the match best word now appear in the finish summary. Round transitions scroll to the header so compact screens retain the finish/handoff actions. The original drag failure is preserved as `before-drag-button-fix.png`. The browser run reported no page errors. Optional practice before starts and rematches is covered by route-level component tests; its existing lesson UI was not re-audited. Task-owned browser processes and the static server are cleaned before handoff.

## Verification

- Expo Doctor: 21/21 passed.
- Save catalog: 180 immutable published banks passed.
- Advisory Impeccable scan: `[]` for the changed UI (not usability acceptance).
- TypeScript passed. Full repository lint passed with 0 errors and 274 existing warnings; changed-file lint passed without findings. The final affected Vitest sweep passed 192 tests across 16 files (`--maxWorkers=2`). Web export passed: offline shell `e75d7b4e6dfb`, 7,544 bundled resources. The local export word gate passed admission and guard checks with zero exceptions; the private policy was not supplied locally.
- The local export word gate explicitly reports `policyDataChecked: false` because the private policy is supplied in CI. A local structural pass does not claim private-policy approval. The draft PR's CI remains the private-policy check.
