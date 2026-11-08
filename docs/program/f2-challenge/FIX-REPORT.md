# F2 independent-review fixes

Branch: `p4/f2-challenge` (only remote branch to be pushed). Final implementation: `2da6bc9f4b3493738eef561ed40e6495c5dccf28`; core fixes `b05c5526`, strengthened fixture checks `2974a2a1`, and the hard-rating-at-floor correction `2da6bc9f`. Started from `origin/p4/f2-challenge` at `ff2801c6`, then merged `origin/program/4.0` at `49a9bbe8`; merge commit `972c3202`. Private remote verified. Work was done in the supplied isolated worktree using detached HEAD because the existing local `p4/f2-challenge` is checked out in another worktree; that other checkout was left untouched. No delegate, PR creation, integration merge, release, version/build or Apple/EAS action.

## Context and acceptance

Read FIX-BRIEF, COMMON, original BRIEF/REPORT, independent REVIEW, applicable canonical skills, repository contract, PRD, QA, save contract, assigned ledger rows and relevant PLAN/Play evidence. This is an offline family app. School Levels 1–5, saved shared boards, ownership and permanent facts must remain intact. No Challenge adapters ship yet. Acceptance is the four P1s and seven P2s, focused failing-before regressions, cheap P3 fixes, clean-clone gate, default/Library-preview gates, Doctor and web QA. FIX-QA.md records the affected journeys and coverage limits.

## Review disposition

| Finding | Change and verification |
| --- | --- |
| P1-1 | Missing registrations directory is an empty registration set. A clean pre-fix clone reproduces ENOENT; exported-tree regression and clean-clone gate verify the fix. Committed-ID removal still fails. |
| P1-2, P2-5 | Construct the selected attempt first, then one guarded `challengeSave` operation replaces the named session atomically. No discard/epoch/remount gap. Failed storage or adapter start leaves the old accepted attempt and original bytes intact. Removed rows fold with the boundary; preservation copy is diagnostic only and child copy makes no recovery promise. |
| P1-3 | Every face answer dismisses that round's card. The rating survives subsequent finishes until the next third-finish face opportunity. Just right/Too hard cannot reveal another card on the same round. |
| P1-4 | Credit removes the session from paused storage atomically, retaining permanent facts. Legacy credited rows don't count toward the cap and leave on the next start. Eight genuinely unfinished games show Continue, Settings export and explicit one-slot replacement. Tests finish nine independent registered engines and exercise the full-slot frame. SAVE_CONTRACT revision 3 documents the authorized correction. |
| P2-1 | Blind/Own Read launch options derive from the selected dare. Separate switches are removed. Real frame tests verify both options. |
| P2-2 | Each A/B award declares `{rule, help}`. Replay enforces the named help/Together policy; Pick Up objectives include award rules. Tests cover allowed Pick Up, Two Ways and cost for helped solo and Together; independent-only restrictions remain. No shipped bank existed to migrate. |
| P2-3 | Both invitations and bridges require the saved School owner and solo mode. Foreign/Together frame regressions cover the formerly dead controls. |
| P2-4 | Validated `settings.learningBridges` remembers bridge choice/dismissal per learner/game, including Family, independently of per-round signals. Learner removal cleans its rows. Tests cover Family/personal dismissal and reload after another finish. |
| P2-6 | The live frame holds its just-finished result locally; opening again shows the picker. Another puzzle has Start directly, with no false saved/Continue/replacement requirement. Real Store/frame regression covers finish, replay and reopen. |
| P2-7 | Restored the existing recorded School harder invitation's Hear action using `learning-try-level-N`. New face/bridge narration is assigned explicitly to **K1-SPEECH**, with exact proposed lines and generation/offline-listening acceptance in CHALLENGE_CORE.md. This uses the review's named-row option. Audio regeneration is lead-only under COMMON.md; no incomplete live manifest, audio registry or recording is committed. |
| P3-1 | Recorded the limitation explicitly: `taps` is a declared navigation budget, not measured path traversal. Route/shelf/file checks remain real. Deriving a new cross-door navigation model is left to the lead's FND-13 integration, rather than claiming the existing number proves interaction. |
| P3-2, P3-3 | Invalid Arcade terminal has a real map exit and no inert Retry. The screen uses the tested `terminalBelongs` validator. Updated screen regression verifies no invalid credit and successful next valid result. |
| P3-4 | Index-based scroll applies only to ownLevels/nativeStages or actual archived growth state. |
| P3-5 | Remembered tier/path also checks the game ID. |
| P3-6 | No gentler invitation at School Level 1 or the frame's lowest available tier. |
| P3-7 | Registry history checking runs only in its repository root; source exports without .git still validate current ledgers/files. In-repo append-only history remains enforced. |
| P3-8 | Per-dispatch tokens prevent older draft finally handlers from unlocking a later terminal save. A blocked draft/boundary regression verifies this. |
| P3-9 | Optional signals are omitted if they exceed person/envelope limits. School's final admission can drop only the new optional signal/practice update after reward calculation. Near-limit regression validates finish and original optional state at 1,999,995 bytes. |
| P3-10 | School working-set guards use the learning owner; Challenge uses the selected Challenge/Cove owner. |
| P3-11 | Removed 18,600+ lines of logs/images from the product tree. Exact originals remain in the sibling artifacts folder under `original-committed-evidence/`. Historical REPORT includes the new location. |

All P1/P2 issues are addressed, with P2-7's new narration explicitly assigned to named integration acceptance as the review permits. P3-1 remains a documented measurement limitation; no other P3 is skipped.

## Verification

Executor: agent. Node 22.22.3 and default PATH. Shipping catalog remains 28 School games / zero Challenge adapters. No paused School round is replaced by Challenge. No marks, completion facts or existing audio assets are removed.

Failing-before evidence: `registry-clean-clone-before.log` reproduces P1-1 on clean merged-base source; `review-regressions-before-final.log` records 21 failing regressions and three unaffected passing cases, including the near-limit case. These run against the pre-fix merged base, with final regression files copied in. `floor-rating-before.log` and `floor-rating-after.log` separately retain the adjacent hard-rating-at-floor failure and fix. Original independent-review evidence remains preserved.

Final checks and web results are appended below after completion. An earlier worktree check was invalidated by an accidental dependency reinstall during the run; it is not acceptance evidence. Clean-clone final results supersede it. The temporary proposed live speech manifest was removed after it correctly failed the complete voice-bank check; the lead-only narration work is captured as K1-SPEECH.

## Limits and integration

No simulator is named in this worker brief. Existing iPhone 16/17 Pro simulators are borrowed and untouched. Native iOS 18.5/26.5, physical iPhone/iPad performance and family acceptance are not run. The private engine adapters establish framework behavior, not acceptance of future shipped banks. K1-SPEECH generation/listening remains explicit integration work; the current School recording action is restored and tested. Public release remains separately gated. The lead had already opened PR #30 against program/4.0; the authorized branch push updates that existing PR. This worker creates no PR and performs no integration merge. Final independent re-review belongs to the lead.

Speech lines added to the live manifest: 0. Eight proposed lines are retained as `f2-challenge-speech-proposal.json` beside this report for the lead to install with complete generated banks.

## Final automated acceptance

Both complete gates passed on final implementation `2da6bc9f4b3493738eef561ed40e6495c5dccf28`:

- Clean clone `/tmp/f2-clean-01a1bbd5`, fresh `npm ci`, default mode: `LITTLE_ISLAND_SLOW_QA=1 LITTLE_ISLAND_SLOW_HOST=1 npm run check` exited 0. Registry/history, typecheck, lint, 2,613 passing tests, two existing opt-in hull-audit skips, and offline export passed. 219 test files passed / one skipped. Shell `7aa3267d05bd`, 6,507 bundled resources. Log: `fix-clean-final-default-check.log`.
- Library preview: `EXPO_PUBLIC_LIBRARY_PREVIEW=1 LITTLE_ISLAND_SLOW_QA=1 LITTLE_ISLAND_SLOW_HOST=1 npm run check` exited 0 with the same test totals. Shell `22cea2db0e41`, 11,064 bundled resources. Log: `fix-final-preview-check.log`.
- Both lint runs: zero errors, 42 repository warnings. `npm run doctor`: 21/21, exit 0, default PATH (`fix-doctor.log`). Advisory Impeccable scan: `[]` (`fix-impeccable.json`).
- Default generated Library files restored after preview: `preview: false`, zero authored items. `git diff --check` passed.

The two opt-in hull-raster tests require a separate output setting and are unrelated to this slice. Native/family and K1-SPEECH acceptance remain as stated above; no approval is inferred from these automated results.

## Final web acceptance and cleanup

Nine of nine affected-flow web cases passed through the T3 shared browser at CSS 320×667 and 1024×768. `fix-web-qa.json` records each case, fixture, saved outcome and screenshot. Three Quick Practice rounds were played through actual answer/Next/Finish controls. Hear fetched the existing `learning-try-level-2` audio with HTTP 200. Stay here survived reload. Just right and Too hard consumed their cards and saved ratings/dismissal without another invitation. Family's bridge worked without signals. Personal bridge dismissal survived another actual four-creation Letter round, saved completion/two stars, and reload. Together showed no personal controls. Zero-star World 6 level 8 opened its real start screen. Phone/tablet Thinking shelves showed registered Levels and no unfinished originals; frames were inspected.

Initial web cases used default shell d8e08a92234d; final reload, Together, high-world and tablet cases used final shell 7aa3267d05bd. Two 404 requests occurred while exports were unavailable or rewriting the served folder. The affected reload was invalidated and repeated successfully after export completion. They are retained in evidence, not counted as passed application requests. No other browser console error was recorded. This is affected-flow web QA, not the full native/release matrix or a repeat of unchanged classic-game acceptance.

The owned T3 tab was closed and its lifecycle record released. The exact owned server PID 29652 was stopped; its process exited 0. Lifecycle status for session 01a1bbd5-5423-7c20-b640-8fd047df4a79 reports no active owned resources. Task-owned temporary clones, dependency trees, dist and Metro cache were removed. No runtime handoff remains. Borrowed simulators and protected/shared services were untouched. The supplied clean source worktree remains for the lead.

Delivery is the implementation plus this report/QA record on p4/f2-challenge; only that remote branch is pushed. Existing PR: https://github.com/Shimizu-Technology/little-island-games/pull/30. Independent final re-review and integration remain lead-owned.
