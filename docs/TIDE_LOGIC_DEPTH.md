# Tide Logic depth and Challenge (C4: SC-05, BK-24)

Tide Logic teaches **writing** a rule: a child reads where the catches should go and builds the rule that sends them there. (Gate Crab teaches discovering one.) Before C4, short belts let wrong rules pass (a mean of 17 of 294 candidate rules passed a Level 5 belt), `then` behaved exactly like `and`, and the prompt spelled out the rule words, so a child could copy them into the blocks. This page says what changed and how it was proved. Every number below is re-derived in `tests/c4-tide-content.test.ts`, `-school.test.ts`, `-challenge.test.ts` and `-view.test.tsx`.

## One pure engine

`src/learn/games/tide-logic/rules.ts` is the single rule engine for School version 3 rounds, Endless Tide and Deep Water: catches, rule frames, where each catch goes, the separation proof, goal sentences and every hint. A catch is a number 0–15 (coral, small, shell, bell as four bits). A rule is one option per slot of its frame. Help, the miss message and the run use the same functions as the win check.

| Frame | Used by | Slots | Rules a child can build | Different behaviours |
|---|---|---|---:|---:|
| `color` | School 1 | colour, bucket | 4 | 2 |
| `size` | School 2 | size, bucket | 4 | 2 |
| `two6` | School 3, Endless 1 | clue, AND/OR, clue, bucket (no bell) | 144 | 32 |
| `bell` | School 4, Endless 2 | which catch rings, clue, bucket | 24 | 24 |
| `two7` | School 5, Endless 3, Find the rule | clue, AND/OR, clue, bucket (bell is a clue) | 196 | 58 |
| `not` | Endless 4 and 6, Deep Water Not, Find the rule | clue or NOT clue, AND/OR, clue or NOT clue, bucket | 784 | 58 |
| `three` | Endless 5, Deep Water Three clues, Find the rule | clue, AND/OR, (clue, AND/OR, clue), bucket | 2,744 | 314 |
| `flip` | Deep Water Flip gate | trigger (clue or NOT clue), starting side | 28 | 16 |

Two rules are the same rule when they have the same behaviour: the same bucket for every catch (the bell frame: for every catch after every possible catch before it; the flip gate: the same flipping catches and starting side). Any rule with the target's behaviour wins, so `coral and no bell → left` and its twin `blue or bell → right` are both right.

## Every wrong rule fails its belt (SC-05)

Each belt is built by the solver (`generate.ts`): it adds the catch that rules out the most surviving wrong behaviours until none survive, trims catches that are not needed, then pads to a comfortable length. The test then checks every shipped belt against **every rule its frame offers**, 308 belts in all and well over 100,000 rule-on-belt checks: any rule that sorts the belt like the target has the target's behaviour. No lucky pass is possible.

The separating core is 1 catch at Levels 1–2, 3–4 at Levels 3–5, 4–5 for three clues and 3 for the flip gate. The spec's worked examples hold: the flip gate with bells on catches 2 and 5 of six sorts left, right, right, right, left, left; three catches pin `coral and no bell`; `big or shell` needs one coral catch more than the spec's three to pin it against colour rules, and every shipped find belt passes the full proof.

## Levels (School version 3)

| Level | Name | What is new | Belt |
|---|---|---|---|
| 1 | Colour gates | One colour, either bucket | 4–5 catches; size and kind vary too |
| 2 | Big or small | One size, either bucket | 4–5 |
| 3 | Two clues | The goal is in everyday words ("Blue fish go left. The rest go right."); the child turns it into AND or OR | 5–7 |
| 4 | **The real bell** | The bell rings on this catch, or on the catch before it. "Shells that come right after a bell go left" is a different rule from "Shells with a bell go left", and every Level 4 belt tells them apart. The counter counts catches sent to the child's bucket | 5–7 |
| 5 | Trace the rule | The bell is a clue among seven. Before running, the child traces their own rule on one chosen catch: the one where the target and its most tempting wrong rule part ways | 6–8 |

**The sentence is hidden above Level 2.** From Level 3 the goal sentence never uses *if, and, or, not, then* or *else* (`usesRuleWords`). Levels 1 and 2 keep their plain "Send blue catches left." Help's first rung gives the wording without the answer: whether both clues are needed or either is enough, whether the bell changes this catch or the next one.

Each round takes four belts, one from each quarter of the level ranked by difficulty, easiest first, and avoids the previous round's four.

### Help, Undo, Clear

Help climbs three rungs, never faster than the child asks: **Look** (with a finished wrong rule, the first catch it sends the wrong way and where it belongs; otherwise how the rule is built and a pair of catches that differ in one clue and land apart), **One step** (one block set right, toward the nearest right rule), and **Show rule**. A press that would add nothing is refused. An edit starts the ladder again. A wrong run names the first wrong catch and both buckets and keeps the rule. Undo (12 deep) and Clear live in the saved round, so a force-close resumes exactly. Help or a wrong run marks the round helped (`helpedWork`).

### Saved rounds

New rounds are **version 3**: four certified belt numbers per level, checked at load against `content.json`. Saved **version 1 and 2** rounds keep their seeded tasks, their board and their earned stars; every frozen save fixture's Tide Logic round still validates unchanged. No envelope, profile, session class or budget changed.

## Endless Tide and Deep Water

Banks **245–250** are Endless Tide, one tier each (10 belts): Two clues, Bell first, Bell clues, Not, Three clues, Find it. Banks **251–254** are Deep Water, one step each, twelve rungs climbing tiers 1–6, two per tier:

| Step | Idea | Kind |
|---|---|---|
| Not | "Coral catches without a bell go left." Every target has NO bell, the one Not with no other word | Write it |
| Three clues | first AND/OR (second AND/OR third), with the bracket on the board. No target can be written with two clues | Write it |
| Flip gate | The gate starts on one side; every matching catch flips it as it arrives | Trace it (six) and Find it (six) |
| Find the rule | No words: a sorted belt, and the rule behind it. Two clues, then Not, then three clues | Find it |

**Write it** shows the goal sentence. **Find it** shows every catch's bucket and no sentence. **Trace it** shows the rule; the child sends each catch left or right, then Checks once. After a Run, every catch is tested in turn with a tap tone and lands where the rule sends it, marked right or wrong; a miss stops at the first wrong catch.

Dares sit on the top rungs, slots **650–685** (36): "First run sorts every catch, no Help" (plan, one run, independent) on Endless tiers 5–6 and Deep Water tiers 5–6, and "Right on the first Check" (whole) on the tier 5–6 flip-gate traces. Awards: no Help and no miss, then a finish in at most two runs (tracing: right first time, then no Help).

### The 500-action reserve

Actions are small numbers. Ordinary play stops at 504 actions; the last 8 and 224 bytes belong to Help (`ASSIST_ACTIONS`, `ASSIST_BYTES`). An unchanged rerun is refused, so misses need an edit between them, and edits stop at the ceiling. From there at most three Help presses and three runs remain, which always finish. Stress tests drive every kind (three clues, bell, Not find, flip find, flip trace) through hundreds of misses, saturated Help broken over and over, and Undo/Clear churn until the log refuses every ordinary action, then finish with Help inside 512 actions and 4,096 bytes. **Keep my plan** starts a new attempt with the draft, and carries the runs, misses and Help so it is never independent afterwards.

## Certified supply (BK-24)

308 belts (target 300, floor 100): 200 School, 60 Endless Tide, 48 Deep Water. 308 distinct semantic hashes (task kind, behaviour and belt, in order when order matters). The bake is deterministic and the test re-runs it: `content.json` is exactly the solver's output.

| Band | Belts | Separating core | Belt length | Families (largest) | Dumb player fails |
|---|---:|---|---|---|---:|
| School 1 | 40 | 1 | 4–5 | 4 (10) | 0 |
| School 2 | 40 | 1 | 4–5 | 4 (10) | 0 |
| School 3 | 40 | 3–4 | 5–7 | 6 (7) | 19 |
| School 4 | 40 | 3–4 | 5–7 | 6 (7) | 20 |
| School 5 | 40 | 3–4 | 6–8 | 12 (4) | 18 |
| Endless 1–6 | 10 each | 3–5 | 5–9 | 6–10 (2) | 4, 5, 6, 10, 7, 10 |
| Deep Water Not | 12 | 3 | 5–8 | 8 (2) | 12 |
| Deep Water Three clues | 12 | 4–5 | 6–9 | 8 (2) | 10 |
| Deep Water Flip gate | 12 | 3 | 5–8 | 6 (2) | 10 |
| Deep Water Find the rule | 12 | 3–5 | 6–9 | 12 (1) | 12 |

No family is over a quarter of its band. A family is what the child reads: the joins, which kinds of clue, which are NOT, and the bucket. Technique histogram over all 308: one clue 80, AND 75, OR 65, bell on this catch 25, bell on the catch before 25, bell as a clue 27, Not 36, three clues 26, flip trace 6, flip find 6, find the rule 28.

### The dumb players

- **The keyword copier** copies the sentence's clue words in order, joins them with AND, and ignores "without" and "right after". It is what the old spelled-out prompt rewarded. It still solves Levels 1–2 (on purpose) and fails **every** top-quarter belt of Levels 3, 4 and 5, every Not belt and the Deep Water three-clue top rungs.
- **The one-clue guesser** (find the rule) takes the single clue that agrees with the most catches; at the flip gate it guesses a plain bell trigger. It fails all 22 two-clue, Not and three-clue Find it belts, and 4 of the 6 flip-gate finds (the two it passes are the tier 1 finds whose trigger really is the plain bell).
- **The no-carry tracer** (flip gate) flips only the catch that matches and forgets the gate stays flipped. It fails every tier 5–6 trace.

### How a child who finds Level 3 too easy steps up

1. **Level 4** asks which catch the bell changes, and every belt punishes the wrong guess.
2. **Level 5** adds the bell as a clue among seven, longer belts, and tracing before running.
3. **Endless Tide** goes on from there at any tier, and **Deep Water** adds NOT, three clues with a bracket, the flip gate and finding a rule with no words at all. All of it is open from day one.

## Speech

Five new lines in `scripts/learn/c4-tide-logic.json` (design-only until the lead voices them): the rules for write, find and trace, the bell and NOT. Each Hear button appears only once its line resolves.
