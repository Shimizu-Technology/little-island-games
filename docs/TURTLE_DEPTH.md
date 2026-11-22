# Turtle Draw depth and Deep Water (C2c: W0-03, SC-03, BK-22)

Turtle Draw's two top levels were out of order, and its block counter hid blocks inside a Repeat. This page says what changed, how the difficulty was measured, and where a child who finds Level 3 too easy goes next. Every number below is re-derived in `tests/c2c-turtle-content.test.ts`, `-challenge.test.ts`, `-school.test.ts` and `-view.test.tsx`. The bake is `src/learn/games/turtle-draw/bake.ts` (`generate.ts` for School, `deep.ts` for Deep Water).

## Every block counts (W0-03)

The old counter looked only at the top level, so `repeat 4 [forward, turn]` was one block, and old Level 5 (a limit of three blocks, one Repeat) was no harder than Level 3. New rounds count recursively: that program is **3 blocks** (the Repeat, the Forward and the Turn). `blockCost` in `dsl.ts` is the one counter. The board, the K7 editor's tray, the win check and the save check all use it.

A program that adds free blocks inside a Repeat (extra pen colours that change nothing) used to pass a three-block limit. It no longer does (`an under-counting program … no longer fits`).

## Levels

| Level | Name | Fewest blocks (certified) | What is new |
|---|---|---:|---|
| 1 | Lines in sand | 1–5, written plan | A line, then corners and a U. Open on purpose: lines do not close |
| 2 | Four sides | 7, written plan | Flat rectangles, rhombi and slanted four-sided shapes. No Repeat is offered yet |
| 3 | Loop a shape | 3–4 | One Repeat of `[forward, turn]` for triangles, squares, hexagons and octagons; two Forward blocks for a longer side |
| 4 | **Angles** | 5 | A loop whose body turns twice, so the turns have to add up: 90 and 90 twice, 60 and 120 twice, 60 and 60 three times, 45 and 45 four times |
| 5 | **Flowers and fixes** | 6 | A shape inside a turn (a Repeat in a Repeat, in one pen colour). Thirty of the forty pictures begin with one planted bug: a wrong turn, a wrong count, or a missing block |

The order is now true to the numbers: every Level 3 picture needs 3–4 blocks, every Level 4 picture 5, every Level 5 picture 6, and the flat plan never fits from Level 3 up (`the flat plan must not fit`). Level 5's tray is one block more than its fewest, so a child cannot out-block the idea. Levels 1 and 2 are flat on purpose; their "fewest" is the written plan.

Level 4 and 5 open in the K7 block editor (`blockEditor: true` on the new task, as K7 allows for newly authored content), with the tray shown, no songs, and the editor measured as School space. A "Drawing cards" button goes back to the cards.

Each round shows four pictures, easiest first: tiers are the four quarters of a level ranked by how much it draws (and, at Level 2, by right angles before slanted sides).

### Hints from the real engine

Hint walks a short ladder, never faster than the child asks:

1. **Where you are.** After a run, the line that first goes wrong. Otherwise, how many changes away the picture is.
2. **One edit.** `distance.ts` finds the fewest editor actions (add, remove, change a block, change a Repeat count) from the plan to the nearest certified plan. Applying the first edit always shortens the distance by exactly one. A test walks every one of the 320 pictures from an empty plan, and every planted bug, to a winning plan this way.
3. **Show me**, the existing whole answer.

## Deep Water (SC-03)

Five steps, each a bank of twelve **draw it** puzzles (banks 220–224) and twelve **predict the picture** puzzles (225–229). Twelve rungs climb tiers 1–6, two per tier. The Challenge picker lists them with every other Challenge game; nothing in the frame changed.

| Step | Idea | Pictures |
|---|---|---|
| Five sides | Turn 72° and repeat 5 times | pentagons, long pentagons, two-sided pentagon loops, pentagon flowers |
| Stars | Turn 144° and repeat 5 times | stars, long stars, zig stars, twin stars |
| Nine sides | Turn 40° and repeat 9 times | nonagons, bent nonagons, nine-sided flowers, nine-sided zig loops |
| Growing shapes | **Grow +10** makes every later side 10 longer | growing triangles, squares, hexagons and rectangles around a point |
| Mixed patterns | Put the ideas together | five-in-nine loops, star and nine-sided growth, three Repeats deep, longer sides |

**Grow +10** is a new command (code 17), not a new K7 node. Grow adds 10 to every Forward after it, each time it runs. In a Repeat, each turn of the Repeat is bigger. The K7 model, codec and operations are unchanged (see "Saves"). Every Deep Water picture is closed (the pen returns to where it began), so the growing pictures are rosettes, not open spirals.

Deep Water adds Forward 40 and 50, the 40°, 72° and 144° turns, and Repeat counts 5 and 9 (`counts` on `ProgramEditor`, default unchanged). The tray is the fewest blocks plus one. Dares sit only on the two hardest rungs of each bank (slots 400–429, 30 in all): on draw it, "First run works" and "Fewest blocks" (Help welcome); on predict, "Right on the first check, no Help".

### Predict the picture

The board shows a program and four pictures drawn to one shared frame, so a picture that is only a little bigger still looks it. The child picks one and checks. Nothing is drawn until the check. A wrong pick is crossed out and the attempt continues; there is no mistake limit. A right pick draws the program line by line. Finishing on the first check without Help is independent; anything else is a helped finish.

The three wrong pictures are real misreadings of the program: ignoring the Repeat, miscounting it, a different or far-off first turn, every side longer or shorter, the blocks read in the other order, forgetting Grow. Each wrong picture sits at least 12 sand units from every other picture on the board (`pictureGap`), so none differs from another by a stroke alone. From tier 5 the wrong pictures always include the one that reads every Repeat as "once". Help crosses out that picture first, then another, and never the answer.

### The dumb player

- **Draw it.** A flat player (no Repeat) never fits any tray: the flat plan is at least 1.8× the tray on every one of the 60 puzzles, and at least 2.25× on the top rungs (tiers 5–6).
- **Predict.** A skimming player reads each Repeat as "once", picks the picture that matches that reading, and otherwise takes the first picture. It is wrong on **all 20** puzzles of tiers 5–6. On tiers 1–4 it can only guess the first picture, so it is right on about a quarter (the right answer is spread evenly over the four places, 15 each).

### How a child who finds Level 3 too easy steps up

1. **Level 4** asks what the turns add up to in a loop that turns twice, and shows 5 blocks for 11 of flat drawing.
2. **Level 5** puts a loop in a loop, or hands over a program with one bug.
3. **Deep Water** starts at tier 1 on any step and is open from day one: new angles that are not on the School buttons, a 9-times repeat, Grow, and (for adults and older children) predicting the picture before it runs.

## Certified supply (BK-22)

320 pictures (target 320, floor 120): 40 per School level and 120 in Deep Water. Each is proved by `draw`, not by hand:

- **closes** (the pen returns to where it began) from Level 2 up and in every Deep Water picture; Level 1's lines and corners are open on purpose and tested as open;
- **fits** the sand grid, 4 units clear of the edge, at the picture's own centred start;
- **new**: 320 distinct geometry hashes, and no two drawings alike (pairwise, with a tolerance);
- **fewest blocks** proved by an exact search over every split and every Repeat the editor can build, at the level's own counts and up to three levels deep. School's written plan is that minimum from Level 3; Deep Water's shipped answer always is;
- **no family over 25%** of its band: School levels have 4–7 families of at most 10; each Deep Water step has 4–5 families of at most 6.

| Band | Pictures | Fewest blocks | Families (count) |
|---|---:|---|---|
| Level 1 | 40 | 1–5 (written) | line 5, corner 10, bend 45/60/120 5 each, u-turn 10 |
| Level 2 | 40 | 7 (written) | rectangle 10, rhombus 5+5, slant 10+10 |
| Level 3 | 40 | 3–4 | triangle 5, square 5, hexagon 5, octagon 5, long triangle 8, long square 9, long hexagon 3 |
| Level 4 | 40 | 5 | rectangle 10, parallelogram 10, alt-hexagon 10, alt-octagon 10 |
| Level 5 | 40 | 6 | flower 10, fix-turn 10, fix-count 10, fix-missing 10 |
| Deep Water | 120 | 3–9 | 22 families across five steps |

Technique histogram over the 120 Deep Water pictures: 72° in 37, 144° in 32, 40° in 32, Repeat 5 in 61, Repeat 9 in 26, Grow in 34; one Repeat deep in 63, two deep in 52, three deep in 5.

## Free drawing

Free drawing is the same free drawing. It is not a puzzle, has no Hint, Show me, tray or dare, and is never a Challenge source (`free drawing is untouched and ungraded`). A free round does not touch `completed`, `done` or any practice record. It draws from the original start point (100, 80), not a picture's centred one, and keeps the old limits: 20 blocks on the top level and 120 drawn lines.

## Saves

- New rounds are **version 2**: four template numbers per level, rebuilt and compared exactly at load. A saved **version 1** round keeps its generator, its tasks, its top-level block count, its board (inside a geometry-off provider) and its earned stars. The frozen fixtures' version 1 Turtle rounds validate unchanged (`every frozen save fixture's Turtle round still validates`).
- School drafts read only codes 0–11; the Deep Water codes 12–17 are appended (`deepCodes`) and only the Deep Water reader accepts them. No K7 node, codec, operation, envelope, profile, session class or budget changed. `ProgramEditor` gained an optional `counts` prop, default `[2, 3, 4, 6, 8]`.
- Deep Water uses codec `turtle-proof-v1`, context `turtle-1`…`turtle-6`, banks 220–229, dares 400–429. A draw-it attempt that has no replay room left offers Keep my plan (`restart`), which carries the plan, runs, misses and Help count.

## Measured board space (F-frame-2)

Turtle Draw is now a measured School board (`SCHOOL_BOARD_MIN['turtle-draw'] = 200`, `docs/CONTRACT_4.0.md`). New rounds ask the frame for the canvas height; the canvas keeps its length labels at 12 pt or more down to that floor. Block-editor levels fix the canvas and let the editor take the space, as Crab and Beep do. In wide landscape the canvas sits left and the controls right. Saved version 1 rounds keep the old drawing and controls outside the measured space. The native evidence is in the slice report, not in this page.
