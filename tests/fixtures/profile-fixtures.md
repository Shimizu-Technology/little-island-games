# Synthetic profile upgrade fixtures

- `profile-2.5.json`: produced and validated by the actual `1700d54c` 2.5 engines in the preceding profile audit. Exact source copy: `little-island-games-artifacts/v3/profiles-audit/probes/fixture-2.5.json`. No real family data.
- `profile-3.0.json`: produced and validated by the actual `77a82ff8` engines, in an archived source tree, with Family practice, A and B. Generator and execution receipts: `little-island-games-artifacts/v3/profiles-fix/fixture-producer.test.ts` and `baseline-regressions.log`. Each profile owns a different paused learning, classic, board and activity game; houses, badge ledgers, Arcade and newer Libraries coexist. Game states come from real constructors, not handwritten boards/history.

`profile-separation.test.tsx` loads both through the real Store migration and preserves originals, checks every owned field, then resets/restores the whole-device canonical backup. `profile-shape.test.ts` adds immutable migration, strict malformed-input and size checks. Native SQLite/Files transport remains lead acceptance.
