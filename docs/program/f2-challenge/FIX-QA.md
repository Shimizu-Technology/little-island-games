# F2 fix acceptance

Agent-executed affected-flow QA, 9 November 2026. Source starts at ff2801c6 and merges program/4.0 at 49a9bbe8. Offline family app; no Challenge adapters are shipped. The required code journeys are regression-tested with private engine adapters; the shipping School journeys are also browser-tested. No simulator is named in this brief; native iOS 18.5/26.5 and physical family acceptance remain lead-owned.

| Case | Starting fixture and actions | Expected visible and saved result | Coverage |
| --- | --- | --- | --- |
| F01 | Empty registrations directory absent in a clean clone; run complete gate | Registry, immutable catalog, types, lint, tests and offline export pass | Clean-clone full gate |
| F02 | Own paused Challenge; choose replacement; Start once | Chosen puzzle starts with next ordinal in one write; School board untouched | Real Store/frame regression |
| F03 | Same fixture; fail storage or throw at adapter start | Old attempt and source remain accepted; no false recovery promise | Failure-injection regression |
| F04 | Finish nine registered engine games; then start again | Completion facts/marks retained; no credited sessions in paused slots; no old result on reopening | Pure transition + real Store/frame |
| F05 | Eight unfinished games; choose Continue/export/replacement | Clear choices; one selected slot replaced atomically; seven others intact | Real Store/frame |
| F06 | Choose Blind or Own Read, then launch | Selected dare sets its exact immutable launch option; unrelated option stays off | Real Store/frame + replay |
| F07 | Helped/Together Pick Up, Two Ways and allowed cost | Correct A/B bits under each named help policy; independent-only rules unchanged | Real engine replay |
| F08 | Third clean School finish; answer each face | One card consumed; no second invitation; rating affects later finishes | Real frame; shipping web for Just right/Too hard |
| F09 | Another child's saved result or Together result | No dead invitation, rating or bridge controls | Real LearnFrame + shipping web |
| F10 | Family and personal Letter result; dismiss bridge; finish another round; reload | Dismissal remains once per learner/game, independent of round signal | Real LearnFrame + shipping web |
| F11 | Personal School harder invitation; Hear; Stay; reload | Existing recording action works; dismissal and School progress persist | Real LearnFrame + shipping web |
| F12 | Phone 320×667 and tablet 1024×768; Thinking shelf and high Arcade world | Registered shelves fit; no unfinished content; high world opens without stars | Shipping web |

New speech lines are assigned to K1-SPEECH in docs/CHALLENGE_CORE.md; lead-only voice-bank generation/native listening are separate integration acceptance. The worker restores the existing recorded School invitation now. No public store or release work is authorized.

## Execution record

Final implementation 2da6bc9f4b3493738eef561ed40e6495c5dccf28: both full gates passed (2,613 tests passed, two opt-in raster tests skipped; 219 files passed, one skipped), Doctor 21/21. Focused pre-fix reproduction: 21 failed / three passed on the merged base, plus the separate floor-rating regression failure; the final full gates pass every new regression.

All F01–F12 code/affected-flow conditions passed at the coverage stated above. Nine browser cases W01–W09 passed; see fix-web-qa.json. F09's foreign-owner condition uses a stale-view component fixture, since valid current profile saves keep each owner's round separate; Together is also checked in shipping web. The personal bridge was tested through dismissal, another actual complete round and reload. Two reloads during unavailable/rewritten export output returned 404; the affected acceptance checkpoint was invalidated and successfully retested after final export completion. Native, physical family, full-app classic replay and newly assigned K1-SPEECH listening are not run in this worker scope.

Owned browser/server resources, temporary clones and build/dependency outputs were cleaned. No handoff remains. Borrowed devices/services were left unchanged.


## Round 2 affected-flow regression acceptance — 9 November 2026

Executor: implementation agent, isolated checkout based on `c014b0df`. Sources: FIX-BRIEF-2.md and review/REVIEW-R2.md in the sibling v4/f2-challenge artifacts folder, PRD, QA, SAVE_CONTRACT, and the F2 rows of the v3 master WORK-LEDGER. The current program plan overrides older PRD references to star locks. This round protects the offline family's shared save and Challenge selection; no adapters or content are registered.

| Case | Fixture/actions and expected outcome | Execution |
| --- | --- | --- |
| R2-01 | Real Store, two personal learners plus Family; write an actual School bridge with `challengeWorking`, populate both settings maps, remove the active learner, remount, change sound, remount. Only the removed learner's rows disappear; other profiles/settings survive, original is preserved and Recovery stays closed. | Passed, automated Store with mocked storage; failed before the fix at remount. |
| R2-02 | Same setup, remove the inactive learner. Check both surviving maps, original bytes, other profile, subsequent settings and reload. | Passed, automated Store with mocked storage; failed before the fix at remount. |
| R2-03 | Fault injection returns an invalid learner-removal candidate. No preservation, write, publication or epoch change may occur. | Passed; failed before the fix. |
| R2-04 | Submit an invalid ordinary settings map, then a valid settings change and remount. Invalid data is refused before publication/write; valid state remains writable. | Passed; failed before the fix. |
| R2-05 | Two-puzzle real-engine registration; select Blind, solve, choose Try a stretch, press Start. Next puzzle starts without the old puzzle's dare or support-off option. | Passed, real Store/frame with mocked presentation/storage; failed before the fix. |
| R2-06 | Register awards with an unknown par metric, zero/negative par, invalid plan bound, negative edits or foreign objective; register valid independent Pick Up as control. | All six invalid cases rejected; control accepted. Six failures before the fix. |
| R2-07 | Rate Too hard after finish three; finish cleanly twice, then finish again. | Gentler offers on both intermediate finishes; rating clears for the next third-finish face. Existing intended contract retained. |
| R2-08 | Eight unfinished games, Continue/replacement choices, then start a replacement. | Passed with readable game labels and exactly one removed slot. |
| R2-09 | Real Arcade screen receives an invalid terminal; close its sheet. | Passed: Result options replaces Save my result; no invalid credit; next valid terminal still saves. |

This is automated affected-flow coverage, not a new browser/device acceptance run. R2-05 uses a private adapter because the shipping registry has zero Challenge adapters. The brief names no simulator; native iOS 18.5/26.5, actual audio, physical devices and family acceptance remain not run. No prior web/native evidence is presented as a run of this round's code. Final engineering results and exact implementation head are in FIX-REPORT.md.

### K1-SPEECH ledger registration

The missing BUILD row was added to the canonical external `v3/master-plan/WORK-LEDGER.md`, and the outstanding gate is recorded in `v4/STATUS.md`. This table preserves that entry in the pushed branch:

| ID | Work | Owner | Depends on | Acceptance/status |
| --- | --- | --- | --- | --- |
| K1-SPEECH | Register the eight proposed F2 result-card/bridge/capacity lines, generate both complete voice banks, and wire Hear controls. | F2 controls; program lead audio generation | K1 | Before child/family acceptance: both complete banks and audible offline faces, invitations, three bridges and capacity help on iOS 18.5 and 26.5. Not run. Proposal remains in sibling `v4/f2-challenge/f2-challenge-speech-proposal.json`. |

Round 2 final engineering on `0c209857`: default and Library-preview complete gates exit 0, each with 2,625 passing tests / two opt-in skips; Doctor 21/21; advisory scan `[]`. Generated files restored to default. Owned runtime/build/dependency outputs cleaned; lifecycle reports no active owned resources. See FIX-REPORT.md and sibling `r2-*.log` evidence.
