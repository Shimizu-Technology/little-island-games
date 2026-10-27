# Arcade feel v2: make the games feel legit

28 October 2026. Leon installed 1.8.0 (14) on his iPhone and played the arcade games. His feedback, verbatim in substance:

> A bunch of the games feel like trash. Flappy Bird is so slow and sluggish, it doesn't feel legit. In the Subway Surfers one the stuff coming in comes from off the road or off the screen and it feels terrible; the animations are terrible. You need to be able to lose — in the flappy one if you hit something you die, or maybe you have a few lives. There need to be a bunch of levels, and it shouldn't start so easy that it isn't rewarding. Tetris is too slow, it feels delayed. Other things like this. Review it all and fix it all properly.

This document replaces the "never lose / Helper bumps cost time" rules in ISLAND_ARCADE.md for the arcade games. Learning games are unchanged. The house rules about **no currency, no purchases, no waiting timers, no streak penalties, no ads or links, reading never timed** still hold.

## Root causes found in 1.8.0 (lead diagnosis)

1. **Helper is on by default** (`emptyArcadeLearner().helper = true`) for every learner and game. Helper slows physics (bat ×0.78 speed, gentler gravity; cargo fall ×1.8) and turns crashes into "Whoops! Keep going". So the default experience is slow and can't be lost.
2. **Controls fire on release.** All 42 arcade `onPress` handlers trigger on touch-up; there are no `onPressIn`, no hold-to-repeat, and no native gesture handling. Every tap feels 80–250 ms late, and holding a direction does nothing.
3. **Discrete state reaches the screen late.** `useArcadeLoop` pushes a React snapshot at most every 100 ms. Things rendered from the snapshot (Cargo's landed blocks and cleared rows, HUD counters, many overlays) appear up to 100 ms after they happen, while the next piece is already moving.
4. **Canoe Cargo:** 1 row/s or slower at the start (×1.8 with Helper), instant lock with no lock delay, no hold-to-repeat move, soft drop is tap-per-row, only "gentle" shapes early.
5. **Lagoon Run:** obstacles are projected with `y = h·(0.34 + 0.62·z²)` and their own lane formula, while the road is drawn by separate scenery art with a different vanishing point. Objects start above the horizon (in the sky) and drift in from beside the road. There's a single obstacle per row, no run cycle (the hero just bobs), no proper lane-change, jump or slide animation, and an instruction banner sits over the play area during play.
6. **Fruit Bat Flight:** slow scroll and soft gravity, hits never end the run, the feedback banner covers the bat, and the bat only flaps from a button (not a tap anywhere).
7. **Too few, too gentle levels:** 3 worlds × 8 + 8 learning. World 1 is mostly tutorial, so there's little reward.

## Shared requirements (all nine arcade games)

**Input**
- Every game control fires on **touch-down** (`onPressIn` / gesture begin), never on release. Directional controls **auto-repeat while held** where the original genre does (DAS/ARR style), and swipes trigger when the finger passes the threshold *during* the move, not on lift.
- The whole playfield is a touch target where the genre expects it (flap anywhere, steer by swipe anywhere).
- Use `react-native-gesture-handler` (SDK 57 compatible, installed with `npx expo install`) where it gives lower latency or multi-touch (Beach Ball's two paddles, Reef drag, runner swipes).

**Frame and latency**
- Anything that moves renders every frame through shared values (`ArcadeSprite`) or UI-thread animation. React re-renders during play are limited to discrete events, and the board's art must be memoized so a HUD update doesn't re-render sprites.
- Discrete events (piece lock, line clear, hit, pickup, score) must reach the screen in the **same frame** they happen in the engine. Push the snapshot immediately on an engine event, not on the 10 Hz timer.
- Fast real-time games (Fruit Bat Flight, Lagoon Run, Palm Patrol, Beach Ball) should run their step on the UI thread (`useFrameCallback` with worklet-safe pure engines) or prove with a simulator video that the JS loop holds 60 fps with no hitches during play. Document which you chose and why.

**Losing, lives and game over**
- Real-time games have **lives shown as hearts** in the HUD: 3 by default, 5 with Helper. A hit costs a heart, plays a hit reaction (flash, knockback, sound, haptic) and gives about 1.2 s of blinking invulnerability. At 0 hearts, a **Game over** screen shows the score and best, with **Try again** (instant restart of the same level) and **Map**.
- Fruit Bat Flight in free play is **one hit = game over**, like the original, with a best score.
- Puzzle games lose the original way: Cargo tops out, Reef Builder runs out of moves.
- A loss never removes earned stars, stickers or outfits.

**Helper**
- **Off by default** for the arcade (`emptyArcadeLearner().helper = false`; existing saves keep whatever was stored, but flip a stored default-true to false once via a validated migration flag).
- When on, it means a little slower, 5 hearts and a wider margin, never invincible. It's a small toggle on the level-start card and in pause.

**Difficulty and levels**
- **6 worlds × 8 levels + an 8-level learning world = 56 levels per game.** Stars needed to open worlds: 0 / 12 / 30 / 50 / 75 / 100. World 1, Level 1 must already feel like the real game (a short level, not a tutorial). Teaching happens in the first 5 seconds, by showing.
- Each level ramps within itself (speed and density rise across the level), and each world ramps across its 8 levels. Every world adds one new twist: a new obstacle, pattern or rule.
- **Stars must be earnable but not free.** One star for finishing, two and three for real skill (no hits, collectibles, speed). Document each game's star rules.
- Extend `LevelId`/`WorldId`, the validators, the map and the registry worlds (new world names and palettes for every game), keeping old saves valid. Stars for `w1-1`…`w3-8` and `learn-*` stay as they are.

**Feedback and animation**
- Hero animation sets: idle, move, jump/flap, hit and celebrate, as frame-based or procedural motion (squash/stretch, tilt with velocity, run-cycle legs).
- No text banners over the play area during play. Short pop-ups ("+1", "Nice!") appear away from the hero and fade in under 0.6 s.
- Every action gets a sound, and hits and clears get a haptic.

## Per-game targets

| Game | Must feel like | Concrete targets |
|---|---|---|
| **Fruit Bat Flight** (Flappy) | Snappy, twitchy, fair | Tap **anywhere** to flap, on touch-down. Flap sets an upward velocity instantly (not added). Strong gravity with a terminal velocity. Nose tilts up on flap and down when falling. Constant horizontal scroll that feels brisk at W1-1 (an obstacle about every 1.3–1.5 s). Gap shrinks and speed rises by world, and later worlds add moving gaps, then wind. Ceiling/ground and trunks are hits. Hit: bat tumbles, heart lost, respawn in the gap centre. 0 hearts: game over. Score +1 per gap with a crisp "ding". Level goal: pass N gaps (W1 12–20 … W6 40–60). |
| **Lagoon Run** (lane runner) | Fast, readable, polished | **One camera model** (horizon y, focal length, road half-width) drives both the road drawing and every object, so objects appear **on the road at the horizon** and grow along their lane line. Road surface scrolls (stripes or texture). Run cycle (legs and arms). Lane change tween ≈120 ms with lean. Jump arc ≈0.55 s with squash on land. Slide ≈0.6 s. Obstacle *patterns*: two lanes blocked, low/high obstacles, moving crabs. Shell trails to collect. Speed ramps through the level. Hit: stumble, flash, heart lost. Swipes fire mid-move. No instruction banner during play (teach once on the first obstacle with a ghost hand, then never again). |
| **Canoe Cargo** (falling blocks) | Crisp, immediate | Touch-down input. Hold left/right auto-repeats (DAS ≈170 ms, ARR ≈50 ms). Hold soft drop (≈20× gravity). Hard drop instant with a drop trail. **Lock delay 0.5 s** with move/rotate resets (max 15). A 7-shape set with a 7-bag randomizer (keep our own art, colors and board size). Gravity by world starts around 0.8 s/row at W1-1 and reaches about 0.1 s/row by W6. Ghost/landing outline in our own style. Line clear flash ≤250 ms without blocking the next spawn's input. Landed blocks render in the same frame as the lock. Top-out = game over. Swipe controls on the board as well as buttons. |
| **Palm Patrol** (invaders) | Responsive shooter | Launcher follows the finger on the UI thread (drag anywhere on the lower area). Tap or hold to fire with a short cooldown. Beetle formation marches and speeds up as it thins, divers in later worlds. A beetle reaching the palms costs a heart. Boss beetle per world. |
| **Beach Ball** (pong/air hockey) | Physical, fast | Paddles track fingers 1:1 on the UI thread (multi-touch for two players). Ball speeds up on each rally hit, and the paddle edge angles the bounce. The computer at three strengths can be beaten but isn't trivial. Points to win per level, with goals for stars. |
| **Crab Crossing** (frogger) | Snappy hops | Hop on touch-down with a ≈120 ms hop animation and input buffering. Traffic and log speeds ramp by world. Hit by a car / falling in the water: splat or splash, heart lost, back to start of the current zone. A timer is **not** used. |
| **Rail Parade** (snake) | Tight control | Turn on touch-down or swipe with a 2-turn input buffer. Tick speed ramps through the level. Hitting a wall, snake or yourself costs a heart (3) with a short respawn. Smooth interpolation between grid cells. |
| **Reef Builder** (block placement) | Tactile | Drag follows the finger with no lag (shared values / gesture handler), lifted above the finger so it's visible. Snap preview, satisfying clear burst. A run ends when no piece fits (lose), with a best score. Later worlds start with blockers. |
| **Shell Song** (Simon) | Musical and clear | Taps respond on touch-down with an instant note and glow. Tempo rises by world. A wrong note costs a heart (3 hearts); 0 = game over. Patterns are longer in later worlds. |

Learning worlds keep their current rules (untimed reading, math choices at a slow pace), but use the same input and animation quality.

## Acceptance (lead QA)

- Unit tests for each engine's new rules: lives, game over, lock delay, DAS, bag randomizer, projection math, level data for all 56 levels, and save migration of old stars and the Helper flag.
- **Simulator video evidence** per real-time game (`xcrun simctl io <udid> recordVideo`) on a Release build: frame-step through the recording and confirm steady motion, objects emerging on the road at the horizon (Lagoon Run), immediate response to touch-down, and a game over reached.
- Full gate, Doctor, an independent review, then build **1.9.0 (15)** to TestFlight.
