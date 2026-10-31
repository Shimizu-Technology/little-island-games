# Little Island 2.0: the Islander, the Locker, Island Home, and a full-app audit

Authorized 29 October 2026. Stassie loves the arcade and asked for unlockable skins and characters, "like a simple Fortnite locker", and for something like Toca Boca. Leon set the direction:

> "for this avatar/islander … you have the home where you can style it and style their home and world and then in each game, that islander is used somehow - like in the subway surfer one, it's the actual character, maybe in the learning ones, it's on the side … doing some like learning animations or in a desk or running or jumping … that way it's like all cohesive … their character means something and … different badges and/or outfits and environments you can unlock based on how far you get in the science or math or reading or the arcade"

He also asked for:
- a thorough audit of every game (some are incomplete);
- fun for all ages, from kindergarten to middle school;
- a premium, legit look and feel;
- hands-on lead validation ("make sure … the characters arms or whatever aren't in the wrong places … nice and clean and easy to use");
- delivery to TestFlight.

Base: `feat/island-arcade` @ 86a6ae1, TestFlight 1.9.3 (18). Integration branch: `feat/islander`, owned by the lead (Claude). Target: **2.0.0 (19)**.

Evidence, all in `little-island-games-artifacts/`:
- `audit-2.0/{learn,classic,arcade,design}/REPORT.md`: four audits covering 120 learning-level runs, every classic, board and other game mode, all nine arcade games across 63 sampled levels, and the Locker and Island Home design study;
- `islander/`: phase worker evidence.

## What the audit found

Nothing crashes. Every game has a working loop, a win, a loss and a retry. The gaps are correctness edges, depth for older children, reward expressiveness, and cohesion.

**Correctness and usability (fix first):**
- An unclaimed chest disappears after any later loss (`src/arcade/progress.ts:80`).
- Palm Patrol's held fire carries into the next math fact.
- Home's "Continue" promises a saved arcade round but opens the map, and unfinished untimed puzzles (Reef) are lost on reload.
- Partial word-part answers are lost on reload.
- Parent notes mislabel foundation rounds and show internal IDs.
- Learners can't be renamed or removed. The active learner is buried in Settings, so it's easy to play as a sibling.
- Board games:
  - Hidden Canoes' result shows the wrong seat's count;
  - celebrations overlap result text and celebrate solo losses;
  - Mystery has no prominent Play again;
  - restoring a finished classic round can fire blocked audio on web.
- Balance:
  - Picnic Mystery's crew mode loses far too readily;
  - Number Island's Gentle mode can end after one move;
  - Island Dash has no gentle helper or rival strength;
  - Palm W1-1 needs up to 80 beetles.

**Depth for all ages (the largest gap):**
- All twelve learning games collapse into one generic quiz board at Levels 4–5.
- Math stops at about 3rd grade (no times tables, division, fractions, negatives or pre-algebra).
- Upper banks hold 12–16 items and repeat quickly.
- Reading has a narrow runway at both ends.
- Science asks about experiments rather than letting the child run them.
- Arcade learning worlds top out at early-elementary content, although World 6 is a real motor challenge.
- Board AIs top out at intermediate play.

**Premium and cohesion:**
- Home and shelves (restrained cream cards) and the Arcade (saturated illustrated world) feel like different apps.
- iPad layouts expose the portrait implementation.
- Maps need world jumps.
- The sticker book is read-only.
- Rewards are four preset looks per game.

## The vision: one Islander through the whole app

Each learner, including Family, gets **one Islander**: a customizable kid character drawn on a single two-view (front/back) pose rig with a layered wardrobe. The animal heroes stay as sidekicks.

| Where | The Islander's role |
|---|---|
| First launch / learner switch | "Make your islander": pick skin tone, hair and colour, outfit. The name chip shows who is playing on Home, shelves and maps |
| Locker | A dressing room with a large live preview and category tabs (Hair, Outfit, Hat, Accessory, Game styles). Tapping previews; **Wear this** commits. Locked items show exactly how to earn them |
| Lagoon Run | She is the runner (back view, same frame and collision contract) |
| Learning games | A companion beside the activity: thinks while you work, cheers a right answer, shrugs "try again", celebrates at round end. She sits at a desk in reading and math, and stands in science and thinking games |
| Results screens | A victory dance in her current look; the animal hero stays as a sidekick |
| Canoe Cargo | Captain on deck (Poko stays as first mate) |
| Board and classic games | Her portrait is your player piece and banner |
| Island Home | She lives there: a furnished room with a beach view. Play and Decorate modes; place furniture and stickers, sit and pose characters |

**Badges and tracks.** Separate badge paths for **Math, Reading, Science & Thinking, CHamoru words, Arcade and Classic games**. Each milestone unlocks themed style or environments, for example:
- Math: calculator watch, number-pattern tee, Math Lab room theme;
- Reading: library corner, storyteller cape;
- Science: lab coat and goggles, aquarium wall;
- Arcade: runner's gear, trophy shelf.

Badges hang on a wall in Island Home.

**House rules carry over:**
- No currency, purchases, ads, random or surprise rewards, timers, streaks or expiring offers.
- Stars stay progress, never something you spend.
- Help and Helper count, and speed never earns rewards.
- Every locked item shows its exact milestone, which can be met from more than one route (learning or arcade).
- Starter choices are generous: identity (skin, hair texture, basic styles) is never locked.
- Cosmetics never change hitboxes or gameplay.
- Reduce Motion is respected.
- Styles suit ages 4 to 13 and up, from cute to cool, and anyone can pick anything.

## Architecture

- **Rig** (`src/islander/`):
  - a pure look model and catalog with strict validation;
  - a pose-parameterized SVG rig in FRONT and BACK views;
  - a fixed paint order, wardrobe items declaring slot, views, layer and anchors, and hat/hair occlusion;
  - a pose library (front: idle, wave, cheer, clap, think, shrug, desk, sit, dance; back: the full Lagoon Run frame set);
  - static memoized SVG per pose and look;
  - a deep-link gallery for visual QA, removed before release.
- **Save:** root version stays 1. A new optional, separately versioned `personalization` namespace holds, per learner: look, earned items, completed milestones, unseen items, game looks and home. It is strictly validated and capped. Rewards come from a pure reducer that consumes accepted completion facts in the **same Store commit** as the finished game. Migration is idempotent:
  - existing outfits, stickers and pending chests are preserved;
  - existing arcade stars are backfilled into milestones;
  - a returning-learner welcome set is granted where learning history exists.

  Backup and restore round-trip the namespace.
- **Completion ledger:** a separate durable list of distinct milestone IDs, independent of the readiness and learning notes (which exclude helped work and Family).
- **Island Home:**
  - one fixed illustrated room plus beach view, with Play and Decorate modes;
  - snapping floor grid and wall anchors;
  - a move/rotate/mirror/put-away toolbar, session undo/redo and a confirmed reset;
  - up to 32 instances and three characters;
  - autosave when a placement settles.

## Phases

Every phase:
- branches from `feat/islander`;
- uses one worker per non-overlapping slice;
- passes the full gate (`npm run check`, `npm run doctor`);
- is reviewed by the lead hands-on on a native Release simulator before merge;
- gets independent code review before release.

| Phase | Scope | Acceptance (lead-verified) |
|---|---|---|
| 0. Fixes | Every correctness/usability item above, plus balance: Picnic gentle crew, Number Island forgiveness, Dash helper and rival strength, a shorter Palm opener | Each reproduction from the audits now passes; regression tests |
| 1. Islander rig | Rig, look model, art-proof catalog, gallery | No limb, hand, hat or hair misplaced at 64/120/240 px in any pose; constant bone lengths; Run duck-clearance contract kept |
| 2. Identity and Locker | `personalization` namespace and migration; "Make your islander"; learner chip and switcher on Home and maps; rename/remove learners (grown-up gate); Locker UI; "new" badges | Create → style → wear → reload → switch learner → backup/restore round-trip; old saves load unchanged |
| 3. Islander in games | Lagoon Run runner = islander; learning companion in LearnFrame; results dance; Cargo captain on deck; board/classic portrait | Native frames: correct pose per event, no clipping; Run collision and duck tests unchanged; Reduce Motion |
| 4. Badges and tracks | Completion ledger; seven track badge paths; reward catalog (wardrobe plus room themes); result card "Try it on / Keep playing / Home" | A learning-only path and an arcade-only path each reach the same tier; no duplicate grants on retry/reload |
| 5. Island Home | Room and beach scene, furniture/sticker art, Play and Decorate, badge wall, room themes from tracks | Place, move, rotate, put away, undo, reload; never empties; earned items appear without rearranging |
| 6. Cohesion and premium pass | Unified shell framing (Home/shelves/arcade); deliberate iPad framing for Flight/Run/Palm/Beach; map world tabs; sticker book shows collected first | Lead walkthrough at phone and iPad sizes |
| Release | 2.0.0 (19) TestFlight with the release pipeline; docs and evidence | VALID / IN_BETA_TESTING in the Leon group |

**After 2.0, depth for all ages (2.1+):**
- learning games keep their own core action at Levels 4–5;
- an older math path: arrays and sharing → times tables and division → fractions and decimals → negatives and ratios → equations;
- larger generated and validated banks;
- more stories and reading bands;
- hands-on science experiments;
- a programmable Crab with loops and conditions;
- stronger board AIs and tactical puzzles;
- content bands for the arcade learning worlds.

These are sized L. They follow the Islander release so Stassie gets what she asked for first, and each new activity feeds the badge tracks built in phase 4.

## Decisions taken (Leon can override)

- Each child makes their own Islander on first visit; there is no fixed default character. Family gets a starter look.
- The animal heroes stay as sidekicks.
- Launch wardrobe:
  - 5 skin tones;
  - 4 hairstyles in 8 colours;
  - 4 starter outfits plus earned ones;
  - 3 hats;
  - 2 accessories at first;
  - growing with each track.
- One room in Island Home first; the beach and more rooms later if she uses it.

## Delivered as 2.0.0 (19)

All phases merged on `feat/islander`.
- Phase 0 fixes; the Islander rig (three art rounds, plus lead fixes to the back-view leg folding and hair tie).
- Island Home (two rounds, plus a portrait scene and beach).
- Identity: the `personalization` namespace, creator, switcher, Locker.
- The Run Islander, companion, results, Cargo captain and board portraits.
- The reward wardrobe and room themes.
- Badges: engine, wiring, backfill, wall, My badges, result card.
- A final polish pass.

**Independent review.**
- Round 1: four material issues (owner credit after a learner switch, entitlement bypass on restore, unknown IDs exhausting caps, warm-ups not earning) plus one minor (beach furniture drops). All fixed in 665b256.
- Round 2: the five fixes confirmed. One material issue remained (the creator racing the learner switcher's dismissal), fixed by a shared sheet-presence coordinator (1f73f70).

**Lead native walkthroughs** (iPhone 16 Pro simulator, Release).
- Walkthrough 1 found:
  - the creator modal freezing Home after Settings closed (fixed in 1acaa3b, verified natively);
  - a duplicate Islander on the Lagoon Run result (fixed in 96d2909).
- Walkthrough 2 verified natively:
  - add learner → Make your islander → Island Market → the Counter badge card → Try it on with the watch preselected;
  - Island Home: the badge wall, dragging the Islander to the chair to sit, autosave;
  - the Islander as the Lagoon Run runner.

  It also found five polish items (lock visibility, track-named rules, "Change my look", item-focused thumbnails, seat depth), fixed in f3a7fc9.

**Not verified:** physical-device feel, VoiceOver end to end, iPad hardware, and Stassie's own acceptance.

## 2.1.0 (20)

Leon on 2.0: why no gender or styling choice; the seated Islander shrinks but the crab doesn't; and he wants Toca-like customization. He approved the agreed scope (artifacts `islander/v21/LEON.md`).

**What 2.1 adds:**
- **Islander:**
  - a first step, "Who's your islander? Boy / Girl / Just me", which presets a look and locks nothing;
  - face options: brows, lashes, freckles, cheeks;
  - 6 more hairstyles and more colours;
  - 8 more outfits;
  - mix-and-match tops and bottoms.
- **Island Home v2:**
  - four rooms (my room, kitchen, tree house, beach hut);
  - 41 free furniture items with real-world sizes;
  - a colour picker;
  - stacking (several small items per surface);
  - a 2× finer grid;
  - 48 items per room.
- **Characters keep a constant size when seated.**

Creativity is free; badges still unlock the themed showpieces.

**Quality:**
- Independent review: one material finding (a surface held only one item), fixed.
- Lead native walkthrough found:
  - Decorate layout overlaps;
  - tiny new furniture;
  - an oversized tray;
  - a smeared aloha print.

  All fixed in 24cd52c.

## 2.2.0 (21)

Leon on 2.1: the numbered creator steps weren't intuitive; avatars weren't clearly boy or girl; he wanted Toca Boca-quality avatars, clothes, Locker and home, plus Subway Surfers, Flappy Bird and Crossy Road quality for the games and premium learning apps for learning, iterating against real references.

**Method:** the lead pulled official App Store screenshots (Toca Boca World, Subway Surfers, Crossy Road, Khan Academy Kids, Duolingo ABC) into artifacts `islander/v22/refs/` and wrote a style analysis (`v22/LEON.md`). Each worker iterated side by side against the references, and the lead rejected first passes until each reached the bar: avatar 2 rounds, Island Home 2, Crab 2, Run 2.

**What changed:**
- **Islander v3:** Toca-like proportions, a dot-eye face with expressions, 14 lock-built hairstyles, fashion-detailed outfits with their own colours, a shoes slot, and a boy/girl/neutral build. Boy versus girl reads at a glance; nothing is locked by gender.
- **Locker and creator:** a colour-grouped icon tab editor (Me, Head, Clothes, Extras) with big zoomed option circles; no numbered steps.
- **Island Home:** a frontal full-screen stage, lived-in room shells, richer furniture, light animations.
- **Lagoon Run:** a harbor world with a big runner, a busy boardwalk, shell trails, juice and a HUD.
- **Fruit Bat Flight:** night parallax, a big score, Get Ready, a shell medal and instant retry.
- **Crab Crossing:** a full-bleed angled block world with a follow camera, tap or swipe input, props and juice.
- **Learning:** subject colours, a journey progress bar, illustrated backdrops, a companion cheer, tactile answers, a celebration screen and shelf cards.

**Quality:** independent review found one material issue (landscape Island Home was unreachable) and one minor (the locked-item rule was missing on a deep link), both fixed with tests. The lead native walkthrough covered the Locker (boy preset), Island Home, Flight, Run and Crab.

## 2.3.0 (22)

Leon on 2.2: Crab Crossing's angle and zoom made it unplayable. He asked for Island Home navigation "however Toca Boca does it" (zooming in and out), coding fundamentals because Stassie wants to learn coding, and several solid games per category with proper levels from kindergarten or younger to middle school. Thinking had only one game.

**Method:** a lead-written contract (`learnIds`, the `coding` island, `ownLevels`, `levelNames`, `ages`) and seven parallel Codex slices: Crab, Home, Coding A, Coding B, Thinking, Numbers and Science. Reading was an eighth slice, and each slice had its own worktree and brief in artifacts `islander/v23/`. The lead reviewed every slice's screenshots against the references and the shared `LEARN_COMMON.md` bar, and sent second rounds where needed:
- Home: 2 rounds; the overview became a dollhouse.
- Coding B: 3 rounds, for missing art, then invalid Python order and centred code.
- Thinking: 2 rounds, for emoji pieces, a wrapped path and missing cages.
- Numbers: 2 rounds, for sheet bleed-through and a vertical sea-level line.
- Science: 2 rounds, for its blob explorer and identical fish.
- Coding A and Reading: 1 polish round each, for shelf icons and journey progress.

**What changed:**
- **Crab Crossing:** Crossy-style framing (58° elevation, about 12 rows visible, crab about 8% of the width) with a frame-rate-independent follow camera.
- **Island Home:** a two-floor dollhouse with a roof and ladder. Whole-house overview, pinch and double-tap zoom, two-axis pan with momentum, drag friends between rooms, and room chips as camera jumps. Also fixes for character depth and seating.
- **Coding island:** Beep Bot (4–6), Turtle Draw (6–11), Tide Logic (7–12) and Code Lab (9–14, valid Python-like code stepped line by line), plus Crab Commands. Adds a Coding badge track with four rewards.
- **Learning:** twelve more own-level games, three each for Reading, Numbers, Science and Thinking, with five levels each. Shelves show age spans youngest first, and every learning island has at least three games. See [LEARNING_LEVELS.md](LEARNING_LEVELS.md).
- **Speech:** warm and calm Kokoro clips for the new registered lines (letters, intros, Beep Bot, Science).

**Quality:**
- Round 1 of independent review found two material issues and four minor ones: a Turtle Draw redraw could stall a round, Treasure Algebra divided only one pan, plus a decimal label, a repeated Pattern Path level, Reduce Motion and 44pt cells. All six were fixed with regression tests.
- Round 2 approved the fixes and the Home delta. Its one minor finding (a cancelled pinch) was fixed.
- The lead's native Release walkthrough covered Crab Crossing (framing and follow), the Island Home dollhouse, the Coding shelf (ages and icons), Code Lab Level 3 (Menlo code, faithful def → call → body ×3 execution) and Weather Watch (the Islander in a raincoat).

## 2.4.0 (23)

Leon's feedback on 2.3 Island Home:
- On the bed, the avatar stood through it with its legs showing.
- Furniture stuck outside the house.
- Moving the avatar and crab felt clunky.
- Nothing could move outside Decorate.
- "Download Toca Boca … keep iterating … till our world is good like Toca Boca."

**Research.** The lead installed Toca Boca World 1.141.1 on the Mac and played the first-run flow: the globe, the creator, "Let's build a home" and the district map. macOS cannot inject touch-drags into Unity, so drag behaviour came from two other sources:
- Toca's official parent guide ("Move characters around…", "dragging objects to their hands", "edible items to their mouths", "tap some objects, like a water faucet or doors");
- frame-stepped gameplay video.

A parallel code audit traced every defect to file:line. The research artifacts are in `islander/v24/`: TOCA.md, AUDIT-HOME.md and refs/.

**Contract.** `src/home/world.ts` defines:
- poses decided by furniture (stand, sit, lie, bathe);
- sockets on furniture;
- capabilities: move in Play, holdable, edible, toggle, dispenses;
- back and front art layers;
- visualBox, the drawn bounds used for containment.

**Slices.** The lead reviewed every round's screenshots against the Toca refs, then checked natively on iOS.
- **ART** (3 phases):
  - rig poses lie, lie-asleep, bathe, sit-side, hold, eat and drink, with the `held` hand node;
  - furniture split into back and front layers, with sockets, so blankets cover legs and tubs hide bodies;
  - CrabFriend as a small pet;
  - living props: lamps, sink water, TV, radio, an opening fridge, a fruit bowl, six foods and drinks with empty states, and four toys;
  - a flat front-on kitchen.
- **ENGINE** (4 rounds):
  - one Play mode where anything moves, plus a Design mode (✓ to finish);
  - `resolveDrop`, which never rejects a drop: hand, mouth, socket, surface, then floor, with live preview, a headboard band and a never-hidden rule;
  - hold, eat, drink and toggle, plus dispensers that never run out;
  - containment clipping and out-of-bounds repair that keeps the original bytes;
  - save v3 with strict socket validation and lossless v1/v2 migration;
  - recomposed starter rooms;
  - minimal round chrome, Find my friends, and a native pose-host reset.

**Quality.**
- **Independent review round 1:** two material findings. Socket validation could be bypassed, and a successful restore didn't keep the incoming bytes.
- **Round 2:** one migration gap remained (implicit legacy seats).
- **Round 3:** approved, with a sweep of all 60 historical slot × anchor combinations.
- **Lead native Release walkthroughs** (iPhone 16 Pro simulator, iOS 18.5, three builds) found and verified fixes for:
  - a starter bed clipped by the wall;
  - over-strict bed drops;
  - a friend hidden behind the bed after a headboard release;
  - a crowded kitchen and a floating "Items" pill;
  - a native-only stale lying transform after leaving the bed.

  The final build passed bed lie and sleep for the Islander and the crab, the headboard release, lift-out, Find my friends, fridge and food fan, sink water, and moving the lamp in Play. Nothing renders outside the walls.
