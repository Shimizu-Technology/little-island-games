# Correction re-check — 2 November 2026

FINAL-01 and the FINAL-02 drawing correction are verified. No remaining required code or art correction was found in this narrow review. One required evidence follow-up remains from FINAL-02: refresh the versioned candidate snapshot. This report does not grant content promotion, family/audio acceptance or release acceptance.

Repository: `/Users/leonshimizu/.t3/worktrees/little-island-games/t3-309a23ae`; branch `feat/v31-library-content2`; HEAD `d2a86bc90167995c5068f6df3690f62194a1ed47`. The candidate is uncommitted. Snapshot read at 2026-11-02T22:36:49+10:00. Governing context: BRIEF.md, ../../COMMON.md, the two referenced RECONCILED.md files, docs/PRD.md and docs/QA.md. Little Island is an offline family app; new/reset learners must have both optional collections off, while existing learners migrate on without losing originals. Acceptance here is limited to those corrected paths, the literal art/alt match and the export guard. F01–F05 and the complete narrative review are inherited from RECHECK-FACTS/FINAL, not repeated.

## Verified corrections

**FINAL-01:** Store.tsx:436–438 now pre-migrates emptySave with `existingLearners: false` before restore. The payload is already v2; migrateLibrary's v2 identity return prevents restore's default existing-learner migration from enabling either collection. Reload also retains that v2 policy. The existing preservation path still awaits preserved persisted/live bytes before replacement; recovery also reaches that same preservation path. The regression at tests/library-store.test.tsx:199–208 calls actual Store startFresh, checks both collections off, checks the replaced stored save is preserved, unmounts/remounts and checks both remain off.

**Existing v1 import remains on:** restore at Store.tsx:408 still calls migrateLibrary with its default existing-learner behavior. The unchanged state.ts v1 branch clones profiles and enables faith/history for every existing learner, including a learner without an old Library profile. Lines418–419 preserve incoming v1 bytes and replaced persisted/live saves. Tests at :210–229 cover whitespace-bearing startup originals, saved/page state, preservation failure and v1 restore with both collections on. I inspected these tests; I did not run Vitest. The supplied final-fixes-tests.log records 22 Store tests passing, but contains no source hash, so it is supporting parent-run evidence rather than independent execution of this exact snapshot.

**FINAL-02 drawing:** I independently opened evidence/art-sheet-4.png with the image viewer. The war-survival panel is second row, **center**, despite the request's “right” locator. Both outer figures visibly sit on chairs, with horizontal thighs, bent knees and feet. The smaller listening child faces the older storyteller beside the open album. SVG inspection confirms separate seat/back/leg geometry and bent seated-body paths for both outer figures. The two small people inside the album remain standing; they are the memory scene, not the corrected seated pair. Their arms reach toward corn in a shared dish, matching a simple family corn-preparation picture. There is no battle, weapon, victory flag or frightening expression. This verifies the literal scene/pose, not a particular historical corn-processing technique or survivor identity.

The exact image alt remains “An older storyteller and a listening child sit beside an album with a simple picture of families preparing corn.” and equals artBrief.exactAlt. Actual SVG SHA-256 is `a087925d469ffa809ae76f74afc8cd86fa06cde6a41515dba56e2b9b4ff8d173`; it matches canonical items.json and content-pass-items.json. The full war records match between those sources. The opened sheet hash is `8fd3b055b0a8c74c50e498e4adbfd61b67cb9baf3f2cb8fa50fa42a4cc353ce8`.

## Export boundary and reviewed text

Production scripts/export-public.mjs is byte-identical to HEAD. The conditional at tests/export-public.test.ts:16–21 invokes the real exporter and requires both a `Privacy guard failed` exception and no destination. It does not disable, mock or sanitize the guard. Production scanFile still scans copied file bytes; exportPublic scans before publishing with rename and removes its staging directory on error. A different earlier error, such as stale audio, would fail this assertion rather than count as privacy success.

I executed production scanFile in memory against the actual war/And Also review metadata: both were rejected. Credential-file, email and token probes were also rejected. No export or temporary snapshot was created. The first stdin import attempt failed on the module's argv/realpath entrypoint check; correcting the probe's stdin argv allowed the real exported function to execute. No production code was changed. Full atomic export behavior was inspected, not independently executed. The private branch returns before the existing successful-export and synthetic-contamination checks, so those checks are **not exercised in this private tree**. That coverage limit is not a guard bypass.

Compared all146 live canonical records with the preserved v2 candidate. The only non-review-field change is war image.sha256; narrative, alt and artBrief fields are unchanged. scripts/learn/library.json, state.ts and the And Also manifest still match their prior final-review hashes. And Also's factualReviewer is now recorded in both canonical and book source records; its scope appends the completed edition/text/alt/rights review reference. No new edition review was needed. The older “await final” phrase remains in the scope history, followed by the completed-review statement.

## Remaining required evidence — CORR-01

The prior FINAL-02 explicitly required regenerated versioned candidate evidence. Only evidence/content-delta.json and content-delta-v2.json exist. V2 still records war image SHA `0737a9ab26e22675c180ae5af2137b6a7190de34e9507031097f4d80b4c4fcd1`, not the corrected `a087925d469ffa809ae76f74afc8cd86fa06cde6a41515dba56e2b9b4ff8d173`. Its historical file hash is unchanged. Preserve both historical freezes and add a new immutable final candidate snapshot reflecting the corrected image and final decision records; identify its hash in the parent report. The current live file hashes below/JSON identify what this reviewer checked, but the earlier v2 snapshot must not be described as the corrected final candidate.

At this read,113 records already have familyDecision.scope `reconciled recommendations`, although the request described recording them afterwards. No record is approved (135 in-review,11 draft), and no family decision has audioAccepted true. I did not alter or validate those decision hashes, run the decision tool, or infer audio acceptance. Parent gates, final decision recording as needed, full default/preview checks, listening and device acceptance remain outside this correction re-check.

## Hashes and execution boundary

Exact SHA-256 file-byte hashes for all inputs inspected in detail are in RECHECK-CORRECTIONS.json. Key implementation hashes:

| File | SHA-256 |
| --- | --- |
| `src/state/Store.tsx` | `4e1d81aaa87366cfc3499c6bdc1fa9b573807b6c0557c84ba8da5f258b3a855f` |
| `tests/library-store.test.tsx` | `b12fd47825d702d44cbdbd1aba95261858dc5322b3f364dda747e4fdb8776ca1` |
| `tests/export-public.test.ts` | `7417edd28c0aa584264245e69205acfce726d0d5026144661f0e371e52c325e2` |
| `scripts/export-public.mjs` | `d04a79a49ee98687135d42dab2ca4b41c665f5672fe13e59fe286470e130d4fe` |
| `content/library/items.json` | `1e2c1a4cfbfc3541f1f819119777a5142b9739113e997f0169293d99d845d194` |

No full check, lint, typecheck, Doctor, Vitest, web export, browser journey, native build, device test or audible review was executed by this reviewer. No source changes were made, so the implementation lint/typecheck gate remains with the parent. The only writes were this external report and its JSON. No servers, browser tabs, simulators, containers, agents or persistent resources were started, claimed or handed off; baseline/shared resources were untouched.
