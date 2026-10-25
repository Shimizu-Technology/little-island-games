# Math practice and practice before play

25 October 2026. Leon approved Shell Math, Number Hop, Quick Practice and optional math/reading practice before a new game, through our development cycle to the next private TestFlight build. Starting source is PR13 `18aa9bf`, based on the 1.5.0 (11) beta he liked. Main remains older; this work is isolated on `feat/math-practice` and will start as a stacked PR.

## Product and experience

Stassie is seven and is learning addition and subtraction. Begin with small amounts within ten, then offer twenty. No assumption about measured attainment or her school's exact curriculum. The existing Numbers island offers counting and some addition; beginner subtraction is missing. Sources: [product brief](PRD.md), [previous learning acceptance](LEARNING_INTUITIVE.md), `src/learn/games/island-market/orders.ts`, Leon's instructions. Pictures and number lines follow the [IES elementary mathematics guide](https://ies.ed.gov/ncee/WWC/PracticeGuide/26); this app is not an assessed intervention.

Use the existing cream, teal and island art. Large targets, one clear next action, spoken and visible instructions, no timer, no lost streaks or grades. Shells visibly join or leave a group; hops show direction and distance; a settled equation connects pictures to symbols. Motion confirms the action and never delays input. Reduced motion keeps the same visible result without decorative travel. Sound off, Help, backgrounding and navigation cancel pending audio. Grown-ups can see whether answers were independent or helped, stored only on this device.

## Scope and contracts

- `src/math/questions.ts` is the shared pure arithmetic contract: `MathConfig`, `MathQuestion`, `createMathQuestions`, `validMathQuestion`, `mathAnswer`, `mathResult`, `mathEquation`, `mathSpeechKey`, `mathSkill`. Nonnegative correct arithmetic, three unique in-range choices, missing second operand or result. Shell Math/Number Hop use result blanks; Quick Practice can use missing operands. First two questions use small amounts.
- Three new learning IDs: `shell-math`, `number-hop`, `quick-practice`. Reuse LearnFrame and its save/replay/help/coaching. Math operation control supports add/subtract/mixed; range defaults to ten, then twenty. Parent owns central save and launch integration. Math worker owns math game directories, learning registry/types/session/Frame changes and activity tests; no changes to Store or global save validation.
- `src/practice/types.ts`: `PracticeSettings` (enabled, subject math/reading/mixed, limit ten/twenty, operation), defaults off; `PracticeSummary` (results of skill/helped, bypassed); bounded `PracticeNotes` (independent/helped counts). Parent owns this type file and shared arithmetic after this foundation commit.
- Warm-up worker owns `src/practice/engine.ts`, `src/practice/PracticePanel.tsx` and focused tests. Public component contract: `PracticePanel({settings, soundOn, active, onComplete, onCancel})`, with `onComplete(summary: PracticeSummary)`. Pure state stays local to the panel. Exactly three completed questions, assisted answers count. Wrong answers stay on the question with help; no perfect score requirement. Include cancel and a protected grown-up bypass using the existing multiplication gate. No Store, Settings, routes or learning registry edits in this slice.
- Reading uses existing curated short words/sentences and matching pictures; no microphone or unverifiable oral scoring. Learning activities remain freely accessible. The parent integrates a shared practice guard at new-round commit boundaries for classic and activity games. No prompt mid-round or on saved Continue; cancellation and restore preserve original rounds and context. Guard remote/private flows without blocking a peer's join or secret handoff.
- English offline audio keys: `mathSpeechKey(question)` for each question, plus `shell-math-intro`, `shell-math-help`, `number-hop-intro`, `number-hop-help`, `quick-practice-intro`, `quick-practice-help`, `practice-intro`, `practice-done`, `practice-try`, `practice-show`. Parent owns scripts/learn/math.json, generated math audio maps/assets and Audio aggregation. Workers reference these keys; they do not edit central audio files. Spoken questions have a Hear button; do not let automatic question speech cut off the frame's welcome goal.

## Acceptance ledger

Executor: agent for pure-engine, browser and available native UI checks; Leon/operator for real-device audio, installation and child usability. Isolated fixtures only. Exact tested commits, artifacts and remaining platform limits will be appended. Cases start not run; a build or screenshot alone is not a pass.

| ID | Required scenario and expected observable/saved outcome | State |
| --- | --- | --- |
| M01 | All arithmetic types/ranges, unique choices and hints share rules; forged/negative/oversized saves rejected; old saves load unchanged | Passed: pure engine/save tests and independent exhaustive checks below |
| M02 | Each new activity: first action obvious, add/subtract within ten/twenty, wrong answer, Show me, finish, replay; exact saved round after reload | Not run |
| M03 | Missing-number questions use valid arithmetic and appropriate visual help | Not run |
| M04 | Grown-up settings default off; math/reading/mix/range/operation choices persist; children cannot casually bypass | Not run |
| M05 | Three questions unlock exactly the intended new round; guided completion works; no questions interrupt the full round | Not run |
| M06 | Cancel/close/back during practice or setup preserves original round; no deferred action after navigation, restore or settings change | Not run |
| M07 | Continue, cold resume, active play, learning activities and peer join remain uninterrupted; new-round/replay paths consistently guarded | Not run |
| M08 | Parent notes distinguish independent/helped responses without promoting assisted work as mastery; no repeated completion recording | Not run |
| M09 | Phone375×667 and tablet portrait/landscape: reachable controls, no overflow, keyboard/focus, reduced motion and sound-off during feedback | Not run |
| M10 | Full check/Doctor, advisory design scan, completed independent final-code review and no unresolved material findings | Not run |
| M11 | Native Release first actions/help/new-round guard and saved recovery on available iPhone/iPad host; record blocked dimensions honestly | Blocked: simulator runner/host, before new math binary interaction |
| M12 | Next unused private build: exact source/IPA/signing/audio, Apple processing and existing Leon group availability verified; owned resources cleaned | Not run |

Public release remains separate. Prior simulator-host blockers remain recorded; recheck readiness instead of repeatedly retrying the same stalled host. TestFlight delivery is explicitly authorized for testing even if a host dimension remains blocked, with merge readiness evaluated separately.

## Integration checks, 25 October

Source under test: `82add98` plus the integration diff; final source SHA will be recorded after browser checks. Node22.22.3, lockfile install, typecheck and 518 tests passed. Doctor21/21 and both advisory design scans returned no findings. Final full gate remains pending the complete audio batch.

Independent review round1 exercised 1,800 math rounds, 41,306 validated save transitions and 720 practice completions. It verified exactly-once delivery, invalidation after session/settings/epoch/navigation changes, all 800 arithmetic prompt meanings and all 832 map filenames. It found two launch blockers: the Race course-picker branch omitted the practice panel, and Mystery treated practice as a route exit and closed the nearby room. Both are fixed; round2 and actual browser retests are pending. Practice replaces content within existing setup sheets, retaining forms on cancel. The card round stays mounted during practice so setup choices survive.

Native preflight: the owned iPhone18.5 simulator opened, but agent-device snapshot failed with `Daemon request timed out`, then debug retry failed with `Runner did not accept connection (xcodebuild exited early)` / failure to obtain the simulator daemon socket. No new math interaction passed. Closed the Device panel and shut down only UDID344FDF3D-291B-4861-8006-3F48AE7ED0C6. Android SDK command-line tools are unavailable. Native phone/tablet, hardware audio/VoiceOver and Stassie's independent usability remain unverified. This is a merge acceptance gap; Leon authorized private beta testing despite the host limitation.

Speech generation stalled in four owned `say` workers. Terminated those exact children and their generator, without restarting shared speech services. A fresh synthesis probe passed. The generator now bounds/retries stalled attempts and publishes a clip only after encoding completes; generation resumed. Public speech distribution rights remain a separate gate.
