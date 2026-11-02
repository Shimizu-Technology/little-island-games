# Book acquisition: 2 November 2026

Eight complete English reading editions are ready for parent integration: 107 pages, including seven wordless pages, with 306 exact text/speech entries. Every item is **draft**. No narration was generated, downloaded or approved. Independent factual/reading-content review and designated family reviewer's family review remain pending.

## Context and acceptance

The isolated branch is `t3/acquire-book-content`, based on design source `c934137`. The family Library is an untimed, offline place for a child and caregiver-led reading. Sources for this scope are `docs/PRD.md`, `docs/QA.md`, `docs/ISLAND_LIBRARY.md`, `content/library/book-plan.json`, the shared `v3/COMMON.md`, and `v3/library/DECISIONS.md`. The Brain Dump search found no additional Library decision. This worker owns book acquisition only; the parent owns content integration, independent review, audio, app behavior and the full release gate. No deployed build was inspected.

Acceptance for this slice: 8–10 complete shortlist editions, exact English ISBNs, publisher-backed text/art rights and creator credits, local readable art and transcripts, local licenses, file hashes, explicit draft review and pending audio, and a measured size below the book-image budget. No public publication is authorized by this work.

## Acquired editions

| Local ID | Exact English title | ISBN | Reading pages | Image bytes |
| --- | --- | --- | ---: | ---: |
| busy-day | A very busy day! | 978-1-928497-79-0 | 15 | 9,969,738 |
| sleepy-mr-sloth | Sleepy Mr Sloth | 978-0-9922357-0-3 | 13 | 1,287,388 |
| a-tiny-seed | A Tiny Seed: The Story of Wangari Maathai | 978-0-9946519-2-1 | 13 | 430,442 |
| a-fish-and-a-gift | A Fish and a Gift | 978-0-9922357-8-9 | 13 | 520,384 |
| a-beautiful-day | A Beautiful Day | 978-1-928318-15-6 | 13 | 2,125,880 |
| a-house-for-mouse | A house for Mouse | 978-0-9922357-5-8 | 13 | 770,337 |
| little-ants-big-plan | Little Ant’s Big Plan | 978-1-928318-22-4 | 13 | 818,258 |
| the-best-thing-ever | The best thing ever | 978-1-928318-55-2 | 14 | 1,486,661 |

These page counts describe the publisher's digital reading editions: a cover plus twelve story images for the six complete GitHub image sets; covers plus twelve story spreads for The best thing ever; and the complete fifteen-image Busy Day fixture. They do not claim to reproduce every print-format bookplate, endpaper or blank leaf. Credits and the complete license are supplied separately offline.

## Rights and edition evidence

Each `books/<id>/` directory contains ordered `page-*.jpg`, `transcripts.json`, `manifest.json`, `publisher.txt`, `CREDITS.txt` and `inspection.jpg`. The seven new books also retain `edition.md`, `edition.txt` (the official published digital edition, including its rights colophon), and `edition-metadata.json`. The text/art and cover rights are declared separately on every record/image even though their licensor and license are shared. No recording rights are inferred.

- [Book Dash's source-file policy](https://bookdash.org/book-source-files/) permits reuse of its books and source files under CC BY 4.0, including adaptation and redistribution, with Book Dash and creator credits. Its local snapshot is `publisher-source-policy.txt`.
- The official publisher repository [bookdash/bookdash-books](https://github.com/bookdash/bookdash-books) describes its text-plus-illustration digital edition format and licenses all Book Dash content. `publisher-repository.txt` retains the retrieved page. The source is frozen at **54916310c5c06a5282e2d5d4add18d64f90e5fde**. Every raw asset/text URL includes that commit.
- The official digital books' closing colophons explicitly identify their creators and CC BY 4.0. Their metadata declares English and the ISBN; all seven match their current exact English publisher pages. `publisher-metadata.yml` preserves the original publisher metadata bytes. The JSON metadata extracts are convenience copies, not separately sourced editions.
- `publisher-crediting-policy.txt` retains the publisher's reuse-credit instructions. Every book's `CREDITS.txt` names the original creators, Book Dash, English ISBN, source, applicable changes and license. Its companion `CREDITS.html` displays the publisher-supplied `book-dash-logo.png` offline. The parent must display that logo with the app's book credits, as the publisher requests. The current publisher identifies A house for Mouse illustrator as **Amy Richards (Uzzell)**; the original cover credits **Amy Uzzell**. Both are retained in the notice. Where the exact digital colophon and current title page name no separate editor, the notice says so; none was inferred. All named creators from both sources are retained.
- `CC-BY-4.0.txt` is the complete offline license copied from the existing library license. App integration must retain the attribution, license and modification notices and preserve the licensed reuse freedoms. No creator endorsement is claimed.

The six complete official GitHub image sets have no story text baked into their illustrations. Their exact English text is displayed alongside the art, as in the publisher's official digital edition. Line breaks/whitespace are reflowed; the words and punctuation are preserved. Cover text includes the visible creator names. Illustrations are converted to RGB JPEG at quality 88, maximum 1600 pixels, with no crop. Source originals, derived bytes, dimensions and transformations are hashed and recorded. Some official originals are 567 pixels across; no extra detail was invented by upscaling. Tablet readability of the scalable text and rendering quality still need parent app/device QA.

The best thing ever has an incomplete image directory in the publisher GitHub repository. Its complete English page art instead comes from the exact publisher title page's [20160409 image set](https://bookdash.org/books/the-best-thing-ever/), with the same English ISBN and matching story text. The original on-page text remains visible in the art; the transcript is corroborated against the official English manuscript. Its last back-cover image has no text and remains wordless. Its creator credits and CC BY 4.0 colophon are preserved from the official English digital edition and current publisher credits.

Busy Day reuses the requested complete fixture. All fifteen original image files were copied byte for byte into `books/busy-day/`; every SHA256 was then checked against a fresh download of the original publisher URL. The English ISBN and four creator roles were rechecked on the publisher page. Original fixture attribution is retained. The source-file PDF endpoint redirects to a publisher CDN that returned **HTTP 403** in this environment; its print credits leaf was not freshly retrieved. The existing edition's creator credits are visible on its cover and corroborated by the current publisher role credits. This limitation is explicit in its manifest; no new print-PDF verification is claimed.

## Transcription and art inspection

All 107 acquired reading images were decoded and inspected in the per-book `inspection.jpg` contact sheets, with individual full-size inspection where details needed checking. The sheets retain the actual local art, in page order. The six text-free digital image sets were compared with their official `edition.md` text and page-by-page alt descriptions; these sources distinguish story text from descriptions. The best thing ever was also checked against its printed page text. No story was inferred from a wordless image.

`transcripts.json` separates story/cover text from incidental legible artwork text such as `NOM NOM`, `SHOP` and `TAXI`. Tiny marks on the illustrated fishing licence are illegible and have not been invented. The publisher's own source text remains unchanged, including historical and cultural content; sensitive notes identify what independent and family review must examine.

The original Busy Day fixture had two observable errors, corrected only in the new book files:

1. Page 13 shows patterned toys and shoes, not a child enjoying a book. Its empty transcript is preserved and its alt is corrected.
2. Page 14 is a wordless back cover. The old transcript was the publisher's descriptive blurb, absent from the image; it is removed. The new speech map therefore omits `library-busy-page-14`. The three visible cover creator names are also registered.

Wordless pages (zero-based): Busy Day 8, 13, 14; A Beautiful Day 4, 12; A house for Mouse 10; The best thing ever 13. These have empty sentence arrays. Every label speaks the book title. There are no fabricated stories or audio placeholders marked ready.

## Skipped candidates and acquisition failures

Three shortlist candidates were left out to keep this batch at eight complete editions: **Where is Lulu?**, **My Dream in the Drawer**, and **Grandpa Farouk’s Garden**. They are unselected, not rejected for rights concerns; no empty records or partial downloads were created for them. They still require complete exact-edition acquisition and review before a future batch. No acquired book had unresolved text/art license terms; zero books were admitted on an assumption about third-party recording rights.

The source-file PDF/CDN failure and incomplete Best Thing Ever GitHub art set were resolved for readable editions through the publisher's other open files, as described above. No account details were submitted and no outside person was contacted.

## Size and verification

Reading art totals **17,409,088 bytes (17.41 decimal MB)**, including the 9.97 MB byte-preserved Busy Day fixture. The complete committed slice, including art contact sheets, source evidence, metadata, speech map and notices, is measured in `inventory.json`. It is below the 100 MB book-image target and 300 MB whole-increment cap. The old Busy Day asset copies remain untouched and are redundant after parent integration.

Author-executed checks on this branch:

- Passed: every English ISBN-13 check digit and equality with the primary publisher metadata/page.
- Passed: 8 records, 107 pages, 7 wordless pages, 306 unique registered speech entries, title labels, pending-only audio, draft reviewer identity, local file/license paths, image SHA256 values and manifest page counts.
- Passed: all 107 JPEGs decoded; complete page order and art checked in the retained contact sheets. This is an author acquisition check, not independent factual or family approval.
- Passed: unmodified repository `scripts/library/validate.mjs --file content/library/book-items.json` in an isolated temporary validation root with symlinked content and a merged temporary speech map. All eight records passed. `validator-result.txt` records the output; no shared file was changed.
- Passed: `npm run typecheck`; `npm run lint` (zero errors, 33 existing warnings in untouched source/tests).
- Not run by this worker: final combined library validator after parent integration, full `npm run check`, Doctor, app/browser/native reader journeys, physical-device and family acceptance. The parent owns those after merging the book speech map and replacing the old fixture. No native or browser usability pass is inferred from asset inspection.

## Parent integration and remaining gates

Merge `book-items.json` **by ID**: `busy-day` revision 2 replaces its old record; the other seven IDs are additions. Merge `book-speech.json` into the parent's speech registration. Remove the stale Busy Day page-14 speech key if no other consumer uses it. After replacing asset references, the parent may remove the unused `content/library/assets/busy-*.jpg` files and original `book-assets.json` records; this worker did not touch them.

Keep every item's draft status and the reviewer string **Codex content author (drafted; independent factual and designated family reviewer family review pending)**. The biographies, culture/regional terms, death/poverty, fishing/shark/wildlife scenes, road litter, water play, fire and fantasy animal behavior are flagged per book. Independent review must judge factual meaning and age-seven suitability, and designated family reviewer must complete the family pass. Audio generation and audible/pronunciation review remain pending. No approval, public release or store submission is part of this commit.

No application source, shared registry, schema, validator or speech pipeline file was edited. No app/native/browser server, tab, simulator, emulator or container was started. The lifecycle session has no owned running resources; transient download/check commands finished. No push, PR or merge was performed.
