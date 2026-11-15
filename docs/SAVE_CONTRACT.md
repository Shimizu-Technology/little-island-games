# Save contract 4.0 — FND-15, revision 4

Lead-approved fix decisions applied on 8 November 2026; F2 completed-slot correction authorized in FIX-BRIEF.md on 9 November 2026; the lead ratified `expected.replace`, `paused-full` and `settings.learningBridges` in FIX-BRIEF-2.md on 9 November 2026; F4’s lead-authorized bank-metadata revision (9 November 2026) removes eager per-entry hashes; downstream adapters must use this revision. F2 re-runs both complete gates and Doctor for this ratification; the lead must re-gate F1/F3 against the integrated revision before downstream adapters land. Source: program PLAN §8, Play Part 2, plan review R2/R5. Any later change needs the lead and affected slices re-gated. Envelope 3 / profiles 2 is the single migration from envelope 1/2. Challenge progress and sessions use revision 1. This is infrastructure; it adds no visible surface or registered puzzle.

## Completion facts

Three bits per entry, canonical padded RFC 4648 base64, least-significant bit first within each byte. Sparse banks are sorted by immutable slot; trailing unused bits must be zero. Bank slots are immutable, including their length, ordered ordinals, rules, hashes, award capabilities and Cove eligibility. New content takes a new bank slot; an existing bank never grows or reorders. F2 commits its generated bank meanings in revision 2 of `src/state/save-catalog.json`; registration checks that manifest, and `npm run save:catalog` rejects changes to any prior committed generation. Unknown content fails closed.


### Bank metadata and session hash loading (revision 4)

A packed bank registers `slot`, `engine`, `rules`, `first`, `count`, `family`, `packHash`, `awards` and `cove`. The entry at index `i` retains global ordinal `first + i`. Uniform award capabilities use one number (0–3); a nonuniform bank uses its exact ordered capability array. No per-entry hash or row is loaded for completion bitmaps, marks, bests, recent selections or cursor validation. Small authored replay registrations retain their existing inline descriptors and hashes; generated banks use range metadata. Retired packs keep their slots, range, exact rules/codecs and content in the compatibility catalog and byte budget.

`BankLoader.savedHash` binds the saved bank and index to the integrity-verified root → family manifest → pack chain. It checks family/engine, slot, ordinal range, count, rules and pack hash, then hashes that exact packaged row. It never chooses a different puzzle, regenerates a seed, or takes an expected hash from a save. Cached manifests, packs, loaded descriptors and refs are deeply frozen, including previously shallow-frozen inputs. Session hashes alone do not prove completion: the registered codec still validates/replays payload, result and evidence.

`parseSave` is the structural storage/import/export boundary. Startup, restore, coherent export and preserved-copy inspection do no packed-content I/O. Packed paused slots validate their wrapper, owner, bank/range, engine/rules, hash shape, codec registration, limits and result shape; payload replay and exact hash verification wait for Continue. Inline authored registrations retain their resident validation. Draft recovery checks base, slot identity, structure and the codec's pure extension relation without loading content. Codecs must keep that relation structural and independent of lazy content.

`challengeOpen` resolves only the selected saved slot and validates its exact packaged hash and codec before rendering the board or enabling edits. Failure returns a typed `content-unavailable`, `invalid-session` or `stale` result with a recoverable message; the slot and draft stay kept, launch and other people/games remain usable, and the frame offers retry or another puzzle. A structurally valid forged packed hash stays inert until opened; it fails Continue and the strict transition/credit boundary. No stored result grants credit by itself. `challengeSave` verifies content before any start, edit or credit, then rechecks mount, epoch and the exact accepted state after an await. Already-resolved moves retain synchronous admission. Cancellation after a snapshot change gives a typed `stale` refusal. Internal loader details are logged and never shown to the family.

The hash pool holds at most 56 accepted refs and 64 transient refs; unopened slots need no proof. Boundary writes capture the available pin set before their first await and publish it without throwing after commit. Pack release does not erase pinned identity proofs. An optional explicit `parseSaveWithContent` integrity audit traverses the bounded envelope via its dedicated entry point, loads sequentially through the two-pack LRU and then checks exact session validity. It is never a launch, import, export or draft-recovery prerequisite. All resolution exceptions are retryable content failures; only a structural/validator verdict can quarantine a draft. Rejected imports preserve exact bytes, deduplicated against the newest recovery copy.

The history gate accepts manifest versions 1 and 2 and forbids a downgrade. Existing inline → packed conversion is permitted only when build-time verification of the packaged chain proves every original ordinal and entry hash, length, engine/rules, award capability and Cove flag unchanged. Packed facts, dare references and contexts remain append-only in every committed generation. Envelope 3, profiles 2, session/progress revision 1, stored ordinals and bitmap encodings do not change. The frozen pre-program save corpus remains unchanged and is rerun in both gates. The separate `tests/fixtures/catalog-revision/` corpus was produced by the inline implementation at `f8d06028`; its unchanged envelope 3 and draft prove all seven completion codes, award bits, a dare mark, bests, cursors, paused refs, folding, credit and merge under both catalog forms.

Launch bytes and costs are measured by `npm run puzzles:scale`: metadata/root parsing, registration, and full structural save parsing for 1/8/56 paused slots (zero asset reads), plus a separate single-session cold/warm Continue including row resolution and codec validation. The structural parse p95 budget is 150 ms; Continue uses the FND-08/FND-17 cold 250 ms / warm 100 ms targets and 4 MiB added decoded-memory budget. These scenarios also belong in the oldest-iPad FND-08/FND-17 acceptance. It uses the 62,647-entry synthetic format fixture; Node and JITless results do not establish Hermes memory or real-device timings. The real-catalog/iPad FND-08/FND-17 gates remain separate.

| Code | Meaning | Open | Helped solo | Together | Independent solo |
| --- | --- | --- | --- | --- | --- |
| 0 | Unseen | 1 | 2 | 3 | 5 |
| 1 | Seen | 1 | 2 | 3 | 5 |
| 2 | Helped finish | 2 | 2 | 4 | 5 |
| 3 | Together finish | 3 | 4 | 3 | 6 |
| 4 | Together + helped finish | 4 | 4 | 4 | 6 |
| 5 | Independent finish | 5 | 5 | 6 | 5 |
| 6 | Independent + Together | 6 | 6 | 6 | 6 |
| 7 | Invalid | reject | reject | reject | reject |

Merge unions the represented facts; independent subsumes helped. Merge is commutative, associative and idempotent. No replay clears any fact.

## Permanent awards and evidence

Two separate bits per bank entry, A = cost dare, B = adapter's second registered dare. Separate 4,096-bit registered dare bitmap; the all-zero bitmap is canonically `''`. A nonempty bitmap must contain a mark. Slots are append-only. Bits outside the registered range are zero. Eviction of optional bests, selection ring or signals never changes either store. No marks are inferred from old School stars.

| Dare | Durable evidence from adapter | Help | Together |
| --- | --- | --- | --- |
| Par/cost | Replay cost, limit named at launch | independent by default; explicit allowed option | only when help allowed |
| Clean | no solution help or failed Check | independent | no |
| Plan | runs retained through reset/edit/reload | named at launch | only when help allowed |
| Blind | support-off launch option | named at launch | only when help allowed |
| Whole | first whole Check | independent | no |
| Two ways | distinct solution hashes, first hashes retained in bounded 32-entry list | allowed | both |
| Pick up | engine-validated terminal board | allowed | both |
| Own read | read-aloud not chosen before answer | independent | no |
| Edits | edit count from original draft | named at launch | only when help allowed |

F2 registers exact engine codecs, immutable descriptors and evidence. F1 rejects unknown codecs and caller-supplied results. Real-time Arcade never has a paused physics draft; only a verified terminal receipt may award. A round may start with an existing, eligible named partner, or confirm one on the terminal transition only (`null` → partner). Cove-only partners require a Cove bank. A partner cannot change during play. Together credits surviving eligible participants in the same replacement; the starter owns the paused board. Together does not write School stars, badges, offers or personal signals. Removed partners receive no credit. A full or invalid partner record never blocks the starter's finish; that record stays intact. F2 must put first-solution hashes into a Two Ways payload at launch so its codec can verify the second solution.

## Bounded sessions

### K7 additive program drafts (15 November 2026, pre-authorized lead change)

Crab Commands, Beep Bot and Turtle Draw share `src/learn/program/`. School states may
add `blockDraft`, a compact revision-1 program `[1, body, songs]`. Nodes are exact
tuples: command `[0, code]`, sequence `[1, body]`, repeat `[2, times, body]`, song
call `[3, songIndex]`, and obstacle condition `[4, blockedBody, clearBody]`.
Command codes are game-owned; unknown codes fail closed. Turtle has no obstacle
sensor and refuses conditions. Beep's sensor checks the square above; Crab's
sensor checks ahead of its current facing. Songs have numbered identities, at
most four definitions, and cannot recurse, directly or indirectly.

Every written node counts, including containers, both branches, calls and each
song definition. The limits remain 80 nodes, effective depth 4 (including calls),
512 expanded commands and 4,096 UTF-8 bytes. Worst-case branch expansion is checked
before execution; control traversal also has a fixed bound. Repeats are 2–16
whole-body iterations. Legacy Again cards retain their game-specific meaning;
they are commands, never silently converted into whole-body repeats.

`blockDraft` is an authoring form alongside the existing executable `program`.
Validation reconstructs the executable plan on the exact saved board and requires
byte-for-byte JSON equality. New School edits measure the complete session before
publication, and `validLearnSession` enforces the same complete UTF-8 budget at
import/load, including IDs and names. The guard applies only to the three K7 draft
codecs; legacy flat sessions retain their compatibility boundary. A stopped Crab prefix is allowed with a validated draft for manual
single-step debugging; ordinary legacy pause validation is unchanged. Existing
game limits (Crab 80 executable cards, Beep 32, Turtle's 120 expanded commands and
legacy body/turn/repeat constraints) still apply to their current levels. Turtle's
old top-level goal limit remains unchanged until SC-03; K7 reports recursive cost
without retroactively changing a saved task's win rule.

Crab and Beep replay codecs accept one additional typed edit action
`['b', blockDraft]`. Replay reconstructs the plan and terminal outcome, tracks
recursive card cost, and retains run, miss, help and edit evidence through undo
and reset. Existing codec IDs and replay payload revision 1 remain unchanged.
The existing byte admission and 512-action log cap still apply, including help
reserves. Oversized edits leave the accepted attempt intact.

Conversion is pure and opt-in when editing. No load migration rewrites legacy
state. Original flat saves, completed plans, tasks and frozen fixture bytes remain
unchanged; a draft is removed when an ordinary card edit replaces its projection
or the next task starts. Existing migration/restore preservation and rollback
rules remain in force. Envelope 3, profiles 2, progress/session revisions, session
classes, catalog slots, budgets and capacities do not change. Legacy Turtle v1
trees accepted by its older validator keep their decoder, including trees outside
the new authoring limits.

Each session names owner, game, round ID, monotonic ordinal, revision, immutable puzzle ref and exact registered codec revision. The codec must validate/replay both payload and recorded result, not trust counters. A credited terminal session cannot be credited again. Successful credit removes the terminal session from `paused` in the same atomic envelope write; permanent completion/award facts remain. The open frame may show that result until it leaves; reopening starts at the picker. Legacy credited terminal sessions remain readable and are removed on the next start, without counting toward the unfinished-slot cap. Replay and checkpoint are separate codecs; unknown codecs remain unreadable, never blank.

| Class | Board maximum | Canonical draft | Undo minimum | Session budget |
| --- | --- | --- | --- | --- |
| programs | 80 AST nodes, depth 4 | exact typed replay | replay | 4,096 bytes |
| moves | 7×7 or adapter-specific | exact moves/tests/folds | replay | 4,096 bytes |
| digits | 9×9 | 13 bits/cell | 256 deltas | 4,096 bytes |
| paint | 25×25 | 2 bits/cell | 1,960-byte ring: 512 uniform strokes; at least 217 worst-case strokes | 4,096 bytes |
| cells | 15×15 | 2 bits/cell | 256 deltas | 4,096 bytes |
| letters | 16×16 | 6 bits/cell | 256 deltas | 4,096 bytes |
| edges | 480 edges | 2 bits/edge | 256 deltas | 4,096 bytes |
| table | 52 cards / 144 tiles | compact arrangement | 1,024 moves | 4,096 bytes |
| pieces | 200 pieces | 4 bytes/piece | 256 deltas | 4,096 bytes |
| answers | one task | exact typed answers/submissions | replay | 4,096 bytes |

Checkpoint edits have no replay action log: keep canonical draft, bounded undo, and never drop Check/help/hint/reset audit events. Undo discards oldest entries only; it never discards the draft. F1 provides canonical bit packing and fixed-width delta rings, not a substitute game engine. F2/adapters must prove their actual replay/checkpoint formats before registration. An edit must not be refused merely because the undo ring is full. An exhausted audit log requires an explicit new attempt, preserving the old one; it must never silently clear help history.

Paint adapters always allocate 625 cells, including smaller displayed boards. Storage uses a fixed stride of 25: a displayed cell at `(row, column)` maps to `row * 25 + column`, and cells outside the displayed board remain unused. A 5×5 display therefore still uses `newCheckpoint('paint')`, never a 25-cell checkpoint.

Paint strokes are locked to one row or column, at most 25 cells. `checkpointPaint` records exact prior values with a two-byte header encoding axis, line, interval and uniformity. A uniform prior line costs three bytes; a nonuniform full line costs nine. The ring retains at most 512 strokes and 1,960 binary bytes; oldest whole strokes drop first. A full ring never refuses an edit. Thus 512 uniform strokes cost 1,536 bytes; the adversarial guarantee is **217**, since 218 × 9 = 1,962, two bytes above the approved allocation. This corrects the review's arithmetic without enlarging the ring. Fill/clear must be an audited new attempt or reserve a 157-byte board snapshot in its codec.

Audit codes are integers 0…9,999, with at most 128 retained events. `checkpointBudget` measures maximum draft, encoded undo and full audit; each codec must register a maximum wrapper + draft + undo + audit allocation totaling at most 4,096 bytes. The exact adapter still proves its payload and reachability. Tests cover full paint/table/digit/piece/cell/letter/edge rings plus all 128 audit events. After an exhausted audit, explicitly replace the old attempt with `challengeSave(next, {...expected, replace: {game, id, revision}})`. Construct the next attempt first. Store preserves the old session in the bounded diagnostic ring and atomically commits the new ordinal and folds removed draft rows; a failed write keeps the accepted old attempt. There is currently no reader or export for the diagnostic ring, so child-facing copy makes no recovery promise. `challengeDiscard` remains an explicit standalone removal operation. No implicit reset clears assistance evidence.

## Storage and admission

Challenge payload ceiling: learner 104,000 bytes, Cove-only person 72,000 bytes. Learner: 8 paused games, 32 signals, 256 bests. Cove: 4 paused games, 8 signals, 128 bests, no School dare bitmap. At most five learners including Family and four Cove-only people, outside child pickers. Metadata and working sets are bounded. Learner recent/cursors/practice/solution-hash capacities are 64/128/64/32; Cove capacities are 32/64/16/16. These smaller Cove working sets reserve space for four 4,096-byte paused sessions without changing permanent facts. Each codec must validate initial state and monotonic extension of earlier assistance/audit evidence, as well as terminal truth. IDs are ASCII; registered signal/practice context IDs are at most 16 characters. Byte budgets are UTF-8. The updated capacity fixture fills all 64 practice rows with maximum context lengths and references, maximum paused-session allocations, ordinal/revision widths, and an 80-character game choice.

Whole save remains 2,000,000 bytes; shared Library remains 1,000,000 bytes. These are admission boundaries, not a guarantee that every maximum fits together. Refusals are typed `full-save`, `session-budget`, `learner-ceiling`, `paused-full` or `stale`, with an explicit message. A terminal refusal leaves the paused game available. Failed admission preserves accepted state and exact source. When unfinished slots are full, the frame offers Continue for each saved game, grown-up Settings export, and explicit choice of one slot to replace in the same atomic start. Export and explicit management are the recovery actions; never prune earned work or another person's draft. No increase to 2,500,000 is made.

Draft rows contain envelope revision, owner, game and complete validated session. Moves are accepted synchronously after owner, epoch, round, revision and budget checks, before any storage await. Each game/base has a latest-wins write-behind worker. Its returned promise reports durability; a failed write leaves every accepted move in memory, reports failure, and permits retry or export. A burst's newest complete session includes all earlier accepted moves. For an ordinary draft move, a `false` durability promise with `challengeRefusal === null` means the move was accepted in memory and needs retry/export; never roll that move back or reuse its previous revision. A typed `challengeRefusal` means admission was refused and the accepted revision did not change. Ordinary settings/game commits remain available during draft I/O. No complete learner record is revalidated or encoded for a move; its cached byte count changes by the changed session's size.

Full-envelope writes happen at boundaries. F2 and other callers must await `challengeSave` start/finish before sending practice credit, coached flags, settings or other commits. Settings and other actions reaching `commit` during these boundaries are refused with an explicit retry message that remains after the boundary; they are not queued. Retry the intended action against the latest state after saving finishes. Start/finish and Cove add/select use atomic replacement without recovery copies. Discard and explicit replacement keep only the removed session (at most 4,096 bytes), in eight rolling slots under keys older builds ignore. Full `recovery-*` preservation is reserved for migration, restore, person removal and assignment, plus genuinely orphaned/unfolded rows. Folded rows are deleted with the envelope commit, without a recovery copy. The pre-update copy remains in Previous saves and routine play never buries it.

Export attempts to drain and fold rows, then always encodes and validates the coherent latest accepted state, even after admission, Library validation or storage failure. If flushing failed, Settings and save status explain that the backup contains accepted work that could not be saved on the device. Library callers retain strict `libraryFlush` health checks. If both a boundary write and its read-back fail, Recovery exports a snapshot of the latest accepted in-memory save, including accepted moves and settings. Starting fresh from that uncertain state preserves this live snapshot as well as the readable disk original; an unconfirmed terminal candidate is not reported as accepted.

A replacement commits its envelope and draft generation atomically. Native boundary writes use the SDK's separate-connection transaction (`BEGIN`, not `BEGIN EXCLUSIVE`); move writes use one guarded SQL upsert on the shared connection. Store serialization supplies ordering. The caller passes revision and folded-session metadata, avoiding a native whole-envelope JSON parse. Rejected draft rows are preserved and deleted in one native transaction; web preserves first, deduplicates exact bytes and removes them. A terminal write that loses its acknowledgement is read back before publication or any further persist. Restore never reuses the imported generation token.

Migration validates the old form first, clones, adds empty Challenge/Cove/draft namespaces, validates and sizes the candidate, preserves exact input, writes, then publishes. Repeat load of unchanged v3 writes nothing. Restore also preserves the current device state. Older builds reject envelope 3; rollback uses the exact pre-update copy and does not merge post-update work backward.

A valid legacy save can still be too close to 2,000,000 bytes to add the new namespaces. Empty bitmaps reduce five-learner migration growth to 937 bytes with the runtime 32-character revision (916 with the shorter migration placeholder); the largest upgradeable five-person source in this fixture is 1,999,063 bytes. Recovery then offers export, an older build to manage saved work, or a smaller backup; it does not promise unavailable management controls on that screen. Invalid Library data has a separate error. Exact original bytes remain active and preserved.

## Optional result UI state

Envelope/profile/Challenge versions remain unchanged. `settings.learningBridges` is an optional validated map of existing learner IDs (including Family) to registered School game IDs. It remembers a bridge choice or dismissal once per learner/game, independently of bounded per-round signals, and is removed with its learner. Together results and another learner's saved result show neither invitations nor bridges. A face consumes the round's card for every answer; its rating survives subsequent finishes until the next third-finish face opportunity. Optional signals are omitted if they would cross the person or envelope ceiling; they cannot prevent completion credit.
