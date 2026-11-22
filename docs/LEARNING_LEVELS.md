# Learning levels

Current profile separation and earned-star behavior is documented in [Local learner saves](PROFILE_SAVES.md). All stones remain open; selected levels and completed levels are separate records. Earlier implementation evidence below is historical.

27 October 2026. Implementation slice based on integration commit 0fbd8af. Sources: docs/ISLAND_ARCADE.md (A07), docs/PRD.md, docs/LEARNING_GROWTH.md, and the pure engines/content in src/learn. The app is private, offline family practice for a seven-year-old and family. There are no accounts or remote learner records. This work makes the existing progression visible; it does not claim mastery or certified learning outcomes.

## Decisions and compatibility

- Levels derive from existing options: easy/medium/hard → 1/2/3; stretch/deep → 4/5. Every stone stays available. Selecting a stone at round end opens setup; only Start replaces the saved round.
- New learners start at Level 1. The current learner's saved round takes precedence, then their remembered game choice. Other learners' rounds remain resumable under their original owner; New round and Play again use the active learner's own choices.
- The brief described five existing steps for all twelve games. The three arithmetic games actually exposed only easy/medium. Level 3 now uses the full within-20 range throughout, without the first two small-number warm-up questions. Quick Practice starts with its missing-number question. Levels 1/2 and old saves are unchanged. Math operation remains freely selectable.
- Optional, strictly validated LearnSession.levelHelped is false on new rounds and sticky true after a miss or explicit assistance. Legacy rounds omit it and remain playable; their unknown assistance history does not establish readiness. Save version stays 1. Existing game state shapes and saved item order remain valid.
- Completed solo rounds write one summary note at game:pace-or-stage:think.level-round. Two independent round summaries with two distinct days and rounds enable an invitation at that same level. Item practice and optional pre-game warm-ups never qualify. Family, together, versus, another learner's saved round, browsing vocabulary, helped rounds and non-winning reef races do not qualify. No timer or speed measure is read. Stay here has the same button treatment as Try Level N+1; neither advances automatically.
- Hints/Peek/read-aloud assistance and wrong answers persist in the round evidence. Normal goal narration and hearing a spelling prompt remain part of the task. Vocabulary Level 1 includes English scaffolding by design; independent means a correct I spy round without extra help.

## Level names verified against content

Foundation names/descriptions are in src/learn/levels.ts, checked against each foundation engine and its selected reading/number/science/vocabulary bank. Levels 4/5 use the authored growth track labels and descriptions directly. CHamoru terms were not changed; all new names are English.

| Game | Level | Name | Grown-up description |
| --- | --- | --- | --- |
| Reef Race | 1 | Hop to 30 | Count along stones 1–30 with a spinner showing 1, 2 or 3. |
| Reef Race | 2 | Hop to 60 | Count along stones 1–60 with one die. |
| Reef Race | 3 | Two dice to 100 | Add two dice and count along stones 1–100. |
| Reef Race | 4 | Predict and swap reef jumps | Predict jumps of 2, 5 and 10, and compare different ways across the reef. |
| Reef Race | 5 | Compare and combine reef routes | Reason about mixed routes, equal distances and landing gaps within 100. |
| Island Market | 1 | Little mango orders | Count 3–9, pack teens, then add two small orders. |
| Island Market | 2 | Crates of ten | Pack tens and ones and add tens within 100. |
| Island Market | 3 | Orders and change | Add, take away and give change with pretend shell coins. |
| Island Market | 4 | Trade and pay at the market | Trade one ten, combine orders, make change and pay with different coins. |
| Island Market | 5 | Exchange, order and make change | Exchange two tens, adjust larger orders and compare exact payments within 100. |
| Sound Boat | 1 | Cat, hen and sun | Spell short-vowel words, then change one sound in a word ladder. |
| Sound Boat | 2 | Fish, crab and kite | Spell blends, two-letter sounds and silent-e words. |
| Sound Boat | 3 | Sheep, boat and star | Spell vowel teams and r-controlled words, with an easier first word. |
| Sound Boat | 4 | Word parts and endings | Build two-syllable words, keep a base word, and notice what endings mean. |
| Sound Boat | 5 | Spelling changes and word families | Read across syllables, build changed endings, and use word parts to explain meaning. |
| Turtle Tales | 1 | Little word stories | Read short-vowel stories and match each page to its picture. |
| Turtle Tales | 2 | Stories with blends | Read stories with blends and digraphs and choose matching pictures. |
| Turtle Tales | 3 | Longer vowel stories | Read stories with vowel teams and silent-e words and match pictures. |
| Turtle Tales | 4 | Story clues and reasons | Read four short stories to order events, infer, explain motives, and find evidence. |
| Turtle Tales | 5 | Evidence across a passage | Use four longer stories to compare explanations and support inferences with the text. |
| Which One? | 1 | Little word pictures | Read short-vowel sentences and choose the picture that matches every word. |
| Which One? | 2 | Blends in pictures | Read sentences with blends and digraphs and spot the matching details. |
| Which One? | 3 | Vowels in pictures | Read sentences with vowel teams and silent-e words and compare details. |
| Which One? | 4 | Directions and references | Follow two clues, track a reference, notice not, and connect causes with results. |
| Which One? | 5 | Linked clues and exceptions | Combine conditions and exclusions, follow references, and reason through event chains. |
| Tide Pool Lab | 1 | Tide pool homes | Find food and homes for creatures and help the coral. |
| Tide Pool Lab | 2 | Sunshine and tides | Explore habitat needs, sunshine and changing water. |
| Tide Pool Lab | 3 | Fish, coral and heat | Add questions about fish breathing and the effects of heat. |
| Tide Pool Lab | 4 | Fair habitat tests | Change one factor and explain observations. |
| Tide Pool Lab | 5 | Evidence & new habitats | Repeat trials and apply evidence carefully. |
| Float or Sink Dock | 1 | First floating finds | Predict six everyday objects, then load a boat with pebbles. |
| Float or Sink Dock | 2 | Floating surprises | Compare seven objects and test a boat's capacity. |
| Float or Sink Dock | 3 | Shape and trapped air | Compare eight objects, including a shape or air pair, and smaller boats. |
| Float or Sink Dock | 4 | Shape, material & air | Compare why particular objects float or sink. |
| Float or Sink Dock | 5 | Capacity & fair trials | Use repeated trials to predict and compare capacity. |
| Crab Commands | 1 | Follow the arrows | Build arrow paths on three beaches, from short to longer. |
| Crab Commands | 2 | Walk and turn | Plan paths using forward, left turns and right turns. |
| Crab Commands | 3 | Do it again | Use Again ×2 to repeat the previous command two more times. |
| Crab Commands | 4 | Find & fix a bug | Repair missing commands on a numbered grid. |
| Crab Commands | 5 | Repeat whole blocks | Expand loops and compare equivalent programs. |
| Håfa Adai Island | 1 | Six picture friends | Explore six reviewed words or find pictures with visible English help. |
| Håfa Adai Island | 2 | Eight picture friends | Explore eight reviewed words; English help in I spy is behind Peek. |
| Håfa Adai Island | 3 | Twelve picture friends | Explore twelve reviewed words; use Peek for English help in I spy. |
| Håfa Adai Island | 4 | Words for everyday moments | Choose familiar words for greetings, food, family, colors, numbers, and body parts. |
| Håfa Adai Island | 5 | Context and careful choices | Follow several English clues to choose a word or response for an everyday situation. |
| Shell Math | 1 | Shell sums to 10 | Join or take away within 10, starting with two small questions. |
| Shell Math | 2 | Shell sums to 20 | Join or take away within 20, starting with two small questions. |
| Shell Math | 3 | More sums to 20 | Join or take away within 20 throughout the round, without the small-number warm-up. |
| Shell Math | 4 | Make ten and find parts | Use make-ten, hidden parts, tens and ones, and equal baskets. |
| Shell Math | 5 | Trade tens and build groups | Regroup, subtract across a ten, and combine equal groups within 100. |
| Number Hop | 1 | Number hops to 10 | Hop forward or back within 10, starting with two small questions. |
| Number Hop | 2 | Number hops to 20 | Hop forward or back within 20, starting with two small questions. |
| Number Hop | 3 | More hops to 20 | Hop within 20 throughout the round, without the small-number warm-up. |
| Number Hop | 4 | Skip across the tens | Use jumps of 2, 5 and 10 across tens; find a start or a jump count. |
| Number Hop | 5 | Missing starts and longer jumps | Plan forward and backward routes within 100, including unknown starts and jump counts. |
| Quick Practice | 1 | Find numbers to 10 | Solve three equations within 10, including a missing number. |
| Quick Practice | 2 | Find numbers to 20 | Solve three equations within 20 after two small warm-up questions. |
| Quick Practice | 3 | Missing number first | Start with a missing number and use the full range within 20 throughout. |
| Quick Practice | 4 | Find unknowns and connect equations | Find different missing parts, balance two sums and solve short two-step stories. |
| Quick Practice | 5 | Balance equations and plan two steps | Solve unknown starts, missing subtractions, equal equations and two-step situations within 100. |

## Within-round order

Selection and validation stay separate: these changes order newly selected items only and never require sorted legacy saves.

| Game | Easier-to-harder treatment |
| --- | --- |
| Island Market | Existing authored plan by concept, then ascending target amount within each step. |
| Tide Pool Lab | Existing authored mission order, from food/homes to coral, tides, fish and heat. |
| Crab Commands | Existing explicit beach tiers 0, 1, 2. |
| Float or Sink Dock | Obvious rock/leaf first; newly selected later objects now follow authored pace rank. |
| Sound Boat | Preserve the easier first picture word; remaining selected picture words now follow grapheme-tile count. Ladders keep their semantic sequence. |
| Which One? | Newly selected sentences follow word count within the selected phonics pace. This is a reading-load proxy, not a proficiency measure. |
| Shell Math / Number Hop / Quick Practice | Preserve the small first two questions at Levels 1/2 and the positional operation/missing-number pattern. Level 3 omits that warm-up. Further sorting would conflict with saved-round positional validation; it is not imposed. |
| Turtle Tales | One story per round; preserve narrative page order. No authored within-story difficulty rank. |
| Reef Race | Movement follows the numbered board, dice and currents. Reordering would change the game. |
| Håfa Adai Island | Category coverage is meaningful; no source-backed rank between reviewed vocabulary words. No invented difficulty order. |
| All growth tracks | No authored within-stage difficulty rank. Keep mixed-skill selection and semantic story/program sequences rather than inventing a rank from question length. |

## Speech integration

Nine new English keys are exported in src/learn/levelSpeech.ts and included by scripts/export-growth-audio.ts: learning-level-1 through learning-level-5 and learning-try-level-2 through learning-try-level-5. The lead must run the existing export-growth-audio.ts step before regenerating both voice banks. No audio generated or banks edited by this worker. Missing clips return silence through the existing Audio player; all prompts stay visible.

## Acceptance and QA ledger

Agent-executed affected-flow A07 on the offline web export. Required dimensions: touch-enabled Chromium at 390×844 and 1024×768. Extra layout checks: 320px, tablet portrait, phone landscape, larger browser text. No simulators; physical iPhone/iPad, native font scaling and VoiceOver remain family/operator acceptance. Browser fixtures are isolated localStorage contexts; no shared family saves.

Executed results and evidence paths follow.

### Execution record

- Tested code: `42e9af5a9bffbec3fe752cab5fea2160839877b7` for the complete A07 matrix. Final code adds `c33d4b9` (ignore callbacks whose round was replaced); affected new-round/action/reload and readiness/help flows are rerun on that export before delivery. No dependencies or native configuration changed.
- Environment: Chromium 1234, touch input, isolated localStorage, static offline export on assigned port 43841. Metro and simulators were not started. Reduce Motion was enabled for the main matrix. Browser forced text enlargement at 1.35× is layout evidence, not native Dynamic Type acceptance.
- Artifact root: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/learning-levels/`. Reproducible runner: `qa.ts`. Fixtures are constructed with the pure engines, validated with `parseSave` before navigation, and installed once before hydration. Gameplay actions use accessible touch locators. The runner reads the saved state to check the selected level, round identity, completed outcome and readiness notes.

| Scenario | Coverage and outcome | Evidence |
| --- | --- | --- |
| A07.1: shelf → setup → all five levels → first action | Passed for all 12 games at both 390×844 and 1024×768: 24 game/viewport cases, 120 level selections/starts/actions. | `qa-accepted-results.json`; `*-setup-1.png`, `*-setup-5.png` |
| A07.2: Level 1 complete, round-end path, reload mid-round | Passed within those same 24 cases. Each completed round was verified through the engine's saved outcome and the visible Play again control; the round ID survived reload. | `*-finished.png`; `qa-accepted-results.json` |
| A07.3: invitation / Stay here / no auto-advance | Passed at both required sizes for Levels 1–4. Seeding two independent summaries on distinct days enables the next invitation. Stay and Play again retain the level. Tapping the round-end path changes setup only, leaving the completed save intact until Start. | `qa-special-results.json`; `*-suggestion-1.png` through `*-suggestion-4.png` |
| A07.4: readiness exclusions and assisted reload | Passed at both sizes: same-day rounds, helped history, answer-only history, no history, together, family, different owner and Level 5 produce no invitation. An actual Show me action survives reload and ends as helped, with no independent summary. | `qa-special-results.json` |
| A07.5: 1.7.0-shaped saves and learner memory | Passed at both sizes for all 12 games: legacy rounds omit the evidence flag, open at the derived level, accept an action and retain identity after reload. Remembered choices are used on fresh visits and when replacing another learner's round. | `qa-special-results.json` (52 cases total across A07.3–A07.5) |
| A07.6: narrow / larger text / orientation | Passed: all 12 setup paths at 320×740 with 1.35× browser text, plus math/reading samples at 768×1024 and 844×390. Five targets remain at least 44px wide/high and within the viewport; Start remains visible. | `qa-layout-results.json` (18 cases); `*-layout.png` |

The first browser run found that `accessibilityState.selected` on a button did not expose selection in React Native Web. Fixed with a radio group and explicit checked state; the subsequent matrix verifies `aria-checked`. Later harness failures targeted a path behind an open sheet, used an incomplete stone label, or installed a fixture during hydration. Those locators/fixtures were corrected and the cases retested; original failure artifacts are retained (`qa-initial-radio-defect.json`, `qa-initial.log`, `*-FAILED.png`). They are not treated as passed gameplay evidence.

The full level-name table and within-round ordering decisions above are implementation acceptance. Native device behavior, physical touch comfort, VoiceOver, real Dynamic Type and family acceptance remain not run by this worker, as required by the no-simulator slice. CodeRabbit/independent integration review, audio generation and private distribution belong to the lead; no PR or merge was attempted.

### Shared integration edits

- `src/learn/home.ts`: additive `shelfLevel` helper and imports, selecting the active learner’s current round or remembered choice.
- `src/state/Store.tsx`: import `recordLevelRound` and wrap the accepted learning-save commit with it. All summary logic lives in `src/learn/levelEvidence.ts`. No other Store behavior changed.
- `scripts/export-growth-audio.ts`: import and spread `levelSpeech` into the existing exporter source, as required by the speech brief. No generated manifest or voice bank was changed.

No changes to arcade, board games, Settings, app version/build numbers, native project files, dependencies or lockfile.

### Final-source retest and gates

Final application source: `c33d4b91cebbc891153d7d8ecff93babcc649ae6`; offline export shell `721b06b0ad1a` (5,557 bundled resources). Documentation-only commits after this do not change the tested application.

| Check | Result | Evidence |
| --- | --- | --- |
| Full gate: typecheck, lint, tests and web export | Passed: 593 tests in 46 files; successful offline web export. | `check.log` |
| Expo Doctor | Passed: 21/21. | `doctor.log` |
| Advisory Impeccable 4.6.0 scan | Passed; empty findings array for all changed UI paths. | `design.json` |
| Replaced-round callback fix | Passed at both sizes for all twelve foundation games: start → action → replace with Level 2 → action → reload retains the new round and level. | `qa-final-smoke-390-results.json`, `qa-final-smoke-1024-results.json` (24 cases) |
| Readiness, round-end selection, Stay, legacy and learner choices | Full 52-case matrix repeated and passed on the final export at both required sizes. | `qa-special-results.json`, `qa-special-final.log` |
| Extra help and missing clips | Passed at both sizes: actual Peek, Hint and spelling-help actions persist after reload, finish as helped with zero independent summaries; choosing a level with sound enabled works when its new clip is absent. | `qa-edges-390-results.json`, `qa-edges-1024-results.json` (8 cases), `*-assisted.png` |

No required browser acceptance case remains failed, blocked or not run. The native/physical and lead integration responsibilities listed above remain separate. No further agents were delegated.

Runtime disposition: all task-owned preview/Chromium/runner processes were stopped, with no active owned resources remaining in lifecycle session `01a17ca4-a4f6-78f2-b79e-465ef6579086`. Assigned port 43841 was used; Metro 43840 was not needed. Borrowed simulators, shared services and other worktrees were left untouched. The clean implementation branch/worktree is retained for the lead to integrate; no PR, merge or public release was performed.

## 2.3: games with their own five levels (31 October 2026)

Sixteen games define their own Level 1–5 mechanics (`ownLevels: true`). The shared growth board does not apply to them. Each round has four or five tasks with help that counts as assisted, no timers, and validated, versioned saves. Shelves list every learning game with its age span, youngest first. Each learning island has at least three games, and Coding is a new island.

| Island | Game | Ages | Levels 1 → 5 |
|---|---|---|---|
| Reading | Letter Lagoon | 3–6 | Hello, letters → Letter twins → First sounds → Letter trails → Sound builders |
| Reading | Story Studio | 6–14 | Picture sentences → Sentence repairs → Sentence artists → Comic editors → Paragraph studio |
| Reading | Word Workshop | 7–14 | Word joinery → Word endings → Meaning makers → Root detectives → Context craft |
| Numbers | Times Tide | 6–11 | Fish in equal pools → Shell arrays → Skip-count reef → Area-model treasure → Fair fish shares |
| Numbers | Fraction Feast | 7–13 | Fair pie shares → Fraction footsteps → Fold the same amount → Combine the feast → Hundred-square market |
| Numbers | Treasure Algebra | 9–14 | Sunny steps → Below sea level → Missing treasure → Balance the chest → Two-step treasure |
| Science | Weather Watch | 4–10 | Weather wardrobe → Season garden → Water cycle → Weather chart → Forecast & prepare |
| Science | Food Web Reef | 6–13 | Reef feeding → Food chains → Branching webs → Population lab → Energy & care |
| Science | Star Station | 7–14 | Day & night → Moon phases → Planet builder → Gravity & orbits → Light, tilt & eclipses |
| Thinking | Pattern Path | 4–11 | Color trail → Growing shells → Skip and turn → Two clues → Number reef |
| Thinking | Shape Shift | 4–13 | Big pieces → Turn it → Flip the fish → Mirror island → Fold the net |
| Thinking | Logic Lagoon | 6–14 | Two friends → Picture grid → Little sudoku → Bigger lagoon → Cages and clues |
| Coding | Beep Bot | 4–6 | One little path → Around the corner → Find a way → Fix the arrow → Again and again |
| Coding | Turtle Draw | 6–11 | Lines in sand → Four sides → Loop a shape → Angles → Flowers and fixes |
| Coding | Tide Logic | 7–12 | Colour gates → Big or small → Two clues → Bell and counter → Trace the rule |
| Coding | Code Lab | 9–14 | Say and step → Scores and loops → Make a function → Find the bug → Tiny programs |

Crab Commands moves from Science & Thinking to Coding. The original twelve games keep the shared growth Levels 4–5 and their earlier age spans.
