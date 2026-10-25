# Making the learning games easy to pick up — 25 October 2026

Leon tested 1.4.0 (10): "some of the games aren't intuitive to use, even to me, let alone a kid. I want all the games super easy and intuitive." A first-time-child playtest of all nine games (sibling `little-island-games-artifacts/reviews/2026-10-25-learning-games-kid-playtest/REPORT.md`) found the same pattern everywhere: instructions told rather than shown, extra gate taps, abstract controls (a keypad instead of a path, +/− steppers instead of a basket), first items that were too hard, pictures that couldn't be named, and little payoff.

## Rules applied to every game
- Show, don't tell: big obvious targets, a tapping hand on the first move, pictures over words, at most a short spoken line of instruction.
- One obvious action at a time; no gate buttons; the game's main action is the only big filled button.
- Touch-and-see toys rather than forms; results visibly happen.
- Gentle starts with a one- or two-tap success and ramps up.
- Every right step is celebrated; a wrong step shows gently and lets her retry.
- Kid words only; grown-up notes live in Help.

## Shared changes (foundation)
- First-move coach (pulsing ring + tapping hand), shown once per game and from Help → "Show me how".
- Spoken goal line when a fresh round opens.
- Star burst on right answers; a "You did it!" / winner card with Play again at the end.
- "New round & options" small and quiet in learning and classic games.

## Per game
Sound Boat (no counting stage; spell into ready-made boxes; nameable pictures), Turtle Tales (a picture check per page so careful reading moves the story), Which One? (bigger pictures, clearer feedback), Reef Race (a real winding path with start, finish and big turtles; a spinner), Island Market (customer bubble + a basket you fill by tapping mango and crate piles; easy start), Tide Pool Lab (concrete picture questions you watch happen), Float or Sink (guess = drop; auto-sort; more objects), Crab Commands (2–3 move first beaches; footprints preview the plan), Håfa Adai Island (no English captions in I spy). Art fixes for the hen, shell, crab home and fox.

## Acceptance

Version 1.5.0 (11). Branch `feat/intuitive-learning`. Implementation was split into three slices on their own worktrees: numbers, reading, and science/thinking/CHamoru. The lead integrated and verified them.

| Case | Scenario | Status |
| --- | --- | --- |
| I01 | Full gate: typecheck, lint, tests, web export, Doctor | Pass: 35 test files, 477 tests; web export with 1,301 offline resources; Expo Doctor 21/21 |
| I02 | Lead first-time-child replay of all nine games at 390×844: first move obvious without reading, no gate taps, kid words, celebration | Pass after fixes. The replay found the first-move hand pointing at one answer in picture choices: the wrong picture on Turtle Tales page 1, "Sand" for the snail, "Sink" for the leaf, and the first customer in "who wants more?". Picture and answer choices now ring the whole set with no hand. Sound Boat, Crab Commands and Håfa Adai Explore still point at the move on purpose. |
| I03 | Every mode of every game to the end, Play again, reload mid-round; phone and iPad sizes | Pass. Each slice played every offered mode and pace to the end at 390×844, with reload and Play again, plus 375×667, 768×1024 and 1024×768. The lead re-checked all nine at 390×844 and 375×667 with no page scroll. |
| I04 | Old saved rounds load or are cleanly replaced; strict validation | Pass. Fixtures hold real 1.4.0 rounds: 212 reading rounds plus science, Håfa Adai and market rounds. Independent review played the e337031 engines through about 600,000 reachable states, and all passed `validLearnSession`/`parseSave` and converted to valid new states. |
| I05 | Native Release on owned iPhone and iPad simulators | Partial on final code: all nine iPhone first actions, per-game Help and Home Continue passed. iPad interaction and cold-launch recovery remain blocked. See continuation below. |
| I06 | Independent final-code review | Codex was unavailable (usage limit until 31 October), so a separate Claude reviewer ran. No blockers. Two material findings, both fixed in 8429ce1: the right-answer tone cut off spoken reasons, and a lost Reef Race showed "You did it!". Minor findings fixed: "Show me how" past the first item, spinner remount, I spy coach, clipped intros. A second review round found nothing material in the fixes. Its one practical minor, a queued reason line outliving a newer sound or a new round, is fixed in 9804b4d. |

**Known limits**
- Growing's third Crab beach is still 11–13 cards.
- Some Håfa Adai people pictures (child, sibling, children) are near-misses without English; Gentle's helper and Peek cover them.
- "cake"-style words offer both c and k.
- The web preview can't autoplay speech after a reload until the first tap.
- Review residuals left as is:
  - On a round's last item the big cheer's fanfare tail overlaps the finish fanfare.
  - "Show me how" during a take-turns Sound Boat word points at the right tile.
  - A picture tapped in Håfa Adai Explore during the first 3.7 s is talked over by the welcome line.
- Reinstalling 1.4.0 over a 1.5.0 save would open recovery, because the new round shapes are newer than that build understands.

Whether Stassie actually starts each game without help is the real test and stays an operator check on the family iPad.

## Continuation — 25 October 2026

The resumed task verified clean integration branch `feat/intuitive-learning` at `4500425`, based on main `e337031`. The required result remains a child being able to find the first action, act, recover, finish and replay in each game, with old rounds preserved. Agent acceptance covers isolated fixtures; physical family and child acceptance stay with Leon/Stassie.

Final application source is `d854d90` (shared feedback fix `e40829f`); later evidence-only commits do not change the application. Fresh final-source gate: Node 22.22.3, typecheck, lint, 477 tests in 35 files, web export (`bee13cf7c729`, 1,301 offline resources) and Expo Doctor 21/21 passed. Impeccable returned no findings on the learning UI; its web CSS scan is advisory for this React Native app.

Independent Codex final-code review found stale landing callbacks could play after mute. `e40829f` invalidates board feedback after mute, Help, background/focus changes, replay and unmount, including callbacks that had not yet queued speech. A focused independent check passed 20 timer scenarios and reproduced the failure on `4500425`. Browser tests of correct and wrong Float or Sink guesses (rock → Sink, rock → Float) muted during the fall recorded no subsequent playback, exact saved-round/settings reload, and working speech after unmute.

GitHub Greptile then found missing screen-reader picture descriptions in I spy, delayed game sounds interrupting Help, and Tide Pool's opening question interrupting a quick answer. The shared feedback fix covers Help. `d854d90` adds spoken English picture descriptions while keeping visual captions hidden, and cancels the opening question after an answer or experiment interaction. Independent review passed 189 source-harness assertions, including all 51 vocabulary concepts, take-turns guesses and coral controls. Browser retest passed fast-answer question cancellation and six descriptive I spy answer labels with no visible captions. Actual VoiceOver speech remains not run. The final native simulator Release compilation also passed for 1.5.0 (11), with embedded bundle SHA-256 `536163db8bd3f595aa40013172f550de0764a45af581190812a64e303a5c7bde`; compilation does not pass C05.

| Continuation case | Fixture and expected outcome | Result |
| --- | --- | --- |
| C01 | Fresh browser contexts, 375×667, start all nine learning games; actionable board without horizontal overflow or page errors | Passed on `e40829f`; screenshots and accessibility labels retained |
| C02 | Fresh Float or Sink rock/leaf; Float and Sink guesses, mute at about 100 ms during fall; no later playback, exact reload, then unmute and hear instruction | Passed on `e40829f` in both cases |
| C03 | Fresh Tide Pool; answer and add snail before initial question delay; result stays uninterrupted | Passed on `d854d90` browser export |
| C04 | Fresh Håfa Adai I spy; picture controls describe their concepts to accessibility APIs while visual English captions stay hidden | Passed on `d854d90` browser export; physical VoiceOver not run |
| C05 | Final native Release first actions, Help, saved Continue, portrait/landscape on iPhone/iPad | Partial: final-source iPhone first actions, per-game Help and Home Continue passed; all nine rounds persisted in native SQLite. Cold-launch recovery and iPad interaction/rotation remain blocked. |
| C06 | Fresh Reef Race (take turns), Market, Tide Pool, Float or Sink and Crab Commands at 375×667 and 1024×768; make the first move and reload the exact saved round | Passed, 10/10 game/viewport dimensions on `d854d90`; the pulsing Reef stone required a pointer click without automation stability waiting |

Evidence and reproducible browser scripts are outside Git in sibling `little-island-games-artifacts/intuitive-1.5.0/continuation`. Continuation acceptance: five of six cases passed; C05 remains blocked. T3 browser snapshots timed out twice; the Chrome extension fallback also timed out, so the recorded browser runs used the existing local Playwright installation and isolated temporary contexts. An initial browser regression attempt overlapped web export and loaded an incomplete artifact; the retest after export completed passed.

The inherited iPad Maestro run failed with `IOSDriverTimeoutException` before app execution. Fresh iOS 18.5 iPhone and iOS 26.5 iPad simulator boot attempts also stalled. The Mac reported load averages above 800 and 99% system-volume usage; those are observations, not a proven root cause. Final application-head GitHub Validate and Greptile checks passed. CodeRabbit supplied a Free-plan summary, not a completed code review; the completed independent reviews are the fallback. At that checkpoint, PR #13, merge and internal TestFlight build 11 were held pending final native acceptance. Leon subsequently requested the private beta below; the native cases remain incomplete and the PR remains open.

### Authorized host recovery and final-source iPhone run

After Leon authorized host recovery, restarting the Apple CoreSimulator broker cleared the task's stuck PID33470. Other sessions' booted devices were recorded and restored; no simulator data was erased. A later launch stall recurred. Its stack showed dyld-cache preflight/mapping, so the iOS18.5 simulator cache was rebuilt and the broker restarted again. This did not establish a root cause or complete native acceptance. Shared home services were preserved.

The installed Release 1.5.0 (11), built from `d854d90`, passed an agent-driven iPhone iOS18.5 walkthrough: Home/island navigation, the first action in every learning game, meaningful I spy picture descriptions, Help and return in every game, and Home Continue for Crab Commands. Native SQLite contained all nine saved rounds and the expected recent game. This is current-source native interaction evidence, separate from the earlier 62-step run. Evidence is in sibling `little-island-games-artifacts/intuitive-1.5.0/native-final/phone`.

Force-close/reopen did not finish: the first snapshot was incomplete, and subsequent launch/automation requests stalled. The original saved fixture was retained. The iOS26.5 iPad installed the app, but both the agent-device runner and the Maestro fallback timed out before a game interaction. These dimensions remain blocked, not passed. Both task simulators subsequently shut down successfully; PID33470 no longer requires a recovery-owner handoff.

The tested `.app` was preserved under `native-final/ReleaseApp/LittleIsland.app` and its embedded JavaScript hash reverified before removing only the task's 5.5GB simulator DerivedData. A separate `release/testflight-11` checkout has dependencies and iOS prebuild/pods prepared. It is not an archive or submission and must be updated to the verified merge commit before release work.

A final fresh iPad mini on the separately installed iOS18.0 runtime booted and installed the same verified Release. Apple `bootstatus` reported completion, but launching the app stalled in the CoreSimulator bridge; agent-device returned `Daemon request timed out` (diagnostic `mvniyrti-78f17239`) before any game interaction. This attempt did not pass a scenario. The Mac's load average was near 990 at that point. Its native-host problem remains unresolved; repeated retries are not acceptance evidence. The Mac mini alternative was inspected read-only and had no simulator runtime or signed-in user console, so no remote installation or service changes were made.

Cleanup completed for all task test processes, simulators, Device panels, browser tabs and servers. Lifecycle session `01a17186-714f-7ee2-994a-bccc0bafba80` reports no active owned resources. No runtime resource was handed off. The clean implementation and prepared release worktrees are preserved while C05 remains incomplete.


### Requested private TestFlight beta — available

Leon then requested: “Do the next build and submit it to TestFlight so I can test.” This authorizes private beta delivery from the reviewed PR source while preserving the incomplete native cases. Source `34639ea2d174f75d9212977b15209e5b9bf46019` was built without merging PR #13. Fresh release checks passed typecheck, lint, 477 tests, web export and Doctor 21/21; signing, packaged assets and source-to-upload identity were verified.

TestFlight **1.5.0 (11)** is now `VALID` / `IN_BETA_TESTING` in the existing Leon internal group (one adult tester). English testing notes include iPad rotation, force-close/reopen, saved games and sound-off. This is delivery acceptance, not a pass for C05 or physical family usability. PR #13 remains unmerged. See [release details](TESTFLIGHT.md) and [delivery evidence](evidence/testflight-build11.json). Temporary signing files and task runtime resources were cleaned; the held source and release worktrees remain available.
