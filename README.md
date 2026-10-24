# Little Island

Eleven offline family games and nine learning games (reading, numbers, science, thinking and CHamoru words) for iPad and iPhone, plus fifty illustrated Explore discoveries. Classic games: Tic-tac-toe, Hangman, Memory Pairs, Checkers, Maze Explorer, Number Island, Go Fish, Crazy Eights, Secret Word, Island Dash, and Picnic Mystery. A shared web build supports offline play after its first successful load. Picnic Mystery also offers parent-approved nearby iPhone/iPad family rooms; solo play and all learning content need no internet.

The app includes local opponents, same-device play, three difficulty choices, hints, undo, playable Checkers lessons, bundled spoken clues/instructions, automatic saves, and grown-up backup/restore. There are no accounts, ads, purchases, analytics, or backend. Saves stay on each device; exporting a backup is the transfer/recovery option.

Family preview comes first. Public distribution requires separate privacy, content-rights, store metadata, and physical-device acceptance. See [product brief](docs/PRD.md), [build plan](docs/BUILD_PLAN.md), [acceptance ledger](docs/QA.md), and [privacy/content notes](docs/PRIVACY.md).

## Development

Use Node 22.13 or newer and the committed npm lockfile.

```sh
npm ci
npm run check
npm run doctor
npm start
```

Metro uses port 43820. For the production web bundle, run `npm run export:web`, then `npm run preview` (port 43821). The service worker bundles the application and audio for subsequent offline launches; the first visit needs a connection. A new export gets its own cache fingerprint.

Native configuration uses Expo SDK 57 and React Native 0.86.3, with iOS/iPadOS 16.4 minimum. Generated `ios/` and `android/` folders are ignored; configure them through `app.json` and Expo plugins. Ruby 3.3.4 and the Gemfile lock pin the CocoaPods toolchain for local iOS builds.

```sh
bundle install
npx expo prebuild --platform ios --no-install --no-clean
cd ios
bundle exec pod install
cd ..
npx expo run:ios --configuration Release --no-bundler
```

A Release build embeds JavaScript and assets and runs without Metro. `npm run ios` is a development convenience and does not prove installed offline acceptance. Use a task-owned simulator and clean it after testing.

## Family installation

Internal TestFlight testing uses the separate **Little Island: Family Games** App Store Connect record and Leon’s internal tester group. See [TestFlight release details](docs/TESTFLIGHT.md) for the exact build and delivery status. TestFlight installation does not require registering device IDs. Physical acceptance remains in the [acceptance ledger](docs/QA.md).

For direct development/ad hoc installation, `eas.json` also supplies Release profiles for a simulator (`simulator`) and registered family devices (`family`). Signing credentials and available cloud-build allowance are needed:

```sh
npx eas-cli@latest build --platform ios --profile family
```

Register the actual iPad and iPhones before producing an internal distribution build, then install the resulting signed artifact on those devices. This repository does not contain credentials or provisioning profiles. Public App Store release is outside this family beta. See the acceptance ledger for the actual build/install status; configuration alone is not an installed app.

Before Stassie uses it, verify her device's Settings → General → About model and iPadOS version, install a compatible signed build, then observe choosing a game, asking for help, leaving/resuming, and replaying. Verify cold launch, audio and saves in airplane mode. Export a backup before replacing or uninstalling a family build.

## Source and content

Rules live in `src/games/`; screens consume those same rules for moves, opponents and hints. Versioned save validation and recovery live in `src/state/`. Regression tests cover rule edge cases, imported-state validation, interrupted saves and recovery races.

`scripts/generate-icons.py` makes original geometric app artwork. `scripts/generate-audio.py` generates local preview speech and tones; checked-in audio works offline. The speech distribution-rights gate is documented in the privacy notes. This repository started from the Expo blank TypeScript template; its original license is retained in LICENSE.
