# Board policies, rivals and board puzzles

Little Island 4.0, slice P1a: ledger rows PP-00, BD-06, BD-07 and PP-01. Slice P1b adds BD-02, BD-04 and BD-05 (below): Coconut Drop puzzles, the Fishing Nets exact ending and chain endings, and the Hidden Canoes heatmap and deduction charts. This covers the computer players in Coconut Drop, Fishing Nets, Hidden Canoes, Shell Pits and Checkers, and the Shell Pits endgame puzzles. Tic-tac-toe is untouched. Coconut Drop and Fishing Nets play exactly as they did in 3.0. Checkers plays the 3.0 search without its clock (revision 2, below).

## Policy contract (PP-00)

`src/playPolicies/` holds every computer policy that has shipped.

- **IDs never change meaning.** An ID is `<game>/<strength>@<revision>`, for example `shell-pits/challenge@2`. `boardPolicies` and `checkersPolicies` are append-only, and a test pins every entry with its revision, depth, node budget and visibility. A stronger or different search is a new revision.
- **Nothing under an ID can be changed at runtime.** Every policy object, its `limits`, and the Shell Pits rules and budget its chooser reads are frozen, and the types are readonly. Assigning to any of them throws. `IterativeSearch` keeps its own copy of the limits it was given. A test also pins a fingerprint of every searched decision (move and positions searched) on a fixed corpus for `shell-pits/challenge@2` and `checkers/*@2`, so editing a depth, cap, ordering or evaluation under a shipped ID fails the build.
- **The budget belongs to the ID.** `choose(view, rng)` takes no budget, so no caller can weaken or strengthen a policy. Search strength depends only on the count of positions searched, never on the clock. A slow device takes longer; it doesn't play weaker. Tests run the same search with slice sizes 1, 7, 256 and 4,096 and get the same move.
- **Public views have no hidden fields.** `openView` (Coconut Drop, Fishing Nets, Shell Pits) and `canoesView` are built one field at a time, so a new Position field can't leak in by spreading. The Hidden Canoes view has the seat's own fleet, its own searches and the other seat's searches of its lagoon. It has no other fleet and no seed, because the seed lays out both fleets.
- **Counterfactual tests.** With the chart held constant, moving a rival canoe anywhere unsearched leaves the view, the decision and the hint unchanged, for every strength and several salts.
- **A saved match freezes its policy.** Board sessions are version 2. They record `policy` (null when no computer plays) and `salt`, a public tie-break number drawn independently of the seed. Validation requires the recorded policy to match the round's game and strength. Version 1 sessions saved before 4.0 stay valid and finish on revision 1. New rounds, including Play again, take the current revision. Nothing changes strength in the middle of a round.
- **Benchmark harness.** `bench()` plays both starters, both seats and seeded random legal openings. It reports unique trajectories separately from games, so repeated seeds can't pass as variety. `scripts/boards/benchmark.ts` writes the evidence file.

### What changed and why

| Policy | Change |
| --- | --- |
| `shell-pits/challenge@2` | New. See BD-06. `@1` (depth 6, 9,000 positions) is kept for version 1 rounds. |
| `fishing-nets/challenge@2` | New in P1b. See BD-04. `@1` is kept for rounds saved under it. |
| `hidden-canoes/challenge@3` | New in P1b. See BD-05. `@2` is kept for rounds saved under it. |
| `hidden-canoes/*@2` | Same rules of thumb as 3.0. The search order now comes from the caller's random source. Revision 1 shuffled with `seed + moves`, and the seed also lays out the fleets. The same chart could get a different choice (test: 31 of 40 seeds differed). `@1` is marked `publicOnly: false` and only finishes version 1 rounds. |
| Hints | Board hints use the strongest current policy from the hinted seat's own view. Shell Pits hints now look 8 sows ahead. Hidden Canoes hints no longer read the seed. Reef Sweep keeps its own solo hint. |

### Checkers, revision 2

The 3.0 Checkers search had a fixed depth and node cap (Growing depth 2 and 1,800 positions, Challenge depth 4 and 9,000), but each root branch also stopped after 8 ms, so a slow device played weaker. That breaks the PP-00 rule. `checkers/<strength>@2` is the same search, move for move, with the clock removed: the same root order, the same full window per root move, the same shared node cap. It runs on an explicit stack in slices of at most 8 ms; the clock only decides when to yield. Gentle still picks any legal move, now from public round facts (the round ID and move count) instead of `Math.random`, so a replayed position picks the same move.

- New and replayed rounds record `policy: "checkers/<strength>@2"`. Validation accepts it only for the round's own strength. Rounds saved without a policy keep revision 1 (`archivedCheckersChoice`, unchanged) and finish as they began.
- A test shows revision 2 makes revision 1's move whenever revision 1's clock doesn't run out, on 46 positions at both strengths. On a clock that runs 9 ms per reading, the old search changed its move in 19 of 23 positions; revision 2 changes none.
- Strength, measured by `scripts/boards/checkers-budget.ts` on 335 positions from 40 seeded games (evidence in the slice's `fix-evidence/`):

  | | Growing | Challenge |
  | --- | --- | --- |
  | Revision 1 on the Mac's Node JIT: same move as revision 2 | 335 of 335 | 335 of 335 |
  | Revision 1 interpreted (`node --jitless`, standing in for Hermes, host loaded): same move as revision 2 | 335 of 335 | 297 of 335 |
  | Revision 1 with its clock stopped: same move as revision 2 | 335 of 335 | 335 of 335 |
  | Largest search, positions | 100 | 1,513 (cap 9,000) |

  So revision 2 plays as revision 1 always played on a fast machine, and a slow device no longer cuts the Challenge search short (38 of 335 decisions there). Both revisions beat a random player 40 of 40. Revision 2 against revision 1 with colours swapped gave the same win counts both ways (Growing 8 to 4, Challenge 2 to 1, the rest drawn or past 200 plies). Interpreted on the loaded host, where revision 1's clock ran out, revision 2 won 17 Challenge games to revision 1's 6 over the same 80 games. The head-start results are identical in both runs, because revision 2 doesn't read the clock.
- Revision 2 search time on the Mac (whole decision, before slicing): Challenge p95 6.9 ms and worst 13.9 ms with JIT; p95 136 ms and worst 215 ms interpreted on a loaded host. It runs in 8 ms slices after the 320 ms thinking pause. **The iPad mini (6th generation) time is still unmeasured.**

## Shell Pits Challenge, revision 2 (BD-06)

Iterative-deepening alpha-beta, from depth 1 to 8, capped at 50,000 positions per decision. It uses the real engine's sow, capture and extra-turn rules and the 3.0 evaluation. Below the root, extra turns are searched first, then captures, then pit order. The ordering only changes speed. An iteration the cap cuts off is discarded, and the deepest completed iteration answers. Depth 1 always completes. Gentle and Growing are unchanged.

Results from `p1-boards/evidence/benchmark.json`, with the greedy grab (most shells, then an extra turn) as the subject:

| | Revision 1 | Revision 2 |
| --- | --- | --- |
| Four opening cases (both starters × both seats) | greedy won 2 | greedy won 0 |
| 144-prefix corpus: greedy wins / draws / losses | 8 / 2 / 134 | 6 / 2 / 136 |

Every corpus game keeps 48 shells, and the turn changes only when the last shell misses the store. Revision 2 wins more of the corpus overall, but 12 individual prefixes (six seat-mirrored pairs) flip. Six go the rival's way, all from a greedy win to a loss. Six go the greedy player's way: two losses become wins, two become draws, and two draws become wins. They're horizon effects. Depth 9, 10 and 12 searches flip a different set each time, and none gives a better corpus total than depth 8. The flips are listed in the evidence file.

**Response time.** On the development Mac's Node.js, across 2,200 corpus decisions, depth 8 finished every time. p50 was 2.3 ms, p95 9.6 ms, and the worst case 21.1 ms (25,727 positions). The search runs in slices of at most 8 ms after the 380 ms thinking pause, so frames keep drawing. **The 100 ms target on the iPad mini (6th generation) has not been measured.** It runs Hermes, which is slower than Node's JIT. A device measurement is still needed.

## Shell Pits endgames (BD-07)

There are 16 endgames in tiers 1–4, with par 2, 3, 4 and 5–6 sows, registered through `defineReplayGame`. The bank is 460, the codec `pits-tactics-v1` and the contexts `pits-1` to `pits-4`. Dares start at slot 3200. The player is the circle side and moves first. Ray, the Challenge rival, answers every sow with its best defence.

- `scripts/boards/pits-tactics.ts` generates the bank deterministically. A bounded solver proves each par exactly: a win in `par` sows against every reply, and none in `par − 1`. Each puzzle has exactly one winning first sow, and the greedy grab isn't it.
- Dares are optional and keep help welcome where it fits. *Win in N sows* is a par on sow count. *Win with a capture across the pits* and *Win before Ray sows once* are pick-up objectives, offered only where a line is certified against every defence. *No help and no lost tries* is the clean dare. Help shows the next winning sow. Undo and Start again are always there. A lost try is a failed check, so it costs the clean mark and nothing else.
- **The strongest bot punishes the exploit but isn't a forced loss.** Greedy loses all four opening cases (above). A depth-14 search beats revision 2 from every starter and seat; the four winning lines are replayed move by move in `tests/shell-pits-tactics.test.ts`.
- Reach the endgames from Shell Pits setup: *Endgame puzzles · win in a few sows*. The frame's way back reads *Back to Shell Pits* through the new optional `backLabel`.

## Coconut Drop puzzles (BD-02)

24 puzzles in three tiers: 8 *win* (one drop finishes four), 8 *block* (Ray could finish four next turn, in exactly one column) and 8 *fork* (one drop makes two fours at once; Ray can block only one). Challenge ID `drop-puzzles`, bank 461, codec `coconut-tactics-v1`, contexts `coconut-1` to `coconut-3`, dares 3264–3311. (Not `coconut-drop`: the Challenge ID ledger is a word list the export guard scans, and that ID tipped it over the guard's list threshold.) You are the circle coconuts and move first.

- **Replayed from a legal opening.** A puzzle is the list of drops that leads to it, played from an empty board through the real engine. Every drop must be legal, nobody may have won, and circle must be next. `scripts/boards/coconut-puzzles.ts` finds the openings by seeded family-style play (take a four, block a four, don't drop under the other side's four) and keeps only positions with exactly one answer.
- **Certified.** A plain search with no memo checks every answer: the win column is the only four; the block column is the only drop after which Ray has no four, and circle has no four of its own; the fork column is the only drop that forces a win in two, circle has no win in one, and the drop leaves at least two fours open.
- **One answer, no detours.** A try may use exactly par drops (1, or 2 for a fork). Any other drop is a lost try, even when a slower win is still possible, so the clean mark always means the puzzle's own drop was found. Ray answers a fork by blocking one four, or plays its own Challenge move when nothing can stop circle.
- **Dares.** *No help and no lost tries* on every puzzle; *Win in 2 drops* on the forks. Help shows the column.

## Fishing Nets: exact ending and chain endings (BD-04)

**`fishing-nets/challenge@2`.** With more than 14 ropes open it makes revision 1's move exactly. From 14 down it solves the ending with `NetsExact`: a negamax over the set of tied ropes, where closing a box adds the box and the same seat chooses again, and any other rope passes the turn. Values count only the boxes still open, relative to the side to move, so a set of tied ropes stands for every turn and score that reaches it; a test checks the move against a plain search whose key is the board, the turn and both scores. The memo visits each set at most once, so it never searches more than 2^14 positions (`limits: { depth: 14, nodes: 16384 }`). Ties between equally good ropes are broken by the round's public salt. It runs in the same 8 ms slices as every policy.

Against revision 1 (`p1b-boards/evidence/benchmark.json`, both starters and seats, seeded openings): 122 wins and 26 losses of 148 on 3×3, 110 / 14 drawn / 24 on 4×4, 112 / 36 on 5×5. Host time per decision at 14 ropes or fewer: p95 3.3 ms, worst 14 ms on Node's JIT; interpreted (`--jitless`, standing in for Hermes, on a loaded host) p95 80 ms, worst 162 ms, in steps whose p95 is 4.3 ms. **The iPad mini (6th generation) time is unmeasured.**

**Chain endings.** 12 endings, bank 462, codec `nets-chains-v1`, contexts `nets-1` to `nets-4`, dares 3312–3335. Each is a legal game through the real engine (3×3 or 4×4) that leaves circle to move with 12 ropes or fewer and no safe rope. Circle can win with best play, while the 3.0 Challenge habit (take every box, then hand over the shortest chain) and plain greed both lose against Ray's exact defence. Ray reads one exact table per ending, built once (at most 2^12 sets) and cached, so replaying a saved try costs lookups only.

Each ending teaches one of two ideas, read from its best line and checked by plain search:

- *Leave two* (6 endings): a box is there to take, but the best rope closes nothing and leaves the last two boxes as a pair. Ray takes the two, then has to open the next chain. Taking the box is strictly worse.
- *The middle rope* (6 endings): every rope gives Ray something. The best rope runs between two boxes that each have two sides, so Ray gets both and can't hand them back. Tying either outer rope of the pair is strictly worse.

The idea appears with Help and after a lost try, on the board itself. (A win goes straight to the shared Challenge ending, which doesn't show it.) Dares: *No help and no lost tries* on every ending; *Win with all N boxes you can* on the 5 endings where a smaller win exists, certified by listing every winning line against Ray's replies.

## Hidden Canoes: heatmap and deduction charts (BD-05)

**`hidden-canoes/challenge@3`.** `CanoesHeatmap` counts every layout of the 3, 2 and 2 canoes that fits the searching seat's own chart: misses stay open water, and every find is covered. It reads only `view.searched`, so the hidden fleet can't change it. It searches an open space covered by the most layouts; ties go to the round's public salt. The count runs in slices of 128 placement pairs. Tests check the count against an independent enumeration, and a counterfactual test lays out every other rival fleet that fits the chart (more than 500 cases) and gets the same view, move and hint each time.

Against revision 2 on 120 boards, both starters and seats: 342 wins, 138 losses. Alone, it finds all seven spaces of a fleet in 19.0 searches on average (worst 26), against 22.2 (worst 29) for revision 2. Host time per decision: p95 1 ms on JIT; interpreted p95 20 ms, worst 53 ms.

**Deduction charts.** 12 charts, bank 463, codec `canoes-charts-v1`, contexts `canoes-1` to `canoes-4`, dares 3336–3347. A chart is public information only: searched spaces and finds, with no fleet and no seed. Three ask *find the space that must hold a canoe*, three *find the space that can't hold a canoe*, three *find the space most likely to hold a canoe* (never a sure space), and three ask for two or three sure spaces. At least two layouts fit every chart. A tap is right only when the chart proves it, so **no mark can come from luck**: the one dare, *No help and no wrong taps*, needs only reading the chart. Help points to an answer and says why in plain words, for example "C3 must hold a canoe: there's no way to fit the canoes without it." A wrong tap is explained the same way ("D3 might be open water: the canoes can fit without it"). The exact counts stay in the tests; a child doesn't need them.

**A round against the computer has no pass-the-device screen.** Hidden Canoes used to cover the chart and ask "Pass to You" before every turn, even against Ray. Only two players sharing the device need that handover now; their rounds are unchanged.

## Rivals, head starts and See the best move (PP-01)

**Rivals.** Pebble the hermit crab (Gentle), Coral the sea turtle (Growing) and Ray the manta ray (Challenge). Each game describes its rival's play in words taken from the policy itself, and tests check the claims. For example, Coral blocks a four you could finish next, and Ray in Fishing Nets hands over the shortest chain. The rival's name appears in the score, the turn line and the result.

**Head starts** are declared in setup, shown on the board and repeated above the board for the whole game. The rival keeps the same policy ID and plays its best; nothing is thrown. A Growing-strength stand-in for the child played the Challenge rival:

| Game | Head start | Stand-in wins (of games) |
| --- | --- | --- |
| Shell Pits | none / 4 / 8 shells counted at the end | 22 / 40 / 64 of 144 |
| Coconut Drop | none / one extra coconut in the middle column | 10 / 32 of 64 |
| Fishing Nets 3×3 | none / 1 / 2 boxes | 46 / 46 / 62 of 144 against `@1`; 19 / 19 (31 drawn) / 50 against `@2` |
| Fishing Nets 4×4 | none / 2 / 3 boxes | 20 / 32 / 40 of 144 against `@1`; 8 / 10 / 16 against `@2` |
| Fishing Nets 5×5 | none / 2 / 3 boxes | 26 / 30 / 30 of 144 against `@1`; 10 / 10 / 10 against `@2` |
| Hidden Canoes | none / find 6 / find 5 | 88 / 124 / 184 of 240 against `@2`; 54 / 76 / 156 against `@3` |
| Checkers (Growing stand-in plays red) | none / the rival starts without one back-row piece | 6 / 5 of 40 won, 21 / 10 lost, the rest drawn or past 200 plies |

With 8 shells ahead, the greedy grab still wins only 20 of 144 Shell Pits games. A head start makes a close game likelier; none makes a win certain. Fishing Nets 5×5 gains little, and nothing at all against the exact ending of `fishing-nets/challenge@2` (P1b), whose head starts are now worth less on every board; the Canoes heatmap rival likewise wins more against every head start. The Checkers head start halves losses without adding wins; both are recorded rather than tuned away.

**See the best move** appears only after a game ends, so nothing hidden can show early. It looks back in slices of at most 8 ms:

- after a win, it shows your winning move. In Shell Pits and Fishing Nets that's the move after which the other side couldn't catch up;
- after a loss or draw:
  - Coconut Drop shows a missed four, then a missed block;
  - Fishing Nets shows a box left waiting, then the rope that gave away the most. It names only the boxes the rope really closes, read from the move itself. Advice appears only when it's proven: a box whose rope touches no other open box is always right to take (taking it changes nothing else, so declining only hands it over), and any other advice must beat the played rope in an exact search (`NetsExact`). The exact search runs once 16 or fewer ropes are open, so it never visits more than 2^16 − 1 positions;
  - Shell Pits searches the best and played sow at every decision, eight sows ahead;
  - Hidden Canoes shows the best chance from the chart alone: the cell covered by the most fleet layouts that fit your misses and finds;
  - Checkers shows a skipped Friendly jump, then a move that left a piece open when a safe one existed.

When nothing stands out, it says so. A look-back belongs to one finished game: its round and exact moves. Undo, a different finish or a new round cancels a look-back that's still running and hides an old one.

## Files outside this slice's own folders

These are listed in the slice report with the reason for each: `src/challenge/types.ts` and `ChallengeFrame.tsx` (optional `backLabel`), `src/challenge/registrations/shell-pits.ts` plus the generated registry and ID ledger, `src/state/save-catalog.json` (bank 460, its dares and contexts), `src/state/challenge.ts` (the JSON type cast Crab also needed), `src/state/validation.ts` (`checkersHeadStart`), `src/games/{types,checkers}.ts`, `src/app/play.tsx` (Checkers rivals and head start), and two shared tests aligned with the identical Crab edits. The fix round adds `checkersPolicy` validation to `src/state/validation.ts` and `policy` to the Checkers round.

## Save-catalog entries

`npm run boards:catalog` writes the Shell Pits bank (460), its dares (3200–3263) and contexts (`pits-1` to `pits-4`) into `src/state/save-catalog.json` from the same registration the app loads. It keeps every other slice's entries, sorts banks and dares by slot, refuses any changed Pits slot through `assertFrozenCatalog`, and is safe to rerun. `npm run boards:catalog -- --check` fails if the manifest is missing or differs. After a catalog conflict: take the other side, run `registry:generate`, `boards:catalog`, then `arcade:dares`.
