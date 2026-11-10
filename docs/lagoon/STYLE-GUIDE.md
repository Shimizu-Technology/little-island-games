# Lagoon Run style guide ("sunlit paper-cut")

LG-S3, L2. This guide covers how Lagoon Run is drawn and baked. World data lives in `src/arcade/games/lagoon-run/look.ts`; art sources live in `scripts/art/`. All art is original to Little Island. Don't copy any existing runner's characters, levels or look.

## Rules

1. **Layered paper-cut shapes.** Build flat shapes in layers, with soft baked light and no gradients on small props.
2. **Three tones per surface.** Each surface gets a lit tone, a base tone and a shade tone. Light comes from one source per world: the sun's position in `look.sun`. Props cast a long soft shadow away from it, plus a contact shadow.
3. **Ink only on what you can touch.** Hazards, pickups and power-ups get a 3-unit `#3E424F` outline. Scenery props, sky, hills, water and deck have none.
4. **Air gets hazier with distance.** Far props fade, and the far deck melts into the world's `haze` colour (`DeckHaze`). Haze never hides a hazard.
5. **One silhouette per action.** Jump hazards are low (log, crate, cooler, crab, coconut). Roll-under hazards are high with a clear gap below (net, frond, banner, line). Go-around hazards are tall (boulder, stone wall, a canoe loaded with sacks). Don't reuse a material across actions; for example, crates are only for jumping.
6. **Hazard fade rule.** Hazards fade in over only the first 15% of the approach, then stay solid (`arrivalOpacity`).
7. **The runner never hides the lane ahead.** The hero is drawn at `HERO_SCALE` 0.72 of track scale, about its contact line. A test checks that the next hazard in the runner's own lane is mostly visible one second before contact, in every lane.
8. **Never upscale raster.** Bake every image at or above its largest on-screen size (see Bake). Sky, water and the frame are live SVG drawn at the arena's real size. The live-SVG runner is supersampled to the stage zoom.

## Camera and HUD

| Setting | Value |
|---|---|
| Zoom | 1.25, as a camera transform. Was 1.7. |
| Horizon | 34% of the visible stage on every screen (`SKY_LINE`) |
| Contact line | `CONTACT` 0.87 of the 660-unit camera frame |
| Letterbox | None. The stage fills the arena (`stageLayout`); a wide screen widens the world, a tall one deepens it. |
| Field-of-view kick | Up to 3.5% wider at top speed. Off with Reduce Motion. |
| Header | The shared Arcade header overlays the run. |
| HUD | Three slim pills under the header: shells, progress (or score in free run), hearts. |
| Arrow buttons | Optional, through the ✥ switch. The choice lasts for the app session. They show by default for VoiceOver users. |

## Worlds

| World | Sky and light | Deck and water | Props | Ambient |
|---|---|---|---|---|
| W1 Morning Beach | Clear blue to pale horizon; low sun on the right | Honey planks, turquoise water | Palm, stilt hut, drying-net rack, gull rock | Three gulls; rails carry net floats |
| W2 Village Festival | Dusk purple to peach; sun low on the left; first stars | Bare boards with worn painted planks, deep teal water | Fruit stall, festival drum, lantern pole, flower arch (all on small platforms) | Bunting with paper lanterns across the sky; seven drifting petals; rails carry lanterns and flags |
| W3–W6, learn | Own sky, water and plank tones; L3 draws them fully | As listed | Three older shapes, now at correct proportions | None yet |

Lagoon doesn't draw storm trails, so W3 no longer advertises them.

## Bake

Run `node --import ./scripts/puzzles/register.mjs scripts/art/bake-lagoon.ts`. It needs `rsvg-convert` (librsvg) and is deterministic. It writes PNGs plus their SVG sources to `assets/arcade/lagoon/`, records sizes, densities and hashes in `assets/arcade/lagoon/manifest.json`, and writes the require map to `src/arcade/games/lagoon-run/art.generated.ts`.

| Asset | Density | Notes |
|---|---|---|
| Deck bands (`<world>/floor-N`) | @3× of the zoomed band at its nearest edge | Periodic, world-space plank texture, 2-board period, lane cue dashes. See `floorBands.ts`. About 20 MB decoded per world, and only the current world loads. |
| Props (`<world>/prop-N`) | 4× of 100×240 | Uniform proportions |
| Hazards, shell, power-ups (`actors/`) | 4–5× | Coconut ball and shadow are separate so the ball can roll. |
| Canoes | 3× at four depths, still and moving | Mapped onto the collision quad; see `bakedGeometry.ts`. |
| Rails (`<world>/rail`), deck, ramp, roof | 3× | Ramp has small painted chevrons. |

## Performance rules this art must keep

- Nothing redraws vector art per frame. A countdown ring that pushed an animated SVG prop every frame cost whole frames.
- No React render may happen as a hazard row passes. The teaching cue's four variants are pre-mounted and switched by pose.
- Draw order is fixed. Depth actors have pre-mounted front and back twins and a stable draw key. Layer containers use `collapsable={false}`.
- Acceptance is the W1-8/771 replay on the simulator: at least 58 fps, at most 6 ms main CPU per frame, and under 2% of pickup windows above 33.4 ms. `docs/lagoon/DEVICE-PROTOCOL.md` covers real devices.
