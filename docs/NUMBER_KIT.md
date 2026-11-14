# K4 number kit and Shell Math (N1a)

The number kit lives in `src/math/kit/`. It is the shared base for the Numbers island: Shell Math now, and Number Hop,
Quick Practice, Market, Reef Race, Times Tide, Fraction Feast, Treasure Algebra and the warm-ups as they move onto it.
Nothing in `src/math/questions.ts` changed, so Number Hop, Quick Practice, warm-ups and arcade chests keep their rules until they move.

## The model (pure, worklet-safe)

Plain data in, plain data out. No React, clocks, `Math.random`, classes, `Map` or `Set`; a test scans the source for them.

| File | What it holds |
| --- | --- |
| `model.ts` | `Problem` (`op`, `a`, `b`, `unknown`), place value, open or make a ten, `equationText`, three-tile `choicesFor` and `choicesAround` |
| `plan.ts` | seven routes (`count`, `tens-ones`, `to-ten`, `to-ten-other`, `up-to-ten`, `give-take`, `trade`) and the `Step[]` each asks of a child |
| `work.ts` | the step state machine: `advance`, `judge`, `replay`, the help ladder (`hintFor`), `solveActs` |
| `generate.ts` | levels graded by required strategy, rungs inside a level, `roundProblems`, `candidates`, `secondWays` |
| `deep.ts` | the four Deep Water shapes: open a number, a missing number, two piles, pairs of ten |

A step is one of `count`, `number`, `trade`, `fill` (move shells) or `pair`. An action is a short array: `["c"]`, `["n", 13]`, `["t"]`,
`["m", side, n]`, `["p", i, j]`, `["h"]` (next help stage), `["k"]` (turn on choices). The same `advance` runs the School board, the Challenge
replay and the dumb-player bots.

Help is a ladder read from the plan: stage 1 says where to look, stage 2 says the step's number, stage 3 fills it in for the child to confirm.
A miss marks the problem helped and blocks nothing. A second way is another route's plan for the same problem, so "show a second way",
the Two-ways dare and the fewest-moves dare use the same plans.

## Components (`src/math/kit/ui/`)

`TenFrame` (shells, a second group in blue, pale shells waiting, struck-out shells, touchable shells for a pick), `Blocks` (tens rods and ones cubes with
touchable trades), `Bridge` (a number line with one arc per hop), `NumberPad` (digits, delete, Go; clears when the step changes; can prefill), `PartWhole`,
`ArrayGrid`. They draw what they are given; the board decides what a touch means.

## Shell Math levels

| Level | Strategy | What the child does | Size |
| --- | --- | --- | --- |
| 1 | Count on | start at the bigger number and tap to count on or back | up to 10 |
| 2 | Ten and ones | work the tens and the ones apart, no trade | teens, then up to 99 |
| 3 | Bridge a ten | cross ten with the bridge drawn; typed answers | within 20 |
| 4 | Make a ten | choose which shells fill the ten; missing numbers last | within 20 |
| 5 | Open a ten | add with a carry, take away with a borrow, in place-value blocks | up to 99 |

Levels 3 to 5 type answers; choices are a help. Rounds are five questions that climb five rungs. Fresh rounds are version 2 and are stored as
the list of actions, rebuilt through the kit on every load. A saved version-1 round, and an archived Level 4 or 5 growth round, load and play as before.
There is no timer; math timing (MT-01) stays opt-in and belongs to N4.

## Challenge (banks 420-429, dares 1000-1099)

Endless Tide: banks 420-424, one per level, 24 questions each, easiest first. Deep Water: bank 425, 16 puzzles (four of each shape, tiers 3 to 6).
Dares 1000-1079: 16 per level. Levels 1 and 2 are no Help and no misses; Level 3 is Say it two ways (a different way from the first); Level 4 is right on the first check;
Level 5 is Fewest moves, where a shorter route exists. Banks 426-429 and dares 1080-1099 are free. `challenge-bank.json` is baked by `bake-challenge.ts`
and frozen by hash; rebake only while the banks are unpublished.

## Not here

Spoken numbers beyond 20 (K9 speech tokens), Number Hop and Quick Practice on the kit (N1b), the math timer (MT-01), the warm-ups (WU-01).
