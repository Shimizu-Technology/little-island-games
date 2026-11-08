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
