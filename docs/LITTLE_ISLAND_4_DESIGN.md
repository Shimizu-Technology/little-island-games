# Little Island 4.0 Clean

The design spec for the Little Island 4.0 Clean redesign. This is the source of truth for 4.0 screens. A PR that builds or changes a 4.0 screen keeps that screen and this document in agreement. Old screens stay reachable until their replacement lands (see Phases).

Status: direction approved by Leon, 26 November 2026. Plan: `little-island-games-artifacts/v4/CLEAN-4.0-PLAN.md`. Reference: TraceBuddy 2.0 (`tracebuddy/docs/TRACEBUDDY_2_0.md`). Clickable prototype: `little-island-games-artifacts/v4/clean-4.0/prototype/index.html`.

## Decisions

| Question | Decision |
|---|---|
| Pillars | All five stay: Toca-style Home, Learning, Plane Puzzles, Nostalgic Arcade, Family Classics + Library. Nothing is removed; clutter is cut, folded or gated. |
| Map | Six doors: **My Home**, **Learn**, **Arcade**, **Puzzles**, **Game Hall**, **Library**. Locker and Badges fold into My Home. |
| Difficulty words | Plain words everywhere: `Easy · Medium · Hard · Expert · Master`, plus a size tag such as `4×4` or `9×9`. Water-depth band names leave the UI. |
| Learning modes | One level path per game. School, Challenge, Deep Water, Endless and Dares stop being separate tabs or screens. |
| Grown-up knobs | One gated **Grown-ups** sheet holds every setting that is not part of playing. |
| Play together | One toggle on the start sheet. No paragraph sections. |
| Puzzle shelf | 4.0 ships 13 puzzles plus Reef Sweep (see Puzzles). About 18 niche games are deferred; built ones keep their saves. |
| Saves | No change to envelope 3 / profiles 2 or any save format. 4.0 Clean is a presentation change. |
| Art | Phase 0B art test decides the illustrated style. Until then, screens use the current art inside the new layout. |

## Who it's for

- **A little one (2–5)** who can't read. Recognizes doors and games by picture, taps big things, never gets stuck, and can't break the family's saves.
- **Stassie (7)**, who loves the Toca-style Home, Coding and the Arcade. Wants to get to her room, her Islander and her next level in one or two taps.
- **An older kid (9–14)** who wants real difficulty in learning games and puzzles, without baby chrome in the way.
- **A grown-up who isn't comfortable with tech**, such as a grandparent, or Leon on a plane. Opens a Sudoku at their level in two taps from the map and plays without reading instructions or knowing words like "band", "pack" or "tier".

## Design rules

Every 4.0 screen follows these. A PR that breaks one needs a written reason.

1. **Works without reading.** Every door, game and child-facing control is recognizable from its picture or icon. Labels help adults but never carry the meaning alone. When read-aloud is on, prompts have a speaker button.
2. **No jargon and no paragraphs on main screens.** Short everyday words only: `Continue`, `Play`, `Undo`, `Hint`, `More`, `Easy`. Explanations live in a picture tip or in Grown-ups. Status lines such as "Every band is open. Your puzzles wait for you." are cut.
3. **One main action per screen,** visibly larger and coral. Everything else stays quiet.
4. **Never cover the board.** Secondary options open in a short native sheet (`formSheet` with detents, at most 40% of a phone's height for in-game sheets) that swipes down to close. In a game, the board moves up and shrinks to stay fully visible; the sheet is undimmed so play can continue.
5. **One visual system.** Nunito type, one rounded icon family (Phosphor), the token palette below, 64 pt child targets and 48 pt adult targets (nothing interactive under 44 pt), and no cards inside cards. Components use `src/ui/theme.ts` tokens, never raw colors or sizes.
6. **Prototype first, ship in small waves.** Every major screen is tried in a clickable prototype on Leon's phone first, then ships in a `Little Island Dev` TestFlight wave so Stassie and Leon steer each step.

## Visual system

- **Type:** Nunito from `@expo-google-fonts/nunito`. Display 800, titles 700, body 600. Scale 34 / 28 / 22 / 17 / 15 / 13. Body never below 15. Dynamic Type up to accessibility sizes without clipping; the existing `wordFit` helpers stay for long words.
- **Color:**
  - background (island cream) `#FFFDF8`, surface `#FFFFFF`, hairline `#ECE7DC`
  - ink `#173330`, muted ink `#5B6B68`
  - lagoon (brand, headers, selected states) `#1E6B66`, lagoon soft `#DDF1EE`
  - action coral `#FF7A5C` with ink text, never white text on coral
  - success `#3E9B6A` on mint, gentle conflict `#C2410C` on rose (never red alone; conflicts also get a shape)
  - door pastels: My Home peach `#FFE3D6`, Learn sky `#DFF0FF`, Arcade butter `#FFF2C2`, Puzzles lilac `#F3E5FF`, Game Hall mint `#DDF5E6`, Library rose `#FFE0EC`
  - All text pairs meet WCAG AA. Color comes from the art and the one main action.
- **Shape:** tiles 24 radius, sheets 28, buttons fully rounded. Resting surfaces have no borders. One soft shadow (`0 4 16 rgba(23,51,48,.08)`) for floating things only (Continue card, sheets, the selected tile). No cards inside cards.
- **Targets:** child controls at least 64 pt; adult controls at least 48 pt; nothing interactive under 44 pt. Board cells keep their existing minimum hit sizes.
- **Icons:** Phosphor (`phosphor-react-native`), bold or fill weight, through one `Icon` component. No emoji in UI chrome. Game art stays game art.
- **Motion:** Reanimated springs (damping ~18, stiffness ~180) for sheets and tiles; 120–160 ms press feedback (scale 0.96) with a light haptic. No entrance animations on frequent screens. One celebration per finish. Reduce Motion gets still versions. The map walk (`WALK_MS` 380 + `ZOOM_MS` 160) stays.
- **Tokens** live in `src/ui/theme.ts`. The old `C` palette in `src/components/ui.tsx` stays for unmigrated screens and is deleted when the last one moves.

## Cut, fold, or gate

| Today | 4.0 Clean |
|---|---|
| **Map** | |
| Eight places: School, Library, Arcade, Game Hall, Home, Locker, Badges, Puzzle Cove | Six doors: My Home, Learn, Arcade, Puzzles, Game Hall, Library |
| Locker as its own place | **Closet** inside My Home (tap the wardrobe or the Closet button) |
| Badges as its own place | **Badge Wall** inside My Home (tap the wall frame or the Badges button) |
| Bottom dock: Continue (Cove) · School · Try today · Favorites | One **Continue** card for the most recent unfinished thing, across every pillar |
| "Try today" | Folded into Learn as one "Today" tile at the start of Subjects |
| Favorites dock entry | Long-press any game tile to favorite it; a Favorites shelf appears at the top of that door |
| "Everything" list icon | A quiet search button in the map header ("Find a game"), for grown-ups and readers |
| Settings lock (sound, practice, backups) | **Grown-ups** button, gated, opens the Grown-ups sheet |
| Learner chip | **Profile pill** (face + name). Tap opens "Who's playing?" with big faces |
| "little island" wordmark on phone | iPad only; the phone header keeps its space for the pill |
| **Puzzles (Cove)** | |
| Band names Paddling / Shallows / Lagoon / Reef / Deep / Trench | `Easy · Medium · Hard · Expert · Master` with a size tag (`Easy 4×4`) |
| "Think as long as you like." + "Every band is open…" + Tide Table explainer | Cut. No status prose on Puzzles home |
| Horizontal rows of text tiles ("Sudoku · 1,200 puzzles · all bands open") | Picture tiles in five sections: Numbers, Words, Logic, Cards, Originals |
| Per-tile "Bands & packs" and "☆ Favorite" buttons | Tap a tile to open its sheet; long-press to favorite |
| "Today · Tide Table" row of three | One "Today" tile at the top of Puzzles that deals today's Medium puzzle |
| "Bands, packs and all puzzles" under every board | "Choose a puzzle" in the board's More sheet, opening a simple numbered grid for the current difficulty |
| Packs / All puzzles / Album / Mixed practice chips | One numbered grid per difficulty with finished ticks. Album and Mixed practice move into that grid's filter (adults only) |
| "Solve together" paragraph + partner chips | "Play together" toggle on the start sheet, showing family faces |
| "Reader level, mistake settings and grown-up choices" button | Mistakes in the board's More sheet; reader level, hidden puzzles and fill notes in Grown-ups |
| "Try this one · pin to a person" | More sheet: "Send to…" (faces). Pins still appear in that person's Continue |
| "Help · show me how" + "Helping a child? Ask what they notice…" | `Hint` in the HUD. The coaching line moves into Grown-ups › Helping a child |
| Role card text under the board | Small "Roles" item in More while playing together |
| "← Cove" text button + title + people picker above the board | Board HUD: `←`, `Undo`, `Hint`, `•••` |
| ~18 niche games on the shelf | Deferred (see Puzzles › Shelf) |
| **Learning** | |
| School subject shelf + intro line "Choose a place to begin…" | Learn: six subject picture tiles, no intro line |
| School levels / Challenge / Deep Water / Endless Tide as separate choices | One level path per game: Level 1 → … → Level N → Deep Water → Endless |
| Optional Dares chips and explanation | A small dare mark on a level node; "Add a dare" toggle on that level's start sheet (hidden for young children, as today) |
| "How shall we play?" mode chips (solo / versus / together) | "Play together" toggle on the level start sheet; "Who goes first?" appears only when it is on |
| "What shall we practise?" and pace chips | The path picks the level; practice focus and pace move to Grown-ups › Learning |
| **Arcade** | |
| World buttons + "Current level · R-3" button + Free play card with record and score history notes | World pager (swipe, with dots); the current level bounces; one coral `Play` for it; quiet `Free play` button. Score history moves to the hero's sheet |
| **Grown-ups** | |
| Settings in the map lock, Cove choices sheet, practice gate, backups, adult Cove people | One gated Grown-ups sheet |

## Screens

### Island Map

- **Header (phone 56 pt):** profile pill on the left (36 pt face + name, 48 pt tall; tap opens Who's playing). On the right, a quiet search button and a quiet Grown-ups button (lock icon), both 48 pt. The wordmark shows on iPad only.
- **Doors:** the illustrated island stays. Six landmarks with a name label under each, in a fixed 2 × 3 arrangement on phones (My Home, Learn / Arcade, Puzzles / Game Hall, Library) and 3 × 2 on iPad and landscape. Doors never move between profiles, so muscle memory holds. Each landmark is at least 120 pt and the whole landmark is the target. The Islander walk to a door stays; Reduce Motion opens immediately.
- **Continue card:** floats at the bottom, full width up to 520 pt, 84 pt tall: game picture, "Continue" and the game's name, and a 64 pt coral play button. One tap reopens that exact game where it was. It shows the single most recent unfinished thing for the current person: a paused puzzle, a learning session, an Arcade level or the last Home room. Hidden when there is nothing to continue. No "Try today" or "Favorites" next to it.
- **Who's playing?** opens as a sheet: big faces for each learner and each Cove-only grown-up, plus Family. Tap a face to switch; the sheet closes. Adding, renaming or removing people is in Grown-ups.
- **First launch:** the existing "make your Islander" flow, unchanged.
- **Grown-up on a plane:** Map → Puzzles → Sudoku → Play, or Map → Continue. Two taps for a returning player.

### Puzzles (Cove)

**Puzzles home**

- Header: `←` (back to map), "Puzzles", profile pill.
- **Continue strip** when the person has paused puzzles: one row of up to four picture cards, each "Continue · Sudoku". Pins from family members show here with the sender's face.
- **Favorites shelf** when the person has favorites.
- **Today** tile first in the grid: a sun picture and "Today". Opens today's Medium deal (existing `tideTable`).
- **Sections:** Numbers, Words, Logic, Cards, Originals. Each section is a heading (icon + word) over a grid of picture tiles: two columns on phones, three to four on iPad. A tile is the game's picture on its section pastel with the name below. No counts, no band text, no buttons on tiles.
- Tap a tile: open its **start sheet**. Long-press: favorite or unfavorite, with a haptic.

**Shelf for 4.0**

| Section | Games |
|---|---|
| Numbers | Sudoku, Cage Sudoku (Killer) |
| Words | Word Search, Crossword (starter set) |
| Logic | Bridges, Loop, Picture Grid, Reef Sweep (no-guess) |
| Cards | Solitaire |
| Originals | Slip Tide, Canoe Seats, Gate Crab, Shell Scale |

Deferred, not on the 4.0 shelf: Carve the Islands, Canoe Charts, Two Shells, One in Each Cove, Tents, Rectangles, Odd One Out, Lamps, Pentomino, Shell Stacks, Old Toys, Cross Sums, Harbor Jam, Logic Grid, Word Builder, Secret Code, Fill-In, Word Scramble, Word Ladder. Built games in that list (for example Word Ladder and Cross Sums) stay registered: their saves load, a paused attempt still shows in Continue and finishes normally, and they come back to the shelf by changing one list. Already-built Cage Math, Greater-Than Grid, Skyline and Pearl Loop follow the same rule unless Leon keeps them (see Open calls).

**Start sheet** (native `formSheet`, one detent about 55% on phones, bottom card on iPad)

- Grabber, the game's picture (large), and its name.
- **Difficulty pills:** only the levels the game has, each with its size tag: `Easy 4×4 · Medium 6×6 · Hard 9×9 · Expert 9×9 · Master 9×9`. The last choice is remembered per person (existing `band` preference). A child profile starts on Easy, an adult on Hard.
- **Play together** toggle row (two faces icon). On: family faces appear; tap one. Off: on my own.
- **Play** (coral, full width, 64 pt). When the game has a paused puzzle, the main button is **Continue** and a quiet "New puzzle" sits under it.
- No other text.

**Board**

- **HUD (one 56 pt row):** `←` (save and leave), the game's name and difficulty in small muted text, `Undo`, `Hint`, `•••`. Icons with short labels on iPad; icons only on small phones, each with an accessibility label.
- The board takes all remaining space, centered. Number pads and tool rows stay with the board below it, as large as the space allows (64 pt keys for children).
- **More sheet** (`•••`, undimmed, at most 40% height on phones; bottom card on iPad and landscape): Mistakes (Friendly / Check when I ask / Rewind), Notes (where the game has them), Restart this puzzle, New puzzle, Choose a puzzle, Send to…, Roles (when together), How to play (picture tips). The board animates up and shrinks so it stays fully visible while More is open.
- **Finish:** one celebration, then `Next puzzle` (coral) and `Puzzles`. When others could have solved together, the existing "Solved together with…" faces appear on the finish card, one tap each.

**Choose a puzzle** (from More): a numbered grid for the current difficulty with ticks on finished ones, opened as a large sheet. Grown-ups can filter to Finished or Mixed practice from a small filter button. Hidden puzzles never appear.

### My Home (Toca room)

- Full-screen room. The room is the main action: touch things directly. Lights toggle, the radio plays, the fridge opens, food can be eaten, friends and props drag and drop (existing `H1–H5` runtime and physics).
- **Top bar:** `←` (map), the room's name as a pill with left/right arrows to walk between rooms (or swipe), and Undo while decorating.
- **Bottom bar:** **Closet** (hanger), **Badges** (star frame), **Decorate** (pencil), **Tidy up** in Decorate's More. 64 pt each.
- **Closet** (Locker, folded in): the wardrobe in the room and the Closet button both open an undimmed sheet (about 45%). The Islander stays visible in the room above the sheet and changes live as clothes are tapped. Tabs are pictures only: hair, tops, bottoms, hats, extras. Earned items carry their existing rules; unearned items show as soft outlines that say how to earn them when tapped.
- **Badge Wall** (Badges, folded in): the frame on the wall and the Badges button open a sheet grid of the 24 milestone badges. Earned ones are full color; others are outlines. Tap one for its picture and one line.
- `/locker` and `/badges` stay as routes that open My Home with the Closet or Badge Wall sheet up, so old links and shortcuts keep working.

### Learn

- **Subjects:** header (`←`, "Learn", profile pill); a "Today" tile; six subject picture tiles (Reading, Numbers, Science, Thinking, Coding, CHamoru) in the same tile grid as Puzzles. No intro line.
- **Subject:** that subject's games as picture tiles (Coding: Crab Commands, Beep Bot, Turtle Draw, Code Lab, Tide Logic).
- **Game: one level path.** A winding path of round nodes from Level 1 to the last school level, then **Deep Water**, then **Endless**, all on one path. The current node bounces and is labeled "Next". Finished nodes show stars. Dare marks sit on nodes that have one. Everything stays open, as today; the path only suggests.
- **Level start sheet:** picture, "Level 3", Play together toggle (with "Who goes first?" when on), "Add a dare" toggle where one exists, and coral **Play**.
- The game screen keeps `LearnFrame`'s compact header, with the mode line removed.

### Arcade

- **Grid:** the nine games as picture tiles with their heroes (Lagoon Run, Fruit Bat Flight, Crab Crossing, Canoe Cargo, Reef Builder, Rail Parade, Palm Patrol, Shell Song, Beach Ball). Three columns on phones, so all nine fit on one screen. Continue for the Arcade sits above the grid when there is one.
- **World map:** hero banner (tap the hero for outfits and score history), the world's name, and the level path for that world. Swipe or tap the dots to change worlds. The current level bounces with "Next". One coral **Play** button plays the current level; tap any node to play that one. A quiet **Free play** button sits below. The sticker chest appears in the banner when waiting.

### Game Hall and Library

Same tile grid and start-sheet pattern. Game Hall: board, card and party games (Checkers, Shell Pits, Coconut Drop, Hidden Canoes, Fishing Nets, Go Fish, Crazy Eights, Memory Pairs, Picnic Mystery, Secret Word and the rest of the current hall). Library: Wonders, Picture books, Look & Listen, Make. The start sheet holds Play together and Play; game rules move into a "How to play" picture tip.

### Grown-ups (gated)

- **Gate:** hold the button for two seconds (progress ring and haptic), or answer the existing multiplication question. Works with VoiceOver.
- **Contents:** people (add, rename, remove learners and Cove-only grown-ups); sounds, music and read-aloud; narration voice and volume; Puzzles (reader level, hidden puzzles, fill notes); Learning (practice focus, pace, earlier family practice, shared practice signals, practice gate); Arcade comfort; helping a child; backups (export, restore); privacy; about.

### Shared UI kit (`src/ui/`)

Built in Phase 1C, matching TraceBuddy's kit:

- `theme.ts`: every token above.
- `Text`: Nunito variants (display, title, heading, body, label, small) with Dynamic Type limits.
- `Icon`: the only path to Phosphor icons.
- `Button`: coral primary and quiet secondary; child and adult sizes.
- `IconButton`: round, 48 pt minimum, required accessibility label.
- `Tile`: picture + name on a pastel; press scale; long-press.
- `Sheet`: native `formSheet` options (small 0.40 and start 0.55 detents, grabber, undimmed in-game), and a bottom-card fallback for iPad and landscape.
- `HoldButton`: two-second hold gate.
- `PageHeader`: `←` + title + profile pill.
- `ProfilePill`: wraps the existing learner chip logic.
- `Hud`: the board HUD row.

No file over about 600 lines. Feature screens import from `src/ui/` only.

## Save and compatibility guarantee

- **No save format changes.** Envelope 3, profiles 2, session and progress revision 1, the completion table, award bits, dare bitmap, session budgets, ceilings and learner/Cove-person limits in `docs/CONTRACT_4.0.md` are untouched.
- **Labels are presentation only.** Difficulty pills map onto the existing tiers 1–6 and rungs; the Cove local `band` preference keeps its numbers. Puzzle refs, hashes, banks and the 17,301+ certified puzzles are unchanged.
- **Learning path is a view.** The level path reads existing School levels, Challenge Deep Water and Endless entries, and dare bits. Learner `choices` and session `options` keep their shape; "Play together" writes the existing `mode` value.
- **Folded places keep their data.** Locker outfits, earned items and badges are read from the same personalization and milestone data. Home rooms keep the `H1–H5` storage and the v4 Home save.
- **Old routes stay.** `/school`, `/challenge`, `/locker`, `/badges`, `/cove` and `/everything` keep working (as redirects where the screen moved), so saved shortcuts and deep links never break.
- **Continue is derived** from data the save already holds. If an ordering needs a new stored field, that is a lead change under `CONTRACT_4.0.md`, scheduled separately.
- **3.0 upgrade path:** a 3.0 save opens in 4.0 Clean through the existing migration, validated, with the original preserved for recovery. Phase 5 checks this on Stassie's real 3.0 save, backed up first, on Leon's phone first.
- Private word-policy files stay outside git.

## Phases

Each phase ships as reviewed PRs into `program/4.0`. Old screens stay reachable until their replacement lands.

0. **Spec, prototype, art test.** This document, the clickable prototype, and the 0B art style test. Gate: Leon signs off.
1. **UI kit.** Nunito, Phosphor and `src/ui/`. No visible behavior change.
2. **Puzzles.** Puzzles home, start sheet, board HUD, More sheet; Word Search, Picture Grid and the starter Crosswords. Dev Build 3 for the plane test.
3. **My Home.** Closet and Badge Wall inside Home; illustrated art; Tidy up. Dev Build 4 for Stassie.
4. **Map, Learn, Arcade.** Six-door map with Continue and the profile pill; one level path per learning game; Arcade grid and world pager. Dev Build 5.
5. **Prove and ship.** Real iPhone and iPad tests (airplane mode, VoiceOver, large text), a pre-reader and a non-tech-savvy adult test, 3.0 upgrade check, then production.

## Acceptance for 4.0 Clean

- A pre-reader opens My Home, dresses their Islander in the Closet and plays in the room without help or reading.
- A pre-reader finds their next Coding level and plays it from the map in three taps or fewer.
- A non-tech-savvy adult opens a Sudoku at their level in two taps from the map, plays, uses Undo and Hint, and changes mistake checking without help.
- No sheet hides a game board; every sheet closes with a swipe down.
- No main screen shows a paragraph or a band, pack, tier or mode word.
- Every 3.0 save and every 4.0 Dev save opens unchanged.
- iPhone (small and large) and iPad, portrait and landscape, at default and large text sizes.

## Open calls for Leon

1. **Six tiers, five words.** Puzzles have six tiers. Default: `Easy` (tier 1) to `Master` (tier 5), and tier 6 shows as `Master+`. Alternative: Master holds tiers 5 and 6 and walks from one to the other.
2. **Already-built extras.** Keep Cage Math, Greater-Than Grid, Skyline and Pearl Loop on the 4.0 shelf, or defer them with the niche list? Default: defer; saves still load.
3. **Today tile.** One "Today" tile (default) or drop the daily pick entirely.
4. **Continue scope.** Default: one card for the most recent thing across all pillars. Alternative: Home is always Continue for a child.
5. **Search on the map.** Keep a quiet "Find a game" search button (default), or move the full list into Grown-ups.
