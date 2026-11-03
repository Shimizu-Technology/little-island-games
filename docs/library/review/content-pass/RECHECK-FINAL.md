# Independent final review — 2 November 2026

**Revisions required: two material findings. The assigned final-review scope is complete.** F01–F05 are corrected. The additional factual wording, names, prayer alts and *And Also!* import pass. The remaining corrections concern reset defaults and one literal art/alt mismatch. This is not shipping, family, device or audible-audio acceptance.

Read-only repository: `/Users/leonshimizu/.t3/worktrees/little-island-games/t3-309a23ae`; branch `feat/v31-library-content2`; HEAD `d2a86bc90167995c5068f6df3690f62194a1ed47`. The reviewed candidate is uncommitted. I wrote only this report and `RECHECK-FINAL.json` in the authorized artifact directory. No repository files, PRs, commits or merges were made; no agents or development resources were started.

## Required corrections

### FINAL-01 — P2: Start fresh enables both optional collections

`src/state/Store.tsx:436–438` calls `restore(JSON.stringify(emptySave()))`. At line 408, restore calls `migrateLibrary(incoming)` with the default `existingLearners: true`. An intentionally empty/reset family is consequently migrated as an existing family and gets both `faith` and `island-history`. Normal fresh hydration correctly passes `existingLearners: false` and leaves them off.

I executed the actual pure migration code without writing files. The normal fresh-load expression returned the nine standard collections; the expression reached by startFresh returned those nine plus faith/history. The focused tests cover initial launch and later new learners, but not this reset path. This violates the fresh-family off default after choosing “Start fresh,” including recovery from an unreadable save.

**Exact correction:** construct the reset payload as v2 with the fresh option before the existing restore/preservation path, for example `restore(JSON.stringify(migrateLibrary(emptySave(), { existingLearners: false })))`. An equivalent explicit restore-mode option is also valid. Keep exact-original-byte preservation. Add a Store regression that calls `startFresh()`, confirms both optional collections are off, verifies the replaced original remains preserved, and reloads without enabling them. Existing v1 import/hydration must continue enabling all existing learners once.

### FINAL-02 — P2: War-survival drawing contradicts its exact seated alt

`content/library/art/next-history-war-survival.svg:1`, shown in final `evidence/art-sheet-4.png`, depicts the older storyteller and listening child **standing** beside the album. Its exact alt and retained art brief say: “An older storyteller and a listening child sit beside an album with a simple picture of families preparing corn.” Both outer people use the straight standing-leg path `M-9 66 L-11 94 M10 66 L12 94`, without a chair or another seated pose. I confirmed this in both the opened render and SVG.

**Exact correction:** redraw both outer people in unmistakably seated poses beside the album while preserving the binding exact-alt/artBrief pair. Keep the simple corn-preparation album scene. Update the SVG checksum in canonical/source records, regenerate the affected sheet and versioned candidate evidence, and independently re-open the changed rendering. This is a literal subject/pose correction, not a request to restyle the art.

## Prior findings verified

- **F01:** family-circle now includes the requested Inafa’maolek title, URL and 2026-11-02 access date. I opened the source again; its children/shared-raising passage supports the retained wording.
- **F02:** wind and seasons use the requested UOG WERI/IREI climate atlas instead of the broken ClimateOfGuam URL. I opened the atlas again; its wet/dry and trade-wind sections are present. Historical source entries and child text were preserved.
- **F03:** wheat-flour’s sensitive note describes measuring flour with a grown-up and no tasting. The retained art brief depicts milling/parts, not sealed-package-only activity. The permitted measuring prompt remains.
- **F04:** all three history records have no held tag. Colonization and WWII carry the specified released-now metadata, both have short grown-up notes, and WWII retains grown-up-only co-reading support.
- **F05:** original freeze SHA remains unchanged. `content-delta-v2.json` contains all **146** candidate records and equals the live canonical array exactly at final comparison. It includes both exact collections and And Also!. History membership is three topics; faith is five wonders plus five prayers.

The previous review’s **676 fields / 688 segments**, including 498 narrative/prayer/revised-alt segments, were not re-reviewed as new prose. Exact comparison finds every previously reviewed text still present except the five explicitly superseded prayer-image alts. Plankton was absent from the original 64-record freeze and is covered independently below. The earlier source-access caveats remain documented in RECHECK-FACTS.md/JSON.

## Additional string review

Compared changed/new speech registrations with HEAD and the prior review/freeze. There are **850 changed/new registrations**; **686** match previously reviewed text exactly (allowing the already registered label’s terminal period). I individually checked the remaining **164** entries, recorded verbatim in RECHECK-FINAL.json:

- **1 plankton sentence:** “A baby fish may begin life drifting as plankton, then grow into a strong swimmer.” It matches the requested Claude wording. The duplicate closing sentence is gone. The independently opened NOAA page describes young fish among zooplankton and young drifters becoming strong swimmers. No new unsupported generalization.
- **28 naming labels:** all new `src/library/naming.json` names agree with their depicted/topic subjects and registered speech. Håfa Adai matches live canonical spelling; CHamoru is retained; the remaining labels are ordinary English names rather than new unapproved vocabulary lessons.
- **13 book label/paragraph registrations, 13 book-image alts and 29 word registrations:** all correspond to And Also!’s title, exact story, pictured events and tokens, including the names Thabo/Keitu. No invented wordless-page narration. Pronunciation is not assessed here.
- **80 newly registered alts for six existing books:** the alt wording is unchanged from HEAD. I read each and visually inspected all 80 corresponding local pages through in-memory contact sheets (A Very Busy Day, Sleepy Mr Sloth, A Tiny Seed, A Fish and a Gift, A Beautiful Day, Little Ant’s Big Plan). No new material transcription/subject defect was found. These visual inspection sheets were never written to disk.

Also checked the **five corrected prayer-image alt fields** (“An open prayer book with a small cross on one page.”) against the opened prayer-book drawing, and the **two new grownUpNote fields** (six sentences total) against their articles. The notes accurately describe the non-graphic content and shared-reading approach; the GrownUps gate contains their display. Standard prayer wording remains unchanged from the first factual pass, represented as a single canonical text per prayer, without Tell/More/Deep inventions.

The live HåfaGPT vocabulary was read again: all **15** copied entry objects are exactly equal to their canonical objects. `body_parts.eye` remains held; no Åtadok/Åtaduk/Mata teaching narration was added. Native pronunciation caveats remain. The optional earlier Scoville-unit and Francis-referent comments remain non-blocking and do not trigger another prose round.

Sources opened for this incremental check: [NOAA plankton](https://oceanservice.noaa.gov/facts/plankton.html), [Book Dash publisher record](https://bookdash.org/books/and-also/), [UOG climate atlas](https://south.hydroguam.net/geographic-climate.php), [Guampedia harmony essay](https://www.guampedia.com/inafamaolek/), and the actual local canonical vocabulary. The supplied PDF is the independently inspected edition source, not a substitute edition from a current web reader.

## And Also! edition, pages and rights

**Pass within import/content scope.** The supplied source artifact hashes to `161745a760d3ed1c471a2160c8345bdd09b5249d1b776ea27332e331f9c914d3`, is 2,037,230 bytes and has 18 PDF pages. PDF metadata’s later 2019 production date is not mistaken for the edition date: the printed credits explicitly give Cape Town, 2 December 2017, English ISBN 978-1-928442-06-6.

I opened the full 18-page edition contact sheet, the full printed credit/licence spread (PDF4), and all 13 actual imported page images. I extracted the PDF text to stdout and compared every imported paragraph in visual reading order. Reading order is exactly PDF **1,5–16**: cover plus all 12 story spreads, including the wordless PDF15. Ownership/title-rights material and decorative endpapers are omitted as declared; no story spread or ending is missing. Extractor ordering on PDF10 was resolved against the visible spread. Differences are line breaks/punctuation spacing, not story wording.

Every transcript and image alt matches between canonical item, transcripts.json and manifest.json. All 13 image hashes and byte sizes match actual files and book-assets.json; the complete canonical book equals book-items.json. The imported JPEGs are byte-identical to their corresponding evidence PDF-page rasters. All alts truthfully distinguish pretend scenes and the final bedroom scene.

The printed PDF credit page, local CREDITS.txt/HTML, edition metadata and manifest identify **Lauren Beukes (writer), Anja Venter (illustrator), Nkosingiphile Mazibuko (designer), Helen Moffett (editor), and Book Dash**. The official publisher page independently agrees with ISBN and roles. CC BY 4.0 is printed in the PDF, the local licence is present, and attribution/licence/change notices are retained in canonical rights and reader-accessible metadata. Raster conversion, omitted print pages and local narration are explicitly declared. No publisher recording is included in this import; I did not listen to or approve generated narration.

## Art inspection

Opened final `art-sheet-1.png` through `art-sheet-6.png`, covering all **31 new vector files**: 28 wonders, two collections and the shared prayer picture. Read the relevant SVG, hash and exact-alt/artBrief data; the 30 new wonder/collection pairs agree exactly. The five prayers share the corrected prayer-book alt.

- Latte shows paired rows of pillars with caps having a flat upper edge and rounded underside, plus a clearly marked reconstruction outline.
- Proa shows a narrow hull, triangular sail and smaller joined outrigger.
- Revised coconut has a trunk, coconuts and pinnate leaflets; hands have palms/backs/soapy/nail insets; the thank-you adult has a seated pose and chair; conceptual maps include families and are labelled as conceptual; creation-care includes a separate sea/tree window view.
- Other new subjects and alts have no material mismatch found. FINAL-02 is the remaining seated-pose mismatch on war-survival.

This is inspection of rendered evidence and vector subjects, not physical-device rendering or approval by a knowledgeable CHamoru sailing/cultural practitioner.

## Code and verification

Inspected the requested diffs in schema.ts, state.ts, Store.tsx, GrownUps.tsx, Topics.tsx, validate.mjs, shipping-report.mjs, record-decisions.mjs and build-index.mjs, plus focused collection, destination, state, store, content and integration test sources. Traced unchanged callers needed to assess visibility and storage boundaries.

- **Migration:** actual read-only execution with a recursively frozen v1 input passed immutability, enabling every saved learner (including one with no Library profile), preserving saved/book-page state, v2 identity/idempotence, retaining a grown-up’s off choice and later-learner off defaults. Archive cloning and preservation paths are present. The reset exception is FINAL-01.
- **Original bytes:** startup preserves exact `encoded` bytes through preserveAndReplace before publishing v2. Legacy/v1 import explicitly preserves incoming bytes and preserves the replaced persisted/live save. Failed preservation prevents replacement. Focused Store tests exercise exact whitespace-bearing originals and preservation failure; these test files were inspected, not run in this review.
- **Availability:** the shared category policy feeds allowed browse/search IDs, related-link destinations, direct-route guards, Look & Listen, saved/recent entries and source-linked Maker pages. New items use faith/history categories rather than leaking onto Guam. Grown-up switches remain gated; child writes preserve policy. No new bypass found by source inspection. Actual interaction remains pending.
- **Prayer rendering/index:** the prayer variant holds canonical sentences once; Topics hides layer selectors and uses the existing SentenceLine renderer; indexing includes prayer text. GrownUps displays its text/note within the existing gate. No parallel invented layers.
- **Decision/report tooling:** scope is stored as supplied. The final code refresh recomputes the accepted decision hash after promotion changes audio/status/scope. A read-only in-memory execution confirmed the final hash agrees; its nested validator was intentionally stubbed, so this is not an end-to-end promotion test. Strict shipping remains separate from report mode. No approval or content mutation occurs in report mode.

Executed read-only checks:

| Check | Result |
|---|---|
| `node scripts/library/validate.mjs` | Exit 0, design validation for 146 items |
| `node scripts/library/destinations.mjs` | Exit 0, 523 typed links and 3 exhibit engines |
| `node scripts/library/validate.mjs --shipping` | Expected exit 1; all 146 records unapproved |
| `node scripts/library/validate.mjs --shipping --report` | Exit 0; explicitly read-only, no approval/promotion |
| Pure migration and reset probes | Normal invariants pass; reset reproduces FINAL-01 |
| PDF/image/manifest/asset comparisons | All13 imported pages consistent |

The report snapshot truthfully lists **850 missing/stale clips**, missing factual-review metadata for **and-also**, **146** missing/stale family decisions, **146** audio/pronunciation acceptances pending and **146** unpromoted records. These counts are expected before the parent records the new decisions and finishes audio. It does **not** establish that only lead listening remains yet.

**Not run by this reviewer:** full npm check, Doctor, lint, typecheck, Vitest suites, default/preview web exports, browser journeys, simulators, native builds or physical family devices. The user explicitly places the default/preview npm gates after audio completion. No count or source review here substitutes for those gates or acceptance. New family decisions must still be recorded using the existing tool after required corrections; no item may be promoted from this report alone.

## Reviewed hashes and boundary

Exact file SHA-256 values below; `RECHECK-FINAL.json` records the complete context/code/test/art/book file inventory, the additional 164 speech strings, notes and limitations. Hashes cover exact file bytes. The working tree changed during review; the decision-tool hash fix and added destination/integration tests were refreshed at final read. This report covers the recorded snapshots, not later edits or generated assets.

| Input | SHA-256 |
|---|---|
| `evidence/content-delta.json` | `7cd648ad69eec6267a564b7e2d2f5e22636c7c8977f549e04f7cd59cda5c0deb` |
| `evidence/content-delta-v2.json` | `a854f1ab6e3ffc36684b4abd6471b90879b043128b292bc167d28eb4a6264772` |
| `RECHECK-FACTS.json` | `0fe0a0d9b83f67884f715205756fd971144f8bbd42039505601f0f9e2e198000` |
| `content/library/items.json` | `b074b58ceae3778010fbb41e5b3fc0ecdf6772897e1f16df3d31e137464719b9` |
| `scripts/learn/library.json` | `f6199c29a6746f7e90772d624a2a0c9d0fa7d4e52215064dc2a99f569956f1cd` |
| `evidence/and-also-2017.pdf` | `161745a760d3ed1c471a2160c8345bdd09b5249d1b776ea27332e331f9c914d3` |
| `content/library/books/and-also/manifest.json` | `d09a11c91eae6944fcb2530b736e1704707eb1014066622699cc523cb26f42de` |
| `src/library/state.ts` | `e055743bb1d126ad4dd50f6695b49e1e69769633eba40fca7e5d4edb001da56a` |
| `src/state/Store.tsx` | `62c1a9a75875f1a91d98208e8d481d99025c8c5c838c96538088c8f87cf0c646` |
| `scripts/library/record-decisions.mjs` | `773e4e158f04f7bbcd2d93860fe417a1fb3edb701940dda10ecb084b8ee2d558` |
| `scripts/library/shipping-report.mjs` | `fa9084086f10dae8d70035c2e22d6e9624497296b9d7f762fe6150c6565c11c1` |

**Cleanup:** no servers, browser sessions/tabs, simulators, emulators, containers, agents or persistent services were started, claimed or handed off. Short read-only processes completed. No baseline/shared resource was changed. Only RECHECK-FINAL.md and RECHECK-FINAL.json were written.
