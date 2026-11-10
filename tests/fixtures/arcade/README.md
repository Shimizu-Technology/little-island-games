# Frozen Arcade fixtures

`arcade-d1-shipped.json` was produced once on 10 November 2026 by `PRODUCER.ts.txt` against an unmodified `git archive` of the shipped 3.0.0 (28) source, 0f428c2fef43a821bbea782823f7548b5d514971. Every write went through that build's own `arcadeTransition`, so its star locks, outfit thresholds and chest rules are the old ones.

| File | Bytes | SHA-256 |
|---|---:|---|
| `arcade-d1-shipped.json` | 2,548 | `7b8407f170b67eafd18d053de4e59d74edaa937b5b63bc731bf5bb6e5bb76441` |

It holds three learners: one who played Canoe Cargo W1–W5 in order to 120 stars, all four outfits (wearing Starlight) and all 16 stickers, with an unclaimed Reef Builder chest; one with 16 Shell Song stars, Sun hat worn, and a Fruit Bat Flight Endless finish the shipped lock refused; and Family with the retired grown-up unlock on, a World 6 star earned through it and one family-board score.

`tests/arcade-open-worlds.test.ts` pins the bytes. Do not regenerate it with newer engines; add a new fixture instead.
