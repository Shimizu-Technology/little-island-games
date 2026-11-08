# Reviewed word data

This directory owns the word schema/runtime helpers for the Cove adapters. There is no approved vocabulary or new shipped bank yet. Do not import raw candidate queues or review packets into application code.

Run `node scripts/words/cli.mjs bake ...` with detached, current review evidence and a private safety policy. It fails on unreviewed records, stale decisions, fixture reviews, missing family sampling, unsupported CHamoru uses, unsafe surfaces or a failed independent verifier. The resulting `bank.json` contains only the runtime projection. Keep `receipt.private.json` outside application assets and public source exports.

Reader level (`Little`, `Growing`, `Strong`, `Grown-up`) is separate from an engine's difficulty band. The four per-record bands describe knowing, reading, spelling and clue reading. All choices stay open. A Grown-up word still has the same family-safety standard.

`runtime.ts` uses only a reviewed, baked accept list, including reviewed British variants for free-typed play. Misses share a neutral reply. Hints are closed templates. These helpers are ready for G6; this slice does not register a game or alter existing Hangman content.
