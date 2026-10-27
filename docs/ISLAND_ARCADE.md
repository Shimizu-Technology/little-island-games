# Island Arcade, board classics and learning levels

Authorized 27 October 2026. Leon asked for arcade games in the spirit of Flappy Bird, Subway Surfers, Tetris and Block Blast, older classics with an island twist, learning built into the games, and a clear easy-to-hard level system for the learning games. He asked for all of them to be built properly and delivered to the private TestFlight group.

Base: `feat/learning-growth` at `01d5e68` (private TestFlight 1.7.0 (13)). Integration branch: `feat/island-arcade`, owned by the lead (Claude). Target build: **1.8.0 (14)**. PRs 13–15 remain held for family acceptance, so this work stacks on them.

## Leon's decisions

- **Inspiration is fine.** Close mechanics are accepted for this private, non-commercial family build. We still use our own names, art and island setting, and we never put another game's name in the UI. Public release stays a separate gate.
- **Fun and enticing, not manipulative.** Kids should want to play, and parents should trust what they're playing.
- **Learning inside the games.** This includes problems between levels and learning built into the mechanics.
- **Build all of them properly**, not a sample.

## House rules for every arcade and board game

Allowed:
- Level maps grouped into worlds
- 1–3 stars per level with goals shown before play
- New worlds that open with stars
- Cosmetic outfits or trails that unlock with stars
- A shared sticker book
- Personal bests and a local family high-score board using the remembered player names
- Celebrations, music, sound effects and haptics

Never allowed:
- Currency, purchases, ads or external links
- Lives or energy that refill over time
- Streak penalties or notifications
- Random paid-style rewards. A chest always shows which sticker it holds before it's opened.

Other rules:
- **Gentle start.** The first world of every game is forgiving and teaches by showing. Each real-time game has a **Helper** option (slower speed, wider gaps, or bumps that cost time instead of ending the run). Stars stay earnable with Helper on.
- **Grown-up controls,** behind the existing grown-up gate: unlock every level, and an optional **arcade break reminder** (off by default; 15/20/30/45 minutes). The reminder appears only between levels, never during play.
- **Learning:**
  1. **Treasure chest.** After a cleared level, an optional chest offers one question from the existing practice engine (`src/practice`) at the active learner's practice settings, or the game's natural subject. Help is always available and helped answers count. A wrong answer gives a hint and another try. Skipping costs nothing; a chest comes back after the next level. Solving it adds the shown sticker. Results go to the existing learner and practice notes.
  2. **Learning world.** Every arcade game has at least one world where the learning is the mechanic itself. See the game table.
  3. **Reading is never under time pressure.** In real-time games, reading only happens in paused or turn-based moments. Quick math choices in a slow learning world are fine.
- **Saves.**
  - Progress is stored per learner, using the active learner from `src/learn/learners.ts` with "family" as the default. It covers stars, open worlds, stickers, outfits, bests and settings, kept in new optional, strictly validated fields; the save version stays 1.
  - Old saves load unchanged. Corrupt data is preserved through the existing recovery path.
  - A level in progress in a real-time game is not saved. It pauses on background, sheets and navigation, and restarts if the app is closed.
- **Platforms.** Native iPhone/iPad and the offline web export (first load online, then offline), in phone and tablet sizes, portrait and landscape where the game allows. Touch first; keyboard on web is a bonus.
- **Performance.** Smooth play on the 2019 iPad mini (5th gen, A12) class of device. Real-time games show their frame budget in the kit's dev overlay. Simulator numbers are evidence, not physical acceptance.
- **Accessibility.**
  - Large touch targets and labelled controls.
  - Color plus shape for meaning.
  - Reduce Motion removes decorative motion only, never the gameplay.
  - Text is always visible when sound is off.
- **Content.**
  - Original vector art and original names.
  - CHamoru words only from the existing source-backed list in `src/learn/content/chamoru.ts`, with exact spelling and no new terms. English names otherwise.
  - Latte stones are not used as game pieces.
- **Speech.** New spoken lines are English and are registered with the existing narration generator source (`scripts/generate-neural-audio.py`). Workers do not run Kokoro; the lead generates both voice banks once at integration. Until then, games must work with the clip missing: text stays visible and the tone falls back.

## Arcade games (new Arcade island on Home)

| Game | Inspired by | Island version | Learning world |
|---|---|---|---|
| Reef Builder | Block placement puzzles | Drag coral pieces onto an 8×8 reef; full rows and columns release fish. Level goals: clear lines, free trapped fish, reach a score. No timer | Number pieces where a line clears when it makes 10 (or a goal sum) |
| Shell Song | Simon | Shells glow and sing a growing pattern to repeat | Shells say letter sounds that build a short word, then she picks its picture. Untimed |
| Rail Parade | Snake | A Guam rail leads a growing line of chicks and avoids the brown tree snake | Step mode (moves only when she swipes): collect numbers in counting or skip-counting order, or letters to spell the pictured word |
| Crab Crossing | Frogger | Hop land crabs across the road and the lagoon logs to the sea | Hop the stones in number-line order |
| Palm Patrol | Space Invaders | Launch coconut husks to stop rhinoceros beetles before they reach the palms | Slow beetles carry answers; stop the one that matches the math fact |
| Beach Ball | Pong / air hockey | Two players at either end of one iPad, or vs. the computer | Chest between matches |
| Fruit Bat Flight | Flappy Bird | A fruit bat flaps between palm trunks at night. Helper bumps cost time, not the run | Slow flight through the gate with the right number (math only) |
| Lagoon Run | Lane runners | Three lanes on the beach and lagoon: swipe to switch, jump coconuts, duck palm fronds | Lanes marked with answers in a slow math world |
| Canoe Cargo | Falling-block puzzles | Falling island cargo pieces on our own board size and art (not 10×20, no copied colors or ghost-piece look) | Cargo carries numbers; rows that make the target sum count double |

## Board classics (Classic games island)

| Game | Inspired by | Notes |
|---|---|---|
| Coconut Drop | Four in a row | Computer opponent (3 strengths), two players on one device with family match |
| Fishing Nets | Dots and boxes | Small to large boards; computer opponent |
| Hidden Canoes | Battleship | Find canoes hidden in the lagoon grid; letter-number coordinates; no war theme |
| Shell Pits | Mancala | Counting and planning; shows how many shells will land before the move |
| Reef Sweep | Minesweeper | Find pearls while avoiding sea urchins; gentle sizes and a safe first tap |

## Learning levels (existing learning games)

The shipped build already has five difficulty steps per learning game: three foundation paces (Gentle, Growing, Challenge) and two concept stages (Stretch, Deep). They're hidden in the setup sheet. The change:

- Show each learning game as **Level 1–5**: foundation easy/medium/hard → Levels 1–3, `stretch` → Level 4, `deep` → Level 5. Each level has a short plain name, e.g. "Level 2 · Sounds like sh and ch".
- Show the level prominently in the game header and as a five-stone path in setup and at the end of a round. Island shelf cards show "Level N of 5".
- Start at Level 1 the first time, and after that continue at the learner's last level.
- At the end of a round, suggest "Try Level N+1?" only when that learner has independent success at the current level across at least two rounds on different days. Speed never counts. Never advance automatically, never lock a level, and keep every level choosable.
- Where content has a difficulty signal, order a round's items from easier to harder, without breaking the validation of existing saved rounds.
- Old saves and options keep loading; the level is derived from the existing `pace` and `stage`.

## Acceptance ledger

| ID | Scenario | Status |
|---|---|---|
| A01 | Arcade island: Home → Arcade → game → level map → play → stars → chest → sticker → back, phone and iPad, native and web | Pass (web, all nine games, 390×844 and 1024×768; unify QA 72/72). Native Release: Home → Arcade → each of the nine games → map → start → play on iPad mini (5th gen) iOS 18.5 simulator; iPhone 16 Pro run recorded below |
| A02 | Every arcade game: every world reachable (grown-up unlock), first level of each world played to a result, learning world played, Helper on/off | Pass (web): first level of every world, each learning world and Helper on/off for all nine games across the worker QA ledgers in ARCADE_GAMES.md and the unify report |
| A03 | Chest: skip, wrong then help, correct; sticker saved per learner; practice notes record helped/independent | Pass (web): skip, wrong then help, correct; sticker saved per learner. Learning-world credit: wrong answers now mark the round helped in all nine games (review rounds 1–2 fixes 9b025f8, 5de5861) |
| A04 | Pause/resume on background, sheet and navigation; restart after kill; Reduce Motion; sound off shows text | Pass (web): pause on background/sheet/navigation, restart at map after reload, Reduce Motion, sound off. Native background pause covered by the kit run; physical device not run |
| A05 | Real-time frame budget on owned iPad mini Release simulator and web export; no dropped-input regressions | Partial: web export p95 ≈ 9 ms (120 Hz host) for every real-time game; iPad mini 5 Release simulator plays all nine smoothly by observation. Physical A12 hardware not measured |
| A06 | Board classics: every game vs. computer at 3 strengths and two-player to a finished game with family match, save/reload mid-game | Pass (web): every board classic vs. computer at three strengths and two-player with family match, mid-game reload exact (BOARD_CLASSICS.md). Native: Coconut Drop opens on iPad simulator |
| A07 | Learning levels: Level path visible for all twelve games; level mapping round-trips; suggestion only after independent multi-day success; legacy saves load | Pass (web): Level 1–5 path for all twelve games, readiness rule, legacy saves (LEARNING_LEVELS.md). Native: "Level 1 of 5 · Cat, hen and sun" on iPad simulator |
| A08 | Saves: new fields validated; malformed data preserved via recovery; backup/restore round-trip includes arcade progress | Pass: strict validation, malformed-save preservation, backup round-trip incl. arcade progress (kit/unify QA); 324 legacy rounds load (review round 1) |
| A09 | Full gate (`npm run check`, `npm run doctor`), advisory design scan, independent final-code review | Pass: npm run check (826 tests), Doctor 21/21, advisory design scan clean; independent reviews: round 1 (one material, fixed), round 2 (two material, fixed), round 3 on the fixes |
| A10 | Both voice banks regenerated and decoded; offline web reload with server stopped | Pass: 280 new clips (140 lines × warm/calm) generated with the pinned Kokoro banks, all decode; offline reload with server stopped passed in worker QA |
| A11 | 1.8.0 (14) signed, uploaded, VALID and available to the existing Leon internal group | Pass: 1.8.0 (14) from 91685c1, Apple build 165fbf73-3a09-48ea-ae4b-a29c88ab0238 VALID / IN_BETA_TESTING in the Leon internal group (TESTFLIGHT.md) |

Physical iPad play, audio comfort, VoiceOver and whether Stassie chooses these games remain family acceptance on real hardware.
