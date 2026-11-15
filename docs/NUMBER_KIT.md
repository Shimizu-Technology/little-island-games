# K4 number kit and Shell Math (N1a)

The number kit lives in `src/math/kit/`. It is the shared base for the Numbers island: Shell Math (N1a), Number Hop and
Quick Practice (N1b) now, and Market, Reef Race, Times Tide, Fraction Feast, Treasure Algebra and the warm-ups as they move onto it.
Nothing in `src/math/questions.ts` changed, so version-1 rounds, warm-ups and arcade chests keep their rules.

## The model (pure, worklet-safe)

Plain data in, plain data out. No React, clocks, `Math.random`, classes, `Map` or `Set`; a test scans the source for them.

| File | What it holds |
| --- | --- |
| `model.ts` | `Problem` (`op`, `a`, `b`, `unknown`), place value, open or make a ten, `equationText`, three-tile `choicesFor` and `choicesAround` |
| `plan.ts` | seven routes (`count`, `tens-ones`, `to-ten`, `to-ten-other`, `up-to-ten`, `give-take`, `trade`) and the `Step[]` each asks of a child |
| `work.ts` | the step state machine: `advance`, `judge`, `replay`, the help ladder (`hintFor`), `solveActs` |
| `generate.ts` | levels graded by required strategy, rungs inside a level, `roundProblems`, `candidates`, `secondWays` |
| `deep.ts` | the four Deep Water shapes: open a number, a missing number, two piles, pairs of ten |
| `wide.ts` | single-step facts beyond 100 up to `WIDE_MAX` (1000): `wideProblems`, `isWide` |
| `twostep.ts` | two-step problems `a ± b ± c`, worked left to right: `validTwoStep`, `twoStepPlan`, `twoStepProblems`, `twoStepText` |
| `hop.ts` | hops on a number line (N1b): `JUMP_SETS`, `fewestJumps` (breadth-first search, the par), `bestJump` (Help), the reach machine `advanceHop`, and the bots `smallestJumpsBot`, `greedyJumps`, `fewestStraight` |
| `unknowns.ts` | a missing number anywhere (`? + 6 = 14`, `Missing`), equal sides (`7 + ? = 5 + 9`, `Balance`), and `seeded`/`drawFor`, a pure seeded random source so a game can draw a fresh question inside a move |

A step is one of `count`, `number`, `trade`, `fill` (move shells) or `pair`. An action is a short array: `["c"]`, `["n", 13]`, `["t"]`,
`["m", side, n]`, `["p", i, j]`, `["h"]` (next help stage), `["k"]` (turn on choices), `["u"]` (undo). The same `advance` runs the School board, the Challenge
replay and the dumb-player bots.

Help is a ladder read from the plan: stage 1 says where to look, stage 2 says the step's number, stage 3 fills it in for the child to confirm.
A miss marks the problem helped and blocks nothing. A second way is another route's plan for the same problem, so "show a second way",
the Two-ways dare and the fewest-moves dare use the same plans.

## Undo, Reset and the cost of a puzzle

Undo takes back the last accepted action (a count tap, a trade, a fill, a pair, a typed step), never the problem as a whole and never after it is solved.
It keeps what is on the record: misses and Help stay, Undo is itself a move (`moves`), it clears the help stage of the step it returns to, and it is
bounded to `MAX_UNDO` (6) a problem. It is not assistance, so it does not mark a problem helped. In Challenge a Reset (start the puzzle again) is free
only before any work, to change the way; after that the moves already made stay in the cost, so neither Undo nor Reset can be used to try a longer route
and then claim Fewest moves. Misses and Help are kept by the shared replay evidence.

A School round keeps the room it needs to finish. `finishCost` counts the forward actions still needed (the rest of this problem, a Next after each problem,
every later problem's steps); a miss, Help, Choices or Undo is refused when it would use that room, so no mix of them can leave a saved round that cannot be finished.

## Range, beyond 100 and two-step problems (what K4 provides)

Every kit validator takes the range as a parameter: `validProblem(p, max)`, `validTwoStep(t, max)` and `validAct(a, max)` default to `KIT_MAX` (100, where
Shell Math lives) and accept `WIDE_MAX` (1000) for games that need it. `placeValue3` gives hundreds, tens and ones. `wideProblems(count, rng)` returns distinct
single-step facts with at least one number over 100; `twoStepProblems(count, rng, max)` returns distinct two-step problems whose middle number and answer stay in
range, and `twoStepPlan` is their plan (the middle number, then the answer) for the same help ladder and replay.

What K4 does not provide, and is left to the games that use it: levels or strategies beyond 100 (no route in `plan.ts` crosses a hundred), pictures for hundreds
(`Blocks` draws tens and ones), unknown positions for two-step problems (the answer is always the last number), and speech for numbers past 20 (K9).
Unknowns in any place of a one-step sum and equal sides are in `unknowns.ts`; story wording lives with Quick Practice (`stories.ts`).

## Components (`src/math/kit/ui/`)

`TenFrame` (shells, a second group in blue, pale shells waiting, struck-out shells, touchable shells for a pick), `Blocks` (tens rods and ones cubes with
touchable trades), `Bridge` (a number line with one arc per hop; it speaks only the hops already drawn, `bridgeLabel`), `NumberPad` (digits, delete, Go; clears when
the step changes; can prefill; refuses a number past `max` and says so), `PartWhole`, `ArrayGrid`. They draw what they are given; the board decides what a touch means.
A touchable `TenFrame` needs cells of at least `MIN_TOUCH` (44 pt), so Level 4 stacks its two groups on a phone.

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

## Quick Practice (N1b, SC-13)

Still a question game: three questions, no clock. Version-2 rounds store every question shown and the actions, rebuilt on load (`quick-practice/round2.ts`).

| Level | What the child thinks about | Answers |
| --- | --- | --- |
| 1 | the answer, then a missing second number, to 10 | three tiles |
| 2 | crossing ten, then a missing second number, to 20 | three tiles |
| 3 | a missing number in every question, the first number too (`? + 6 = 14`, `15 − ? = 8`, `? − 7 = 9`) | typed |
| 4 | missing parts to 100 with a regroup (`? + 28 = 63`), equal sides (`7 + ? = 5 + 9`), a one-step story | typed |
| 5 | missing parts past 100 (`340 + ? = 500`), two steps in order (`40 − 15 + 8`), a two-step story | typed |

Sixty story templates (`stories.ts`): 30 one-step (join, separate, start unknown, change unknown, compare) and 30 two-step. Property tests fill every
template with every number the generator can draw and check the answer is a whole number in range, every number read is at least 2, and the
hidden number never appears in the text. **A miss never leaves the question to be guessed again:** the board shows the worked answer and a fresh
question of the same kind takes its place, drawn from the round's seed (`drawFor`), so a reload draws the same one; the place stays helped. After
nine fresh questions a miss is an ordinary miss. Help is the kit ladder: a clue, the working, then the answer filled in; at Levels 3 to 5 "Show choices"
gives three tiles. An open number line is drawn only when the answer is a distance, never a landing point.

## Number Hop (N1b, SC-15)

Five puzzles a round (`number-hop/round2.ts`). Levels rise by strategy:

| Level | Strategy | Puzzles |
| --- | --- | --- |
| 1 | hop on by ones, to 10 | tap Hop one, then name the landing (kept from before) |
| 2 | hop across ten, to 20 | every question crosses ten |
| 3 | choose jumps of 1 and 2, both ways | reach the flag; distances climb 3 to 14 |
| 4 | jumps of 2, 5 and 10 forward, to 100 | rungs 4 and 5 are traps: the biggest jump that fits gets stuck or takes longer |
| 5 | jumps of 1 and 10 both ways; unknown starts | going past and back is strictly shorter; then work back to where the frog started (typed) |

Par is the fewest jumps, proved by breadth-first search over the whole line (`fewestJumps`, checked against brute force in tests). Only the
standing path counts: Undo takes a jump off it and Start again clears it, both free. A reach puzzle is the child's own work when it lands in par
with no Help; landing in more is welcome, says how many it can be done in, and offers "Try for N jumps". The smallest-jump bot lands over par on
every reach puzzle (or never lands at Level 4), so it never earns the level's stars.

Both games set `nativeStages`: a saved version-1 round keeps its own engine and board, an archived Level 4 or 5 question round keeps the shared
board, and new rounds at every level are version 2. No Challenge entry yet (banks 430-434 and dares 1100-1149 are reserved and unused).

## Not here

Spoken numbers beyond 20 (K9 speech tokens), the math timer (MT-01), the warm-ups (WU-01), Challenge entries for Quick Practice and Number Hop.
