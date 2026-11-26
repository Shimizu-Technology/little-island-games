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
| Playing with others | The start sheet shows only the modes a game already has: **On my own**, **Play together** (co-op, existing `together`) and **2 Players** (scored head-to-head, existing `versus`). One choice row, no paragraphs. See Start sheet modes. |
| Puzzle shelf | 4.0 ships 13 puzzles plus Reef Sweep (see Puzzles). About 18 niche games are deferred; built ones keep their saves. |
| Saves | No change to envelope 3 / profiles 2 or any save format. 4.0 Clean is a presentation change. The one new piece of state is a device-local Continue pointer kept outside the save (see Continue). |
| Old links | Every old route keeps its parameters and lands on the matching 4.0 place (see Route compatibility). |
| Art | Phase 0B art test decides the illustrated style. Until then, screens use the current art inside the new layout. |

## Who it's for

- **A little one (2–5)** who can't read. Recognizes doors and games by picture, taps big things, never gets stuck, and can't break the family's saves.
- **Stassie (7)**, who loves the Toca-style Home, Coding and the Arcade. Wants to get to her room, her Islander and her next level in one or two taps.
- **An older kid (9–14)** who wants real difficulty in learning games and puzzles, without baby chrome in the way.
- **A grown-up who isn't comfortable with tech**, such as a grandparent, or Leon on a plane. Resumes a Sudoku in one tap from the map (three for a fresh one) and plays without reading instructions or knowing words like "band", "pack" or "tier".

## Design rules

Every 4.0 screen follows these. A PR that breaks one needs a written reason.

1. **Works without reading.** Every door, game and child-facing control is recognizable from its picture or icon. Labels help adults but never carry the meaning alone. When read-aloud is on, prompts have a speaker button.
2. **No jargon and no paragraphs on main screens.** Short everyday words only: `Continue`, `Play`, `Undo`, `Hint`, `More`, `Easy`. Explanations live in a picture tip or in Grown-ups. Status lines such as "Every band is open. Your puzzles wait for you." are cut.
3. **One main action per screen,** visibly larger and coral. Everything else stays quiet.
4. **Never cover the board.** Secondary options open in a short sheet that closes with a swipe down, a visible Close and (on Web) Escape. On iOS it is a native `formSheet` with detents; on Web it is the `src/ui/Sheet.tsx` overlay (see Sheets by platform). In-game sheets take at most 40% of a phone's height. The board moves up and shrinks to stay fully visible, and the sheet is undimmed so play can continue. If the board cannot fit at that size, the sheet's content scrolls instead of growing.
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
| Favorites dock entry | A star button on every start sheet (labeled for VoiceOver), with long-press on a tile as a shortcut; a Favorites shelf appears at the top of that door. Profile favorites and device-local Puzzle favorites stay separate, as today |
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
| "Solve together" paragraph + partner chips | "Play together" choice on the start sheet, showing family faces |
| "Reader level, mistake settings and grown-up choices" button | Mistakes in the board's More sheet; reader level, hidden puzzles and fill notes in Grown-ups |
| "Try this one · pin to a person" | More sheet: "Send to…" (faces). Pins still appear in that person's Continue |
| "Help · show me how" + "Helping a child? Ask what they notice…" | `Hint` in the HUD. The coaching line moves into Grown-ups › Helping a child |
| Role card text under the board | Small "Roles" item in More while playing together |
| "← Cove" text button + title + people picker above the board | Board HUD: `←`, `Undo`, `Hint`, `•••` |
| ~18 niche games on the shelf | Deferred (see Puzzles › Shelf) |
| **Learning** | |
| School subject shelf + intro line "Choose a place to begin…" | Learn: six subject picture tiles, no intro line |
| School levels / Challenge / Deep Water / Endless Tide as separate choices | One level path per game: Level 1 → … → Level N → Deep Water → Endless |
| Optional Dares chips and explanation | A small dare mark on a level node; a "Dares" row of picture chips on that level's start sheet, one per eligible dare slot, multi-select, saved as today's selected slots (hidden for young children, as today) |
| "How shall we play?" mode chips (solo / versus / together) | One mode row on the level start sheet with only the game's own modes: On my own · Play together · 2 Players. "Who goes first?" appears for 2 Players and for together games with turns |
| "What shall we practise?" and pace chips | The path picks the level; practice focus and pace move to Grown-ups › Learning |
| **Arcade** | |
| World buttons + "Current level · R-3" button + Free play card with record and score history notes | World pager (swipe, with dots); the current level bounces; one coral `Play` for it; quiet `Free play` button. Score history moves to the hero's sheet |
| **Grown-ups** | |
| Settings in the map lock, Cove choices sheet, practice gate, backups, adult Cove people | One gated Grown-ups sheet |

## Screens

### Island Map

- **Header (phone 56 pt):** profile pill on the left (36 pt face + name, 48 pt tall; tap opens Who's playing). On the right, a quiet search button and a quiet Grown-ups button (lock icon), both 48 pt. The wordmark shows on iPad only.
- **Doors:** the illustrated island stays. Six landmarks with a name label under each, in a fixed 2 × 3 arrangement on phones (My Home, Learn / Arcade, Puzzles / Game Hall, Library) and 3 × 2 on iPad and landscape. Doors never move between profiles, so muscle memory holds. Each landmark is at least 120 pt and the whole landmark is the target. The Islander walk to a door stays; Reduce Motion opens immediately.
- **Continue card:** floats at the bottom, full width up to 520 pt, 84 pt tall: game picture, a verb and the game's name, and a 64 pt coral play button. It shows one item for the current person, chosen by the Continue rules below. The verb is honest: `Continue` only when an exact saved round reopens; `Play next` when the game reopens at its next level (most Arcade games); `Back to` for a Home room. Hidden when there is nothing to show. No "Try today" or "Favorites" next to it. At AX5 the card reflows to two lines and the map scrolls beneath it, so it never covers a door.
- **Who's playing?** opens as a sheet: big faces for each learner, plus Family. Cove-only grown-ups sit in their own row labeled "Puzzles only"; choosing one opens Puzzles as that person and leaves the learner selection alone, so Home, Learn and Arcade play is never credited to a grown-up or to the wrong child. Tap a face to switch; the sheet closes. Adding, renaming or removing people is in Grown-ups.
- **First launch:** the existing "make your Islander" flow, with a visible `Not now` that leaves the map usable as Family. Nothing on the map needs an Islander first.
- **Grown-up on a plane:** returning player: Map → Continue (1 tap). Fresh Sudoku at a remembered difficulty: Puzzles → Sudoku → Play (3 taps). First time: Puzzles → Sudoku → `Hard` → Play (4 taps).

### Continue

The save has separate markers per pillar (`recentBoard`, `recentLearn`, `recentActivity`, `recent`, `arcade.recent`), Cove attempts ordered by ordinal, the Home room, and one serialized Arcade round (Reef Builder). None of them shares a clock, so Continue works like this:

- **Recency pointer, device-local.** When a round starts or saves, the app writes `{ owner, kind, id, at }` to a small device-local key (the same kind of storage as the Cove local preferences, not inside envelope 3 or profiles 2). It is a hint only. It is never exported, restored or merged, and a missing, invalid or stale pointer is ignored.
- **Validation.** The pointer wins only when its target is still resumable for the same owner: an unfinished Cove attempt by ref, an unfinished Learn session, an unfinished board/game/activity session, the saved Reef Builder round, or an Arcade game with a visit marker. Otherwise it is dropped.
- **Fallback order** when there is no valid pointer (first launch after update, new device, restore): today's fixed `homeContinue` order (board, learn, activity, game, arcade), then the newest paused Cove attempt by ordinal, then the last Home room. Ties inside a pillar use that pillar's existing order.
- **Arcade honesty.** Reef Builder is the only Arcade game with a saved round and the only one that shows `Continue`. Every other Arcade game shows `Play next` and opens at its current world and level, not mid-run.
- **Finishing** a round clears the pointer for that item and the card falls back; it never revives an older marker that the save has already replaced.
- **Pins versus paused work.** Paused work always outranks a pin. Pins show in the Puzzles Continue strip with the sender's face, never on the map card.
- **Owner.** The card belongs to the current learner (or Family). A Cove-only grown-up's paused puzzles appear in Puzzles and in their own row of Who's playing, never as the map card for a child. Cove-only identity still clears on boot and learner switch, as today.
- Making this pointer part of the save would be a lead change under `CONTRACT_4.0.md`; 4.0 Clean does not do that.

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
| Logic | Bridges, Loop, Picture Grid, Reef Sweep (no-guess, see below) |
| Cards | Solitaire |
| Originals | Slip Tide, Canoe Seats, Gate Crab, Shell Scale |

Deferred, not on the 4.0 shelf: Carve the Islands, Canoe Charts, Two Shells, One in Each Cove, Tents, Rectangles, Odd One Out, Lamps, Pentomino, Shell Stacks, Old Toys, Cross Sums, Harbor Jam, Logic Grid, Word Builder, Secret Code, Fill-In, Word Scramble, Word Ladder. Built games in that list (for example Word Ladder and Cross Sums) stay registered: their saves load, a paused attempt still shows in Continue and finishes normally, and they come back to the shelf by changing one list. Already-built Cage Math, Greater-Than Grid, Skyline and Pearl Loop follow the same rule unless Leon keeps them (see Open calls).

**Reef Sweep.** Its Challenge registration is `cove: false` today, and it is played from the Game Hall. In 4.0 its Puzzles tile is a shortcut that opens the existing Reef Sweep Challenge (`/challenge?game=reef-sweep`), owned by the current learner, exactly as the Hall does. It is not added to `coveEntries()`. Making it a real Cove game (Cove people, pins, Cove Continue) needs a separate registration change, catalog validation and owner decision, and is out of scope for 4.0 Clean.

**Start sheet** (native `formSheet`, one detent about 55% on phones, bottom card on iPad)

- Grabber, the game's picture (large), and its name.
- **Difficulty pills:** only the levels the game has, each with its size tag: `Easy 4×4 · Medium 6×6 · Hard 9×9 · Expert 9×9 · Master 9×9`. The last choice is remembered per person (existing `band` preference), and an existing preference always wins. A person with no preference starts on Easy (today's default, band 1); an adult picks Hard with one tap.
- **Mode row:** only the modes the game has, as icon chips with labels: `On my own`, `Play together` (co-op), `2 Players` (scored, board, card and race games). Picking Play together or 2 Players shows family faces; tap one. A game with one mode shows no row.
- **Star** (favorite), 48 pt, with an accessibility label.
- **Play** (coral, full width, 64 pt). When the game has a paused puzzle for this person, the main button is **Continue**, it reopens that attempt with its saved mode, partner and options, and a quiet "New puzzle" sits under it. Starting a new puzzle over a paused one asks first, as today.
- No other text.

**Start sheet modes**

| Game kind | Modes shown |
|---|---|
| Puzzles | On my own · Play together |
| Reef Race | On my own · Play together · 2 Players |
| Float & Sink | On my own · 2 Players |
| Game Hall board and card games | Each game's existing modes; head-to-head games show 2 Players |
| Learning games | Each engine's `modes` list, mapped the same way |

The chosen chip writes the existing `mode` value (`solo`, `together`, `versus`). A resumed session keeps its saved mode, starter, match and options; the sheet shows them but does not change them.

**Shelf filtering never hides saved work.** The shelf list and hidden-puzzle filters shape only the tile grid. Continue, pins, `/cove?game=`, `/challenge?puzzle=` and "Choose a puzzle" look up saved attempts against every registered game, codec and packed bank, not the visible shelf. A paused attempt in a deferred game, or on a puzzle hidden later, always opens and finishes.

**Board**

- **HUD (one 56 pt row):** `←` (save and leave), the game's name and difficulty in small muted text, `Undo`, `Hint`, `•••`. Icons with short labels on iPad; icons only on small phones, each with an accessibility label.
- The board takes all remaining space, centered. Number pads and tool rows stay with the board below it, as large as the space allows (64 pt keys for children).
- **More sheet** (`•••`, undimmed, at most 40% height on phones; bottom card on iPad and landscape): Mistakes (Friendly / Check when I ask / Rewind), Notes (where the game has them), Restart this puzzle, New puzzle, Choose a puzzle, Send to…, Roles (when together), How to play (picture tips). The board animates up and shrinks so it stays fully visible while More is open.
- **Finish:** one celebration, then `Next puzzle` (coral) and `Puzzles`. When others could have solved together, the existing "Solved together with…" faces appear on the finish card, one tap each.

**Choose a puzzle** (from More): a numbered grid for the current difficulty with ticks on finished ones, opened as a large sheet (its own dismiss, separate from More). Grown-ups can filter to Finished or Mixed practice from a small filter button. Hidden puzzles never appear as new choices, but a paused hidden puzzle still resumes.

### My Home (Toca room)

- Full-screen room. The room is the main action: touch things directly. Lights toggle, the radio plays, the fridge opens, food can be eaten, friends and props drag and drop (existing `H1–H5` runtime and physics).
- **Top bar:** `←` (map), no profile pill, the room's name as a pill with left/right arrows to walk between rooms (or swipe), and Undo while decorating.
- **Bottom bar, in every room:** **Closet** (hanger), **Badges** (star frame), **Decorate** (pencil), each 64 pt with a visible word under the icon and a VoiceOver label. **Tidy up** is in Decorate's More. The in-room wardrobe and wall frame are extra shortcuts, never the only way in; rooms without them still have the buttons.
- **Closet** (Locker, folded in): the wardrobe in the room and the Closet button both open an undimmed sheet (about 45%). The Islander stays visible in the room above the sheet and changes live as clothes are tapped. Tabs are pictures only: hair, tops, bottoms, hats, extras. Earned items carry their existing rules; unearned items show as soft outlines that say how to earn them when tapped. Tapping an item tries it on; a coral `Wear this` keeps it, as in today's Locker. Closing the sheet without Wear keeps the old look. New items are marked seen as today.
- **Badge Wall** (Badges, folded in): the frame on the wall and the Badges button open a large sheet with the existing 28 frames (seven tracks of four: Math, Reading, Science & Thinking, Coding, CHamoru words, Arcade, Classic & Board). Every frame stays in place, so earning adds color without moving anything. Earned ones are full color; others are outlines. Tap one for its picture and one line.
- `/locker` and `/badges` stay as routes that open My Home with the Closet or Badge Wall sheet up (see Route compatibility).

### Learn

- **Subjects** (bare `/learn` lands here): header (`←`, "Learn", profile pill); a "Today" tile; six subject picture tiles (Reading, Numbers, Science, Thinking, Coding, CHamoru) in the same tile grid as Puzzles. No intro line.
- **Subject:** that subject's games as picture tiles (Coding: Crab Commands, Beep Bot, Turtle Draw, Code Lab, Tide Logic).
- **Game: one level path.** A winding path of round nodes from Level 1 to the last school level, then **Deep Water**, then **Endless**, all on one path. Each node resolves to what exists today: School nodes open that School level (`/learn?game=`), Deep Water nodes open the authored Challenge puzzle, and Endless opens the packed Challenge bank. A game that has only some of these shows only those nodes. The current node bounces and is labeled "Next". Finished nodes show stars. Dare marks sit on nodes that have one. Everything stays open, as today; the path only suggests.
- **Play Next:** a coral `Play` under the path starts the Next node with the remembered mode, so a returning child needs no sheet. If that node has a paused session, it resumes instead of starting fresh.
- **Level start sheet** (tap any node): picture, "Level 3", the mode row (see Start sheet modes, with "Who goes first?" when needed), a Dares chip row where the node has eligible dare slots, and coral **Play** (or **Continue** when that node is paused).
- The game screen keeps `LearnFrame`'s compact header, with the mode line removed.

### Arcade

- **Grid:** the nine games as picture tiles with their heroes (Lagoon Run, Fruit Bat Flight, Crab Crossing, Canoe Cargo, Reef Builder, Rail Parade, Palm Patrol, Shell Song, Beach Ball). Three columns on phones, so all nine fit on one screen. Continue for the Arcade sits above the grid when there is one.
- **World map:** hero banner (tap the hero for outfits and score history), the world's name, and the level path for that world. Swipe or tap the dots to change worlds. The current level bounces with "Next". One coral **Play** button plays the current level; tap any node to play that one. A quiet **Free play** button sits below. The sticker chest appears in the banner when waiting.

### Game Hall and Library

Same tile grid and start-sheet pattern. Game Hall: board, card and party games (Checkers, Shell Pits, Coconut Drop, Hidden Canoes, Fishing Nets, Go Fish, Crazy Eights, Memory Pairs, Picnic Mystery, Secret Word and the rest of the current hall). Library: Wonders, Picture books, Look & Listen, Make. The start sheet holds the mode row and Play; game rules move into a "How to play" picture tip. Game Hall remains `/shelf?island=classic`, and each tile opens its game through the existing per-game dispatch.

### Grown-ups (gated)

- **Gate:** hold the button for two seconds (progress ring and haptic), or answer the existing multiplication question. The question is always offered next to the hold, so VoiceOver, Switch Control and keyboard users never need a timed gesture.
- **Contents:** people (add, rename, remove learners and Cove-only grown-ups); sounds, music and read-aloud; narration voice and volume; Puzzles (reader level, hidden puzzles, fill notes); Learning (practice focus, pace, earlier family practice, shared practice signals, practice gate); Arcade comfort; helping a child; backups (export, restore); privacy; about.

### Shared UI kit (`src/ui/`)

Built in Phase 1C, matching TraceBuddy's kit:

- `theme.ts`: every token above.
- `Text`: Nunito variants (display, title, heading, body, label, small) with Dynamic Type limits.
- `Icon`: the only path to Phosphor icons.
- `Button`: coral primary and quiet secondary; child and adult sizes.
- `IconButton`: round, 48 pt minimum, required accessibility label.
- `Tile`: picture + name on a pastel; press scale; long-press.
- `Sheet`: one API over two implementations (see Sheets by platform). iOS: native `formSheet` options (small 0.40 and start 0.55 detents, grabber, undimmed in-game). Web, iPad and landscape: a responsive overlay card.
- `HoldButton`: two-second hold gate.
- `PageHeader`: `←` + title + compact profile pill (face only; the name shows on the map).
- `ProfilePill`: wraps the existing learner chip logic. Full (face + name) on the map, compact elsewhere.
- `Hud`: the board HUD row.

No file over about 600 lines. Feature screens import from `src/ui/` only.

### Sheets by platform

Expo Router's Web build treats `formSheet` as a normal stack screen, so the sheet has two implementations behind `src/ui/Sheet.tsx` (built in Phase 1C):

| | iOS (iPhone) | iPad, landscape | Web (`npm run export:web`, offline) |
|---|---|---|---|
| Start sheet, Who's playing, Closet | Native `formSheet`, detents 0.55 / 0.45, grabber | Bottom card, 520 pt wide | Bottom sheet on narrow windows, centered card on wide ones |
| In-game More | In-screen sheet, at most 40% height, undimmed; board shrinks above it | Side or bottom card next to the board | Same in-screen sheet, rendered in the page |
| Large pickers (Choose a puzzle, Badge Wall) | Large detent | Large card | Full-height card |
| Close | Swipe down, visible Close | Swipe down, visible Close | Swipe down, visible Close, Escape, backdrop tap where dimmed, browser Back |

- **In-game sheets are in-screen views, not routes,** so the board, round and focus stay mounted and a board gesture can never pop the round. Board pan/drag gestures are kept off the sheet's grabber area, and the existing Library swipe guards stay.
- **Focus:** opening a sheet moves VoiceOver and keyboard focus to its title; closing returns focus to the button that opened it. Web traps Tab inside an open sheet.
- **Route sheets** (start sheets opened from a link) declare their parent screen as the anchor, so a cold link opens the door with the sheet on top and Back closes the sheet first.
- **Before migrating screens:** verify on iOS 18.5 and 26.5, iPad portrait and landscape, and a cached offline Web reload with deep links.

## Save and compatibility guarantee

- **No save format changes.** Envelope 3, profiles 2, session and progress revision 1, the completion table, award bits, dare bitmap, session budgets, ceilings and learner/Cove-person limits in `docs/CONTRACT_4.0.md` are untouched.
- **Labels are presentation only.** Difficulty pills map onto the existing tiers 1–6 and rungs; the Cove local `band` preference keeps its numbers. Puzzle refs, hashes, banks and the 17,301+ certified puzzles are unchanged.
- **Learning path is a view.** The level path reads existing School levels, Challenge Deep Water and Endless entries, and dare bits. Learner `choices` and session `options` keep their shape; "Play together" writes the existing `mode` value.
- **Folded places keep their data.** Locker outfits, earned items and badges are read from the same personalization and milestone data. Home rooms keep the `H1–H5` storage and the v4 Home save.
- **Old routes stay** with their parameters (see Route compatibility).
- **Continue** reads the save plus a device-local pointer that is never written into the save (see Continue). Storing recency in the save would be a lead change under `CONTRACT_4.0.md`, scheduled separately.
- **Deferred and hidden games keep working.** Their registrations, codecs and packed assets stay, so saved attempts, pins and refs resolve.
- **3.0 upgrade path:** supported 3.0 progress opens in 4.0 Clean through the existing migration, validated, with the original bytes kept for recovery. The migration is unchanged, so its documented limits still apply: a save over a capacity or with unresolved content is refused or has that content set aside, and the original stays available to restore. 4.0 Clean never trims or rewrites a save to make it fit. The frozen legacy and near-limit fixtures (`tests/fixtures/save-v3/`) stay in the suite. Phase 5 checks this on Stassie's real 3.0 save and a 4.0 Dev save, backed up first, on Leon's phone first.
- Private word-policy files stay outside git.

## Route compatibility

Every old route keeps its parameters. A cold link (app not running) waits for the save to load, shows Recovery if needed, then lands on the 4.0 place. Back or dismiss from a landed sheet returns to that place's door, and Back from the door returns to the map. A missing or unknown ID lands on the place itself with nothing preselected, never a dead end or the bare map.

| Route | 4.0 landing |
|---|---|
| `/learn` (no game) | Learn subjects screen |
| `/learn?game=<id>` | That game's School level, as today (LearnFrame) |
| `/school` | Learn subjects screen |
| `/shelf?island=<subject>` | That Learn subject |
| `/shelf?island=classic` | Game Hall |
| `/challenge?game=<id>&puzzle=<ref>` | That authored or packed puzzle in ChallengeFrame, resuming its saved round if one exists |
| `/cove` | Puzzles home |
| `/cove?game=<id>` | Puzzles home with that game's start sheet up (Continue first if paused) |
| `/cove?person=<id>&game=<id>` | Selects that Cove person explicitly (existing `ResumeCovePerson`, with its retry), then the game's start sheet |
| `/locker` | My Home, Closet sheet up |
| `/locker?item=<id>` | My Home, Closet open on that item's tab, item tried on (not worn) and marked seen |
| `/badges` | My Home, Badge Wall up |
| `/badges?badge=<id>` | My Home, Badge Wall with that frame selected and announced |
| `/island-home?item=<id>` | My Home with that furniture item placed for decorating, as today |
| `/everything` | Map with Find a game open |
| `/everything?section=favorites` | Find a game, Favorites shelf |
| `/everything?section=ideas` | Learn, Today tile focused |
| `/arcade?game=<id>` | That Arcade game's world map |

Tests: the existing hub navigation and Cove platform tests move from the eight-place map to the six doors in Phase 4, and each phase adds route tests for the rows it touches.

## Phases

Each phase ships as reviewed PRs into `program/4.0`. Old screens stay reachable until their replacement lands.

0. **Spec, prototype, art test.** This document, the clickable prototype, and the 0B art style test. Gate: Leon signs off.
1. **UI kit.** Nunito, Phosphor and `src/ui/`. No visible behavior change.
2. **Puzzles.** Puzzles home, start sheet, board HUD, More sheet; Word Search, Picture Grid and the starter Crosswords. Dev Build 3 for the plane test.
3. **My Home.** Closet and Badge Wall inside Home; illustrated art; Tidy up. Dev Build 4 for Stassie.
4. **Map, Learn, Arcade.** Six-door map with Continue and the profile pill; one level path per learning game; Arcade grid and world pager. Dev Build 5.
5. **Prove and ship.** Real iPhone and iPad tests (airplane mode, VoiceOver, large text), a pre-reader and a non-tech-savvy adult test, 3.0 upgrade check, then production.

## Acceptance for 4.0 Clean

- A pre-reader opens My Home, finds the labeled Closet button, tries on and wears an outfit, and plays in the room without help or reading.
- A pre-reader plays their next Coding level from the map in four taps or fewer (Learn → Coding → game → Play), or one tap through Continue when it was the last thing played.
- A non-tech-savvy adult on a fresh install, in airplane mode, taps `Not now` on the Islander flow and starts a Sudoku at Hard in four taps (Puzzles → Sudoku → Hard → Play), plays, uses Undo and Hint, and changes mistake checking without help. The next day, the same adult resumes it in one tap and a new Sudoku takes three. Undo and Hint stay visible with spoken labels, leaving returns to the same board, and a failed save offers Retry.
- Offline Web: an installed or cached copy reloads and opens deep links in airplane mode. A first Web visit needs a connection once; that is stated, not hidden.
- No sheet hides a game board; every sheet closes with a swipe down and a visible Close, and on Web with Escape and browser Back.
- No main screen shows a paragraph or a band, pack, tier or mode word.
- Supported 3.0 progress and 4.0 Dev saves open through the existing migration; anything refused or set aside keeps its original bytes for recovery.
- **AX5 Dynamic Type:** at the largest accessibility size, every main screen reflows or scrolls with no clipped or overlapping text, the Continue card and HUD never cover the board or a door, and boards keep their minimum cell sizes. Web passes at 200% browser zoom.
- **VoiceOver:** every door, tile, chip, HUD button and sheet control has a spoken label and role; sheets take focus on open and return it on close; favorites, dares and modes work without long-press; the Grown-ups gate is passable without a timed hold.
- iPhone (small and large) and iPad, portrait and landscape, at default and AX5 text sizes.

## Open calls for Leon

1. **Six tiers, five words.** Puzzles have six tiers. Default: `Easy` (tier 1) to `Master` (tier 5), and tier 6 shows as `Master+`. Alternative: Master holds tiers 5 and 6 and walks from one to the other.
2. **Already-built extras.** Keep Cage Math, Greater-Than Grid, Skyline and Pearl Loop on the 4.0 shelf, or defer them with the niche list? Default: defer; saves still load.
3. **Today tile.** One "Today" tile (default) or drop the daily pick entirely.
4. **Continue scope.** Default: one card chosen by the Continue rules (device-local recency, then the fixed fallback). Alternative: Home is always Continue for a child, which would hide paused work behind the My Home door.
5. **Search on the map.** Keep a quiet "Find a game" search button (default), or move the full list into Grown-ups.
