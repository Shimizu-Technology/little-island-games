# Arcade games

## Canoe Cargo

27 October 2026. Worker branch `feat/arcade-cargo`, based on integration commit `7d7ac79`. Sources: `ISLAND_ARCADE.md`, `ARCADE_KIT.md`, `PRD.md`, `LEARNING_GROWTH.md` and the W7 brief. Private, offline family play for a seven-year-old and her family. The shared kit supplies per-learner progress, outfits, chests and pause/background ownership. No real-time round is persisted. Public release, audio generation and native family acceptance belong to the lead.

Rules: pack a **9×14** hold with seeded two-, three- and four-parcel bundles. Full rows sail away. Rotation uses bounded horizontal wall kicks; cargo cannot pass through other cargo. Drop places the bundle immediately; overflow ends the round without losing earlier stars. Multi-row clears and consecutive clear combos add points. Free play opens after all eight first-world levels, supports voluntary docking, and records a local named best. Stars reward finishing, then finishing within the two visible load thresholds. Helper has the same thresholds.

Worlds: Picnic Harbor (eight slow introductory deliveries), Trade Wind Bay (eight faster canoe, score and stuck-crate goals), Moon Tide (eight faster goals with rising rows at load boundaries), and Number Voyage (eight number levels with targets 9, 12, 15, 18 and 21). Initial deliveries leave a clear channel; later bundles come from deterministic seeded selection. World 1 starts at 2.4 seconds per fall, increasing gradually; Moon Tide reaches 0.505 seconds. Garbage has a three-parcel gap and comes less often with Helper.

Learning: all parcels carry visible values 1–3. Every full row sails; a matching sum earns a second canoe and 100 bonus points. The target remains large in the HUD. Helper removes automatic falling in Number Voyage: count, move, rotate, then drop. Instructions and star goals are shown before play. The pending English narration source adds four cargo keys, with text and tones available without clips. Practice uses the existing addition skill IDs according to the sum range.

Helper: 1.8× fall interval, two upcoming bundles, and a single hold per level/round. Hold sets a bundle aside and takes the next; it cannot be repeatedly cycled. Switching Helper off/on does not refill it. The pause sheet contains the in-round toggle. Teaching demonstrates a three-parcel delivery, with a still final example under Reduce Motion.

Art: original outlined crates, coconut bundles, fish baskets and taro sacks; dusk, harbor and number-voyage scenery; wooden hold and glossy gold controls. Poko the pelican captain has island, sunhat, explorer and starlight outfits, idle bobbing and delivery/bump reactions. Shared transforms move falling parcels; settled SVG cargo is memoized. Clears show a sailing canoe, particles and score/combo text; Reduce Motion makes decorative responses still. Kit tones and optional haptics accompany inputs and clears. The frame/map/results/chest visual overhaul is a separate worker's slice.

Island edits are additive: a stable nine-game shelf order retains newly registered games; the sticker atlas includes all sixteen existing stickers exactly once across nine named chapters. Rewards remain shared across games. No save schema change or audio-bank edit.

Acceptance: agent-executed comprehensive Cargo flows in isolated touch-enabled Chromium contexts at 390×844 and 1024×768; orientation checks at 768×1024 and 844×390. Required cases: every world reachable via grown-up unlock and first level played to a result; failure/retry; learning bonus and chest; Helper on/off and one-use hold; pause, sheets, simulated browser background, reload; saved stars/stickers/notes/bests; offline reload; busiest-level scheduling. Native, VoiceOver, real haptics/audio comfort and physical A12/child acceptance are not run: no simulators are authorized.

### QA ledger

Execution receipts, gate logs and screenshots: `/Users/leonshimizu/Desktop/ShimizuTechnology/little-island-games-artifacts/island-arcade/arcade-cargo/`. Final execution statuses and source commit will be appended after runtime verification. Automated checks do not establish physical family acceptance.
