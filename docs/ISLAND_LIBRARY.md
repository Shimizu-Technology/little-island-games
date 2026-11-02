# Island Library 3.1 — design and foundation

Design phase, 2 November 2026. Base: `origin/feat/v3` at `aacd8a13aabf65414ecf1090d832e5c841348f23`. The lead must approve this design before production integration. Nothing replaces the hub’s Library destination or `src/explore/*` in this phase. No PR, release, version bump or native build is part of this worker’s scope.

## Product and acceptance brief

Stassie, seven, should be able to enter by picture or a question, find a familiar subject despite a spelling error, read or listen without time pressure, follow a meaningful link, make a page, keep it and return. A caregiver chooses what each child can see. Little ones get one image and one repeatable spoken label with an obvious grown-up exit; infancy remains caregiver-led, not an independent screen-learning programme.

Sources: [PRD](PRD.md), [QA limits](QA.md), [existing Explore](V2_EXPLORE.md), current `src/explore/content.ts`, `progress.ts`, `rights.ts`, `src/hub/Landmarks.tsx`, and the approved worker brief. The external research package is at `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/v3-research/`: `kidnet/REPORT.md` (full report, particularly the concrete plan and parent controls) and `landscape/REPORT.md` (age bands, decoding versus listening). A fresh Brain Dump search found only the unrelated podcast note already identified by that research. These briefs, not old TestFlight paragraphs in the PRD, define current intent. Source base and native Expo 57/RN 0.86.3 dependencies were verified; this worker has not verified a deployed 3.0 build.

Design acceptance: working web-export prototype; one full layered topic and complete book fixture; photographed mid-interaction states at 390×844, 744×1133 and 1133×744, plus 200% prototype text; build-time content checks and focused rule tests; unchanged real Explore; no external runtime requests added by the Library; branch pushed. Native speech, touch, Dynamic Type, physical iPad mini 6 performance and family acceptance belong to the lead’s next phase.

## Information architecture

The Library is a recognizable building on the Island, with a direct Library entry retained for quick returns. The entry study reuses the real hub’s `Landmark` instead of drawing a competing building. Inside:

| Place | Primary task | What stays visible |
| --- | --- | --- |
| Wonder | Browse pictured categories, search, read a topic, try an exhibit | Back, sound, Library places |
| Books | Choose an installed picture book; read, hear or share reading | Page controls, saved place, book credits |
| Make | Draw or build a page/book inspired by a wonder | Undo, save status, return to source |
| My Shelf | Return to saved wonders/books, creations and recent places | Explicit saved items, no completion score |
| Look & Listen | Caregiver-led naming with one picture and repeatable label | One obvious grown-up exit; no search or navigation menu |
| Grown-ups | Preview actual items; select collections per local child; optional hours | Existing grown-up gate, clear current child and save outcome |

Four stable bottom destinations use words and distinct symbols. A topic’s related links form a stack: Back returns to the prior topic, then the exact prior query/category/scroll position. Reader page and chosen layer remain when visiting the shelf. Production routes must use Expo Router; the design study’s in-memory screen stack does not establish the production navigation implementation. On phones, categories use two columns; reading uses one column. Tablet reading can place the picture beside text. No swipe is required to turn a page or change a layer. Sources are readable offline credits, not child-facing browser exits.

No feed, random daily allocation, points, pet chores, forced reading task or locked creative tool is introduced. “Tell me,” “More” and “Deep” describe depth without public age or ability labels. Vocabulary-rich shared listening is welcome even when a child cannot decode the same text independently. A tap, an open page or a finished recording is not evidence of independent reading. If grown-up notes are added, use explicit `listened`, `read-together`, `self-reported-read` and `unknown` modes; infer none of these as assessed decoding.

## Visual and interaction direction

Cream paper, deep teal ink, sage land, lagoon water and warm sand extend the hub. The Library is a calm interior: a featured question, recognizable picture doors and comfortable text rather than another island map that must be traversed. Original vectors stay simple and static. The book retains its creators’ art and proportions; scalable text below the spread supplies the large-text reading surface.

Two meaningful responses: saving changes the button to “Saved” immediately, and selecting Replay highlights the exact sentence. Neither waits for an animation. Exhibit position changes are deliberate manual steps with an untimed explanation. Reduced motion receives the same immediate settled state; no decorative animation, parallax or background timer is needed. This phase makes no frame-rate claim from still images.

The study is opt-in: `npm run export:library-lab`, then `LITTLE_ISLAND_PORT=43857 npm run preview`, then `/library-lab`. Without `EXPO_PUBLIC_LIBRARY_LAB=1`, the route redirects home; native always redirects. Do not enable the flag in a family/release build. `LibraryLab.tsx` is a web design surface, not a native screen ready to ship. It uses HTML controls within the Expo route and existing native/web vector components. Prototype state is memory-only, visibly identified as an unsaved demo. Refresh resets its shelf, availability, creations and recent places. Real app saves are never read or replaced by it.

Replay and category-label controls demonstrate selection and sound-off recovery; **they do not play new narration**. They explicitly say recording is pending. The topic is fully authored at all three depths; that is not family/content approval. The 15 book spreads are a complete original English fixture including wordless spreads and covers. The page maker demonstrates free stamps, undo and keeping a creation during a visit; it is not the planned drawing/book editor.

## Content contract

`src/library/schema.ts` defines the discriminated `LibraryItem` union; the JSON authoring file is `content/library/items.json`. There is one runtime admission checker, `scripts/library/validate.mjs`. The prototype consumes those same authored fields rather than a second set of topic/book text.

| Field | Required contract |
| --- | --- |
| Identity | `schemaVersion: 1`, stable `id`, monotonically increasing `revision`, `type` = topic / exhibit / book / collection |
| Discovery | `title`, category ID, reviewed aliases, tags, one image and a short spoken label |
| Stages | Age range hint and support note; neither locks reading layers nor claims a validated reading level |
| Review | draft / in-review / approved, reviewer identity, ISO date, scope; approved additionally needs factual and family reviewer identities |
| Sources | Title, exact HTTPS source, accessed date; frozen revision ID for adapted reference text |
| Sensitivity | Explicit array, including an empty array when reviewed and none found; body, disasters, predation, health, culture and safe activity notes are intentional editorial decisions |
| Rights | Text/edition rights plus **separate rights for every image and every recording**: license/version, creator, source URL, offline credit and modification note; CC content also has a local license file |
| Images | Local file, useful alt text, rights, SHA-256 for imported raster assets. Derivatives carry original credit and list crops/resizing |
| Spoken text | Stable sentence ID, visible transcript, speech key, explicit audio record. Ready audio has local file/hash, transcript hash, creator/license, reviewer and review date |
| Topic | Nonempty sentence arrays for `tell`, `more`, `deep`; sentence replay uses the same transcript as the recording |
| Exhibit | Engine ID and scientific/model limits; authored links. State must use pure engine rules in the build phase |
| Book | Exact edition, language, ISBN, original title, edition rights; ordered image/transcript page records; wordless pages explicitly contain an empty transcript array |
| Collection | Explicit ordered member IDs, reviewed label/image, no computed “safe” inclusion based on one keyword |
| Links | Typed `item`, `legacy-topic`, `game` or `make` destinations and an action label describing the result; never unrestricted URLs or “Learn more” |

The future 8+ Reference shelf is a **separate, grown-up-enabled package**, off by default. Reserve bundle ID/version, frozen source revision and contributor attribution, complete license text, changes, per-image rights and an approved link allowlist. CC BY-SA text must retain its applicable license and remain separate from original app code/content. No wiki dump, online renderer, runtime fetch or automatic screening-to-publication path is implemented here. Store/distribution review of licensing remains a separate gate.

## Authoring and admission pipeline

1. Choose a question from the collection plan. Assign stable ID, primary sources, observation/making outcome, category, aliases, stage and sensitive notes.
2. Write original layers. Starting bands: Tell me about 20–45 words in short meaningful sentences, More about 60–120, Deep about 120–220. These are editing aids, not rigid minimums or reading-grade certification. The prototype deliberately uses a shorter worked example to test the interaction.
3. Acquire or make each asset. Record original file URL, checksum, creator, rights, local credit and changes before using it. Source facts do not license source images. Do not assume a book’s license also covers a separate audio producer’s recording.
4. Review factual meaning and links, then family suitability. Complete the checklist below. Drafts remain drafts; agent source checks do not replace Leon’s family/editorial approval.
5. Register exact label and sentence transcripts in `scripts/learn/library.json`, following the existing `scripts/learn/<slice>.json` convention. `scripts/learn/library.stage` explicitly keeps this design registration out of the shipped manifest/receipts. `python3 scripts/generate-audio.py --manifest --include-staged` previews the combined transcript map without generating audio. The lead removes the staging marker only after approval and regeneration/review of the warm/calm banks and receipts, then attaches ready recordings. Do not synthesize narration or use speech recognition at runtime. Stop/release audio on navigation, sound off, background, route blur and unmount; reuse preloaded players rather than replacing a file on every tap.
6. `npm run library:validate` checks all design records, including mandatory rights, review fields, transcript registration, explicit audio readiness, image files/hashes, layer presence and internal graph targets. Drafts may carry an explicit pending recording reason. Missing audio declarations fail even on drafts. Approved records may not have pending audio.
7. `npm run library:validate:shipping` rejects every draft/unreviewed item and every missing/unreviewed recording. **It intentionally fails on this design collection.** In the production integration, run this before selecting/packaging Library content; never weaken it to ship the fixture. Existing Explore remains independently ship-ready under its existing pipeline.
8. `npm run library:index` builds the deterministic local search JSON using `src/library/search.ts`. Web export runs validation and index generation. Full check covers lint, TypeScript, all tests and the web export.

The validator enforces declared provenance, paths and hashes, not whether a voice sounds kind or a fact is true. Audible review and full decoding/receipt checks in the established speech pipeline remain required. This prototype records no third-party book audio. The offline CC BY 4.0 license is included; original text and vector work have their own rights marker. The eleven candidate books below are a selection plan, not eleven imported/approved editions.

### Review checklist for age seven

- Is each claim supported by an exact source, and is the explanation accurate without misleading simplification? Label models, maps, predictions and uncertain claims.
- Can a seven-year-old understand the question and first action? Read the prose aloud; explain technical words. Check phonics/irregular vocabulary with the reading-content owner before calling anything decodable.
- Does More/Deep add meaning rather than repeat Tell me? Can any child choose any available layer without a test or reward?
- Inspect every picture, alt text, caption, page, greeting, source title, linked destination and activity response. Check frightening imagery, medical/cultural claims, predation and disasters in context.
- Check safe participation: no breath-holding challenge, wildlife touching, unsafe water/electric experiments or current-warning claim. CHamoru words require the separate HåfaGPT source-backed workflow.
- Verify exact edition, each illustration and recording license; keep offline credits; distinguish our changes. Do not import an attractive online recording without its own permission.
- Hear every recorded sentence in both promised voices, including names/greetings and sentence boundaries. Sound off must retain the text and clear recovery.
- Follow all authored links under each child’s collection choices. Search, related links, recents, shelf and restored/direct routes must apply the same availability policy.
- Read with large text and VoiceOver, turn pages without swiping, stop midway, return and recover a save failure. Family review must include Stassie’s independent discovery and a caregiver-led little-one interaction.

## Offline search and visibility

`content/library/categories.json` supplies eight pictured Wonder categories and the separately controlled Picture books collection. Category/label audio is registered independently. `search-aliases.json` is editorial input; `search-index.json` is a build artifact checked into this design branch for review. The design index covers the existing topic catalogue with the worked turtle entry substituted for the old turtle search card; original turtle content is untouched.

Ranking is deterministic: exact title word/alias (100), prefix (80), bounded edit distance (60), conservative phonetic key (40); stable ID breaks ties. All query words must match. Query input is bounded to 120 characters/eight words; edit allowance is one for words of 4–6 letters, two for longer words. Phonetic matching begins at four characters and needs three consonants, reducing accidental vowel matches. “dolfin” is an explicit reviewed dolphin alias; “dophin” exercises typo matching. This is a deliberately small English prototype, not a claim to understand every child spelling or CHamoru pronunciation. Expand from a reviewed family misspelling fixture set.

The index is local JSON; there is no cloud query, microphone, query logging or fabricated answer. Picture categories work without typing. No result offers a kind recovery and a direct return to pictures. Exact terms/aliases rank above approximate matches. Production indexing must include reviewed layer vocabulary, book metadata, category aliases and approved collection membership, with incremental output-size tests. This foundation indexes titles, tags and aliases; full-text layer indexing remains a build task.

Apply availability **before ranking**, and again at destination resolution. Do not leak hidden titles in suggestions, recents or shelf. `availability.ts` contains the shared pure filter used by the prototype. Hiding a collection never deletes saved IDs, creations or book positions; re-enabling reveals them. The build should use one typed destination registry to validate legacy/game/Make links against actual exported registries; this phase checks internal Library IDs and has explicit previews for the existing destinations.

## Per-child controls and hours

Use existing local learners without requiring a birth date. All controls sit behind the existing grown-up multiplication gate; no new account or weaker gate is introduced. The study calls the same pure `makeGate` / `gateAccepts` engine as Settings. It does not claim the existing light gate is tamper-proof device management.

Preview lists show actual items plus sources, sensitivity and review status. Availability changes apply to browse/search/links/shelf/direct routes consistently. Availability and listening preference are separate: hearing a complex available topic does not require passing a reading test. Keep collection revisions visible to adults so an update cannot silently broaden a previously approved shelf.

Hours default off. The build must store a validated local schedule with timezone policy and an adult override. Warn gently, confirm durable saving first, then pause new launches at a safe stopping point. Offer “finish this page” according to adult policy. If saving fails, keep work in memory, preserve the prior data and show Retry/recovery; never cover the error with a successful wind-down. Test overnight windows, clock/timezone changes, travel, suspension, restart and switching children. No reading countdown, push reminder, penalty or distressed pet follows an ended session. The prototype’s wind-down is an explicitly labeled memory-only sketch, not a scheduler or save implementation.

## Size and performance budget

Planning numbers, incremental to the measured base app; decimal MB, no video/3D scans:

| Asset | Assumption | Budget |
| --- | --- | ---: |
| Topic text / review / index | 150 × 8 KB plus index/provenance | 3 MB |
| Wonder art | 150 × 2 × 100 KB | 30 MB |
| Topic narration | 150 × 180 seconds × 48 kbit/s ÷ 8, per voice | 162 MB |
| 15 books: art | 15 × 16 spreads × 140 KB | 33.6 MB |
| 15 books: narration | 15 × 240 seconds × 48 kbit/s ÷ 8, per voice | 21.6 MB |
| Three exhibits | 3 × 4 MB | 12 MB |
| Credits / headroom | metadata, alternate sizes, small effects | 25 MB |
| Total one voice / two voices | rounded | 287 MB / 471 MB |

These are targets to measure, not measured installed sizes. Proposed incremental hard planning cap: 500 MB for two voices; reconsider voice duration or art before exceeding it, rather than adding required downloads. Packaging, installation/update copies, existing app assets and family creations are excluded and need their own device measurement. This fixture intentionally retains about 10 MB of original book JPEGs for rights fidelity; optimize derived sizes with recorded changes only in the build phase.

On iPad mini 6, decode only current/next book spreads at a capped pixel size; release offscreen decoded images and inactive audio players. Prefer static vectors and calculations. Search index should remain under 1 MB at 150 items and return within a measured 50 ms on that device; book changes and shelf return should feel immediate. Establish cold-open time, peak memory, thermal and presented-frame measurements on the actual hardware, not desktop browser estimates. No measured iPad performance is claimed here.

## Migration without loss

`src/library/legacy.ts` is a read-only migration proposal. It copies all fifty `ExploreTopic` payloads under `original`, retains stable IDs and original source/review/rights/narration references, and proposes new category membership. Tests prove copying does not mutate input. It does not write a save, alter Explore or approve a Deep layer.

Production migration order:

1. Retain the existing Explore catalogue and versioned save intact. Export/backup and preserve the original on-disk record before any replacement. Add the Library save as a new versioned section; validate before committing atomically.
2. Map old stable topic IDs directly. Existing `short` becomes an initial Tell me candidate; `deeper` becomes More candidate; `question` remains the activity prompt. Deep is **missing**, not a relabeled old paragraph. Author/review/record new layers before shipping them.
3. Keep every original title, explanation, prompt, illustration motif, source and review field in a migration ledger. Existing full-topic narration remains available during transition; do not pretend it supplies sentence alignment for new layers. Retain all five lab engines and validated saved lab states.
4. Copy favorites, current topic, query/filter, scroll positions and bounded history with the stable-ID map. Preserve unknown/retired IDs in recovery, not silent deletion. A missing or hidden destination returns to the nearest available parent with an explanation and retains the original location for later recovery.
5. Compare old/new payloads and backup round trips; test all fifty links/favorites and all five labs, interruption, restore and re-enable behavior. If validation fails, leave the old section active and preserve the candidate/original for recovery. Migrations never mutate their inputs.
6. Fit the 150-question plan around existing reviewed topics. Matching questions inherit the old ID after editorial review; unmatched old topics stay available, even if that temporarily exceeds 150. The count is a planning guide, not a reason to delete content.

## Three exhibits to build first

| Exhibit | Child action and useful result | Limits / links |
| --- | --- | --- |
| Living reef | Add/remove one organism or change a water-condition control; compare two saved observations | A small authored relationship model, not a real forecast. Begin with existing food-chain rules; show why real food webs are more complex. Links: coral, parrotfish, seagrass, turtle breathing, Make a reef book. |
| Weather workshop | Move one drop through evaporation/cloud/rain/soil/ocean; choose a branch and compare paths | Build on the existing water-journey engine, not a duplicate. No live storm warning or deterministic typhoon forecast. Links: clouds, rain, forecasts, safe grown-up preparation, Make a weather page. |
| Our night sky | Turn Earth, change a model date/time and inspect why the visible sky changes | Reuse day/night rules; label simplified scale and orientation. A fixed Guam viewpoint first; no camera/location permission required. Links: Moon, shadows, stars, telescope, Make a constellation story. |

The turtle breathing sketch demonstrates a small connection inside the reef exhibit, not a fourth full exhibit.

## First collection plan

`content/library/collection-plan.json` contains 150 titles only, across eight categories. These are proposals, not written or reviewed production articles. Guam cultural/local-history topics need appropriate local review; body/weather topics need careful scope. No new CHamoru term has been authored. The following appendix is generated from that plan.

### Ocean & Reef

1. How do sea turtles breathe?
2. What is a coral reef?
3. Why is the sea salty?
4. How do dolphins breathe?
5. Why do waves roll in?
6. What makes the tide rise?
7. Who lives in a tide pool?
8. How does a fish breathe?
9. Why do crabs have shells?
10. What do parrotfish eat?
11. Can an octopus change color?
12. What is a food web?
13. Where does beach sand come from?
14. Why are mangroves important?
15. What lives in the deep sea?
16. How do jellyfish move?
17. Why do whales sing?
18. How do seagrasses grow?
19. How can we care for the reef?

### Guam & Our Island

1. Where is Guam?
2. How was Guam made?
3. What is limestone?
4. What is a latte stone?
5. Who is the ko’ko’?
6. What is a limestone forest?
7. Where does our drinking water come from?
8. Why are some beaches sandy?
9. What grows in a mangrove forest?
10. What is a village?
11. How do maps show our island?
12. What is the Mariana Trench?
13. What lives in a Guam river?
14. What is a coconut crab?
15. Why are native trees important?
16. How do we care for our beaches?
17. How do islands connect by ocean?
18. What can we notice on a family walk?
19. What makes our island home?

### Animals

1. Why do butterflies change shape?
2. How do birds fly?
3. Why do bats come out at night?
4. How do geckos climb?
5. Why do spiders spin webs?
6. How do ants work together?
7. What is an animal habitat?
8. Why do animals hide?
9. How do baby animals grow?
10. Why do some animals migrate?
11. How do bees help flowers?
12. Can animals hear different sounds?
13. How do snails move?
14. Why do birds build nests?
15. How do frogs change as they grow?
16. What is a mammal?
17. What is a reptile?
18. How do animals stay cool?
19. How can we watch animals kindly?

### Space & Sky

1. Why do we have day and night?
2. Why does the Moon change shape?
3. What is a star?
4. Why do stars look tiny?
5. What is the Sun?
6. What is a planet?
7. Why does Earth go around the Sun?
8. What keeps us on the ground?
9. What is a shadow?
10. Why do we have seasons?
11. What is a constellation?
12. Why does the sky look different at night?
13. What is a telescope?
14. What is the Milky Way?
15. What are Saturn’s rings?
16. Why is Mars red?
17. What is a comet?
18. How do astronauts live in space?
19. How does a rocket move?

### Weather & Earth

1. How does a cloud form?
2. Why does it rain?
3. Where does rainwater go?
4. What makes wind?
5. What is a rainbow?
6. Why does thunder rumble?
7. What is a typhoon?
8. How do forecasts help us?
9. What is the water cycle?
10. Why does ice melt?
11. What is evaporation?
12. Why does a puddle dry up?
13. What is a volcano?
14. Why do earthquakes happen?
15. How do rocks change?
16. What is soil made of?
17. How do rivers shape land?
18. What is weather and what is climate?
19. How can we prepare together?

### My Body

1. Why do we breathe?
2. What does the heart do?
3. How do our bones help us?
4. How do muscles move us?
5. How do we see?
6. How do we hear?
7. How do we smell?
8. Why can we taste food?
9. How does skin protect us?
10. Where does food go?
11. Why do we need water?
12. Why do we sleep?
13. Why do teeth fall out?
14. How do cuts heal?
15. What are germs?
16. Why do we wash our hands?
17. How can we name our feelings?
18. How do we grow?

### How Things Work

1. How does a wheel help?
2. What is a lever?
3. How does a ramp help us lift?
4. How do gears turn together?
5. How does a pulley work?
6. Why do boats float?
7. How do airplanes stay up?
8. How does a bicycle move?
9. How does a flashlight work?
10. What is an electric circuit?
11. How do magnets pull?
12. How does a switch work?
13. How do we measure length?
14. How do we measure time?
15. How does a camera make a picture?
16. What is a computer instruction?
17. How do bridges hold weight?
18. Why does a ball bounce?

### Plants & Food

1. What does a seed need?
2. How do roots help a plant?
3. Why do leaves need sunlight?
4. How do flowers make seeds?
5. How do seeds travel?
6. What is a fruit?
7. Which plant parts do we eat?
8. How does a coconut grow?
9. What grows in a garden?
10. Why do bananas grow in bunches?
11. How does rice grow?
12. What is breadfruit?
13. What is a food chain?
14. Why do leaves fall?
15. What do worms do in soil?
16. What happens in compost?
17. How do we keep food fresh?
18. How can we grow herbs?
19. Why do plants have different leaves?

## First book shelf: eleven candidate English editions

Use the linked publisher edition, not a similarly titled third-party adaptation. All eleven title pages were retrieved on 2 November 2026; Book Dash’s [source-file policy](https://bookdash.org/book-source-files/) identifies CC BY 4.0 and requires creator and publisher credits. The [license](https://creativecommons.org/licenses/by/4.0/) is bundled locally for the imported fixture. Each candidate still needs a frozen edition, per-file manifest, full-page review and a separately cleared recording. No audio is assumed licensed from a book title page.

| Candidate and exact source | License | Editorial role / outstanding review |
| --- | --- | --- |
| [A very busy day!](https://bookdash.org/books/a-very-busy-day/) | CC BY 4.0 | Town/family; complete fixture imported, family/audio approval pending |
| [Sleepy Mr Sloth](https://bookdash.org/books/sleepy-mr-sloth/) | CC BY 4.0 | Animals; rhyming shared reading |
| [A Tiny Seed](https://bookdash.org/books/a-tiny-seed/) | CC BY 4.0 | Plants; biography/context and environmental sensitivity |
| [A Fish and a Gift](https://bookdash.org/books/a-fish-and-a-gift/) | CC BY 4.0 | Ocean/family; complete edition review |
| [A Beautiful Day](https://bookdash.org/books/a-beautiful-day/) | CC BY 4.0 | Shared looking; complete edition review |
| [The best thing ever](https://bookdash.org/books/the-best-thing-ever/) | CC BY 4.0 | Making/creativity; complete edition review |
| [Where is Lulu?](https://bookdash.org/books/where-is-lulu/) | CC BY 4.0 | Independent choice; complete edition review |
| [My Dream in the Drawer](https://bookdash.org/books/my-dream-in-the-drawer/) | CC BY 4.0 | Imagination; complete edition review |
| [Grandpa Farouk’s Garden](https://bookdash.org/books/grandpa-farouks-garden/) | CC BY 4.0 | Gardening; complete edition review |
| [A house for Mouse](https://bookdash.org/books/a-house-for-mouse/) | CC BY 4.0 | Animal homes; complete edition review |
| [Little Ant’s Big Plan](https://bookdash.org/books/little-ants-big-plan/) | CC BY 4.0 | Planning; story versus animal facts |

StoryWeaver CC BY 4.0 editions are supported by the schema and remain another acquisition source. The first shortlist uses one publisher to reduce edition/credit ambiguity; it does not authorize bulk importing StoryWeaver or assume every recording there has matching rights. Reader publication must retain visible offline credits and license notices and preserve licensed reuse rights. This phase does not decide public-store distribution compliance.

## Next-phase effort and approval decisions

Estimates are focused person-days, not a delivery commitment, and assume the existing Explore/lab/audio infrastructure is retained.

| Engineering work | Range |
| --- | ---: |
| Production content/destination registry, validators, packaging, search, picture/audio entry | 8–12 |
| Native reading/book reader and accessible sentence audio lifecycle | 8–12 |
| Versioned per-child shelf, backups, immutable migration/recovery and return context | 6–10 |
| Parent preview/availability, safe hours/wind-down and route policy | 7–11 |
| Three polished exhibits using current engines where possible | 12–18 |
| Free drawing/page/book maker and source links | 10–16 |
| Native performance/accessibility, offline, family QA and fixes | 8–12 |
| Engineering total | 59–91 |

| Content / review / audio work | Range |
| --- | ---: |
| Reconcile existing 50 and author the remaining title plan, three layers and authored links | 30–45 |
| Fact, local/cultural and age-seven editorial/family review; corrections | 20–35 |
| Wonder illustrations, diagrams and three exhibit explanations | 15–25 |
| Eleven–fifteen book editions: acquisition, per-file rights/transcripts/alt text and review | 8–15 |
| Generate, align, hear/review two voice banks and repair pronunciations/receipts | 15–25 |
| Content/review/audio total | 88–145 |

Several people can overlap independent work after the first complete end-to-end native slice is approved. Do not multiply 150 articles before validating the first child discovery/read/listen/make/keep/return journey. Content/review capacity is the largest schedule risk; two voices and three layers dominate size and audio review. Rights/edition mismatches, missing pronunciation expertise, decoded-image memory and interrupted-save handling are separate risks.

Lead decisions: approve the four-place IA and visual direction; choose one or two promised voices and the size cap; assign factual, family, local-cultural and reading-content reviewers; approve the first book shortlist and complete-fixture treatment; choose schedule/override semantics; decide whether the first production slice includes the full maker or links to a smaller existing creation tool. Public release and the later Reference shelf remain separate gates.
