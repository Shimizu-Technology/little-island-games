# Board policies, rivals and Shell Pits tactics

Little Island 4.0, slice P1a: ledger rows PP-00, BD-06, BD-07 and PP-01. This covers the computer players in Coconut Drop, Fishing Nets, Hidden Canoes, Shell Pits and Checkers, and the Shell Pits endgame puzzles. Tic-tac-toe is untouched. Coconut Drop, Fishing Nets and Checkers play exactly as they did in 3.0.

## Policy contract (PP-00)

`src/playPolicies/` holds every computer policy that has shipped.

- **IDs never change meaning.** An ID is `<game>/<strength>@<revision>`, for example `shell-pits/challenge@2`. `boardPolicies` is frozen and append-only, and a test pins every entry with its revision, depth, node budget and visibility. A stronger or different search is a new revision.
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

Checkers keeps its 3.0 search, which is timed, not counted: 8 ms per root branch. It's registered as `checkers/<strength>@1` only so rivals can name it. Its strength can still vary with device speed. That's an existing property, and the master plan leaves Checkers AI alone.

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

## Rivals, head starts and See the winning move (PP-01)

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
| Checkers | the rival starts without one back-row piece | not benchmarked (timed 3.0 search) |

With 8 shells ahead, the greedy grab still wins only 20 of 144 Shell Pits games. A head start makes a close game likelier; none makes a win certain. Fishing Nets 5×5 gains little, which is recorded rather than tuned away.

**See the winning move** appears only after a game ends, so nothing hidden can show early. It looks back in slices of at most 8 ms:

- after a win, it shows your winning move. In Shell Pits and Fishing Nets that's the move after which the other side couldn't catch up;
- after a loss or draw:
  - Coconut Drop shows a missed four, then a missed block;
  - Fishing Nets shows a box left waiting, then the rope that gave away the most;
  - Shell Pits searches the best and played sow at every decision, eight sows ahead;
  - Hidden Canoes shows the best chance from the chart alone: the cell covered by the most fleet layouts that fit your misses and finds;
  - Checkers shows a skipped Friendly jump, then a move that left a piece open when a safe one existed.

When nothing stands out, it says so.

## Files outside this slice's own folders

These are listed in the slice report with the reason for each: `src/challenge/types.ts` and `ChallengeFrame.tsx` (optional `backLabel`), `src/challenge/registrations/shell-pits.ts` plus the generated registry and ID ledger, `src/state/save-catalog.json` (bank 460, its dares and contexts), `src/state/challenge.ts` (the JSON type cast Crab also needed), `src/state/validation.ts` (`checkersHeadStart`), `src/games/{types,checkers}.ts`, `src/app/play.tsx` (Checkers rivals and head start), and two shared tests aligned with the identical Crab edits.
