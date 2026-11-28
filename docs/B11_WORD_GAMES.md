# Build 11 Wave 4: Word Hunt and Anagrams

Base: `db4d0ef15df451e77b361099e22c34ac905cdcbf`, `program/4.0`. R1 implementation: `b3b5f797`; final vocabulary correction: `c60dcaab`. Draft integration only; public distribution and physical family-device acceptance remain separate gates.

## Product and architecture

Kami asked for finger-traced word finding, and Leon approved Word Hunt and Anagrams. Both games run offline for solo play or two people sharing a device. Context: `docs/PRD.md`, `docs/QA.md`, the Wave 4 brief and the independent R1 report. The cream, honey wood and lagoon palette, global atmosphere, sound controls and Reduced Motion behavior follow the app's existing conventions.

Game Hall and Everything show two prominent illustrated cards that open `/word-games?game=word-hunt|anagrams`. The dedicated route disables its parent ScrollView during tracing. `src/app/activity.tsx`, `src/state/activities.ts`, `src/learn/home.ts` and `src/state/profiles.ts` match the original base exactly, preserving the five-activity and eleven-classic-game rosters. Reading routes cannot reach the timer hook; clock advancement is separate from the pure model and validator.

## Vocabulary and engines

The lazy lexicon extracts only human-facing prose from the Library catalog, inherited Word Rescue pack through its admitted registry, growth discovery/number lessons, science tasks and Float or Sink experiments. It excludes answer choices, spelling distractors, affix glosses, abbreviated weekday chart labels, technical IDs, URLs and object keys. It does not import restricted reading snapshots. No dictionary literal, dependency, policy exception or word-bank edit was added. The private policy file was not accessed.

The pinned catalog yields **1,486** unique uppercase 3–8 letter words, meeting the revised 1,400-word requirement. Tests exclude `BLEU`, `ING`, `FUL`, `PRE`, `TELE`, `GEO` and `BIO`. Changing the catalog may change the vocabulary.

A trie solves all eight directions without reusing tiles. Every returned 4×4 board has at least 25 answers and a five-letter answer; every 5×5 board has at least 45 answers. Seeded six/seven-letter racks contain at least 12 answers and reject every valid full-length starting arrangement. Both games share scoring and round transitions. Missed Word Hunt words retain canonical paths.

## Saves and privacy

Optional `save.wordGames` contains a strictly validated v1 `people` map. Each learner owns separate slots containing exact letters, selections, rack order, both word sets, player, phase, remaining time, revision, round identity and personal best. Owner, epoch, identity and revision guards reject stale writes. Removing a learner removes only that learner's slots. Older saves omit the field. All 180 published save banks remain unchanged.

Rush lasts 80 seconds in Word Hunt and 60 seconds in Anagrams. Chill has no timer and optional hints. Pass & Play hides scores and words behind a handoff card, then gives Player 2 the same letters and a fresh timer. Restored running sessions open paused. Pause, backgrounding and unmount preserve fractional seconds. Rematches retain letters with a new identity and clean scores; new games use a new seed.

## R1 corrections

| Finding | Final behavior |
| --- | --- |
| R1-01 | Restricted-reading imports removed; provenance tests untouched and passing |
| R1-02 | Parent scrolling locked during drag and reset on release, cancel, pause, preview replacement and unmount |
| R1-03 | Only approved prose fields extracted; reported distractor and affix fragments absent |
| R1-04 | Selected size alone uses primary coral and selected accessibility state; answer wrapping uses active round size |
| R1-05 | Storybook icons use the neighboring tiles' rounded, clipped border frame |
| R1-06 | Trail paints below crisp letters; racks reject all full-word permutations; pause/unmount flush fractional seconds |

The subsequent CI steer is implemented through the dedicated route, optional save namespace and independent shelf cards. No protected test was edited.

## R1 acceptance ledger

Executor: implementation agent. Affected flows in isolated Chromium storage, using the exported web build. Evidence: `little-island-games-artifacts/v4/b11-word-hunt/r1/`. The initial implementation screenshots and `REVIEW-R1.md` remain in the parent folder. Browser results identify the working source and final code commit; screenshots do not establish native acceptance.

| Case | Action and expected result | Result |
| --- | --- | --- |
| RQA-01 | Open Game Hall and Everything; select new illustrated card and reach dedicated route | Passed |
| RQA-02 | Trace diagonally, step back and release; repeat via taps | Passed: exact path, one score, duplicate feedback, crisp foreground letters |
| RQA-03 | Hint, pause, reload and resume | Passed: starting tile shown, concealed paused board, exact saved progress |
| RQA-04 | Finish, inspect missed path and rematch; repeat on 5×5 with touch input | Passed: visible replay, canonical path, exact same board; compact 320×667 finish |
| RQA-05 | Seven-tile submit/remove/shuffle/clear/reload; keyboard six-tile play | Passed: multiset enforced, saved word retained, keyboard toggle and Rush clock |
| RQA-06 | Complete both players, inspect handoff and scorecard | Passed: private handoff, same rack, fresh timer, correct winner |
| RQA-07 | Choose six tiles after a seven-tile finish, then rematch | Passed: seven-tile round retained, answer/rack wrapping agree on phone |
| RQA-08 | Disable network after loading and submit a valid rack word | Passed: local lexicon, scoring and save; cold offline installation not claimed |
| RQA-09 | Physical iOS/Android tracing, VoiceOver, audible feedback and family play | Not run; device acceptance required |

Browser dimensions: 320×667, 390×844 and 1280×800. Inputs: mouse, Chromium touch events and keyboard. No page errors. The T3 snapshot tool timed out twice, so isolated Chromium supplied the browser evidence. Two R1 browser probes needed harness corrections: phone wrapping was initially asserted at desktop width, and a Back selector matched both header and finish controls. Corrected probes passed; failed probe logs are retained.

## Automated verification

- Affected Vitest sweep: **388 tests / 23 files**, including all six previously failing files, reading runtime provenance, native module loading, activity/entry and save tests (`--maxWorkers=2`). Final focused interaction suite: **27 tests**. After excluding chart labels, the exact eight-file CI-regression command passed again: **135 tests / 8 files**.
- TypeScript passed; final source recheck recorded in the R1 logs. Lint: **0 errors, 274 existing warnings**. Advisory Impeccable scan: `[]`.
- Save catalog: **180 immutable published banks passed**.
- Export: offline shell `a20209dffce0`, 7,544 resources. The final export word-policy gate passed admission and guard checks with zero exceptions; its result is recorded with the R1 artifacts. Local export has no private policy, so its structural result does not claim private-policy approval; CI supplies that policy.
- Task-owned browser processes, tab and static server are cleaned before handoff. Native release acceptance and final-head CI/re-review remain separate from these local checks.
