# Island picture dictionary

About 400 original vector pictures of everyday things, for Picture Crossword clues, word lists and Word Search picture mode (ledger rows PX-02 and PX-04, decision D4). Every picture was drawn for Little Island in the style in `STYLE.md`; eleven are cut down from the app's own Library icons (`basedOn` in `sources.json`). Nothing here is traced, clip art, emoji or a font glyph.

No game uses these yet.

## Files

| File | What it holds |
|---|---|
| `svg/<id>.svg` | One picture, 120-unit box, transparent background |
| `manifest.json` | Id, word, category, VoiceOver alt text, byte size and SHA-256 of each file; the only file the app reads |
| `sources.json` | W1 record id, allowlist queue, the meaning drawn and any other common meaning, and provenance for the cut-down Library icons |
| `allowlist.json` | The result of checking each word against the W1 word pipeline: queue, record id and reader level. No private policy or list data |
| `approvals.json` | Empty decision fields for Leon, bound to each file's hash. A redraw clears the decision |
| `STYLE.md` | The rules every picture follows |

## Making and checking

The pictures are drawn as code in `scripts/art/pictures/defs/` with the kit in `scripts/art/pictures/style.mjs`, which holds the palette and line weights.

```sh
node scripts/art/pictures/build.mjs            # write svg/, manifest, sources, approvals and the loader's asset table
node scripts/art/pictures/check.mjs            # static checks (also run by npm test via tests/pictures.test.ts)
node scripts/art/pictures/render-check.mjs <new report.json>   # host: renders, stays in frame, fills the frame
node scripts/art/pictures/sheets.mjs <new dir>                 # labelled contact sheets, 50 a sheet, 44 pt and 120 pt
node scripts/art/pictures/sheets.mjs <new dir> --blind <seed> --key <new key path outside dir>   # numbered, shuffled
node scripts/art/pictures/allowlist.mjs <W1 queues dir> <new private receipt>                  # rewrite allowlist.json
```

`render-check.mjs` and `sheets.mjs` need `rsvg-convert` and ImageMagick on the host. `allowlist.mjs` needs W1's private queues (`tiers.queue.json`, `local.queue.json`, `safety-policy.private.json`) and writes its receipt outside the repository.

## Review

A machine can check the files, not whether a picture is the thing it says. Each round, a fresh reviewer that has never seen the word list names every picture from shuffled, numbered 44 pt sheets, then compares its names with the key. Pictures it names wrongly or hesitates on are redrawn, until at least 97% are named right. Leon then reviews the labelled sheets and fills in `approvals.json`. No picture is approved by an agent.

## Before a game uses these

- Take answers from an admitted W1 word bank and look pictures up with `pictureForWord`. The words in `manifest.json` are picture labels, not reviewed answers.
- Labels and alt text are word data. Many of these words also appear on W1's broad scan list, and the export guard fails any shipped file that holds three distinct broad terms of five or more letters. Decide how labels and alt text are admitted before the first import ships them.
- Alt text names the object. A picture clue must not read its alt text aloud before the child answers.
