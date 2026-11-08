# F1 save contract — implementation and lead handoff

8 November 2026. Private offline Little Island family app; no public release, Apple/EAS action, version/build bump, PR or integration merge. The production puzzle catalog remains empty, so this slice adds no child-facing game or picker.

Branch: `p4/f1-save`, created from `origin/program/4.0` at `0f428c2fef43a821bbea782823f7548b5d514971`. Repository: `https://github.com/Shimizu-Technology/little-island-games.git`. Worktree: `/Users/leonshimizu/.t3/worktrees/little-island-games/t3-b469ba4e`. Final implementation commit: `c540c7ea8ba56ab72683d4edb281daa09ea862ed`. This report's later documentation commit contains no runtime changes.

Source context: slice BRIEF and v4 COMMON in full; v3 master-plan PLAN §§4,5,8,9,10,15,16 and the FND ledger rows; play-spec Part 2; classics engine storage report; review R2/R5; repository AGENTS, PRD, QA and PROFILE_SAVES. Canonical project, Brain Dump, QA, lifecycle and writing guidance read. Brain Dump search supplied no newer relevant product decision. Expo is SDK 57; SQLite changes were checked against `https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/` and the installed module types. I did all implementation and testing myself, without delegates. Independent integration review belongs to the lead.

## Changes and row status

| Row | Implementation and source evidence | Remaining acceptance |
| --- | --- | --- |
| PF frozen saves | First commit `042b02e8`: immutable source-generated envelope 2 and v1 backup, Family plus four named learners, all 28 School games at Level 4, six classics, five boards, five activities per owner, Arcade constructor vectors, and 1,981,062-byte valid legacy save. Producer, hashes and source receipt committed under `tests/fixtures/save-v3/`. | Synthetic saves from shipped game source, not extraction of private device data or proof of the signed preview's Library. |
| FND-01 | One pure migration to envelope 3 / profiles 2, required learner Challenge records, Cove namespace and draft generation. Input validated first; old slots and originals retained; repeated settled load writes nothing. No forced version-2 writer. | Lead integration review; installed native update and actual screen-level resume remain separate. |
| FND-02 | Canonical sparse 3-bit completion, separate 2-bit A/B awards, registered permanent dare bitmap, immutable catalog ordinals, bounded working sets and 8 paused learner slots. Seven-state joins and award combinations, numeric eviction and malformed input tested. | F2 must register exact engine codecs/descriptors before new Challenge content can load. |
| FND-03 | Small durable row per owner/game; exact envelope base, ordinal, owner, epoch and revision guards. Boundary/export folding and restore generation replacement. SQLite transaction and web quota/interruption tests pass. | Physical kill-at-move and action-to-durable-write timing on the oldest iPad **not run**. This row is not fully accepted. |
| FND-04 | Preservation/write/post-write-publication interruption tests; no early Together award or duplicate credit; stale callback/switch/restore/discard guards. Archived original Store rejects/preserves v3 and restores its own Previous v2 save. PROFILE_SAVES rewritten. | Native Files, real low-disk and installed rollback acceptance **not run**. |
| FND-05 | Up to four Cove-only names and records outside the unchanged five-learner cap. No School, house, locker or Library allocation. Deletion is isolated and epoch guarded. | G1 owns the future Cove picker; no new picker is introduced here. |
| FND-15 / R2 | State/award/Together tables frozen in `docs/SAVE_CONTRACT.md` before runtime implementation. Portable packed checkpoints, 625-cell drafts, 1,200 edits, 512-delta ring, full digit notes, 1,024 table deltas and 200-piece storage tested. Never silently remove audit events or the draft. | **Material contract conflict remains:** 4,096 bytes cannot hold exact undo for 512 arbitrary 625-cell strokes. Current proof covers fixed-width deltas, not that stronger promise. Exact Solitaire/Jigsaw and other new engine reachability/replay proofs require their adapters. Do not mark the full row accepted. |
| FND-16 / R5 | Actual production storage primitives and whole-save validator measured with 62,647 entries, five learners including Family, four adults, full-size session allocations, 80 Library drawings, existing real Home data and 999,900 Library bytes. Near-limit admission safely refuses extra dense progress. No cap increase. | Future Home container/undo formats do not exist on the base and belong to H3/H5; repeat sizing when they land. Native transport and device timing are unverified. This is a measured storage-layout proof, not full FND-16 acceptance. |

The frozen Cargo constructor is an engine vector, not a supported paused physics session. Existing saved Arcade rounds are Reef sessions.

The exact engine registration seam requires validation, recomputation of terminal truth, a legitimate initial state and proof that newer drafts extend earlier assistance/audit evidence. Generic checkpoint validation does not certify results. Real-time Arcade physics codecs are rejected even if a registration attempts to declare them persistable. F2's runtime terminal-receipt path remains its responsibility.

The only file outside state/docs/tests is the existing Settings backup handler: it now calls `store.backup()` so export drains and folds rows before sharing. Labels and child-facing navigation are unchanged. No speech lines or generated registries were added. Library generated files must remain in default mode.

## Capacity

See `SIZE.json` for reproducible bytes and caveats. Learner Challenge: 100,579 bytes with eight 4,096-byte sessions; Cove person including name: 69,632 bytes with four such sessions. Five learner Challenge records: 502,895 bytes. Four adult records: 278,528 bytes. Whole fixture: **1,896,524 bytes**, leaving **103,476 bytes** under 2,000,000. Library: 999,900 bytes. The migrated near-limit legacy save is 1,985,398 bytes; adding one dense Challenge record produces 2,085,138 bytes and is rejected.

These use test-only structural codecs with the actual production encoding and validation path. Padding reserves every paused session's full allocation; it is not a claimed playable puzzle. No claim is made that every legacy maximum, future Home maximum and every new maximum fit together. The supported boundary remains 2,000,000 bytes and Library 1,000,000. On failure: keep accepted data and exact originals, export, then explicitly finish/replace a chosen paused game or manage a person. Nothing is pruned automatically.

## Verification

The numbered source/device scenario ledger is in `QA.md`.

**Final gates passed on `c540c7ea`: default and `EXPO_PUBLIC_LIBRARY_PREVIEW=1`, each with `LITTLE_ISLAND_SLOW_QA=1 LITTLE_ISLAND_SLOW_HOST=1 npm run check`: typecheck, lint (zero errors), 2,405 tests in 199 files, and offline web export. Doctor passed 21/21 with the default PATH. Default shell `88032002a7f2` / 6,480 resources; preview shell `435b554be5ba` / 11,037 resources. `npm run ios:restore-generated` restored the committed default Library (0 authored items, 50 index entries), and Git verified no generated-file diff. See `GATES.json` and the committed check/Doctor transcripts.** Automated Store/adapter tests use controlled local memory, actual Node SQLite SQL transactions and a localStorage quota fixture. They establish those contracts, not Expo native transport, OS-kill timing, physical Files, iPhone/iPad interaction or family acceptance. No simulator was assigned by this slice, booted or driven.

The archived original `0f428c2f` Store rollback test passed: unsupported envelope 3 stays byte-for-byte active and in preservation; Start fresh preserves it; restore recovers the exact pre-update v2 profiles, homes and Library. Rehearsal source and execution log are in the external slice folder.

Initial regression failures retained: version-2-only expectations and generation-token equality assumptions; they were updated to enforce v3, canonical export and a fresh restore generation while preserving all game content assertions. The first full gate failed only the obsolete `version:3` future-version assertion (2,401 other tests passed); it now uses version 4. A pre-final run was superseded after source review extended the real-time physics block to Cargo; that run was stopped through its exact lifecycle-owned process tree. Adapter test scaffolding initially awaited the asynchronous hoist incorrectly; the actual SQL tests pass after correcting the fixture. The Cargo registration defect was reproduced with the new regression test against archived pre-fix commit `32feb1e9` (expected throw was missing), then passed on `c540c7ea`. The failing and fixed logs are retained. No production defect was hidden by loosening a validator.

## Lead start here

1. Verify this branch/head and clean status; review `docs/SAVE_CONTRACT.md`, state modules, the save tests and frozen receipts. Run the full gate on the integrated branch in both Library modes.
2. F2 registers exact codecs and immutable catalog entries before hydration. Do not register a checkpoint adapter until it proves its engine-specific initial/extension/result rules and supported audit/undo capacity.
3. Resolve the arbitrary-stroke undo allocation before claiming FND-15 complete. Re-measure after actual Solitaire/Jigsaw, Home storage/undo and custom puzzle formats land. Execute physical durability, Files, low-disk and installed update/rollback checks. Source checks do not close those rows.

Only the lead integrates into `program/4.0`; no save-writing code from this branch may reach `main`. No PR was created. No external messages were sent.

## Cleanup

Lifecycle session `01a1bac4-dfcc-7960-b477-40a24286fbdd`. Borrowed baseline simulators/services remain untouched. Both final gates and all test/export processes exited. Lifecycle cleanup/status reports no active owned resources. Task-owned `node_modules`, `dist`, `.expo` and the two temporary source archives were removed after verification; source, frozen fixtures, backups and QA evidence remain. Shared caches and borrowed services/devices were not cleaned. No server/browser/device resource is handed off or has unresolved ownership. Preserve this branch/worktree for the lead; it is held integration work, not a merged disposable checkout.
