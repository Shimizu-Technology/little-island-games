# Inline to packed save proof

These fixtures are immutable. They are separate from the frozen pre-program `save-v3` corpus; do not regenerate that corpus.

`inline-v3.json` and `inline-draft.json` were generated and accepted by the unmodified inline-catalog implementation at `f8d06028` on 9 November 2026 (Node 22.22.3). The source was extracted with `git archive f8d06028 src content scripts/puzzles scripts/learn`, using the locked dependencies and its TypeScript module hook. No new implementation was copied into that source tree. The generator and generation receipt are retained in the slice evidence as `fixes-generate-inline.ts` and `fixes-fixture-generation.log`.

The seven-entry pack has global ordinals 400000–400006. The old completion and credit functions produced codes 0–6, award bits, a dare mark and bests. The envelope also contains a paused session, recent entries, a cursor, practice and a selected path. The draft advances the exact paused slot. `inline-proof.json` records the old inline bank meanings and exact old fold/credit/merge outputs. The test pins the envelope, draft and pack SHA-256 values and checks unchanged bytes and meanings under inline and packed registration; it also rejects a wrong-row hash before use. This is a synthetic codec/format proof, supplemented by the unchanged real-engine migration suites.
