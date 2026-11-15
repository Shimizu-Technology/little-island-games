# Reading kit (K5) and Sound Boat

15 November 2026, slice R1a (`p4/r1a-reading`). Ledger rows K5 and SC-21. This is the shared reading kit in `src/learn/reading/` and the Sound Boat rebuild on it. **Reading is never timed and never rewards speed.** Nothing in the kit or in Sound Boat reads a clock, keeps a score against one, or advances a word by itself (`tests/reading-no-timer.test.ts`).

## What the kit holds

| Piece | File | What it does |
| --- | --- | --- |
| Scope and sequence | `scope.ts` | One ordered list of 25 steps over five levels: short vowels (1); digraphs, ng, blends, silent e (2); vowel teams and r-controlled (3); compounds, beats, endings that keep the base word (4); spelling changes and word starts (5). Every step names its practice skill. |
| Grapheme analysis | `graphemes.ts` | Checks that tiles spell a word and derives every pattern the tiles show. A word is filed under the newest idea in it. |
| Word parts | `morphology.ts` | The four spelling-change rules (none, drop e, double, y to i) as code, so a record's claim is checked against the rule, and a tray checker that finds every way a tray can spell a word. |
| Records | `records.ts` | `LetterWord` (Levels 1-3), `PartsWord` (Levels 4-5, content only) with `PartsDraft` (the same plus where it stands), and `ReadingText` (sentences and passages). No type here holds review evidence. |
| Validators | `validate.ts` | Structure checks for words, banks and texts, a decodability check for texts against a lexicon, and the pinned-digest check for inherited words. Reviewed content has no check here: it ships only through the detached W1 gate. |
| Shipped words | `inherited.ts` | The 340 words that shipped in 3.0.0, filed by pattern. Tags are derived, not copied. |
| Tap-a-word | `tap.ts`, `TapWords.tsx` | One tap says a printed word. It is a read-aloud act, never a read. |
| Listening vs decoding | `evidence.ts` | `prompt`, `read-aloud`, `help`, `miss`. Only reading alone, unhelped and unmissed is independent decoding. Hearing never makes it true. |
| Building a word | `build.ts` | The pure rules shared by the School board and the Challenge replay: tray, draft, Check, Help. Uses the shared whole-answer kit (`src/puzzles/wholeAnswer.ts`). |
| Admitted banks | `admitted/index.ts` | The only door into the app for reviewed records. It reads the W1 word registry (`content/words`), which lists only manifest-registered banks that passed detached admission. Empty today. |

## Records and review

A record's `status` is one of:

- `inherited`: shipped in 3.0.0. Admitted only while the derived records match a pinned digest (`INHERITED_DIGEST`). Editing the shipped words, or the way the kit tags them, changes the digest on purpose.
- `draft`: written, not reviewed. Never ships.
- `fixture`: invented for tests and the dev harness. Never ships.

There is no `reviewed` status in this tree and no record carries review evidence. Review is detached W1 evidence: two blind reviewers on different models with their transcripts, the lead's reconciliation, and Leon's `familySample`. `scripts/words` checks it against the locked private policy and rereads the transcript and family-evidence bytes. Nothing here can approve a record.

**Lead contract change: W1 reading records.** Reading records go through the same admission Word Search words use, with the smallest additive extension (`record type reading`):

1. `node scripts/words/cli.mjs prepare-reading <input.json> <policy> <out> <batch-id>` with `{records, fixture:false}`, where `records` are the draft records without `status`. The record shape has closed keys (`validateReadingRecord` in `scripts/words/core.mjs`), so an inline `status`, `review` or approval field is refused. The blind packets show reviewers the word, pieces and tray, with their own context (`reading-parts-blind-v1`).
2. `import` and `reconcile` as for words. The lead supplies the detached evidence `{prepared, reviews, transcriptPaths, lead, familySample}` per record.
3. `bake-reading` (`scripts/words/bake-reading.mjs`) needs the locked policy, binds every record to its prepared batch by scan-list hash and content, rereads transcripts and the family evidence, checks every text a child could see against the exact and lemma blocks and the private scan, and writes the runtime projection `{schemaVersion, kind:'reading-parts', words}` with no review state, hash or policy, plus a private receipt.
4. The projection is registered in `content/words/banks.manifest.json` with `kind: "reading-parts"` and loads through `readingBankLoaders` in `registry.generated.ts` (regenerate with `registrySource`). `npm run check:words` rebakes it from the detached evidence; the export guard runs it at every shipping gate. A reading bank filed anywhere else is an unadmitted word bank.
5. `admitParts` runs the kit's own piece and spelling rules over the projection at load, in addition to the build-time check.

`scripts/reading/make-parts-bank.ts` writes the fixture bank (`tests/fixtures/reading/`) and the draft bank (`scripts/reading/drafts/`) from one list of specs, computing every piece with the kit's own spelling rules. `scripts/reading/check.ts <bank.json>` validates a bank file's structure and spelling rules only. The draft bank is outside the app tree and is the list to put through the two-reviewer process.

## Sound Boat

| Level | Name | What it asks | Where it comes from |
| --- | --- | --- | --- |
| 1 | Cat, hen and sun | Spell consonant-vowel-consonant words tile by tile. | Shipped words. Per-letter feedback. |
| 2 | Fish, crab and kite | Blends, digraphs, ng, silent e. | Shipped words. Per-letter feedback. |
| 3 | Sheep, boat and star | Vowel teams, r-controlled. | Shipped words. Per-letter feedback. |
| 4 | Word parts and endings | Build two-part words from pieces: compounds, beats, endings that keep the base word. Whole-word Check. | Reviewed word-part bank. |
| 5 | Spelling changes and word families | Endings that change the base word (mak+ing, hopp+ing, cri+ed) and word starts (un-, re-). Whole-word Check. | Reviewed word-part bank. |

Levels 1-3 keep their saved round shape exactly. Their boards no longer advance a finished word by themselves: a finished word stays on the boat, can be tapped to hear, and the child taps **Sail on** when ready. **Undo** takes back the last letter placed on the current word (never more than was placed, never once the word is built, and never erasing a wrong tile or Help, which stay counted).

**Levels 4-5 switch to the new board only when a reviewed bank is admitted** (at least 12 words at each level). Until then the engine reports `nativeStages: false` and the older growth quiz serves those levels, so nothing unreviewed is reachable from the app. Archived growth rounds always dispatch to their own board (K8, `tests/challenge-handover.test.ts`).

On the new board nothing is marked right or wrong until **Check**. A miss keeps the word exactly where it was, counts once, and says only that the word is still there. **Help** lights the next needed piece, or marks a placed piece that does not fit. Help and a miss both make the word helped, never clean. Hearing the word again is part of the task and marks nothing; every request plays it, and only the saved state is idempotent. Each box is its own accessibility button, so one chosen piece can be removed with VoiceOver. Checks and misses saturate at 500 so every legal run stays saveable; "ever missed" and first-try truth are unchanged. Level 5 shows the base word and ending (`make + ing`); the work is noticing that the finished word keeps `mak`, not `make`. Level 5 words are all spelling changes or word starts, and a child who just keeps the base word fails every spelling change (`tests/sound-boat-parts.test.ts`).

### Challenge

`src/learn/games/sound-boat/challenge*.ts*` is a replay Challenge (`defineReplayGame`), codec `sound-boat-proof-v1`, context `sbt`. Banks 440-444 hold Levels 1-5 (445-449 spare). Dare slots 3600-3699 go to the first 25 puzzles of Levels 2-5: **own read** at Levels 2-3 (read the printed word yourself, then build it with no Help; hearing it keeps the finish but ends the mark) and **one first-try Check with no Help** at Levels 4-5. Level 1 has none. Every puzzle carries an award bit under the same rule.

Production passes the Challenge only tasks from admitted reviewed banks, so it has no puzzles today and `challengeFor('sound-boat')` hides it. To switch it on once a bank is admitted: run a catalog generation like the other School games (see `src/learn/games/beep-bot/generate-catalog.ts`), register the new banks and dares in `src/state/save-catalog.json`, and let the lead check the slots against `SLOTS.md`. Levels 1-3 Challenge puzzles would come from the shipped words (`taskOfLetters`); they are not published until the lead decides to bake them.

With sound on and no own-read dare, a Challenge board is honest dictation ("Hear the word, then spell it"): the word is heard and spelled from pieces, which is a spelling task and never evidence of reading it alone. An own-read dare prints the word instead, so the mark is for reading it.

### Reading is never timed, app-wide

`tests/reading-no-timer.test.ts` finds every reading route from the engine registry (every Reading-island game) and from the kit imports, not from a list. Which One and Turtle Tales no longer advance by timer: the child presses **Next** or **Turn the page**. Saved shapes and resume are unchanged.

### Fixtures and the dev harness

`tests/fixtures/reading/sound-boat-parts.fixture.json` is labelled `fixture: true` and has no review. Only tests and `scripts/dev/sound-boat-entry.tsx` import it. Production Expo Router imports neither.

## Tests

`tests/reading-kit.test.ts`, `sound-boat-parts.test.ts`, `sound-boat-challenge.test.ts`, `sound-boat-parts-view.test.tsx`, `sound-boat-undo.test.tsx`, `reading-no-timer.test.ts`, `reading-press-advance.test.tsx`, and the W1 reading-admission cases in `tests/helpers/word-pipeline-regressions.mjs`. Existing `learn-reading`, `challenge-handover` and growth tests are unchanged and pass.
