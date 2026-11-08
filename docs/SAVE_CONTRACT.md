# Save contract 4.0 — FND-15, revision 2

Lead-approved fix decisions applied on 8 November 2026; downstream adapters must use this revision. Source: program PLAN §8, Play Part 2, plan review R2/R5. Any later change needs the lead and affected slices re-gated. Envelope 3 / profiles 2 is the single migration from envelope 1/2. Challenge progress and sessions use revision 1. This is infrastructure; it adds no visible surface or registered puzzle.

## Completion facts

Three bits per entry, canonical padded RFC 4648 base64, least-significant bit first within each byte. Sparse banks are sorted by immutable slot; trailing unused bits must be zero. Bank slots are immutable, including their length, ordered ordinals, rules, hashes, award capabilities and Cove eligibility. New content takes a new bank slot; an existing bank never grows or reorders. F2 commits its generated meanings in `src/state/save-catalog.json`; registration checks that manifest, and `npm run save:catalog` rejects changes to any prior committed generation. Unknown content fails closed.

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

Each session names owner, game, round ID, monotonic ordinal, revision, immutable puzzle ref and exact registered codec revision. The codec must validate/replay both payload and recorded result, not trust counters. A credited terminal session cannot be credited again. Replay and checkpoint are separate codecs; unknown codecs remain unreadable, never blank.

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

Audit codes are integers 0…9,999, with at most 128 retained events. `checkpointBudget` measures maximum draft, encoded undo and full audit; each codec must register a maximum wrapper + draft + undo + audit allocation totaling at most 4,096 bytes. The exact adapter still proves its payload and reachability. Tests cover full paint/table/digit/piece/cell/letter/edge rings plus all 128 audit events. After an exhausted audit, explicitly discard the old attempt through `challengeDiscard` (which writes its session into a bounded on-disk diagnostic ring; there is currently no reader or export for this ring), then launch the next ordinal. No implicit reset clears assistance evidence.

## Storage and admission

Challenge payload ceiling: learner 104,000 bytes, Cove-only person 72,000 bytes. Learner: 8 paused games, 32 signals, 256 bests. Cove: 4 paused games, 8 signals, 128 bests, no School dare bitmap. At most five learners including Family and four Cove-only people, outside child pickers. Metadata and working sets are bounded. Learner recent/cursors/practice/solution-hash capacities are 64/128/64/32; Cove capacities are 32/64/16/16. These smaller Cove working sets reserve space for four 4,096-byte paused sessions without changing permanent facts. Each codec must validate initial state and monotonic extension of earlier assistance/audit evidence, as well as terminal truth. IDs are ASCII; registered signal/practice context IDs are at most 16 characters. Byte budgets are UTF-8. The updated capacity fixture fills all 64 practice rows with maximum context lengths and references, maximum paused-session allocations, ordinal/revision widths, and an 80-character game choice.

Whole save remains 2,000,000 bytes; shared Library remains 1,000,000 bytes. These are admission boundaries, not a guarantee that every maximum fits together. Refusals are typed `full-save`, `session-budget`, `learner-ceiling` or `stale`, with an explicit message. A terminal refusal leaves the paused game available. Failed admission preserves accepted state and exact source. Export and explicit management are the recovery actions; never prune earned work or another person's draft. No increase to 2,500,000 is made.

Draft rows contain envelope revision, owner, game and complete validated session. Moves are accepted synchronously after owner, epoch, round, revision and budget checks, before any storage await. Each game/base has a latest-wins write-behind worker. Its returned promise reports durability; a failed write leaves every accepted move in memory, reports failure, and permits retry or export. A burst's newest complete session includes all earlier accepted moves. For an ordinary draft move, a `false` durability promise with `challengeRefusal === null` means the move was accepted in memory and needs retry/export; never roll that move back or reuse its previous revision. A typed `challengeRefusal` means admission was refused and the accepted revision did not change. Ordinary settings/game commits remain available during draft I/O. No complete learner record is revalidated or encoded for a move; its cached byte count changes by the changed session's size.

Full-envelope writes happen at boundaries. F2 and other callers must await `challengeSave` start/finish before sending practice credit, coached flags, settings or other commits. Settings and other actions reaching `commit` during these boundaries are refused with an explicit retry message that remains after the boundary; they are not queued. Retry the intended action against the latest state after saving finishes. Start/finish and Cove add/select use atomic replacement without recovery copies. Discard keeps only the session (at most 4,096 bytes), in eight rolling slots under keys older builds ignore. Full `recovery-*` preservation is reserved for migration, restore, person removal and assignment, plus genuinely orphaned/unfolded rows. Folded rows are deleted with the envelope commit, without a recovery copy. The pre-update copy remains in Previous saves and routine play never buries it.

Export attempts to drain and fold rows, then always encodes and validates the coherent latest accepted state, even after admission, Library validation or storage failure. If flushing failed, Settings and save status explain that the backup contains accepted work that could not be saved on the device. Library callers retain strict `libraryFlush` health checks. If both a boundary write and its read-back fail, Recovery exports a snapshot of the latest accepted in-memory save, including accepted moves and settings. Starting fresh from that uncertain state preserves this live snapshot as well as the readable disk original; an unconfirmed terminal candidate is not reported as accepted.

A replacement commits its envelope and draft generation atomically. Native boundary writes use the SDK's separate-connection transaction (`BEGIN`, not `BEGIN EXCLUSIVE`); move writes use one guarded SQL upsert on the shared connection. Store serialization supplies ordering. The caller passes revision and folded-session metadata, avoiding a native whole-envelope JSON parse. Rejected draft rows are preserved and deleted in one native transaction; web preserves first, deduplicates exact bytes and removes them. A terminal write that loses its acknowledgement is read back before publication or any further persist. Restore never reuses the imported generation token.

Migration validates the old form first, clones, adds empty Challenge/Cove/draft namespaces, validates and sizes the candidate, preserves exact input, writes, then publishes. Repeat load of unchanged v3 writes nothing. Restore also preserves the current device state. Older builds reject envelope 3; rollback uses the exact pre-update copy and does not merge post-update work backward.

A valid legacy save can still be too close to 2,000,000 bytes to add the new namespaces. Empty bitmaps reduce five-learner migration growth to 937 bytes with the runtime 32-character revision (916 with the shorter migration placeholder); the largest upgradeable five-person source in this fixture is 1,999,063 bytes. Recovery then offers export, an older build to manage saved work, or a smaller backup; it does not promise unavailable management controls on that screen. Invalid Library data has a separate error. Exact original bytes remain active and preserved.
