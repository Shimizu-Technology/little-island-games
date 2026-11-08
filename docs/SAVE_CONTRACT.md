# Save contract 4.0 — FND-15, revision 1

Frozen for downstream implementation on 8 November 2026. Source: program PLAN §8, Play Part 2, plan review R2/R5. Any later change needs the lead and affected slices re-gated. Envelope 3 / profiles 2 is the single migration from envelope 1/2. Challenge progress and sessions use revision 1. This is infrastructure; it adds no visible surface or registered puzzle.

## Completion facts

Three bits per entry, canonical padded RFC 4648 base64, least-significant bit first within each byte. Sparse banks are sorted by immutable slot; trailing unused bits must be zero. Catalog ordinals, slots, rules and hashes never change meaning. Unknown content fails closed.

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

Two separate bits per bank entry, A = cost dare, B = adapter's second registered dare. Separate 4,096-bit registered dare bitmap; slots are append-only. Bits outside the registered range are zero. Eviction of optional bests, selection ring or signals never changes either store. No marks are inferred from old School stars.

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

F2 registers exact engine codecs, immutable descriptors and evidence. F1 rejects unknown codecs and caller-supplied results. Real-time Arcade never has a paused physics draft; only a verified terminal receipt may award. Together credits surviving named participants atomically; the starter owns the paused board. Together does not write School stars, badges, offers or personal signals. Removed partners receive no credit.

## Bounded sessions

Each session names owner, game, round ID, monotonic ordinal, revision, immutable puzzle ref and exact registered codec revision. The codec must validate/replay both payload and recorded result, not trust counters. A credited terminal session cannot be credited again. Replay and checkpoint are separate codecs; unknown codecs remain unreadable, never blank.

| Class | Board maximum | Canonical draft | Undo minimum | Session budget |
| --- | --- | --- | --- | --- |
| programs | 80 AST nodes, depth 4 | exact typed replay | replay | 4,096 bytes |
| moves | 7×7 or adapter-specific | exact moves/tests/folds | replay | 4,096 bytes |
| digits | 9×9 | 13 bits/cell | 256 deltas | 4,096 bytes |
| paint | 25×25 | 2 bits/cell | 512 deltas/strokes | 4,096 bytes |
| cells | 15×15 | 2 bits/cell | 256 deltas | 4,096 bytes |
| letters | 16×16 | 6 bits/cell | 256 deltas | 4,096 bytes |
| edges | 480 edges | 2 bits/edge | 256 deltas | 4,096 bytes |
| table | 52 cards / 144 tiles | compact arrangement | 1,024 moves | 4,096 bytes |
| pieces | 200 pieces | 4 bytes/piece | 256 deltas | 4,096 bytes |
| answers | one task | exact typed answers/submissions | replay | 4,096 bytes |

Checkpoint edits have no replay action log: keep canonical draft, bounded undo, and never drop Check/help/hint/reset audit events. Undo discards oldest entries only; it never discards the draft. F1 provides canonical bit packing and fixed-width delta rings, not a substitute game engine. F2/adapters must prove their actual replay/checkpoint formats before registration. An edit must not be refused merely because the undo ring is full. An exhausted audit log requires an explicit new attempt, preserving the old one; it must never silently clear help history.

**Constraint needing lead attention:** the plan's 4,096-byte session cap cannot represent 512 arbitrary 625-cell paint strokes with exact prior values (80,000 binary bytes before metadata in the worst case). Fixed-width cell deltas fit; this is not proof of 512 arbitrary multi-cell strokes. Keep fail-safe admission and do not register an adapter claiming that stronger guarantee until a reviewed encoding/allocation resolves it. No child draft may be truncated to fit.

## Storage and admission

Challenge payload ceiling: learner 104,000 bytes, Cove-only person 72,000 bytes. Learner: 8 paused games, 32 signals, 256 bests. Cove: 4 paused games, 8 signals, 128 bests, no School dare bitmap. At most five learners including Family and four Cove-only people, outside child pickers. Metadata and working sets are bounded. Learner recent/cursors/practice/solution-hash capacities are 64/128/64/32; Cove capacities are 32/64/16/16. These smaller Cove working sets reserve space for four 4,096-byte paused sessions without changing permanent facts. Each codec must validate initial state and monotonic extension of earlier assistance/audit evidence, as well as terminal truth. IDs are ASCII; byte budgets are UTF-8.

Whole save remains 2,000,000 bytes; shared Library remains 1,000,000 bytes. These are admission boundaries, not a guarantee that every maximum fits together. Failed admission preserves accepted state and exact source. Export and explicit management are the recovery actions; never prune earned work or another person's draft. No increase to 2,500,000 is made.

Draft rows contain envelope revision, owner, game and complete validated session. Accepted moves write only a small row. Full-envelope writes happen at boundaries. Export drains/flushes rows first. A replacement commits its envelope and draft generation atomically; obsolete rows are kept for recovery and never applied to a different base. Native uses one exclusive SQLite transaction; web uses the atomic localStorage envelope write as generation commit. Restore never reuses the imported generation token.

Migration validates the old form first, clones, adds empty Challenge/Cove/draft namespaces, validates and sizes the candidate, preserves exact input, writes, then publishes. Repeat load of unchanged v3 writes nothing. Restore also preserves the current device state. Older builds reject envelope 3; rollback uses the exact pre-update copy and does not merge post-update work backward.
