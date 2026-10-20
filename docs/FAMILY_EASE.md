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
