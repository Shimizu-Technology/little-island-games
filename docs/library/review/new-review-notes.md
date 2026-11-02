# Independent factual and editorial review — 40 new wonders

2026-11-02. Reviewer: **Codex independent factual reviewer**. Verified clean isolated checkout `t3/review-new-wonders` at `d0c181e66b0baa6f512a1c78630fa0a8f527a289`, remote `https://github.com/Shimizu-Technology/little-island-games.git`. These are the forty topic IDs in `new-items.json`, taken from canonical `items.json`, in assignment order. I did not delegate or participate in their original authorship.

This is an offline, untimed family Library for a seven-year-old, older shared readers and caregiver-led little ones. Context read: the required v3 `COMMON.md`, `library/DECISIONS.md`, `library/content/REPORT.md` (the latter two are in the sibling artifacts folder), `docs/ISLAND_LIBRARY.md`, `docs/PRD.md`, `docs/QA.md`, and the shimizu-projects, brain-dump and unslop skills. The Brain Dump search found only the already-known unrelated podcast note. The exact checkout, scope and current acceptance contract take precedence over older release records.

The patch rewrites all three layers, retains sentence records and pending audio, and increments each record to revision 2. Tell has 1–3 short sentences; Deep is 125–136 words. More and Deep are each authored as one connected paragraph represented by sequential sentence records. A reader should join sentences with spaces, without an extra paragraph per record. There is no claim of assessed decodability. Art/alt text, links, stage hints, rights and every `sensitiveNotes` string are unchanged; art verification belongs to the parent. Unchanged originals are frozen only in `new-evidence/original-records-d0c181e.json` as provenance.

Every record is **in-review**, not approved. Each scope states a concrete correction and a specific pending Leon judgment. Factual reviewer is `independent factual reviewer`; no familyReviewer is invented. Leon’s family/cultural review, reading-content assessment, pronunciation, warm narration generation, receipt checking and audible review remain gates. Familia remains the exact governed `source_backed` term, not pronunciation or cultural approval.

Sources were read as evidence. No Wikipedia text is used as a sole source or imported. Failed access is reported below; inaccessible claims were replaced or removed. `new-evidence/retrieval.json` retains exact URLs, direct status/redirects, checksums and web fallbacks. Some exploratory URLs returned 404 or abstract-only content and are explicitly not used. Successful download is not, by itself, factual verification. Prose and examples are original; there are no copied source passages. Shared machine, geology and sky references were used alongside distinct primary sources, keeping each page’s contribution brief rather than expanding one overview across many articles.

Acceptance for this assigned patch: exactly forty complete records, supported revised claims, the requested reading layers, honest item notes and access outcomes, unchanged sensitive/art fields, schema-valid in-review metadata, pending audio, no canonical/registry edits, and one local commit for parent integration.

## Validation and integration limits

- `npm ci --ignore-scripts` completed on Node 22.22.3. Initial typecheck could not start before install (`tsc: command not found`); after install, `npm run typecheck` passed and `npm run lint` passed with 33 warnings in unchanged code/tests.
- `npm run library:validate` passed for the unchanged canonical 110 records. This alone does not validate revised transcripts.
- The existing validator also passed against an in-memory corpus overlay replacing these forty records, with an in-memory exact transcript overlay. Nothing was written to the canonical corpus or speech registry. The receipt is `new-evidence/validation.json`; it also checks assignment membership/order, revision, review fields, unique sentence/speech keys, Deep length and exact preserved metadata.
- The parent must synchronize `scripts/learn/library.json`, related generated registry/index data and final audio before ordinary admission/shipping. Running the stock validator against this isolated forty-record patch alone is not an integration test: related targets live in the remaining corpus and revised speech is intentionally not registered here.
- No full check/export, UI, device, simulator, audible or family acceptance is claimed. No application code changed; this task supplies a review patch for integration. No PR, push, merge or release was performed. No runtime server, browser tab, simulator, emulator or container was started; no owned runtime resources remain.

## Per-item findings

### fish-gills — How does a fish breathe?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Retained dissolved-oxygen exchange and mouth-to-gill flow; removed unsourced air-breathing exceptions and turtle/dolphin comparison. Tell names oxygen directly, avoiding the suggestion of underwater air bubbles.

Evidence read: Gills and heart sections: flow, exchange, folded plates and blood route.

Sources opened (2026-11-02):
- [Western Australia Department of Primary Industries: Fish anatomy](https://marinewaters.fish.wa.gov.au/resource/fish-anatomy/) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Decide whether “needs oxygen” is clear enough alongside dissolved oxygen, and review shoreline observation wording.

### crab-shells — Why do crabs have shells?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Distinguished the grown exoskeleton from a borrowed snail shell; removed a single molt timing that would overgeneralize species.

Evidence read: NOAA molting section; Zoo physical-description/molting and borrowed-shell sections.

Sources opened (2026-11-02):
- [NOAA Fisheries: Alaska Shellfish Growth Research](https://www.fisheries.noaa.gov/alaska/science-data/alaska-shellfish-growth-research) — Direct HTTP 200; relevant text read.
- [Smithsonian National Zoo: Land hermit crab](https://nationalzoo.si.edu/animals/land-hermit-crab) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review shedding and vulnerability for comfort; retain no handling or shell removal.

### parrotfish — What do parrotfish eat?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Replaced algae-only implication with qualified microphagy evidence; grinding and sediment are supported by the full Clements paper and NOAA. No universal coral-eating or Guam sand-production claim.

Evidence read: Full paper pp. 2–5 and 14–16: microscopic diet targets, grinding and feeding methods; NOAA sand paragraph.

Sources opened (2026-11-02):
- [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/sand.html) — Direct HTTP 200; relevant text read.
- [Clements et al. 2017: Parrotfishes as microphages, Biological Journal of the Linnean Society, doi:10.1111/bij.12914](https://onlinelibrary.wiley.com/doi/10.1111/bij.12914) — Web open also returned 403. Replaced with the UCI-hosted full author paper; inspected diet/feeding morphology discussion, not only the abstract. Original citation is superseded in the revised source list.
- [Clements et al., Integrating ecological roles and trophic diversification on coral reefs (author full paper, UCI)](https://german.bio.uci.edu/images/PDF/Clements%20et%20al.%20%282016%29%20BJLS_online.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review animal feeding and waste language; keep ecological interpretation separate from a promise about every species.

### tide-pool — Who lives in a tide pool?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Removed evaporation/salinity claim absent from the cited page; connected low-tide warming/oxygen, high-tide replenishment and barnacle attachment. Species examples are possibilities, not a Guam checklist.

Evidence read: Complete NOAA main text: exposure, oxygen/warming, food delivery and barnacle attachment.

Sources opened (2026-11-02):
- [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/tide-pool.html) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review shore danger, predation context and the safe viewing line.

### beach-sand — Where does beach sand come from?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Removed storm/sorting elaboration unsupported by this page and false precision about sand-size limits; retained specific source-supported rock and biological origins without identifying Guam grains.

Evidence read: Complete NOAA main text: rock weathering, transport, colors and biological grains.

Sources opened (2026-11-02):
- [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/sand.html) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review shoreline context; no collection or water activity is requested.

### mangrove-roots — Why are mangroves important?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Removed unsupported specific salt-removal, breathing-root and storm-guarantee discussion; NOAA supports low-oxygen habitat, prop roots, deposition and shelter.

Evidence read: Complete NOAA main text: intertidal setting, low-oxygen soil, root deposition and habitat.

Sources opened (2026-11-02):
- [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/mangroves.html) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review coastal access and the non-graphic shelter-from-predators example.

### jellyfish-move — How do jellyfish move?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added the South Carolina DNR locomotion section and Smithsonian anatomy text because the original NOAA page does not explain propulsion. Removed unsourced species-specific swimming claims; no treatment or species-identification advice.

Evidence read: SCDNR anatomy/locomotion/food/stinging-cell sections; Smithsonian anatomy; NOAA composition.

Sources opened (2026-11-02):
- [NOAA National Ocean Service](https://oceanservice.noaa.gov/facts/jellyfish.html) — Direct HTTP 200; relevant text read.
- [South Carolina Department of Natural Resources: Jellyfish, locomotion and anatomy](https://www.dnr.sc.gov/marine/pub/seascience/jellyfish.html) — Direct HTTP 200; relevant text read.
- [Smithsonian Ocean: Jellyfish and Comb Jellies](https://ocean.si.edu/ocean-life/invertebrates/jellyfish-and-comb-jellies) — Direct 403; web retrieval provided anatomy, nerve-net and introductory text. Added the fully readable SCDNR locomotion section for the muscle/pulsing claim.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review stinging cells, catching prey and the single no-touch line.

### whale-song — Why do whales sing?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added NOAA sanctuary research with song structure and feeding-ground recordings; removed definitive communication-purpose wording and ungrounded translations. Exact function remains explicitly unsettled.

Evidence read: NOAA sanctuary song-structure and feeding-habitat sections; Hawaiian sanctuary function discussion.

Sources opened (2026-11-02):
- [NOAA Fisheries: Humpback whale](https://www.fisheries.noaa.gov/species/humpback-whale) — Direct HTTP 200; relevant text read.
- [NOAA Hawaiian Islands Humpback Whale Sanctuary: Whale Behavior](https://hawaiihumpbackwhale.noaa.gov/science/research/whale-behavior.html) — Direct HTTP 200; relevant text read.
- [NOAA Sanctuaries: Unraveling Mysteries of Humpback Whale Song](https://sanctuaries.noaa.gov/news/sep22/mysteries-of-humpback-whale-song.html) — Direct HTTP 200; relevant text read.

Unresolved factual limits: The exact function of song remains scientifically unsettled and is stated as such; no definitive purpose is asserted.

**Pending Leon family/cultural judgment:** Review general reproduction wording and animal observation; no mating imagery or human-language translation.

### guam-made — How was Guam made?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added NPS evidence for plate-related uplift; retained USGS north/south and permeability distinction. Removed implication that Guam arose from one volcano or one event.

Evidence read: NPS geologic setting; USGS geology and hydrologic principles.

Sources opened (2026-11-02):
- [USGS: Hydrologic Resources of Guam (Gingerich, 2003)](https://pubs.usgs.gov/wri/wri034126/htdocs/wrir03-4126.html) — Web open returned 403; direct retrieval succeeded. Read geology, groundwater, recharge, pumping and surface-water sections. Historical quantities are not asserted as current.
- [NPS Geodiversity Atlas: War in the Pacific National Historical Park](https://home.nps.gov/articles/nps-geodiversity-atlas-war-in-the-pacific-national-historical-park.htm) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review local explanation and whether the simplified two-rock Make map needs a caregiver note about mixed areas.

### limestone — What is limestone?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Opened the full USGS fact sheet, not just its summary; replaced oversimplified shell-to-rock account with carbonate, chalk, travertine and dissolution. No color-based identification or field experiment.

Evidence read: USGS full fact sheet: formation and types, dissolution and aquifers; Guam geology.

Sources opened (2026-11-02):
- [USGS: Hydrologic Resources of Guam (Gingerich, 2003)](https://pubs.usgs.gov/wri/wri034126/htdocs/wrir03-4126.html) — Web open returned 403; direct retrieval succeeded. Read geology, groundwater, recharge, pumping and surface-water sections. Historical quantities are not asserted as current.
- [USGS: Limestone, a crucial and versatile industrial mineral commodity](https://pubs.usgs.gov/fs/2008/3089/) — Web open returned 403; direct summary retrieval succeeded. Followed the actual linked full PDF and read formation/types and dissolution/aquifer sections. Original citation is superseded in the revised source list.
- [USGS: Limestone—A Crucial and Versatile Industrial Mineral Commodity, full fact sheet](https://pubs.usgs.gov/fs/2008/3089/fs2008-3089.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review local rock examples; retain the no caves/cliffs/collecting sensitivity despite no activity inviting them.

### guam-rail — What is the Guam rail?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Used Smithsonian for adaptation, diet, decline and conservation; USGS provides invasive-snake research context, not rail population evidence. Avoided volatile population/status counts and unverified local-language teaching.

Evidence read: Zoo physical description, habitat, diet and conservation; USGS research context only.

Sources opened (2026-11-02):
- [Smithsonian National Zoo: Guam rail](https://www.nationalzoo.si.edu/animals/guam-rail-koko) — Direct HTTP 200; relevant text read.
- [USGS: Brown Treesnake Research Continues at Guam National Wildlife Refuge](https://www.usgs.gov/news/featured-story/usgs-brown-treesnake-research-continues-guam-national-wildlife-refuge) — Direct 403; web open retrieved full article. Read research/control paragraphs; it does not establish rail population numbers.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review extinction/introduced-predator wording and local identity; no CHamoru name or community approval is added.

### limestone-forest — What is a limestone forest?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Replaced unavailable FWS project page with WERI forest text and USDA soil profile. Removed unverified Guam restoration actions and generalized invasive-species assertions; shallow soil is qualified to the Guam soil series.

Evidence read: WERI limestone-forest paragraph; USDA profile, depth, drainage and forest-use sections.

Sources opened (2026-11-02):
- [US Fish and Wildlife Service: Native Limestone Forest Restoration and Enhancement](https://www.fws.gov/apps/rivers/carp/carp/project/native-limestone-forest-restoration-and-enhancement) — Direct 403; web open redirected to FWS home, not the project. Search excerpt was not accepted as full evidence. Removed this citation from both revised records and replaced or removed associated elaboration. Original citation is superseded in the revised source list.
- [USGS: Hydrologic Resources of Guam (Gingerich, 2003)](https://pubs.usgs.gov/wri/wri034126/htdocs/wrir03-4126.html) — Web open returned 403; direct retrieval succeeded. Read geology, groundwater, recharge, pumping and surface-water sections. Historical quantities are not asserted as current. Original citation is superseded in the revised source list.
- [University of Guam WERI: Forests of Southern Guam](https://south.hydroguam.net/environment-forests.php) — Direct HTTP 200; relevant text read.
- [USDA NRCS: Official Guam Soil Series Description](https://soilseries.sc.egov.usda.gov/OSD_Docs/G/GUAM.html) — Direct HTTP 200; relevant text read.

Unresolved factual limits: None retained from the blocked citation; associated unsupported elaboration was removed or replaced.

**Pending Leon family/cultural judgment:** Review local habitat framing and schematic plant shapes; source examples do not establish every forest’s soil or species.

### drinking-water — Where does our drinking water come from?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Anchored lens/pumping explanation in the 2013 USGS scenario study and historical hydrology. Removed unsupported treatment process and contamination elaboration; no present-day safety, percentage or supply guarantee.

Evidence read: USGS groundwater/recharge/withdrawal sections and full 2013 model abstract.

Sources opened (2026-11-02):
- [USGS: Hydrologic Resources of Guam (Gingerich, 2003)](https://pubs.usgs.gov/wri/wri034126/htdocs/wrir03-4126.html) — Web open returned 403; direct retrieval succeeded. Read geology, groundwater, recharge, pumping and surface-water sections. Historical quantities are not asserted as current.
- [USGS: Withdrawals and drought in the Northern Guam Lens Aquifer](https://www.usgs.gov/publications/effects-withdrawals-and-drought-groundwater-availability-northern-guam-lens-aquifer) — Direct 403; web open retrieved full study abstract, including model assumptions and drought/pumping results. Used only as scenario evidence, not a current water-quality report.

Unresolved factual limits: Current water quality, supply percentages and alerts are not established by these historical sources and are not asserted.

**Pending Leon family/cultural judgment:** Review drought/salinity explanation and water safety; the page cannot decide whether a current tap is safe.

### village — What is a village?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Confirmed nineteen districts and combined-place names against the council’s full list. Removed sweeping claims about traditions/belonging; family mapping is clearly an invitation, not ethnographic evidence.

Evidence read: Mayors Council nineteen-district list and combined-name entries; GVB main village text.

Sources opened (2026-11-02):
- [Mayors Council of Guam: Guam’s Villages](https://mcog.guam.gov/villages-list) — Web open timed out; direct retrieval succeeded. Read district introduction and relevant combined-name entries in the full list.
- [Guam Visitors Bureau: Villages](https://www.visitguam.com/about-guam/villages/) — Direct 403; web open retrieved the page. Read main village text at its bottom (nineteen villages and varied histories), not just navigation.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review the exact family-memory invitation and combined district example; no name translation or cultural approval is implied.

### native-trees — Why are native trees important?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Replaced failed FWS citation with BLM ecosystem/definition evidence and WERI local context. Removed unsupported specific Guam restoration prescriptions; Joshua tree example is explicitly mainland.

Evidence read: BLM definition and ecosystem exchanges (pp. 2–3, 6–9); WERI native-forest context.

Sources opened (2026-11-02):
- [US Fish and Wildlife Service: Native Limestone Forest Restoration and Enhancement](https://www.fws.gov/apps/rivers/carp/carp/project/native-limestone-forest-restoration-and-enhancement) — Direct 403; web open redirected to FWS home, not the project. Search excerpt was not accepted as full evidence. Removed this citation from both revised records and replaced or removed associated elaboration. Original citation is superseded in the revised source list.
- [Bureau of Land Management: Native Plants Junior Ranger, pp. 2–3, 6–9](https://www.blm.gov/sites/default/files/docs/2024-10/Native-Plants-Junior-Ranger-Book-2024.pdf) — Direct HTTP 200; relevant text read.
- [University of Guam WERI: Forests of Southern Guam](https://south.hydroguam.net/environment-forests.php) — Direct HTTP 200; relevant text read.

Unresolved factual limits: None retained from the blocked citation; associated unsupported elaboration was removed or replaced.

**Pending Leon family/cultural judgment:** Review native-species language and mainland comparison; no foraging, removal or planting instruction is introduced.

### family-walk — What can we notice on a family walk?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Verified Familia in frozen HåfaGPT family.family source_backed entry; removed pronunciation and tradition claims. Observation-versus-explanation example is explicitly hypothetical original pedagogy, with NPS leave-in-place guidance.

Evidence read: NPS established trails/leave-what-you-find/respect-wildlife guidance; exact frozen family.family entry.

Sources opened (2026-11-02):
- [National Park Service: Leave No Trace principles](https://www.nps.gov/articles/leave-no-trace-seven-principles.htm) — Direct HTTP 200; relevant text read.
- [HåfaGPT governed vocabulary repository: family.family](https://github.com/Shimizu-Technology/HafaGPT/blob/609a8eb44c5068bf1b539221de078adeb1f20787/api/language_content/canonical_vocabulary.json) — Direct HTTP 200; relevant text read.

Unresolved factual limits: Familia pronunciation remains unreviewed; the observation example is explicitly hypothetical, not a local tradition.

**Pending Leon family/cultural judgment:** Review walking/rolling/resting inclusion and the family activity; Familia still needs native pronunciation and Leon cultural review.

### distant-stars — Why do stars look tiny?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added NASA-hosted observing guide for unresolved stellar disks; removed brightness-versus-luminosity elaboration beyond the original citations. Distance/time distinction retained.

Evidence read: Sun distance/size text; light-year definition and light travel; observing guide p. 9 unresolved disks.

Sources opened (2026-11-02):
- [NASA Space Place](https://spaceplace.nasa.gov/all-about-the-sun/en/) — Direct HTTP 200; relevant text read.
- [NASA Space Place](https://spaceplace.nasa.gov/light-year/en/) — Direct HTTP 200; relevant text read.
- [NASA Night Sky Network / Astronomical Society of the Pacific: Ready to Observe, p. 9](https://nightsky.jpl.nasa.gov/docs/TTKReadyObserve1.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review Sun-safety context and the illustration’s symbolic dot sizes; no solar observation is requested.

### shadow — What is a shadow?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added the Smithsonian activity’s full geometric explanation; removed unsupported fuzzy-edge account. Ring orientation and lunar eclipse are sourced examples; phases are not described as Earth’s shadow.

Evidence read: Smithsonian shadow page plus full activities pp. 11–14: straight paths, orientation and eclipses.

Sources opened (2026-11-02):
- [Smithsonian Astrophysical Observatory: Light that does not pass](https://hte.si.edu/shadows.html) — Direct HTTP 200; relevant text read.
- [NASA Space Place](https://spaceplace.nasa.gov/seasons/en/) — Direct HTTP 200; relevant text read.
- [Smithsonian Astrophysical Observatory: Light that Does Not Pass, activities pp. 11–14](https://hte.si.edu/Activities/shadows_activities.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review light handling and whether an eclipse example is comfortable; no Sun-looking or flashlight experiment is required.

### constellation — What is a constellation?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added IAU primary definition to distinguish regions from figures; qualified physical association instead of saying all pattern stars are unrelated. No traditional navigation or local star story is added.

Evidence read: IAU regions/figures/boundaries paragraphs and NASA pattern/perspective explanation.

Sources opened (2026-11-02):
- [NASA Space Place](https://spaceplace.nasa.gov/constellations/en/) — Direct HTTP 200; relevant text read.
- [International Astronomical Union: The Constellations](https://www.iau.org/IAU/Astronomy-FAQs/Constellations.aspx) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review cultural framing and invented-dot Make prompt; an IAU map convention does not replace community sky knowledge.

### night-view — Why does the sky look different at night?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Retained scattering, rotation and orbital viewpoint; removed unsourced Moon/light-pollution/weather elaboration. Static illustration is not a current Guam sky chart.

Evidence read: NASA scattering explanation, daily rotation paragraph and orbital-viewpoint paragraphs.

Sources opened (2026-11-02):
- [NASA Space Place](https://spaceplace.nasa.gov/constellations/en/) — Direct HTTP 200; relevant text read.
- [NASA Space Place](https://spaceplace.nasa.gov/blue-sky/en/) — Direct HTTP 200; relevant text read.
- [NASA Space Place: What Causes the Seasons?](https://spaceplace.nasa.gov/seasons/en/) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review outdoor-night context and absence of real-time guidance; no independent night outing is requested.

### telescope — What is a telescope?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Replaced unsupported magnification/false-color/turbulence elaboration with the cited optics mechanism and mirror engineering. Retained a single solar-optics safety sentence.

Evidence read: NASA telescope optics and mirror/lens engineering; solar-optics safety paragraphs.

Sources opened (2026-11-02):
- [NASA Space Place](https://spaceplace.nasa.gov/telescopes/en/) — Direct HTTP 200; relevant text read.
- [NASA: Eclipse Viewing Safety, optical-device cautions](https://science.nasa.gov/eclipses/safety/) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review eye-safety line and supervised use; the original schematic is not an equipment guide.

### milky-way — What is the Milky Way?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Checked the full NASA Milky Way explanation and galaxy overview; retained evidence-based mapping, disk and radio-gas example. Removed apparent outside-portrait implication and avoided an exact size/count.

Evidence read: NASA galaxy overview plus within-galaxy mapping/disk/dust/radio paragraphs.

Sources opened (2026-11-02):
- [NASA Science](https://science.nasa.gov/universe/galaxies/) — Direct HTTP 200; relevant text read.
- [NASA Imagine the Universe: Milky Way](https://imagine.gsfc.nasa.gov/features/cosmic/milkyway_info.html) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review abstract galaxy-scale explanation for comprehension; no sensitive content or cultural approval asserted.

### comet — What is a comet?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Kept nucleus→warming→coma→tails with dust/ion distinction; removed the uncited meteor comparison and tail-ahead claim. No current comet forecast or impact scenario.

Evidence read: NASA facts: nucleus, warming, coma, two tails and spacecraft observations.

Sources opened (2026-11-02):
- [NASA Science](https://science.nasa.gov/solar-system/comets/facts/) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review comet scale and Sun-safety sensitivity; no search for a comet near the Sun is requested.

### astronaut-home — How do astronauts live in space?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Opened NASA’s technical Q&A for oxygen/water support; removed unsupported sleeping-bag detail. Microgravity remains shared orbital free fall, with exercise explained rather than prescribed.

Evidence read: NASA microgravity full relevant sections; technical Q&A oxygen/water answer; living-space overview.

Sources opened (2026-11-02):
- [NASA: Living in Space](https://www.nasa.gov/humans-in-space/living-in-space/) — Direct HTTP 200; relevant text read.
- [NASA: What is Microgravity?](https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-microgravity-grades-5-8/) — Direct HTTP 200; relevant text read.
- [NASA Robotics Alliance Project: Spaceflight Q&A, environmental/resource answers](https://robotics.nasa.gov/spaceflight-qa/) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review body adaptation and water reuse wording; no exercise challenge or unprotected-space scenario.

### breathing — Why do we breathe?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Connected breathing mechanics, alveoli and circulation from NHLBI; removed diagnostic/model filler. Oxygen supports cellular energy release rather than being created by lungs.

Evidence read: NHLBI respiratory-system and complete breathing-benefits gas exchange/mechanics text.

Sources opened (2026-11-02):
- [NIH NHLBI: How the Lungs Work](https://www.nhlbi.nih.gov/health/lungs) — Direct HTTP 200; relevant text read.
- [NIH NHLBI: What Breathing Does for the Body](https://www.nhlbi.nih.gov/health/lungs/breathing-benefits) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review body vocabulary and the one gentle no-breath-holding line; no health comparison or test.

### heart — What does the heart do?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Used NHLBI circulation and beat pages to explain coordinated pumping/valve sounds; removed color-model and comparison-to-other-children filler. Tell’s “food” means nutrients carried by blood.

Evidence read: NHLBI circulation overview and heartbeat/electrical-sequence/valve-sounds text.

Sources opened (2026-11-02):
- [NIH NHLBI: The Heart](https://www.nhlbi.nih.gov/health/heart) — Direct HTTP 200; relevant text read.
- [NIH NHLBI: How the Heart Beats](https://www.nhlbi.nih.gov/health/heart/heart-beats) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review simplified food/nutrient wording and valve sounds; no pulse counting, diagnosis or exercise test.

### bones — How do our bones help us?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added NCI skeletal-system evidence for protection, levers and marrow; NIAMS supports growth/remodeling. Removed diet/exercise prescription language and unsupported protein-composition detail.

Evidence read: NCI functions/marrow text and NIAMS living-bone/growth paragraphs.

Sources opened (2026-11-02):
- [NIH NIAMS: Kids and Their Bones](https://www.niams.nih.gov/health-topics/kids-and-their-bones) — Direct HTTP 200; relevant text read.
- [NIH NIAMS: Bone Health and Osteoporosis](https://www.niams.nih.gov/health-topics/bone-health-and-osteoporosis) — Direct HTTP 200; relevant text read. Original citation is superseded in the revised source list.
- [NCI SEER: Introduction to the Skeletal System](https://training.seer.cancer.gov/anatomy/skeletal/) — Direct full-text retrieval succeeded. A separate www-host web attempt first returned text, then timed out; direct text supports the retained explanation.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review body imagery and marrow explanation; retain sensitivity metadata and avoid comparing children’s bodies.

### muscles — How do muscles move us?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added NCI muscle-types page; kept fiber→connective tissue→tendon→bone mechanism. Removed unsupported isometric/posture and paired-band claims from prose.

Evidence read: NCI complete structure and muscle-types sections; original injury overview consulted but superseded.

Sources opened (2026-11-02):
- [NIH NIAMS: Sports Injuries, musculoskeletal system](https://www.niams.nih.gov/health-topics/sports-injuries) — Direct HTTP 200; relevant text read. Original citation is superseded in the revised source list.
- [National Cancer Institute: Muscle Tissue](https://training.seer.cancer.gov/anatomy/muscular/structure.html) — Direct HTTP 200; relevant text read.
- [NCI SEER: Muscle Types](https://training.seer.cancer.gov/anatomy/muscular/types.html) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review body explanation and the existing two-band Make prompt as a simplified picture, not an exercise instruction.

### vision — How do we see?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Checked NEI’s full pathway; removed unsupported glasses/diagnosis discussion. The tree example illustrates that pathway without claiming a literal image travels down the nerve.

Evidence read: Complete NEI eye-to-brain pathway; NASA eye-safety text for solar warning.

Sources opened (2026-11-02):
- [NIH National Eye Institute: How the Eyes Work](https://www.nei.nih.gov/eye-health-information/healthy-vision/how-eyes-work) — Direct HTTP 200; relevant text read.
- [NASA: Eclipse Viewing Safety, optical-device cautions](https://science.nasa.gov/eclipses/safety/) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review body vocabulary and eye-safety line; no vision test or comparison is proposed.

### hearing — How do we hear?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Retained NIDCD sequence and pitch-location example; removed unrelated communication-device and illustration boilerplate. Hair-cell projections are distinguished from ordinary hair.

Evidence read: Complete NIDCD seven-step hearing explanation; loudness testing is not requested.

Sources opened (2026-11-02):
- [NIH NIDCD: How Do We Hear?](https://www.nidcd.nih.gov/health/how-do-we-hear) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review sensory inclusivity, quiet-picture line and the cry/bark example; no required hearing response or loudness test.

### smell — How do we smell?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Used NIDCD receptor-pattern and two-route explanation; removed unsupported specific hazard-detection claims. Hypothetical remembered drawing avoids a sniffing activity.

Evidence read: NIDCD how-smell-works subsection, receptor combinations and two aroma routes.

Sources opened (2026-11-02):
- [NIH NIDCD: Smell Disorders, how smell works](https://www.nidcd.nih.gov/health/smell-disorders) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review nose/food explanation and no-unknown-sniffing guidance; no allergy exposure or safety-by-smell test.

### taste — Why can we taste food?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Preserved correction of tongue-zone myth and NIDCD flavor mechanism; removed generalized food-need and diagram boilerplate. No tasting activity or allergy exposure.

Evidence read: NIDCD how-taste-works subsection, distributed cells, common chemical sense and flavor.

Sources opened (2026-11-02):
- [NIH NIDCD: Taste Disorders, how taste works](https://www.nidcd.nih.gov/health/taste-disorders) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review food/chili example and optional remembered-food wording; no taste comparison, food ranking or safety test.

### wheel — How does a wheel help?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Distinguished rolling resistance from wheel/axle force tradeoff. Added OpenStax and museum road-surface evidence; removed unsupported bearings/material-selection claims.

Evidence read: TeachEngineering rolling paragraph, OpenStax crank/wheel model, museum road-surface text; NASA/UMass definitions.

Sources opened (2026-11-02):
- [NASA: Simple Machines classroom connection](https://www.nasa.gov/wp-content/uploads/2023/03/simple-machines-classroom-connection-508.pdf) — Direct HTTP 200; relevant text read.
- [University of Colorado Boulder TeachEngineering: Engineering Simple Machines](https://www.teachengineering.org/lessons/cub_simple_lesson01) — Direct HTTP 200; relevant text read.
- [OpenStax College Physics: Simple Machines](https://openstax.org/books/college-physics/pages/9-5-simple-machines) — Direct HTTP 200; relevant text read.
- [Exploratorium: The Wheel](https://annex.exploratorium.edu/cycling/wheel1.html) — Direct HTTP 200; relevant text read.
- [University of Massachusetts Lowell, Tsongas Industrial History Center: Simple Machines](https://www.uml.edu/docs/Simple_Machines_Complete_tcm18-253653.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review heavy-load boundary and cart example; no real vehicle or load test.

### lever — What is a lever?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added OpenStax torque/lever examples and ideal-model limits. Corrected any implication that every lever multiplies force; removed repetitive pinch warnings from layers while retaining metadata.

Evidence read: OpenStax lever/torque/shovel passages; NASA, TeachEngineering and UMass force-distance definitions.

Sources opened (2026-11-02):
- [NASA: Simple Machines classroom connection](https://www.nasa.gov/wp-content/uploads/2023/03/simple-machines-classroom-connection-508.pdf) — Direct HTTP 200; relevant text read.
- [University of Colorado Boulder TeachEngineering: Engineering Simple Machines](https://www.teachengineering.org/lessons/cub_simple_lesson01) — Direct HTTP 200; relevant text read.
- [OpenStax College Physics: Simple Machines](https://openstax.org/books/college-physics/pages/9-5-simple-machines) — Direct HTTP 200; relevant text read.
- [NASA Glenn: Simple Machine Web](https://www.grc.nasa.gov/www/k-12/Summer_Training/KaeAvenueES/Simple_Machine_Web.html) — Direct HTTP 200; relevant text read.
- [University of Massachusetts Lowell, Tsongas Industrial History Center: Simple Machines](https://www.uml.edu/docs/Simple_Machines_Complete_tcm18-253653.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review the imagined seesaw/shovel examples and drawing-only invitation; no lifting furniture or pinch-point action.

### ramp — How does a ramp help us lift?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Kept force-distance tradeoff explicitly ideal/no-friction; real friction remains. Removed unsupported real-accessibility/control claims and categorical claim that every longer ramp is easier.

Evidence read: OpenStax equal-work ramp passage and TeachEngineering inclined-plane text; NASA/UMass definitions.

Sources opened (2026-11-02):
- [NASA: Simple Machines classroom connection](https://www.nasa.gov/wp-content/uploads/2023/03/simple-machines-classroom-connection-508.pdf) — Direct HTTP 200; relevant text read.
- [University of Colorado Boulder TeachEngineering: Engineering Simple Machines](https://www.teachengineering.org/lessons/cub_simple_lesson01) — Direct HTTP 200; relevant text read.
- [OpenStax College Physics: Simple Machines](https://openstax.org/books/college-physics/pages/9-5-simple-machines) — Direct HTTP 200; relevant text read.
- [NASA Glenn: Simple Machine Web](https://www.grc.nasa.gov/www/k-12/Summer_Training/KaeAvenueES/Simple_Machine_Web.html) — Direct HTTP 200; relevant text read.
- [University of Massachusetts Lowell, Tsongas Industrial History Center: Simple Machines](https://www.uml.edu/docs/Simple_Machines_Complete_tcm18-253653.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review load-moving boundary and gentle-slope comparison; drawing does not certify real ramp accessibility.

### gears — How do gears turn together?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Opened the attached teaching slides for direction/idler and torque support. Numerical 10:20 example is an original ratio illustration; external-gear qualification prevents universal direction claims.

Evidence read: TeachEngineering background and attached slides 8–14 for ratios, idlers, direction and torque.

Sources opened (2026-11-02):
- [University of Colorado Boulder TeachEngineering: What Are Gears and What Do They Do?](https://www.teachengineering.org/lessons/umo_challenges_lesson02) — Direct HTTP 200; relevant text read.
- [TeachEngineering lesson slides: spur gears, idlers and speed/torque, slides 8–14](https://teachengwebstorageprod.blob.core.windows.net/te-content-prod/umo_challenges_lesson02_presentation_v6_dwc_EV3.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review machinery boundary and tooth-count example; no operating or touching real gears.

### pulley — How does a pulley work?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Added ideal load-support and rope-distance mechanism, distinguishing fixed from moving pulley. Removed unsupported safety-engineering detail; metadata still retains ropes/suspension risk.

Evidence read: OpenStax fixed/multiple pulley passages; NASA Glenn support-line statement and teaching definitions.

Sources opened (2026-11-02):
- [NASA: Simple Machines classroom connection](https://www.nasa.gov/wp-content/uploads/2023/03/simple-machines-classroom-connection-508.pdf) — Direct HTTP 200; relevant text read.
- [NASA Glenn: Simple Machine Web](https://www.grc.nasa.gov/www/k-12/Summer_Training/KaeAvenueES/Simple_Machine_Web.html) — Direct HTTP 200; relevant text read.
- [University of Colorado Boulder TeachEngineering: Engineering Simple Machines](https://www.teachengineering.org/lessons/cub_simple_lesson01) — Direct HTTP 200; relevant text read.
- [OpenStax College Physics: Simple Machines](https://openstax.org/books/college-physics/pages/9-5-simple-machines) — Direct HTTP 200; relevant text read.
- [University of Massachusetts Lowell, Tsongas Industrial History Center: Simple Machines](https://www.uml.edu/docs/Simple_Machines_Complete_tcm18-253653.pdf) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review paper-only rope tracing and load example; no hoisting, hanging ropes or climbing system.

### boats-float — Why do boats float?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Confirmed displaced-water weight, average density and loading against OpenStax/TeachEngineering; preserved distinction between buoyancy and stability. No real-water trial.

Evidence read: OpenStax buoyancy/displacement/density/loading text; TeachEngineering hull and stability paragraphs.

Sources opened (2026-11-02):
- [University of Colorado Boulder TeachEngineering: Floaters and Sinkers](https://www.teachengineering.org/lessons/view/duk_float_mary_less) — Direct HTTP 200; relevant text read.
- [OpenStax University Physics: Archimedes’ Principle and Buoyancy](https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review water-safety line and sinking/tipping language; no claim that a drawn hull is safe to use.

### airplanes — How do airplanes stay up?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Used NASA flow-turning and four-forces explanations; removed unsupported equal-transit rebuttal and detailed pressure/angle claims. Force balance is limited to steady level flight.

Evidence read: Complete NASA lift flow-turning text and four-forces/glider discussion.

Sources opened (2026-11-02):
- [NASA Glenn: What Is Lift?](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/what-is-lift/) — Direct HTTP 200; relevant text read.
- [NASA Glenn: Four Forces on an Airplane](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/four-forces-on-an-airplane/) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review explanatory wing arrows and glider example; no launching, jumping or flight test.

### bicycle — How does a bicycle move?

Factual outcome: revised with supported claims within the stated scope; family approval pending.

Opened the museum’s Drives & Gears article, not just its landing page. Original 40:20 example illustrates tooth ratio. Removed unsourced traction/brake and chain-direction elaboration.

Evidence read: Museum Drives & Gears full article, especially tooth ratios; Wheel article for early direct drive.

Sources opened (2026-11-02):
- [Exploratorium: Science of Cycling](https://annex.exploratorium.edu/cycling/) — Direct HTTP 200; relevant text read. Original citation is superseded in the revised source list.
- [University of Colorado Boulder TeachEngineering: Gears](https://www.teachengineering.org/lessons/umo_challenges_lesson02) — Direct HTTP 200; relevant text read. Original citation is superseded in the revised source list.
- [Exploratorium: Science of Cycling—Drives & Gears](https://annex.exploratorium.edu/cycling/gears1.html) — Direct HTTP 200; relevant text read.
- [Exploratorium: Science of Cycling—The Wheel](https://annex.exploratorium.edu/cycling/wheel1.html) — Direct HTTP 200; relevant text read.

Unresolved factual limits: No retained unsupported claim identified in this pass.

**Pending Leon family/cultural judgment:** Review moving-chain boundary, historical comparison and gear example; no required riding or handling a chain.

Final integrating editor clarified the first Deep gear sentence to describe teeth pushing against one another, avoiding an implication of no sliding contact between tooth surfaces.
