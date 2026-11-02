# The Island: phase-one design lab

This is a web-only comparison of two home-map directions. It never replaces or links from the real home screen. No new content engine, save schema, learner stage, or native dependency is introduced.

```sh
npm ci
EXPO_PUBLIC_ISLAND_MAP_LAB=1 npm run check
LITTLE_ISLAND_PORT=43857 npm run preview
```

Open `/island-map-lab?direction=a` (postcard) or `?direction=b` (village). Add `&text=large` for the explicit 150% text study. Ordinary production exports redirect this route to Home unless the lab flag is set. Native always redirects to Home. CSS and SVG here are prototype assets; phase two needs a deliberate React Native port.

Buildings open a keyboard-accessible preview dialog. School, Arcade and Game Hall expose the current catalog; launch buttons open the existing routes. Everything includes Continue, Try today, favorites, every current game and the existing settings. Continue/suggestions/learners use current modules and saves. CHamoru opens the existing `hafa-adai` activity from its own subject entrance. It is excluded from Reading in this lab to avoid duplication.

Art is original vector work. Terrain and each landmark are separate memoized components. The only idle animation is CSS transform/opacity on a flag, smoke and water; Reduce Motion stops it. No animation writes to React state. Native performance and VoiceOver remain phase-two acceptance.

The external `v3/hub/REPORT.md` records context, direction comparison, stage proposals, estimated phase-two effort, QA and screenshot paths. Nursery is reserved as the north-edge grove, with no sign, control, teaser or promise before usable content exists.

On a heavily loaded shared host, add `LITTLE_ISLAND_SLOW_HOST=1` to `npm run check`. This gives the existing large fixtures up to thirty minutes; normal budgets, test coverage and assertions stay unchanged.
