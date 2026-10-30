# Islander badges and rewards (spec for 2.0)

Companion to [ISLANDER_2.md](ISLANDER_2.md). Every track has four named badges. Each badge unlocks a style item for the Islander, a thing for Island Home, or both, and hangs on the Island Home badge wall.

## Earning rules
- **Badges count distinct accomplishments, never speed.** Help, Helper and assisted rounds count. Family counts.
- **There is always more than one route.** No badge requires a particular difficulty, a perfect run or a streak.
- **Badges are permanent.** Nothing expires, nothing is spent, and there are no surprises: every locked item shows its badge and the exact rule.
- **A completion fact is emitted once per owner and round,** from accepted engine/save transitions, in the same Store commit as the finished game. Retrying, reloading or losing never duplicates or removes anything.
- **Existing saves are backfilled once:** arcade clears from saved stars, and the learning track first-badges from existing learning history. The backfill is idempotent.

## Tracks and badges

"Distinct pairs" means distinct (game, level) pairs with at least one completed round.

| Track | Games that count | Badge 1 | Badge 2 | Badge 3 | Badge 4 |
|---|---|---|---|---|---|
| **Math** | Shell Math, Number Hop, Reef Race, Island Market, Quick Practice, arcade math worlds and chest math | *Counter*: any completed round | *Builder*: 3 distinct pairs | *Problem Solver*: a round at Level 3+ **or** 6 distinct pairs | *Math Star*: a round at Level 5 **or** 10 distinct pairs |
| **Reading** | Sound Boat, Turtle Tales, Which One?, arcade word worlds | *First Words* | *Page Turner*: 3 distinct pairs | *Storyteller*: Level 3+ **or** 6 distinct pairs | *Bookworm*: Level 5 **or** 10 distinct pairs |
| **Science & Thinking** | Tide Pool Lab, Float or Sink Dock, Crab Commands, Explore topics and labs | *Curious*: any round, or any Explore topic | *Explorer*: 3 distinct pairs or topics | *Scientist*: Level 3+ **or** 6 distinct | *Inventor*: Level 5 **or** 10 distinct |
| **CHamoru words** | Håfa Adai Island, CHamoru Memory Pairs | *Håfa Adai*: any round | *Neighbor*: 3 distinct | *Storykeeper*: Level 3+ **or** 4 distinct pairs | *Island Voice*: Level 5 **or** 7 distinct pairs |
| **Arcade** | All nine arcade games | *Player One*: any cleared level | *Level Hopper*: 8 distinct cleared levels | *World Opener*: open World 3 in any game **or** clear every level of one world | *Legend*: clear any World 6 level **or** 40 distinct cleared levels |
| **Classic & Board** | Classic games, the five board games, cards, Mystery, Dash, Maze | *Game Night*: finish any game | *Good Sport*: finish 3 different games | *Strategist*: finish 6 different games | *Champion*: win a board game at the middle or strong opponent **or** finish 10 different games |

## Reward catalog

There are starter items (always owned), plus 24 badge rewards: one per badge. The art keeps the house style and is suitable for every age (cool, not babyish).

| Badge | Islander style | Island Home |
|---|---|---|
| Math 1 / 2 / 3 / 4 | Calculator watch (accessory) / Number-pattern tee (outfit) / — / Star-math outfit colour | — / Number blocks / Rainbow abacus / **Math Lab** wallpaper |
| Reading 1 / 2 / 3 / 4 | Bookworm beanie (hat) / — / Storyteller outfit colour / Reading glasses: round frames (accessory) | — / Reading cloud / Storybook library / **Library** wallpaper |
| Science 1 / 2 / 3 / 4 | Safety goggles (accessory) / Lab coat (outfit) / — / Galaxy hair colour | — / Little blue planet / Stargazer telescope and Pip's reef / **Night Sky** wallpaper |
| CHamoru 1 / 2 / 3 / 4 | Flower lei (accessory) / Woven sun hat (hat) / — / Sunset outfit colour | — / Woven island mat / Woven glow lamp / **Island Breeze** floor |
| Arcade 1 / 2 / 3 / 4 | Runner's headband (hat) / Lagoon jersey (outfit) / Star sneakers outfit colour / Lightning streak hair colour | — / Pocket arcade / Good times shelf / **Arcade Neon** wallpaper |
| Classic 1 / 2 / 3 / 4 | Captain's cap (hat) / — / Checker scarf (accessory) / Royal outfit colour | Checkers for two / Lagoon surfboard / Shell wind chime / **Game Room** floor |

Rows with "—" in a column still give the other column's reward. Every badge gives at least one reward.

## Presentation
- **Result screens** show one small card when something new is earned, e.g. "New badge: *Builder* · Number blocks are ready". The card offers **Try it on** / **See it at home**, **Keep playing** and **Home**. There is no modal chain.
- **The Locker and the Island Home tray** show locked items with the badge name and its rule, e.g. "Earn the *Explorer* badge: finish 3 different science games".
- **"New" is a small text badge,** cleared when the item is opened, plus "Mark all seen". No counters or reminders.
- **The badge wall** in Island Home holds six track rows of four frames each. Earned badges are coloured illustrations; unearned ones are soft outlines with the rule on tap.
- **A "My badges" page,** reachable from the Locker and the badge wall, shows progress toward the next badge in each track as plain text ("2 of 3 different games").

### Review fixes: ownership, validation and warm-ups (30 October 2026)

A saved learning round credits its original `learner`, including Family, even if someone else is now active. Classic, board, activity and Explore ownership lives in the optional version-1 `roundOwners` namespace, bound when the round starts and preserved across switches/reloads. Existing sessions without ownership bind once to the active learner on upgrade; older saves cannot reveal a different historical owner. Arcade retains its existing per-owner/epoch acceptance boundary.

An accepted three-question warm-up counts as `learn:quick-practice:<level>` for Math and `learn:which-one:<level>` for Reading. Mixed practice counts each subject present. Levels follow the existing stage/limit mapping; assistance counts. Cancellation, partial practice and grown-up bypass never award. The completion fact and explicit `think.level-round` note commit together; duplicate callbacks do not add evidence or grants. Existing warm-up answer notes cannot distinguish a complete sheet from a later bypass, so they are not backfilled. New explicit completion notes can be backfilled by the existing migration.

Catalog version 1 validates grants and accomplishments against actual game, level and Explore catalogs. CHamoru Memory has three levels. The milestone limit is the complete catalog inventory plus 64 entries of headroom, rather than 256 arbitrary strings. Unknown IDs are invalid; every real accomplishment fits without evicting earlier evidence. Restore and personalization writes both require starter-or-earned wardrobe, furniture and themes; stickers use the owner's arcade collection. Rejected imports enter recovery with their exact original bytes preserved, while current games remain stored.
