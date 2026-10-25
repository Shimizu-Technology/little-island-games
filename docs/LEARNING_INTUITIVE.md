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
| I05 | Native Release on owned iPhone and iPad simulators | Pending |
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
