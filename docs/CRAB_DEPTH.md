# Crab Commands depth (C1d: SC-01b, SC-01c)

Crab Commands was the first game the family called too easy. Levels 1–3 top out at 13 cards, and Again saves only a card or two. This page says what each step up asks for, how the difficulty was measured, and where a child goes next.

All numbers below come from the app's own movement engine (`engine.ts` `step`), through the searches in `search.ts`. The bakes are `bake-school.ts` and `bake-deep.ts`. `tests/c1d-crab-school.test.ts` and `tests/c1d-crab-deep.test.ts` re-prove every beach.

## Levels 1–3

There are 30 more beaches, 10 per level, so a long run of Level 1 rounds doesn't repeat the same three long beaches. Each one is solved on the engine. Its tier comes from the shortest plan: 2–3 cards, 4–6, or 7–13. On every new Level 3 beach, Again saves at least one card, and at least two on the long ones.

## Level 4: Find & fix a bug

Each of the 24 beaches opens with a plan that has one planted bug: a wrong turn, a missing or extra Walk, or a wrong Again (one card too many or too few repeats). The board's own repair search, the same one that powers Hint, finds a one-edit repair that wins with a shortest plan. The first hint names that one edit. More help and the whole plan come only when asked.

| Tier | Shortest plan (mean cards) | Cards between the bug and the first sign of trouble (mean) |
|---|---:|---:|
| 1st beach | 7.0 | 1.3 (at most 2) |
| 2nd beach | 9.3 | 1.8 |
| 3rd beach | 12.0 | 5.0 (at least 3) |

On the last beach the plan looks fine for several cards after the bug, so the child has to trace the plan instead of fixing the red card.

## Level 5: Repeat whole blocks

The 24 beaches use Walk and Turn. The plan tray holds fewer blocks than the fewest flat cards, with or without Again, so no flat plan fits: the test proves this per beach. Every block counts, as the editor counts it. The block search (cards and Repeats, nested at most two deep, with the editor's counts ×2, ×3, ×4, ×6 and ×8) finds the fewest blocks, and the tray is that number plus at most one.

| Tier | Fewest flat cards | With Again | Fewest blocks | Tray | Repeat nesting |
|---|---:|---:|---:|---:|---|
| 1st beach | 8.8 | 8.6 | 4.3 | 5.3 | one Repeat |
| 2nd beach | 10.5 | 9.8 | 6.3 | 7.3 | Repeat with cards around it |
| 3rd beach | 14.3 | 13.0 | 6.4 | 6.4 | a Repeat inside a Repeat is needed: no single-level plan fits |

Hint names one editor action toward the nearest certified winner, in the editor's own controls (`block-hint.ts`). It might be: tap a dashed ＋ place, then a palette button; tap a Repeat, then ×N; select a block, then replace or remove it; or "Make plan a song". A new Repeat arrives at ×2 and the next step sets its count. A new If arrives with empty branches, and the next steps fill "＋ When blocked" and "＋ Otherwise". A song is built the only way the editor allows: put its cards in the plan, make the plan a song, then call ♫ Song 1 again. The last help step spells out the whole plan, including every branch and the song. The run itself shows where a plan bumps. Every step the hint names is one the editor accepts: when the next card would not fit the tray, the hint makes room first ("The tray is full, so make room first. Tap plan, block 3 (Walk), then tap Remove block."), choosing the block whose removal leaves the shortest way to the winner. The same ladder serves Level 5 and the Songs and Foggy beach puzzles. A test drives the real editor, pressing only the controls the words name, from an empty plan and from full, mistaken drafts to a helped win on every one.

Tray puzzles (Level 5 and every Deep Water block puzzle) admit only the Repeat counts the editor's buttons set: 2, 3, 4, 6 and 8. The rule sits in the same admission as the tray and tools, for initial drafts, replay and edits. The K7 codec still reads counts 2–16, so older saves keep decoding.

## Deep Water

Five new ideas follow Mud, each in five puzzles: teach, develop, twist, short hard, then an easy finish. There is no recursion. The best possible is never shown before a win. Puzzle titles, lessons and dare labels hold no par number, and the finish card says it.

| Idea | Bank | What is new | Top-rung proof |
|---|---:|---|---|
| Rising tide | 12 | Low sand (~) floods once the crab has walked the tide number of squares | The twist's shortest route gets cut off; a tide one step sooner is unsolvable |
| Key and gate | 13 | The gate opens once the key is held | No plan gets home without the key; the key is a detour |
| Songs | 14 | Name a group of cards and call it. Cards and songs only, no Repeat | No flat plan fits the tray; the song plan does. Teach and the easy finish call the song twice; the others three times |
| Foggy beach | 15 | One plan must work on two beaches; If blocked | No flat plan brings the crab home on both. Every program a child can build in five blocks was tried: fewest blocks are 4 / 5 / 5 / 5 / 4, and no harder rung is won by an earlier rung's shortest plan |
| Two crabs | 16 | Every card moves both; a crab that would bump stays | The twist needs at least two cards where one crab is held still |

Why Songs has no Repeat block: a run stops the moment the crab is home, so on a 5×5 beach any group a song captures, a Repeat can capture in as few blocks. The bake measured this on every three-call candidate it tried. Offering Repeat would let a child skip the idea. The engine refuses a Repeat on these puzzles, and the editor doesn't show one.

Foggy beach rises by program, not by tier number. The bake and a test both try every program of up to five blocks the editor can build (Walk, Turn left, Turn right, Repeat at its button counts, If blocked with either branch), on both beaches, and keep the ones the engine accepts and wins:
- **Teach** needs `Repeat [If blocked: turn, otherwise: walk]`: 4 blocks, tray 5.
- **Develop** needs 5 blocks (tray 5). The plan puts a card before the Repeat. None of Teach's 4-block winners works here.
- **Twist** needs 5 blocks (tray 5). The plan puts two cards in one branch. No shortest Teach or Develop plan works here.
- **Tight tray** needs 5 blocks with no spare (tray 5). Its plan is `Repeat 6 [Turn right, If blocked: Turn left, Walk]`, and only six programs win it. No Develop or Twist winner, and no 4-block Teach winner, works here, so the shortest plans from the last beaches fail, as its lesson says.
- **Easy finish** returns to the teaching shape with one spare block.

Every winner within each tray uses If blocked inside a Repeat. The enumeration counts a plan as winning only if the engine accepts it, so a plan whose cards run past 80 on a beach does not count.

When Harder would move to another idea, the finish card says where it goes ("Harder takes you to Key and gate 4 of 5."). A "keep learning this idea" choice belongs to the shared Challenge core and is recorded as a follow-up.

Deep Water dares (slots 154–157) sit only on tier-6 rungs, which no earlier idea uses. A dare in a shared tier would change what the finish card offers after a Mud puzzle.

## The dumb player

`greedyBot` (`deep-proofs.ts`) plays flat cards only, with no loops, songs or conditions. It walks to the nearest shell, then home, on a naive map where gates are walls and keys and low sand are plain sand. With two crabs it brings one crab home, then the other. On a foggy beach it plans on the first beach. The tests require it to fail every Level 5 beach, every Songs and Foggy beach, and the twist and short hard beach of every idea.

## Stepping up from Level 3

A child who finds Level 3 too easy has three real steps up. None of them is just more of the same:

1. **Level 4** asks them to read a plan instead of writing one, and to find the card that went wrong before the crab shows it.
2. **Level 5** takes away the room for single cards. The only way to fit the tray is to see the pattern and repeat it. The last beach needs a Repeat inside a Repeat.
3. **Deep Water** (the Challenge button) adds a new idea per group: timing with the tide, ordering with a key, naming groups with songs, one plan for two beaches, and two crabs on one program. Mud and Rising tide suit a 7-year-old. Songs, keys and fog suit about 9. Two crabs and tight trays are for older children and adults.

Every level and every Deep Water puzzle stays open from day one.

## Saves

New Level 4–5 rounds play these beaches (`nativeStages`). A paused Level 4–5 board round from before resumes on the shared board, and earned stars are unchanged. Level 1–3 rounds and every published Challenge descriptor are unchanged, and the hint golden for every earlier beach is identical. Level 5 beaches are the only School beaches that opt in to `blockEditor`, as the K7 contract allows for newly authored content.
