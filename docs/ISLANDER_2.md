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
| 4. Badges and tracks | Completion ledger; six track badge paths; reward catalog (wardrobe plus room themes); result card "Try it on / Keep playing / Home" | A learning-only path and an arcade-only path each reach the same tier; no duplicate grants on retry/reload |
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
