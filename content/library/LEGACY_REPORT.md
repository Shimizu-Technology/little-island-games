# Explore → Little Island Library: legacy content handoff

All 50 existing Explore topics have draft Library records with their original stable IDs. This is a content-only authoring handoff for parent integration, not factual approval, family acceptance, a release, or a save migration.

Base: `c934137649d08d1bb72797a1d80087f6275358a6`, branch `t3/migrate-explore-library-content`, 2 November 2026. The branch/worktree were already isolated and clean at start. No delegation, PR, push, merge, runtime server, browser tab, simulator, native build, dependency change, audio generation, or public publication is part of this task.

Product brief: private offline family discovery for a seven-year-old, with shared listening welcome and no validated reading-level claim. The source of intent is the supplied `v3/COMMON.md`, `docs/PRD.md`, `docs/QA.md`, `docs/ISLAND_LIBRARY.md`, and external `v3/library/REPORT.md` and `DECISIONS.md`. The current task-specific brief overrides the common push/full-gate directions. Acceptance for this slice is 50 complete three-layer drafts, exact original payload/source/review preservation, valid content fragments and speech mappings, local art and rights, and a local commit. The parent owns 40 new titles, books, exhibits, runtime integration and the combined gate.

## Deliverables and counts

- `legacy-items.json`: 50 topic records; no ID renamed or replaced with the design fixture’s `turtle-breath` ID.
- Layers: 150 Tell sentences, 261 More sentences, 466 Deep sentences (877 total). Tell has at most three short sentences per topic. More forms one paragraph of preserved explanation and elaboration; Deep adds causal/comparative explanation and model limits.
- Tell ranges from 11–23 words, More 42–89 words, Deep 110–131 words. These describe text length, not a certified grade level or phonics assessment.
- legacy-speech.json: 1295 unique exact transcripts. Includes 50 question-title labels, all layer sentences, 233 action links, the original prompts split into replayable sentences, and image descriptions. Every companion sentence record is explicitly pending.
- `legacy-provenance.json`: 50 keyed envelopes containing every complete original `ExploreTopic`, original asset-registry metadata, historical review, exact sources, original full-topic narration and speech key, sentence retention mappings, editorial category/art/link mappings, source-access evidence, safety notes, and pending speech records for links/prompts/image descriptions.
- `art/legacy-<original-id>.svg`: 50 standalone static SVG exports, 53,863 bytes together. Each item includes its image SHA-256 and separate image rights. No source photo, source illustration, font, or third-party artwork was imported.
- 73 distinct exact primary-source URLs across the records, including every original URL. All access/attempt dates are 2026-11-02. Historical source titles and URLs remain intact in each original payload.
- 37 records have explicit sensitivity notes. All ten original Guam & Our World records are flagged for culture/context review, including map and naming conventions; weather/body/predation/wildlife/sun-safety flags appear where relevant. No new CHamoru term was added.

## Retention and editorial decisions

All 297 original short/deeper explanation sentences remain verbatim, in order: the complete original `short` starts More, and the complete original `deeper` starts Deep. Safety qualifications have not been removed; selected ones are also repeated in More or Tell. The full original title, activity question, illustration name, related IDs, sources, world and review fields remain in provenance. Each retained explanation sentence maps to its exact new destination sentence ID.

The new `label.text` is always the exact question title. It is never a noun such as “Turtle.” All new IDs and speech keys use `library-<topic>-<layer>-<n>`; companion labels use `label`, `link`, `prompt` and `image` as the layer component. All audio remains pending independent review, then the existing warm neural generation/review/receipt pipeline. Original complete-topic narration is preserved as a reference, not misrepresented as audio for the new sentence boundaries. Lightning retains the corrected `science-v25-explore-lightning` reference and must not use the older unsafe clip.

All original related IDs have authored `item` links. Additional exhibit links use only the parent-owned `reef-food-web`, `water-journey`, and `night-sky` IDs. Game links use existing `memory` or `maze` IDs and do not promise a topic-specific pack. Every Make link targets `wonder-page`; its original question is retained with prompt speech in `editorialMapping.activity`, ready to offer as an optional idea. Old lab names remain in original prose for lossless retention; the parent must preserve the five lab engines and resolve their upgraded destinations.

Oceans maps to Ocean & Reef. Space, Animals and Weather retain their corresponding categories. Seven Guam/world topics map to Guam & Our Island; mountains, rivers and volcanoes map to Weather & Earth. Their original world membership remains intact in the ledger. Age hints are `[5,13]` on every item, with explicit shared-listening and unvalidated-reading support.

The SVG exporter evaluates only the existing `Motif` JSX with standard SVG primitives and reproduces the `TopicArt` background and composition. It converts React Native SVG rotation/origin pairs to standard SVG transforms, adds a descriptive title and retains shapes/colors. No `src` file changed. Per-topic motif and source/output hashes are in provenance. Generic island/globe/compass pictures are explicitly illustrative, not accurate geography, a navigation chart or a live instrument. The source’s habitat turtle and insect-flight butterfly are retained as examples, not claims about every habitat or flying insect.

## Review and source-access limits

Every new item has `review.status: draft` and reviewer `Codex content author (drafted; independent factual and designated family reviewer family review pending)`. There is no factualReviewer or familyReviewer assignment. Author consultation does not satisfy the independent factual pass, designated family reviewer’s sensitive/local-cultural pass, reading-content review, or audio review. Model analogies and new definitions also require that independent sentence-level pass. No source quotation or external image is copied into the new elaboration.

Some primary URLs could not be read directly. They remain in the source list and complete original payload. `sourceEvidence` distinguishes opened pages, failed attempts and primary-publisher search extracts; its access date is not a claim that every direct fetch succeeded. Specific follow-up:

- [Smithsonian: Bat Facts](https://www.si.edu/spotlight/bats/batfacts): direct-open-404; publisher-search-extract-available. Primary publisher search returned the original text; new wing/echo elaboration also uses opened NPS pages.
- [Smithsonian: Butterflies](https://avpreservation.si.edu/spotlight/buginfo/butterfly): direct-open-timeout. Retained unchanged; opened Smithsonian Butterflies and Beyond and NPS monarch page as additional evidence.
- [Smithsonian Gardens: Pollination](https://gardens.si.edu/gardens/pollinator-garden/why-what-when-where-who-how-pollination/): direct-open-500. Retained unchanged; alternative Smithsonian Garden page also failed directly but its primary publisher search extract was available.
- [Smithsonian Gardens: Pollinator Garden](https://gardens.si.edu/gardens/pollinator-garden/): primary-publisher-search-extract. Pollen transfer between anthers and stigmas; direct page returned server error, publisher search extract consulted.
- [Smithsonian: Insect Flight](https://www.si.edu/spotlight/buginfo/insect-flight): direct-open-404. Retained unchanged; publisher mirror search extract and opened NC State entomology source used.
- [NOAA: What Causes Wind?](https://www.boulder.noaa.gov/video/what-causes-wind/): direct-open-timeout. Retained unchanged; opened NOAA NESDIS wind explanation instead.
- [USGS: Geology of Guam](https://pubs.usgs.gov/pp/0403a/report.pdf): direct-open-403; publisher-search-extract-available. Preserve exact historic PDF URL; publisher search extract and USGS Guam project extract corroborate geology.
- [USGS: Coral Reef Project — Guam](https://www.usgs.gov/centers/pcmsc/science/coral-reef-project-guam?page=1): primary-publisher-search-extract. Northern limestone plateau, southern volcanic hills and land-to-reef sediment connections. Direct page timed out; publisher search extract consulted.
- [USGS: Rivers, Streams, and Creeks](https://www.usgs.gov/water-science-school/science/rivers-streams-and-creeks): direct-open-timeout; publisher-search-extract-available. Publisher search extract confirms joining tributaries and downhill flow; independent review should inspect complete text.
- [USGS: This Dynamic Planet](https://pubs.usgs.gov/imap/2800/): direct-open-403. Retained unchanged; USGS Dynamic Planet search extract and map-projection FAQ extract consulted.
- [USGS: How are different map projections used?](https://www.usgs.gov/faqs/how-are-different-map-projections-used): primary-publisher-search-extract. A flat map cannot preserve every property of a globe. Direct page timed out; publisher search extract consulted.
- [USGS Lessons on the Lake: Cartographic Information](https://pubs.usgs.gov/of/1998/of98-805/lessons/chpt1/act3-hnd.htm): primary-publisher-search-extract. Large-scale maps show more detail over less area; graphic scale relates map and ground distance. Direct open returned 403, primary publisher search extract consulted.
- [USGS: Volcanoes](https://pubs.usgs.gov/gip/volc/nature.html): direct-open-403. Retained unchanged; companion About Volcanoes page opened successfully.

The remaining bibliography entries opened as primary pages, with author consultation only. A transient later timeout does not erase an earlier successful page read. Source excerpts may omit parts of a page; independently re-check support for each retained and added sentence before marking review complete. In particular, the continent naming convention and map/plate distinction, the pollination explanation, and historic PDF references deserve a full-source reread.

## Verification

Agent-executed fragment checks passed against the base source above: JSON parsing; exactly 50 ordered original IDs and 50 provenance keys; deep equality of every original payload; all 297 old explanation sentences retained verbatim; original source titles/URLs, prompt, review and narration retained; schema fields and category membership; Tell ≤3 sentences; every Deep ≥100 words; no duplicate/missing/stale speech IDs; exact question labels; pending audio; local art hashes; all original related links retained; all game/Make targets valid; and all item links resolve within the 50 topics or the three declared parent exhibits. No shipping admission is claimed from a fragment check.

All 50 SVGs parsed as XML and rendered with `rsvg-convert`; no external references, script elements or React Native-only rotation/origin attributes remained. The author inspected the full 50-image contact sheet at `/tmp/little-island-legacy-art-qa/contact.png`. Individual rendered PNGs are in that directory. This is static asset inspection, not an application or native UI check.

Typecheck/lint: final result recorded below. The first attempt temporarily borrowed the main checkout’s installed dependencies after confirming identical lockfile hashes. That borrowed dependency setup was not a reliable gate: typecheck reported gesture type incompatibilities in unchanged `src/home/Drag.tsx` and `HouseCamera.tsx`, and lint could not resolve four existing `react-test-renderer` imports. The borrowed link was removed; task-local `npm ci` installed the exact lockfile for the final retry. No shared dependency tree was changed.

The parent must merge the 50 records into its catalogue, merge the exact speech map into `scripts/learn/library.json`, resolve its three exhibit IDs and maker registry, preserve the pending/draft gates, then run the combined validator, `npm run check` and Doctor. Stock validation is not claimed for the unintegrated fragment: it intentionally reads the active speech file and requires a complete internal destination graph. Full combined check, runtime interaction, saved favorites/history migration, offline narration, native, VoiceOver and physical family acceptance were not executed by this content worker.

## Item ledger

Each entry below records all retained explanation text. Exact original prompts, related IDs, source/review payloads and sentence IDs are in the matching provenance key. Bibliography numbers refer to the exact URL list after the ledger. Safety notes are author flags for designated family reviewer, not approval.

### sun — Is the Sun a star?

Category: space. Motif: sun. Sources: [1].

Retained short: Yes! The Sun is our nearest star. It sends light and warmth across space to Earth. Other stars look much smaller because they are so far away.

Retained deeper: Deep inside the Sun, tiny particles join together and release energy. The Sun is a huge ball of very hot material, not a burning campfire. Never look straight at the Sun.

Safety/review flags: sun safety: Keep the explicit warning against looking directly at the Sun in every reading path; illustration is not a viewing guide.

### moon — Why does the Moon change shape?

Category: space. Motif: moon. Sources: [2].

Retained short: The Moon stays round. We see different amounts of its sunlit half as it travels around Earth. These changing views are called phases.

Retained deeper: The Moon does not make its own light. Moonlight is reflected sunlight. The familiar monthly phases are not caused by Earth's shadow; a shadow on the Moon is a lunar eclipse.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### day-night — What makes day and night?

Category: space. Motif: earth. Sources: [3], [4].

Retained short: Earth spins. Your part of Earth has day when it faces the Sun and night when it faces away. One full turn takes about 24 hours.

Retained deeper: Earth also travels around the Sun, but that journey takes about a year. Turning and traveling are different motions. The day-and-night lab lets you turn a marked spot into and out of sunlight.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### planets — Who is in our solar system?

Category: space. Motif: planets. Sources: [5].

Retained short: Eight planets travel around the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. Earth is the planet we call home.

Retained deeper: The solar system also includes moons, asteroids, comets, and dwarf planets such as Pluto. The planets are very far apart. A picture that fits them all on one page usually changes their sizes or distances.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### mars — Why is Mars red?

Category: space. Motif: mars. Sources: [6].

Retained short: Dust and rocks on Mars contain iron minerals. Those minerals have reacted with oxygen, giving much of the surface a rusty red color.

Retained deeper: Mars has a thin atmosphere and is cold. Robot explorers study its rocks for clues about its past. Evidence shows that liquid water once flowed on parts of Mars; that does not mean people can breathe there.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### saturn — What are Saturn's rings?

Category: space. Motif: saturn. Sources: [7].

Retained short: Saturn's rings are made of many separate pieces, mostly ice with some rock and dust. They travel around the planet. They are not one solid hoop.

Retained deeper: Saturn is a giant planet made mostly of hydrogen and helium. Its rings look bright because they reflect sunlight. Other giant planets have rings too, though Saturn's are especially easy to notice in pictures.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### gravity — Why do things fall?

Category: space. Motif: gravity. Sources: [8], [9].

Retained short: Gravity is an attraction between things that have mass. Earth's gravity pulls us toward the ground. It also helps keep the Moon traveling around Earth.

Retained deeper: Gravity reaches across space. An orbiting spacecraft keeps falling toward Earth while moving forward fast enough to keep missing the ground. Astronauts floating in orbit have not escaped all gravity.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### stars — Are all stars the same?

Category: space. Motif: stars. Sources: [10].

Retained short: Stars are giant glowing balls of hot material. They come in different sizes, temperatures, and colors. Our Sun is one of the many stars in the Milky Way galaxy.

Retained deeper: Blue stars are hotter at their surfaces than red stars. A star that looks faint may simply be very far away. Stars are too distant for us to visit on a quick rocket trip.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### rockets — How does a rocket move?

Category: space. Motif: rocket. Sources: [11], [9].

Retained short: A rocket pushes gas out in one direction, and the rocket is pushed in the opposite direction. This push can lift a spacecraft from Earth.

Retained deeper: A rocket does not need to push against air, so it can work in space. Launching takes a lot of energy. Spacecraft can carry instruments that help us learn about planets, weather, and oceans.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### asteroids — What is an asteroid?

Category: space. Motif: asteroid. Sources: [12].

Retained short: An asteroid is a rocky object that travels around the Sun. Asteroids are much smaller than planets. Many orbit in the main asteroid belt between Mars and Jupiter.

Retained deeper: Asteroids are leftovers from the early solar system. They can be round or lumpy. Scientists study them to learn about the materials that helped form planets long ago.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### salty — Why is the ocean salty?

Category: ocean. Motif: salt. Sources: [13], [14].

Retained short: Rain and flowing water wear away rocks on land. Rivers carry some dissolved minerals into the sea. Openings in the seafloor add minerals too.

Retained deeper: When water evaporates from the sea, most salts stay behind. Ocean water contains many dissolved salts, not just the salt we sprinkle on food. Different places can have different saltiness.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### tides — Why does the shore move?

Category: ocean. Motif: tides. Sources: [15].

Retained short: The sea level rises and falls in a pattern called the tides. Gravity from the Moon and the Sun helps produce this movement.

Retained deeper: High tide and low tide change how much beach is uncovered. Tides are different from the small waves that break on the shore. Always explore a beach with a grown-up who checks local conditions.

Safety/review flags: water safety: Grown-up supervision and local tide, surf, and weather checks; no invitation to wade or approach a receding shore.

### waves — What starts an ocean wave?

Category: ocean. Motif: waves. Sources: [16].

Retained short: Wind blowing over water makes many of the waves we see. A wave carries energy across the water. It does not carry the same bucket of water all the way across an ocean.

Retained deeper: Water near the surface moves as the wave passes. Far from shore, that motion is often roughly circular. Some waves begin with other events, such as underwater earthquakes, rather than wind.

Safety/review flags: storms/disaster: Underwater earthquakes and hazardous waves; keep calm and do not imply this offline app supplies alerts. water safety: Model does not establish beach safety.

### coral — Is coral a plant or an animal?

Category: ocean. Motif: coral. Sources: [17].

Retained short: Corals are animals. Many live as groups of tiny polyps. Hard corals build skeletons that can become part of a reef, where many other animals find homes.

Retained deeper: Many shallow-water corals have tiny algae living inside them. The algae use sunlight to make food and share some with the coral. Coral is living and delicate: look without touching or standing on it.

Safety/review flags: body: Animal tentacles and tissue; predation: coral captures food from water. wildlife safety: Do not touch, stand on, remove, or collect coral.

### plankton — What drifts in the ocean?

Category: ocean. Motif: plankton. Sources: [18].

Retained short: Plankton are living things carried by currents because they cannot swim strongly enough against them. Many are tiny, but some, including certain jellyfish, are large.

Retained deeper: Phytoplankton use sunlight to make food. Zooplankton are animals, and many eat phytoplankton. These small drifters help feed much bigger ocean animals. Small does not mean unimportant.

Safety/review flags: predation: Small animals eating algae and being eaten; no graphic depiction.

### seagrass — Can grass grow under the sea?

Category: ocean. Motif: seagrass. Sources: [19].

Retained short: Seagrasses are flowering plants that grow in shallow seawater. Their leaves use sunlight, and their roots help hold them in the seabed. They are different from seaweed.

Retained deeper: Seagrass meadows provide hiding places and food for marine animals. Like plants on land, seagrasses need suitable growing conditions. Boats and trampling can damage a meadow.

Safety/review flags: wildlife safety: No trampling, collecting, or boat activity suggested. body: Plant reproduction includes flowers and seeds.

### deep-ocean — What happens deeper in the ocean?

Category: ocean. Motif: submarine. Sources: [20], [21], [22].

Retained short: The deeper you go underwater, the more water is above you. That increases the pressure. Deep-ocean explorers need equipment designed for this strong squeeze.

Retained deeper: Sunlight fades with depth, so the deepest water is dark. Special robots and submersibles help scientists explore places people cannot safely swim. Pressure is one reason exploring the deep sea is difficult.

Safety/review flags: water safety: No diving, pressure, or breath-holding experiment; specialist exploration only.

### octopus — What can eight arms do?

Category: ocean. Motif: octopus. Sources: [23].

Retained short: An octopus has eight arms lined with suckers. It can use them to explore and hold food. Most of its body is soft, so it can fit into surprisingly small spaces.

Retained deeper: Octopuses can change their skin's appearance to blend with their surroundings. They are relatives of squid and cuttlefish. A squid has eight arms plus two longer feeding tentacles; an octopus has eight arms.

Safety/review flags: body: Animal arms, suckers, skin, muscles and nerves. predation: Food handling; no graphic feeding scene. wildlife safety: Do not handle or imitate contact with an octopus.

### turtles — How does a sea turtle breathe?

Category: ocean. Motif: turtle. Sources: [24], [25].

Retained short: Sea turtles breathe air with lungs. They must come to the surface to breathe, even though they spend much of their lives in water. Their flippers help them swim.

Retained deeper: Green turtles often eat seagrass and algae as adults. Female sea turtles come onto beaches to lay eggs. Observe turtles from a distance and give them space; never chase or feed them.

Safety/review flags: body: Lungs, breathing, body fat and egg laying; designated family reviewer family review. wildlife safety: Distance, no chase/feed/touch, no blocking a nesting turtle. water safety: No breath-holding or underwater imitation.

### food-web — Who feeds whom in the sea?

Category: ocean. Motif: foodchain. Sources: [26].

Retained short: A food chain follows energy from one living thing to the next. Tiny algae can feed tiny animals, which can feed fish. Bigger animals may eat those fish.

Retained deeper: Real ocean meals form a food web, with many connections. Removing one kind of living thing can affect others. The activity shows one possible chain, not every animal's entire diet.

Safety/review flags: predation: Animals eating animals is central; calm language and non-graphic imagery. model limits: One possible relationship map, not a real ecosystem forecast.

### bats — Are bats birds?

Category: animals. Motif: bat. Sources: [27], [28], [29].

Retained short: Bats are mammals, not birds. They have fur and feed their babies milk. Their wings are thin skin stretched over long fingers, rather than wings covered in feathers.

Retained deeper: Many bats use echoes to find their way and catch insects. Other bats eat fruit or nectar and help plants. Bats are wild animals: watch without touching, and tell a grown-up if one is close.

Safety/review flags: body: Milk feeding, fur, finger bones, ears and skin. predation: Insect-eating bats; no graphic imagery. wildlife safety: No touching bats; tell a grown-up if one is close.

### butterflies — Where does a butterfly come from?

Category: animals. Motif: butterfly. Sources: [30], [31], [32].

Retained short: A butterfly begins as an egg, grows into a caterpillar, changes inside a pupa, and emerges as an adult butterfly. These stages look very different.

Retained deeper: Caterpillars mostly eat plants and grow before changing. Many adult butterflies drink flower nectar through a curled mouthpart. The tiny scales on their wings help create their colors.

Safety/review flags: body: Animal eggs, life stages and body transformation; no implication that all insects change identically.

### frogs — Why does a tadpole change?

Category: animals. Motif: frog. Sources: [33].

Retained short: Many frogs begin life as tadpoles in water. A tadpole grows legs and changes into a frog. Its body changes as it grows, including how it moves and breathes.

Retained deeper: Different frogs live in different ways. An African clawed frog remains very aquatic as an adult and has powerful swimming legs. A frog needs a suitable habitat, not just any puddle.

Safety/review flags: body: Animal development, breathing and limb changes. wildlife safety: Draw or observe from a distance; no handling, collecting, or releasing frogs.

### bees — How can a bee help a flower?

Category: animals. Motif: bee. Sources: [34], [35].

Retained short: When a bee visits flowers, pollen can stick to its body and travel to another flower. This helps many flowering plants make seeds. Moving pollen this way is called pollination.

Retained deeper: Flowers may offer nectar or pollen as food. Bees are not the only pollinators: butterflies, birds, and other animals can help too. Watch visiting insects without catching or disturbing them.

Safety/review flags: body: Plant reproductive parts and seeds; explain without adding human-body comparisons. wildlife safety: Do not catch, disturb, or approach stinging insects.

### camouflage — Can you hide in plain sight?

Category: animals. Motif: camouflage. Sources: [36].

Retained short: Camouflage helps an animal blend with its surroundings. Colors and patterns can make it harder for another animal to notice. A leaf-like insect or a patterned butterfly may be easy to miss.

Retained deeper: A pattern that hides well on one background may stand out on another. Some butterfly colors also warn predators instead of hiding the butterfly. Color can do more than one job.

Safety/review flags: predation: Hiding from and warning predators; no graphic imagery. body: Butterfly wing scales and color structures.

### dolphins — Is a dolphin a fish?

Category: animals. Motif: dolphin. Sources: [37].

Retained short: A dolphin is a mammal. It breathes air through a blowhole and feeds its calf milk. A fish usually gets oxygen from water through gills.

Retained deeper: Bottlenose dolphins make sounds and use echoes to help find food. They live in groups and eat animals such as fish and squid. Watch wild dolphins from a distance and never offer them food.

Safety/review flags: body: Breathing, blowhole and milk feeding. predation: Dolphins eat fish and squid; no graphic depiction. wildlife safety: Distance and no feeding or chasing dolphins.

### habitats — What makes an animal's home?

Category: animals. Motif: habitat. Sources: [38].

Retained short: A habitat is a place where a living thing can find what it needs. Animals need food, water, shelter, and enough space. Different animals need different combinations.

Retained deeper: A habitat can be a coral reef, a wetland, a forest, or many other places. A nest is only one part of a bird's habitat. The whole surrounding area must meet its needs too.

Safety/review flags: wildlife safety: Picture matching does not authorize moving animals or building captive habitats.

### migration — Why do animals travel far?

Category: animals. Motif: migration. Sources: [39], [31].

Retained short: Some animals move between places as seasons change. This is migration. They may travel to find food, raise young, or reach a suitable climate.

Retained deeper: Many North American monarch butterflies fly toward winter resting places. Their return journey involves later generations. A migration route needs useful stopping places as well as a destination.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### insect-flight — How do tiny wings fly?

Category: animals. Motif: wings. Sources: [40], [41].

Retained short: Many insects can fly, including bees, butterflies, and dragonflies. Moving wings push on the air and help support the insect. Wings come in many shapes and beat at different speeds.

Retained deeper: Insects are the only invertebrates with true powered flight. A butterfly's broad wings and a dragonfly's narrower wings work in different ways. Flying animals are not all close relatives.

Safety/review flags: body: Wings and backbone classification. wildlife safety: Paper design only; no collecting insects.

### bird-feathers — What are feathers for?

Category: animals. Motif: feather. Sources: [42].

Retained short: Feathers help birds in several ways. Flight feathers help shape wings and tails. Fluffy feathers trap air and help keep a bird warm. Not every bird can fly.

Retained deeper: Feathers have many tiny branches. Different shapes do different jobs, from insulation to steering. A penguin's wings help it move underwater. Look at wild feathers without collecting or touching them.

Safety/review flags: body: Feather anatomy and insulation. wildlife safety: Look without collecting or touching wild feathers.

### blue-sky — Why is the sky blue?

Category: weather. Motif: sky. Sources: [43].

Retained short: Sunlight contains many colors. Tiny molecules in the air scatter blue light strongly in many directions. Some of that blue light reaches your eyes from across the sky.

Retained deeper: Near sunset, sunlight travels through more air before reaching us. Much blue light has been scattered away, leaving more red and orange light. Never look straight at the Sun, even near sunset.

Safety/review flags: sun safety: Never look directly at the Sun, including at sunset; motif is symbolic.

### clouds — What is a cloud made of?

Category: weather. Motif: cloud. Sources: [44], [45].

Retained short: A cloud is made of tiny water drops, ice crystals, or both. Water vapor is an invisible gas. When enough vapor changes into little drops or ice, we can see a cloud.

Retained deeper: Air that rises often cools. If it cools enough, water vapor can condense onto tiny particles. Clouds have different shapes, and one cloud shape alone does not tell the whole weather story.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### rain — How does rain fall from a cloud?

Category: weather. Motif: rain. Sources: [46].

Retained short: Tiny drops in a cloud can join and grow. Ice particles can grow too and melt as they fall. When drops become large enough, they fall toward the ground as rain.

Retained deeper: Some falling rain evaporates before reaching the ground. Rain that reaches land can soak into soil or flow into streams. A cloud does not need to empty all at once.

Safety/review flags: water safety: Water journey is a model; no entering floodwater or collecting rain during a storm.

### rainbows — How does a rainbow appear?

Category: weather. Motif: rainbow. Sources: [47], [1].

Retained short: Sunlight bends as it enters a water drop, reflects inside, and bends again as it leaves. Different colors bend by different amounts, spreading the sunlight into a rainbow.

Retained deeper: A rainbow depends on where you stand. Usually the Sun is behind you and rain is ahead. Another observer sees light from different drops. A rainbow is not a solid arch you can walk up to.

Safety/review flags: sun safety: Never look directly at the Sun; any observation must face away from it. water safety: No outdoor observation during thunder or dangerous weather.

### wind — What is wind?

Category: weather. Motif: wind. Sources: [48], [49].

Retained short: Wind is moving air. Air moves in response to differences in air pressure. The Sun heats Earth's surface unevenly, helping create those differences.

Retained deeper: Land and water can warm at different rates. Near a coast, that can help create a sea breeze. Wind also moves clouds and transfers energy to the ocean's surface to make waves.

Safety/review flags: storms/disaster: Related typhoon link; no claim of live wind or safety forecast. weather safety: Retain original indoor or safely sheltered observation.

### lightning — Why does thunder rumble?

Category: weather. Motif: lightning. Sources: [50], [51].

Retained short: Lightning is a powerful electrical discharge. It heats the air very quickly, and the expanding air makes a sound wave called thunder. We see the flash before we hear the sound because light travels faster.

Retained deeper: Lightning can happen inside a cloud, between clouds, or between a cloud and the ground. If you hear thunder, tell a grown-up and go inside a substantial building. Watching from shelter is safer.

Safety/review flags: storms/disaster: Lightning can frighten children; calm safety wording and designated family reviewer family review. safety: Immediately tell a grown-up and enter a substantial building; stay away from windows. Never suggest watching from an open shelter, going outdoors, or timing thunder. legacy audio safety: Preserve corrected science-v25-explore-lightning key; older clip must not be reused.

### typhoons — Is a typhoon a hurricane?

Category: weather. Motif: storm. Sources: [52], [53].

Retained short: Both are names for the same kind of large spinning tropical storm. In the western North Pacific, including near Guam, this kind of storm is called a typhoon.

Retained deeper: Tropical cyclones draw energy from warm ocean water. Their winds and rain can be dangerous. This app is for learning, not live warnings: a grown-up should follow local officials and prepare early.

Safety/review flags: storms/disaster: Dangerous wind and rain, Guam context; designated family reviewer family review. culture: Regional storm naming and Guam context; no new cultural or CHamoru terms. safety: Offline education only, never current warnings; follow local officials and grown-up preparations.

### water-cycle — Where does water go?

Category: weather. Motif: cycle. Sources: [54].

Retained short: Water moves between the ocean, air, land, and living things. Liquid water can evaporate into vapor, condense into drops, and fall as rain. It can also freeze or melt.

Retained deeper: The water cycle has many paths, not just one circle. Some water soaks into the ground. Some flows down rivers. Water may stay in ice, soil, lakes, or oceans for very different lengths of time.

Safety/review flags: No specific sensitive content identified by author; independent factual and family review still pending.

### seasons — Why do seasons change?

Category: weather. Motif: seasons. Sources: [4].

Retained short: Earth's axis is tilted. As Earth travels around the Sun, different parts receive more direct sunlight and longer days. This helps cause the seasons.

Retained deeper: The northern and southern halves of Earth have opposite seasons. Seasons are not mainly caused by Earth moving closer to the Sun. Near the tropics, wet and dry patterns may be more noticeable than snowy winters.

Safety/review flags: sun safety: Globe or drawing model only; never look at the Sun. culture: Seasonal labels vary by location; avoid treating snowy four-season weather as universal.

### forecast — How do people predict weather?

Category: weather. Motif: forecast. Sources: [55].

Retained short: Weather scientists collect observations from the ground, balloons, satellites, and other tools. Computers help them use these observations to make a forecast: a prediction of what may happen next.

Retained deeper: A forecast is not a promise. Air and water are always changing, and predictions can change as new observations arrive. This offline app has no current forecast. Ask a grown-up for today's local weather information.

Safety/review flags: storms/disaster: No current forecast or warning; grown-up checks an official current source. safety: Imaginary weather station only; no launching balloons or placing tools outdoors in storms.

### guam — Where is Guam?

Category: guam. Motif: guam. Sources: [56], [57], [58].

Retained short: Guam is an island in the western Pacific Ocean. It is the southernmost island of the Mariana Islands. An island is land with water all around it.

Retained deeper: Guam has beaches, reefs, hills, and forests. Its northern limestone landscape and southern volcanic hills tell parts of its long geological story. People live, work, and care for these connected places.

Safety/review flags: culture: Guam place and identity; designated family reviewer local/family review. Natural history does not stand in for cultural history. art accuracy: Generic island motif is not an accurate Guam map. No new CHamoru terms.

### islands — How can land be an island?

Category: guam. Motif: island. Sources: [59], [60].

Retained short: An island is a piece of land surrounded by water. Some islands form through volcanic activity. Others grow or change through coral building, moving sediments, or changes in sea level.

Retained deeper: Many ocean islands are the tops of much larger landforms rising from the seafloor. An island's shore can change as waves, currents, and storms move sand and other material.

Safety/review flags: culture: Islands and Guam/world place context; designated family reviewer review, no new cultural claims or CHamoru terms. storms/disaster: Original mentions storms reshaping shores; not a safety forecast.

### reef — Why care for Guam's reefs?

Category: guam. Motif: reef. Sources: [17], [61].

Retained short: A coral reef is a living neighborhood. Fish and many other animals find food and shelter there. Reefs can also reduce some wave energy before it reaches shore.

Retained deeper: Reefs need suitable water conditions to thrive. Touching coral, leaving litter, and damaging habitats can harm living things. On a family visit, leave animals and coral where they are and follow local guidance.

Safety/review flags: culture: Guam reef stewardship and local guidance; designated family reviewer review. storms/disaster: Reefs reduce some wave energy; never a guarantee of storm protection. wildlife safety: Leave animals and coral in place; no touch, collecting, litter or trampling.

### trench — What is the Mariana Trench?

Category: guam. Motif: trench. Sources: [62], [63], [20], [64], [22].

Retained short: The Mariana Trench is a very deep part of the Pacific Ocean near the Mariana Islands. It forms where one of Earth's moving plates bends down beneath another.

Retained deeper: Its deepest known area is called Challenger Deep. The water there is dark and under enormous pressure. Deep does not mean lifeless: scientists use special equipment to investigate this ocean environment.

Safety/review flags: culture: Mariana place name and Guam/world geography; designated family reviewer review, no new CHamoru terms. water safety: Specialist vehicles only; no diving or pressure experiment.

### mountains — How can mountains grow?

Category: weather. Motif: mountain. Sources: [65].

Retained short: Earth's outer shell is divided into slowly moving plates. Where plates push together, rock can fold, break, and rise into mountains. Volcanoes can build mountains too.

Retained deeper: Mountains keep changing after they form. Rain, rivers, ice, and wind can wear rock away. Building and wearing down happen over long periods. A mountain is not always a volcano.

Safety/review flags: culture: World place context and Denali example; designated family reviewer review of naming/context. model safety: Gently fold scrap paper; no climbing or rock-breaking activity.

### rivers — Why do rivers wind toward the sea?

Category: weather. Motif: river. Sources: [66], [67].

Retained short: Rivers carry flowing water downhill under gravity. They collect water from rain, melting snow, springs, and smaller streams. Many eventually reach a lake or the ocean.

Retained deeper: Flowing water can wear away rock and move sediment. A river can curve because of the land and the way water erodes and deposits material. Not every river reaches the sea.

Safety/review flags: culture: Guam/world geography context; designated family reviewer review. water safety: Drawing only; no entering a river or floodwater.

### continents — What are continents?

Category: guam. Motif: globe. Sources: [68], [69], [60].

Retained short: Continents are Earth's large land regions. A common seven-continent model names Africa, Antarctica, Asia, Europe, North America, South America, and Australia. People sometimes group the land differently.

Retained deeper: A map flattens Earth's curved surface, so it changes some shapes, sizes, or distances. A globe is a round model. Neither a map nor a globe can show every detail at once.

Safety/review flags: culture: Continent grouping and naming conventions differ; retain qualification and request designated family reviewer review. map accuracy: Stylized motif does not provide navigational or boundary information.

### maps — How do you read a map?

Category: guam. Motif: map. Sources: [70], [71].

Retained short: A map uses shapes, colors, and symbols to show places. A key explains what the symbols mean. A scale helps connect a distance on the map to a distance in the real world.

Retained deeper: Maps are made for different jobs. A walking map may show paths, while a weather map shows air conditions. Our illustrated expedition map is a simplified learning map, not a navigation chart.

Safety/review flags: culture: Human choices of place labels, boundaries and map conventions; designated family reviewer review. navigation safety: Learning map only, never a real navigation chart.

### directions — Which way is north?

Category: guam. Motif: compass. Sources: [72].

Retained short: North, east, south, and west are directions. A compass rose on a map shows how the map is oriented. Many maps put north at the top, but not all do.

Retained deeper: A magnetic compass points toward magnetic north, which is not exactly the same as the geographic North Pole. A map may show different north arrows. Use real navigation tools with a knowledgeable grown-up.

Safety/review flags: culture: Map orientation conventions and Guam/world context; designated family reviewer review. navigation safety: Decorative compass is not a live sensor; real navigation with knowledgeable grown-up and current tools.

### volcanoes — What is inside a volcano?

Category: weather. Motif: volcano. Sources: [60], [73].

Retained short: Melted rock below the ground is called magma. When it reaches the surface, it is called lava. A volcano is an opening where material from inside Earth can reach the surface.

Retained deeper: Volcanoes do not all erupt in the same way. Some build islands and mountains over many eruptions. Many occur near plate boundaries, but some form over hot spots within a plate.

Safety/review flags: storms/disaster: Volcanic eruptions and hazards; calm illustration, designated family reviewer family review. culture: Guam/world geographic and place context; no new CHamoru terms. safety: Drawing only; no heat, lava, chemical eruption experiment, or live hazard claim.

## Exact source bibliography

1. [NASA: Sun Facts](https://science.nasa.gov/sun/facts/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
2. [NASA Science](https://science.nasa.gov/moon/facts/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
3. [NASA Science](https://science.nasa.gov/earth/facts/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
4. [NASA Space Place](https://spaceplace.nasa.gov/seasons/en/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
5. [NASA Science](https://science.nasa.gov/solar-system/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
6. [NASA Science](https://science.nasa.gov/mars/facts/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
7. [NASA Science](https://science.nasa.gov/saturn/facts/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
8. [NASA Space Place](https://spaceplace.nasa.gov/what-is-gravity/en/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
9. [NASA Basics of Space Flight: Gravity & Mechanics](https://science.nasa.gov/learn/basics-of-space-flight/chapter3-4/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
10. [NASA Science](https://science.nasa.gov/universe/stars/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
11. [NASA Space Place](https://spaceplace.nasa.gov/launching-into-space/en/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
12. [NASA Science](https://science.nasa.gov/solar-system/asteroids/facts/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
13. [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/whysalty.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
14. [NOAA JetStream: Sea Water](https://www.noaa.gov/jetstream/ocean/sea-water) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
15. [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/tides.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
16. [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/wavesinocean.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
17. [NOAA: Coral Animals](https://oceanservice.noaa.gov/facts/coral.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
18. [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/plankton.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
19. [NOAA Florida Keys National Marine Sanctuary](https://floridakeys.noaa.gov/plants/seagrass.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
20. [NOAA: How does pressure change with ocean depth?](https://oceanservice.noaa.gov/facts/pressure.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
21. [NOAA Ocean Exploration](https://oceanexplorer.noaa.gov/facts/light-distributed.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
22. [Woods Hole Oceanographic Institution: Why is pressure different in the ocean?](https://www.whoi.edu/ocean-learning-hub/ocean-facts/why-is-pressure-different-in-the-ocean/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
23. [Smithsonian Ocean](https://ocean.si.edu/ocean-life/invertebrates/octopuses-squids-and-relatives) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
24. [NOAA Fisheries: Green Turtle](https://www.fisheries.noaa.gov/species/green-turtle) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
25. [NOAA Office of Response and Restoration: How Do Oil Spills Affect Sea Turtles?](https://response.restoration.noaa.gov/about/media/how-do-oil-spills-affect-sea-turtles.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
26. [NOAA Education: Aquatic Food Webs](https://www.noaa.gov/education/resource-collections/marine-life/aquatic-food-webs) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
27. [Smithsonian: Bat Facts](https://www.si.edu/spotlight/bats/batfacts) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
28. [NPS: How Bats Fly](https://home.nps.gov/subjects/bats/how-bats-fly.htm) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
29. [NPS: Echolocation](https://www.nps.gov/subjects/bats/echolocation.htm) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
30. [Smithsonian: Butterflies](https://avpreservation.si.edu/spotlight/buginfo/butterfly) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
31. [NPS: Pollinators — Monarch butterfly](https://home.nps.gov/articles/monarch-butterfly.htm) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
32. [Smithsonian NMNH: Butterflies and Beyond](https://naturalhistory.si.edu/education/teaching-resources/life-science/butterflies-and-beyond) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
33. [Smithsonian National Zoo: African Clawed Frog](https://nationalzoo.si.edu/animals/african-clawed-frog) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
34. [Smithsonian Gardens: Pollination](https://gardens.si.edu/gardens/pollinator-garden/why-what-when-where-who-how-pollination/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
35. [Smithsonian Gardens: Pollinator Garden](https://gardens.si.edu/gardens/pollinator-garden/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
36. [Smithsonian National Museum of Natural History: Butterfly Colors](https://naturalhistory.si.edu/education/teaching-resources/life-science/butterfly-colors-and-biomimicry) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
37. [NOAA Fisheries: Common Bottlenose Dolphin](https://www.fisheries.noaa.gov/species/common-bottlenose-dolphin) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
38. [NPS: Food, Water, Shelter, Space](https://www.nps.gov/teachers/classrooms/food-water-shelter-space.htm) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
39. [NPS: Migrating Monarchs](https://www.nps.gov/subjects/pollinators/migratingmonarchs.htm) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
40. [Smithsonian: Insect Flight](https://www.si.edu/spotlight/buginfo/insect-flight) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
41. [NC State University General Entomology: Wings](https://genent.cals.ncsu.edu/bug-bytes/thorax/wings-2/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
42. [Cornell Lab: All About Feathers](https://academy.allaboutbirds.org/feathers-article/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
43. [NASA Space Place](https://spaceplace.nasa.gov/blue-sky/en/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
44. [NOAA JetStream: Clouds](https://www.noaa.gov/jetstream/clouds) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
45. [NOAA JetStream: How Clouds Form](https://www.noaa.gov/jetstream/clouds/how-clouds-form) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
46. [USGS: Precipitation and the Water Cycle](https://www.usgs.gov/water-science-school/science/precipitation-and-water-cycle) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
47. [National Weather Service: Rainbows](https://www.weather.gov/fgz/Rainbow) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
48. [NOAA: What Causes Wind?](https://www.boulder.noaa.gov/video/what-causes-wind/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
49. [NOAA NESDIS: Why Does Wind Blow?](https://www.nesdis.noaa.gov/about/k-12-education/atmosphere/why-does-wind-blow) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
50. [NOAA NESDIS: Lightning and Thunder](https://www.nesdis.noaa.gov/about/k-12-education/severe-weather/what-causes-lightning-and-thunder) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
51. [NWS: Lightning Indoors](https://www.weather.gov/safety/lightning-indoors) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
52. [NOAA: Hurricane or Typhoon?](https://oceanservice.noaa.gov/facts/cyclone.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
53. [NASA Space Place](https://spaceplace.nasa.gov/hurricanes/en/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
54. [NOAA Education: The Water Cycle](https://www.noaa.gov/education/resource-collections/freshwater/water-cycle) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
55. [NOAA Education: Weather Observations](https://www.noaa.gov/education/resource-collections/weather-atmosphere/weather-observations) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
56. [NPS: War in the Pacific Nature](https://www.nps.gov/wapa/learn/nature/index.htm) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
57. [USGS: Geology of Guam](https://pubs.usgs.gov/pp/0403a/report.pdf) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
58. [USGS: Coral Reef Project — Guam](https://www.usgs.gov/centers/pcmsc/science/coral-reef-project-guam?page=1) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
59. [NPS: Pacific Islands Geology](https://home.nps.gov/subjects/geology/geodiversity-atlas-pacific-islands-network-index.htm) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
60. [USGS: About Volcanoes](https://www.usgs.gov/programs/VHP/about-volcanoes) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
61. [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/coral_protect.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
62. [NOAA: Deepest Ocean](https://oceanservice.noaa.gov/facts/oceandepth.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
63. [USGS: Seismicity of the Earth 1900–2012, Philippine Sea plate and vicinity](https://www.usgs.gov/publications/seismicity-earth-1900-2012-philippine-sea-plate-and-vicinity) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
64. [NOAA Ocean Exploration: How far does light travel in the ocean?](https://oceanexplorer.noaa.gov/ocean-fact/light-distributed/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
65. [USGS: Geology of Denali](https://www.usgs.gov/geology-and-ecology-of-national-parks/geology-denali-national-park-and-preserve) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
66. [USGS: Rivers, Streams, and Creeks](https://www.usgs.gov/water-science-school/science/rivers-streams-and-creeks) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
67. [USGS: Find-A-Feature — Meander](https://www.usgs.gov/educational-resources/find-feature-meander) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
68. [USGS: This Dynamic Planet](https://pubs.usgs.gov/imap/2800/) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
69. [USGS: How are different map projections used?](https://www.usgs.gov/faqs/how-are-different-map-projections-used) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
70. [USGS: Topographic Map Symbols](https://www.usgs.gov/publications/topographic-map-symbols) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
71. [USGS Lessons on the Lake: Cartographic Information](https://pubs.usgs.gov/of/1998/of98-805/lessons/chpt1/act3-hnd.htm) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
72. [USGS: North Arrows](https://www.usgs.gov/faqs/what-do-different-north-arrows-a-usgs-topographic-map-mean?items_per_page=6&page=1) — accessed or attempted 2026-11-02; detailed access outcome in provenance.
73. [USGS: Volcanoes](https://pubs.usgs.gov/gip/volc/nature.html) — accessed or attempted 2026-11-02; detailed access outcome in provenance.

## Cleanup and handoff

No runtime resources were started, so there is no server/tab/simulator/container to stop or hand off. Temporary task-local dependency cleanup and final checks are recorded below. The worktree and unpushed branch are intentionally retained for the parent to consume the local commit. Source artifacts and temporary static-art QA evidence remain available; no running process is handed off.

Final local checks: `npm run typecheck` passed; `npm run lint` passed with 0 errors and the existing 33 warnings after task-local `npm ci`. The final 50-record fragment/preservation/speech/hash/graph check passed again after the source-evidence additions. No application code, dependency manifest, or lockfile changed. The full combined validator/check/Doctor remains assigned to the parent.

Cleanup complete: the temporary borrowed dependency symlink and the task-installed `node_modules` directory were removed. All check processes exited. No task-owned runtime resource remains. The isolated worktree/branch and static-art QA evidence are intentionally retained for the parent; nothing was pushed.
