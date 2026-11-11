# Board policies, rivals and Shell Pits tactics

Little Island 4.0, slice P1a: ledger rows PP-00, BD-06, BD-07 and PP-01. This covers the computer players in Coconut Drop, Fishing Nets, Hidden Canoes, Shell Pits and Checkers, and the Shell Pits endgame puzzles. Tic-tac-toe is untouched. Coconut Drop and Fishing Nets play exactly as they did in 3.0. Checkers plays the 3.0 search without its clock (revision 2, below).

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

  So revision 2 plays as revision 1 always played on a fast machine, and a slow device no longer cuts the Challenge search short (38 of 335 decisions there). Both revisions beat a random player 40 of 40. Revision 2 against revision 1 with colours swapped gave the same win counts both ways (Growing 8 to 4, Challenge 2 to 1, the rest drawn or past 200 plies).
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

## Rivals, head starts and See the best move (PP-01)

**Rivals.** Pebble the hermit crab (Gentle), Coral the sea turtle (Growing) and Ray the manta ray (Challenge). Each game describes its rival's play in words taken from the policy itself, and tests check the claims. For example, Coral blocks a four you could finish next, and Ray in Fishing Nets hands over the shortest chain. The rival's name appears in the score, the turn line and the result.

**Head starts** are declared in setup, shown on the board and repeated above the board for the whole game. The rival keeps the same policy ID and plays its best; nothing is thrown. A Growing-strength stand-in for the child played the Challenge rival:

| Game | Head start | Stand-in wins (of games) |
| --- | --- | --- |
| Shell Pits | none / 4 / 8 shells counted at the end | 22 / 40 / 64 of 144 |
| Coconut Drop | none / one extra coconut in the middle column | 10 / 32 of 64 |
| Fishing Nets 3×3 | none / 1 / 2 boxes | 46 / 46 / 62 of 144 |
| Fishing Nets 4×4 | none / 2 / 3 boxes | 20 / 32 / 40 of 144 |
| Fishing Nets 5×5 | none / 2 / 3 boxes | 26 / 30 / 30 of 144 |
| Hidden Canoes | none / find 6 / find 5 | 88 / 124 / 184 of 240 |
| Checkers (Growing stand-in plays red) | none / the rival starts without one back-row piece | 6 / 5 of 40 won, 21 / 10 lost, the rest drawn or past 200 plies |

With 8 shells ahead, the greedy grab still wins only 20 of 144 Shell Pits games. A head start makes a close game likelier; none makes a win certain. Fishing Nets 5×5 gains little, and the Checkers head start halves losses without adding wins; both are recorded rather than tuned away.

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
