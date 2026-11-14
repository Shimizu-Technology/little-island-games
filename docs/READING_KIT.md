# Reading kit (K5) and Sound Boat

15 November 2026, slice R1a (`p4/r1a-reading`). Ledger rows K5 and SC-21. This is the shared reading kit in `src/learn/reading/` and the Sound Boat rebuild on it. **Reading is never timed and never rewards speed.** Nothing in the kit or in Sound Boat reads a clock, keeps a score against one, or advances a word by itself (`tests/reading-no-timer.test.ts`).

## What the kit holds

| Piece | File | What it does |
| --- | --- | --- |
| Scope and sequence | `scope.ts` | One ordered list of 25 steps over five levels: short vowels (1); digraphs, ng, blends, silent e (2); vowel teams and r-controlled (3); compounds, beats, endings that keep the base word (4); spelling changes and word starts (5). Every step names its practice skill. |
| Grapheme analysis | `graphemes.ts` | Checks that tiles spell a word and derives every pattern the tiles show. A word is filed under the newest idea in it. |
| Word parts | `morphology.ts` | The four spelling-change rules (none, drop e, double, y to i) as code, so a record's claim is checked against the rule, and a tray checker that finds every way a tray can spell a word. |
| Records | `records.ts` | `LetterWord` (Levels 1-3), `PartsWord` (Levels 4-5), `ReadingText` (sentences and passages), and the review evidence shape. |
| Validators | `validate.ts` | Structure checks for words, banks and texts, a decodability check for texts against a lexicon, and the shipping gate. |
| Shipped words | `inherited.ts` | The 340 words that shipped in 3.0.0, filed by pattern. Tags are derived, not copied. |
| Tap-a-word | `tap.ts`, `TapWords.tsx` | One tap says a printed word. It is a read-aloud act, never a read. |
| Listening vs decoding | `evidence.ts` | `prompt`, `read-aloud`, `help`, `miss`. Only reading alone, unhelped and unmissed is independent decoding. Hearing never makes it true. |
| Building a word | `build.ts` | The pure rules shared by the School board and the Challenge replay: tray, draft, Check, Help. Uses the shared whole-answer kit (`src/puzzles/wholeAnswer.ts`). |
| Admitted banks | `admitted/index.ts` | The only door into the app for new records. Empty today. |

## Records and review

A record's `status` is one of:

- `inherited`: shipped in 3.0.0. Admitted only while the derived records match a pinned digest (`INHERITED_DIGEST`). Editing the shipped words, or the way the kit tags them, changes the digest on purpose.
- `draft`: written, not reviewed. Never ships.
- `fixture`: invented for tests and the dev harness. Never ships.
- `reviewed`: carries `review` evidence: two keep verdicts from two different models in separate runs with separate transcripts, a lead keep, and a content hash that matches the record as it is now. A later edit makes the evidence stale.

No code, test or tool here writes `reviewed` or fills review evidence. The lead's W1/W2 reconcile does. `shippingIssues(bank)` fails closed on fixtures, drafts, missing or stale or half-complete evidence, and inherited records that do not match the pin. `admitParts` runs it at module load, so an unreviewed bank listed in `admitted/index.ts` fails the build, not just a test.

`scripts/reading/make-parts-bank.ts` writes the fixture bank (`tests/fixtures/reading/`) and the draft bank (`scripts/reading/drafts/`) from one list of specs, computing every piece with the kit's own spelling rules. `scripts/reading/check.ts <bank.json> [--shipping]` validates a bank file. The draft bank is outside the app tree and is the list to put through the two-reviewer process.

The W1 word-data detector in `scripts/words/shipping.mjs` treats any file or folder named `bank`/`banks` as an unadmitted word bank, which is why this folder is `admitted/`. It does not recognise reading records by their shape (it looks for `spelling`, `lemma` and `words`/`clues`/`answers`/`accept` arrays). Their gate is `assertShippable`, run when the app loads `admitted/index.ts`. See the report for the lead decision this raises.

## Sound Boat

| Level | Name | What it asks | Where it comes from |
| --- | --- | --- | --- |
| 1 | Cat, hen and sun | Spell consonant-vowel-consonant words tile by tile. | Shipped words. Per-letter feedback. |
| 2 | Fish, crab and kite | Blends, digraphs, ng, silent e. | Shipped words. Per-letter feedback. |
| 3 | Sheep, boat and star | Vowel teams, r-controlled. | Shipped words. Per-letter feedback. |
| 4 | Word parts and endings | Build two-part words from pieces: compounds, beats, endings that keep the base word. Whole-word Check. | Reviewed word-part bank. |
| 5 | Spelling changes and word families | Endings that change the base word (mak+ing, hopp+ing, cri+ed) and word starts (un-, re-). Whole-word Check. | Reviewed word-part bank. |

Levels 1-3 keep their saved round shape exactly. Their boards no longer advance a finished word by themselves: a finished word stays on the boat, can be tapped to hear, and the child taps **Sail on** when ready.

**Levels 4-5 switch to the new board only when a reviewed bank is admitted** (at least 12 words at each level). Until then the engine reports `nativeStages: false` and the older growth quiz serves those levels, so nothing unreviewed is reachable from the app. Archived growth rounds always dispatch to their own board (K8, `tests/challenge-handover.test.ts`).

On the new board nothing is marked right or wrong until **Check**. A miss keeps the word exactly where it was, counts once, and says only that the word is still there. **Help** lights the next needed piece, or marks a placed piece that does not fit. Help and a miss both make the word helped, never clean. Hearing the word again is part of the task and marks nothing. Level 5 shows the base word and ending (`make + ing`); the work is noticing that the finished word keeps `mak`, not `make`. Level 5 words are all spelling changes or word starts, and a child who just keeps the base word fails every spelling change (`tests/sound-boat-parts.test.ts`).

### Challenge

`src/learn/games/sound-boat/challenge*.ts*` is a replay Challenge (`defineReplayGame`), codec `sound-boat-proof-v1`, context `sbt`. Banks 440-444 hold Levels 1-5 (445-449 spare). Dare slots 3600-3699 go to the first 25 puzzles of Levels 2-5: **own read** at Levels 2-3 (hear the word once, then build it with no Help) and **one first-try Check with no Help** at Levels 4-5. Level 1 has none. Every puzzle carries an award bit under the same rule.

Production passes the Challenge only tasks from admitted reviewed banks, so it has no puzzles today and `challengeFor('sound-boat')` hides it. To switch it on once a bank is admitted: run a catalog generation like the other School games (see `src/learn/games/beep-bot/generate-catalog.ts`), register the new banks and dares in `src/state/save-catalog.json`, and let the lead check the slots against `SLOTS.md`. Levels 1-3 Challenge puzzles would come from the shipped words (`taskOfLetters`); they are not published until the lead decides to bake them.

### Fixtures and the dev harness

`tests/fixtures/reading/sound-boat-parts.fixture.json` is labelled `fixture: true` and has no review. Only tests and `scripts/dev/sound-boat-entry.tsx` import it. Production Expo Router imports neither.

## Tests

`tests/reading-kit.test.ts`, `sound-boat-parts.test.ts`, `sound-boat-challenge.test.ts`, `sound-boat-parts-view.test.tsx`, `reading-no-timer.test.ts`. Existing `learn-reading`, `challenge-handover` and growth tests are unchanged and pass.
