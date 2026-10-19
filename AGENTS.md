This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Little Island contract

- Read docs/PRD.md and docs/QA.md. Family-first offline game collection; public release remains a separate gate.
- One independently writable task per branch/worktree. Preserve other sessions' resources.
- Start: `npm start` (Metro strict port 43820), or `npm run export:web && npm run preview` (static preview port 43821, override LITTLE_ISLAND_PORT).
- Stop: terminate the exact owned root process with SIGTERM; scripts/serve.mjs closes its listener. No Docker services or persistent resources belong to this app.
- Full gate: `npm run check` and `npm run doctor`. Native release/simulator tests and real family device acceptance are recorded separately in docs/QA.md.
- Node >=22.13.0. Use the lockfile and `npm ci`.
- Rules and hints must share the same pure engines. Store only validated, versioned sessions; preserve original data during recovery/restore.
- CodeRabbit is advisory unless repository protection says otherwise. A skipped/unavailable review is not approval; use completed independent final-code review when advisory review is unavailable.
- Do not publish the family preview to a public store. Clear speech distribution rights, child-facing metadata/privacy, and real-device acceptance first. Family device builds are authorized; interactive account/device registration may still be required.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
