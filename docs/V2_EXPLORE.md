# Explore implementation and acceptance

## Sourced brief

October 19, 2026; isolated branch `feat/v2-explore`, base `cbd1107`. Leon approved a complete family-first offline discovery collection for Stassie, age seven, alongside the Little Island games. The current release contract is [V2_RELEASE.md](V2_RELEASE.md); existing app purpose and styling are in [PRD.md](PRD.md). The Brain Dump was searched for Little Island notes; no matching project note was found. The conversation and release contract remain the source for this scope.

The primary journey is map → world or search → discovery → listen/read/save → activity or related topic → back. A child should be able to keep following questions without leaving the reviewed collection. A parent controls sound and stores favorites. No backend, AI, account, browser link, web view, or required download is introduced.

The design retains cream, deep teal, quiet paper surfaces, and the app's Avenir/native typography. An original illustrated archipelago separates the five worlds; this map is explicitly imaginary. The geographic activity uses a separate original simplified Earth map. Press feedback is immediate opacity, with no decorative animation. Text remains present when sound is off. Controls wrap rather than shrink below touch size; large text switches topic cards to one column. Keyboard focus uses an outline. No local server, tab, device, or emulator was started by this slice.

## Implemented content

`src/explore/content.ts` contains fifty original topics, ten each in Space, Oceans, Animals, Weather, and Guam & Our World. Each topic includes a stable ID, question title, short explanation, deeper fact, useful activity prompt, three internal related IDs, original illustration motif, primary source URLs, and review metadata. `topicNarration(topic)` exposes the exact readable transcript for bundled audio generation. Reading uses both explanations and the prompt; no unreviewed text is generated at runtime.

Sources were researched on October 19 using NASA, NOAA, USGS, National Park Service, Smithsonian, and Cornell Lab primary educational material. Unreachable guessed source paths were removed or replaced with reachable/indexed source pages. Some primary sites intermittently return fetch errors; source addresses are references, never runtime dependencies. The content avoids unstable mission records and exact population counts, explains simplified models, and distinguishes forecasts from current warnings. Guam geography uses USGS's General Geology of Guam plus NPS nature context. Cultural or Chamorro-language claims have not been invented.

This is an agent fact check, not a human educator's sign-off. Parent/child comprehension, pronunciation of the generated narration, and editorial review before a public release remain acceptance work. The supplied source metadata says this explicitly. All explanations and vector code are original; source facts do not grant a license to source photographs. No photographs, logos, copied diagrams, recordings, or quoted source passages are included. The per-topic asset registry is `src/explore/rights.ts`. The parent integration owns speech generation and its distribution-rights gate.

## Integration contract

Import `ExploreScreen`, `TOPICS`, `topicNarration`, `normalizeExploreFavorites`, and optionally `EXPLORE_ASSET_REGISTRY` from `src/explore`.

```tsx
<ExploreScreen
  favorites={save.exploreFavorites}
  onToggleFavorite={(id) => toggleAgainstLatestSave(id)}
  onBack={() => returnToLittleIsland()}
  onSpeak={(id, transcript) => playBundledDiscovery(id)}
  onStop={() => stopNarration()}
  narrationEnabled={save.settings.sound}
  speakingTopicId={currentlyPlayingTopicId}
/>
```

The toggle callback applies an ID to the parent's latest save, avoiding stale replacement arrays during rapid taps. Unknown imported favorites should be rejected by parent validation or normalized before use. The exported normalizer accepts only known unique topic IDs. Search covers titles, both explanations, and world names; multiple search words must all match. Search, favorites filter, scroll positions, and a history stack are retained within a mounted Explore visit. Related-topic Back returns to the previous topic; another Back returns to its original list with its context.

Every internal navigation and exit stops narration, as do unmount and sound being disabled. Listen is disabled with explicit text when sound is off. Stop is enabled only when the parent reports that topic playing. Source URLs are selectable reference text, without link handlers. The module does not use external navigation.

The parent owns route registration, saved favorites, backup inclusion, migration/validation, bundled audio mapping, player lifecycle, and source integration QA. This module owns no shared Store, app routes, package/config, or audio files. Activity state persists while navigating inside the mounted Explore screen. Leaving/restarting the section starts the activities again; this is deliberate and does not delete favorites.

## Five working activities

| World        | Activity           | Meaningful actions and outcome                                                                                                                                                                                                        |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Space        | Day & night lab    | Turn a marked location through eight positions while sunlight stays fixed; observe day, night, and boundary positions; reverse or reset. Eight steps return to the starting orientation.                                              |
| Oceans       | Build a food chain | Choose energy source and successive food/eater links; incorrect order explains the next connection without advancing; undo the last link; complete a five-link chain. Real food webs are explicitly more complex.                     |
| Animals      | Habitat detective  | Match six animals to suitable habitats using food, water, shelter, and space. Wrong choices retain the case; each correct answer explains why; six matches complete the activity. Cases use the same ecology described in the topics. |
| Weather      | Water journey lab  | Evaporate, condense, grow drops, rain, soak into ground or run off, return to ocean, freeze, and melt. The diagram/state/explanation change together. A bounded recent-path notebook shows alternative routes.                        |
| Guam & World | Map expedition     | Solve five geographical clues using numbered original map markers and accessible destination buttons; wrong selections retain the clue, correct selections add a fact and advance; finish all five or restart.                        |

`activities.ts` contains pure rules that drive the UI. Reset is always available. No timers or gestures are required. The north-up geographic map is approximate, not to scale or for travel navigation. Guam and Japan are east of Asia; Australia is south of Guam; Antarctica is stretched along the bottom of this flat view. The diagram has redundant numbered buttons so tiny map markers are not the only input.

## Actual verification

Executor: implementation agent, source slice only. Node 22, Expo 57/RN 0.86 types. `npm ci --ignore-scripts` completed. `npm run typecheck` and `npm run lint` passed. Nine meaningful module tests passed: content counts/internal destinations/transcripts/provenance fields; multiword search and filters; bounded favorites; day/night full rotation; ordered chain with correction; complete habitat matches; branched water journeys and bounded history; map mistakes/completion; and reset/serializable interrupted-state continuation. Full existing tests are recorded by the final command below when run.

No browser or installed-device execution is claimed by this slice. Parent integration must execute V07–V10 against its exact commit/build: reach all fifty topics; search/favorite/return context; complete all five activities; listen/transcript/Stop and sound off; keyboard and large-text layouts; phone/iPad portrait and landscape; offline cold launch with all generated audio bundled; persisted favorites through restart/backup/update. Actual audible quality, VoiceOver hearing/focus, Stassie's comprehension, and the unknown family iPad model remain operator acceptance.

Final source-slice verification: all five existing/module test files passed, **62 tests total** (53 existing plus 9 Explore). Typecheck and lint passed after formatting. These checks validate source logic and compilation, not rendered UI, native audio delivery, or child usability.
