# Family ease improvement — 21 October 2026

Baseline main5686c1e, clean and equal origin/main. User wants all three outcomes from the October20 review: independent child play, more fun/polish and more accessible learning/discovery. Sources: PRD, QUALITY_QA, TESTFLIGHT and sibling artifact reviews/2026-10-20-product-review-5686c1e.md. Eleven offline games, fifty narrated topics and five labs for a seven-year-old and family; no accounts/backend/public release. Latest recorded beta1.2.0(7); this implementation is not a new TestFlight delivery.

Scope: compact Home with game favorites and alone/together browsing, shared failed-save retry, parent-accessible preserved saves, optional first crew-job guidance, and earlier hands-on Explore entry points. Preserve all games, validated legacy saves, secret-role concealment, settings, narration/transcripts, progress/search/scroll context. No new dependencies, networking, game rules, data deletion or public release. Still feedback confirms selected favorites/guide steps; no new decorative motion or input delay.

Root feat/family-ease owns Home, state, recovery and integration. Independently isolated children own ExploreScreen only and Mystery first-job guidance only; root executes combined runtime QA. Branch protection API403 private-plan limitation; Validate/check+Doctor and completed independent final-code review remain gates. CodeRabbit advisory; unavailable review is not approval.

Agent-executed affected-flow acceptance on fresh owned fixtures:

- F01 Phone/tablet Home: all11 games available; alone excludes SecretWord, together excludes Dash; favorite add/remove opens no game, survives restart and transfer; ongoing resume preserved.
- F02 Save-write failure in Explore: active-screen error/retry visible; retry writes latest favorite/lab state; reload proves saved result.
- F03 Parent recovery: wrong valid backup replacement preserves A; Previous saves lists/inspects A; cancel retains B; restore A preserves B and reloads exact chosen save. Invalid copy can export, cannot restore; read/storage failure is recoverable without deleting originals.
- F04 Picnic fresh solo Crew: Garden cue→actual travel→three beds→completion feedback→next exploration; later progress/nearby/mischief never receive misleading first-job cues. Existing jobs/roles/actions still reachable.
- F05 Explore map activity entries and topic activity action reachable; all5 labs open; Sun narration/transcript/favorite/related/back and exact lab/search/scroll context retained.
- F06 Native phone/tablet affected Home/Settings/recovery/Explore/Picnic layouts and saved outcomes; larger text/rotation; physical touch/audio/VoiceOver/enjoyment remain operator dimensions, not agent claims.
- F07 Full check/Doctor, Impeccable advisory, independent final-code review, final-head CI and merge verification. Update this ledger with exact commits/evidence and outstanding dimensions before readiness.

Lifecycle01a15936-df12-7ed3-bd7a-6c43e9cdcb4f baseline shared Hafa Core simulator/protected services; no owned runtimes at start. Claim and clean only owned delta. Native distribution is separate from source merge.

## Execution record

Final application source e3af4ff. Root/child implementation commits5d64a64, dc6d0c5, ca10286; independent round1 found replay could narrow All to the last word's category. Fixe3af4ff stores the selected pack separately and uses All for legacy saves; final independent review covered the whole change and this fix with no unresolved material findings. CodeRabbit reports Free-plan summaries rather than code reviews; its skipped/draft status is not approval. This completed independent review is the advisory-unavailable fallback.

Agent-owned incognito web fixtures at localhost43821,393×852 phone and768×1024 tablet. Native Release generated from the same source, Xcode26.6/SDK26.5, deployed to iOS18.5 iPhone16Pro30780651 and iPadmini81B6CFCF. No Metro was running. Native JS SHA2564233c867e363d839659e6ea9bbbabda75b1633d70a8747936c0028b1aa24e2dd. Original simulator databases were backed up before isolated fixture preparation; original rows remain preserved. No physical family data or devices were used.

| Case | Executed result and limits | Status |
| --- | --- | --- |
| F01 | Web all11 choices; alone10 excludes SecretWord, together10 excludes Dash. Memory favorite add/remove never navigated; restart retained favorite and its shortcut opened Memory/start/resume. Phone first game now y297 versus baseline544. Tablet grid and native Home inspected. Actual Hangman six-miss loss→quick replay changed roundID, reset guesses and retained options/packAll. | Pass |
| F02 | Separate simulated web write failures for Sun favorite and Earth labturn2→3 showed active-screen warning/retry, with stored data unchanged. Removing fault and UI retry persisted latest state; reload retained favorite, turn3 and searchSun. This simulates the adapter error, not physical storage exhaustion. | Pass |
| F03 | Actual browser file import replaced A with B; inspect/cancel kept B; confirmed previous-copy restore recovered byte-identical A and preserved B. Invalid raw copy was export-only; actual export handler handed exact original bytes to Blob, without claiming OS download. Native phone UI list/inspect/confirm restored byte-identical A and SQLite retained B; tablet UI restored Memory favorite/settings and retained B before subsequent play. Native Files import/export not run. | Pass |
| F04 | Browser tablet and native phone/mini actual freshCrew guide→walkGarden→three bed actions→Gardenready/Jobs1of4 and notebook shortcut. Web freshMischief had no guide; pure tests cover nearby/later/invalid eligibility. Home/cold-resume retained the natural native round. No renewed nearby transport or full mystery terminal claimed. | Pass |
| F05 | All5 browser map entries opened correct labs; Sun Listen/Stop, related topic/Back, favorite, searchSun, lab/Home/reload retained context and turn. Native phone/mini directly opened Daynight from map and turned Earth; larger-text landscape repeats check actual lab action reachability. Other native labs/all50 topics were not comprehensively rerun. Physical sound/VoiceOver not claimed. | Pass |
| F06 | Native phone and mini layout flows passed: accessibility-medium Settings/grown-up gate, portrait and landscape Home, actual landscape Earth-turn action, and cold Home with the saved Mystery resume. Deep restore used normal text; the larger-text check covered the gate and lab control. Both OS text sizes and orientation were restored. Physical touch/audio/VoiceOver/enjoyment remain operator dimensions. Android blocked: host lacks SDK command-line tools. | Pass |
| F07 | Full check220tests/18files, typecheck/lint/webexport passed under Node22.22.3; Doctor21/21; Impeccable advisory[]; source-bound native Release passed; independent final-code review complete. CI passed on e3af4ff; documentation-head CI and final merge verification recorded with PR6. | Source gates pass; final integration recorded in PR |

Evidence stays in sibling `little-island-games-artifacts/family-ease`: browser execution note, build receipt, original QA database backups, screenshots and native flow logs. Original failed runs are retained in `/tmp/li-family-maestro-*` and the copied logs. T3 agent-device snapshots timed out; exact owned-device restart and Maestro recovered native interaction. Initial native backup test tapped a control clipped by the sheet, corrected by centering the test target; initial Home assertions omitted the saved-round accessibility-label suffix, corrected in final layout/cold-resume checks. These harness failures do not erase the later verified saved outcomes.

Toolchain: first install inherited Node22.0 in the new worktree and omitted the optional Rolldown native binding. The exact lockfile-matching1.2.14 binding was reused from the existing checkout; final checks used Node22.22.3. CocoaPods regenerated its task-local Node environment under22.22.3 before the final Release build. No shared Node/Ruby configuration or dependencies changed.

This is a source integration, not a new TestFlight upload or public release. Family device acceptance and distribution rights remain separate. Lifecycle final status and resource cleanup are verified before completion; no runtime handoff is intended.

## TestFlight delivery

On 21 October 2026, the changes above shipped to the existing adult Leon internal group as 1.2.0 (8). Apple build `b4c6c59d-db63-4be7-bd43-d9d2215b46d2` is VALID / IN_BETA_TESTING and attached. See [release evidence](TESTFLIGHT_BUILD8.md). Earlier statements that source integration had not yet been uploaded describe the pre-release state; physical family acceptance and public distribution remain separate.
