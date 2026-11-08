# Internal TestFlight release

Leon requested an internal TestFlight build on October 19, 2026 so he can test on family devices. This beta delivery does not complete the outstanding acceptance cases in QA.md or authorize public App Store distribution.

## App identity

- Apple team: `4T358A5S74` (existing individual membership).
- Bundle ID: `com.shimizutechnology.littleisland`.
- App Store Connect: `6824481437`, **Little Island: Family Games** (the shorter name was unavailable).
- EAS project: `8147346d-095e-4e2a-88ed-f5711aa74940`, `@shimizutechnology/little-island-games`.
- First TestFlight target: version 1.0.0, build 4; iPhone and iPad, minimum iOS/iPadOS 16.4.
- Existing distribution certificate reused: `88CUWN8J2G`; separate active App Store profile: `2STXA6SVLC`.

The production profile uses store distribution and an explicit local build number. Increment `ios.buildNumber` before each new upload, commit that change, then build from the recorded commit. Never submit an assumed latest build from another app.

```sh
eas build --platform ios --profile production --non-interactive --freeze-credentials --no-wait
# Once the exact build finishes and this app's App Store Connect ID is configured:
eas submit --platform ios --profile production --id <exact-eas-build-id> --non-interactive
```

EAS owns the signing credentials. No private keys, certificates, passwords, or provisioning profiles belong in Git. Existing submission credentials may be reused for this app, without rotating shared account credentials.

## Word-bank delivery gate

For current program builds, use `npm run ios:preview-build -- <build command>` and deliver with `npm run deliver:ios -- <submission command>` (or `deliver:web` for a web delivery). Set `LITTLE_ISLAND_WORD_POLICY_LOCK`, `LITTLE_ISLAND_WORD_RECEIPTS` when banks exist, `LITTLE_ISLAND_WORD_WEB_ARTIFACT`, `LITTLE_ISLAND_WORD_IOS_ARTIFACT` and a new external `LITTLE_ISLAND_WORD_RELEASE_RECEIPT`. The wrappers run full detached admission, scan the actual web and embedded Hermes artifacts, then verify the source/policy/artifact-bound receipt before delivery. A hand-written bank with a matching manifest is insufficient. Keep source clean; default generated Library files are restored before receipt creation. Historical commands below describe earlier deliveries and do not bypass this gate for new builds. Public distribution remains a separate gate.

## Acceptance and delivery

Success requires an App Store Connect record for this exact bundle ID, an uploaded build that finishes processing, and internal access for Leon. A successful upload alone does not establish that the build is available in TestFlight or installed on a device. Record the exact source, build ID, Apple processing state, tester group, and remaining checks after delivery.

Keep this beta limited to Leon's adult tester account. The existing child-account and speech-distribution limitations in PRIVACY.md remain. Physical offline launch/audio, Files backup round trip, accessibility, and the remaining device/mode matrix still need acceptance. PR1 source integration now follows the explicit family-feedback gates in POLISH_REVIEW.md; public and physical/child acceptance remain separate.

## Local build 4

The cloud service rejected the build because the account’s free monthly iOS allowance was exhausted. No cloud build was created and no plan upgrade was purchased. A local Xcode 26.6 archive and `app-store-connect` distribution export succeeded instead.

- Source: `567b5174146123dc630e13cd09d69e99f7e7d2c8`; runtime game code remains the reviewed build 3 source.
- Artifact: `LittleIsland.ipa`, 19,819,035 bytes.
- SHA-256: `0b50449522be1e97b8c90fc970059f1840955ee413548286e323773265f53359`.
- Verified version 1.0.0 (4), exact bundle ID, minimum OS 16.4, both device families, and strict code signature.
- Embedded App Store profile has beta entitlement, no device list, and debugging disabled.
- Existing credentials were reused. The temporary signing keychain, private files, and task-installed profile were removed; the original keychain search list was restored.
- Internal group `Leon` (`95450b29-136b-4227-8df6-7eb3c67ceff9`) contains Leon’s existing account only; automatic distribution is off.

Submit the exact locally verified artifact:

```sh
eas submit --platform ios --profile production --path /absolute/path/to/LittleIsland.ipa --non-interactive
```

Local artifact paths, signatures, source, and delivery receipts stay outside Git in the sibling `little-island-games-artifacts/testflight` directory. Submission `6e2572ae-676d-4c08-8b2f-9113efdf16cc` finished successfully. Apple processing completed. App Store Connect’s **Leon** group shows **1.0.0 (4) — Testing**, **1 Tester / 1 Build**, and the existing tester account is **Invited**. Apple build ID: `25e90130-e46b-46b0-a271-f3dc0ea3e38d`. Availability was verified through the signed-in UI; a final API receipt timed out. See [delivery evidence](evidence/testflight-build4.json).

Open TestFlight on the family device with the invited account, accept the invitation, and install **Little Island: Family Games 1.0.0 (4)**. Leon subsequently reported successful phone use and supplied screenshots. The iPad and child acceptance remain unverified. Build4 delivery is complete; PR1 is being updated under the new family-feedback integration gates.

## Local build 5 (previous internal beta)

Build 5 delivered the PR1 family-feedback changes. Source `97f010851e8f15b08457bf546a82cc2cdbe416d6` has the same application tree as merged main `e4ba26a42ea7bd6ede424b23c0e34943674c7367`. The exact 19,857,178-byte IPA SHA256 is `f5cc2a91d1b1eca1e6b4d496c96e78364898f63264836ada5e7905be42a7302b`; strict signature, App Store profile, bundle/version/families/minimum OS were verified. Submission `d054d8a2-6f1b-43ac-9ad1-650b106be10b` finished. Apple build `5aa8804f-3ac7-4718-aa70-531694403de3` is `VALID` / `IN_BETA_TESTING`, attached to the existing Leon group (one adult, automatic distribution off). Local receipts are `ipa-build5.json`, `submission-build5.json` and `apple-build5.json` in the artifact directory above. Physical installation is not established by that API receipt.

## V2 internal beta: 1.1.0 (6), available

Leon explicitly authorized the full V2 implementation, reviewed main integration and next internal TestFlight build. [V2_RELEASE.md](V2_RELEASE.md) defines scope; [V2_QA.md](V2_QA.md) records completed journeys and unresolved gates. Local simulator artifact iteration names such as “Native7” still identify 1.1.0 (6), not a TestFlight build 7.

PR#2 merged to main as `e9445d113487862f5388fef8efb4d53c3a89d2ee`. Its final PR validation and post-merge main validation passed. A fresh CNG workspace and pods were generated from that clean main commit, then the local archive/export fallback produced the signed IPA. Existing signing credentials were reused; the temporary keychain, private files and task-installed profile were removed.

- IPA: 28,978,652 bytes; SHA256 `e8b2af97cc57cbb5c81d6bb61a2c6b696c10ed7b9cb2b03f1001af0a5d681b8b`.
- Embedded JS SHA256 `ff0d1e28d476385289846e13479af27f88b9c1b8262ee0ea03bc8d6ec6a4b2ca` matches the sealed archive. Strict code signature, signed App Store entitlements, bundle ID, version/build, minimum 16.4, both device families and Bonjour configuration were verified.
- All50 Explore narration files in the signed IPA match their source bytes. This verifies bundling; physical audio playback and pronunciation remain operator checks.
- EAS submission `9f75b440-1505-47e1-b90b-29fcab7eb868` finished. The exact completed Apple upload links to build `73bc73b2-8786-49eb-8cb2-26a1f57c4fa6`.
- At `2026-10-19T22:51:07.482Z`, App Store Connect reports `VALID` / `IN_BETA_TESTING`, attached to the existing **Leon** internal group with one adult tester and automatic distribution off. Updated English testing notes were verified. No public group or public release was created.

Open TestFlight and update **Little Island: Family Games** to **1.1.0 (6)**. Availability does not prove installation or physical family acceptance. See [delivery evidence](evidence/testflight-build6.json) and [the V2 acceptance ledger](V2_QA.md) for remaining device/operator checks. Local archive, signature, source and delivery receipts remain outside Git in the artifact directory above.


## Quality release: 1.2.0 (7), available

PR#4 merged as `f830c79591678a090b661eb3b88319f0bf01e9a6`. Its tree matches final validated PR head `0717009`; the application source is the reviewed `ca5464d`. Final-head CI passed, and the independent final-code and merge-readiness reviews found no unresolved material issues. CodeRabbit supplied a Free-plan walkthrough/summary, with no review object or actionable inline comments; the repository's advisory-unavailable fallback is the completed independent review. [QUALITY_QA.md](QUALITY_QA.md) records the executed journeys and limits.

The exact clean merge was regenerated with lockfile installation, Expo CNG and scoped CocoaPods before a local Xcode 26.6 archive/export. Existing credentials were reused; temporary signing files, keychain and task-installed profile were removed.

- Signed IPA:30,664,091 bytes; SHA256 `cd85fa49c94656397ece9e7f4e335d371ee890a8e529b3f4bbc5e07841c7baa0`.
- Embedded JS SHA256 `9de392b9da5e4a7b43dacf12f85f96ac23aa47aca897bdeaeb9284e9e662a844` matches the archive. Strict signature, App Store profile, signed entitlements, exact bundle/version/build, minimum 16.4, iPhone/iPad families and Bonjour declaration passed verification.
- All 197 referenced audio files match the signed IPA bytes. This verifies bundling, not audible playback, pronunciation or speech distribution rights.
- EAS submission `d65a14bc-b132-41d4-9cac-8904d12eb8c3` finished. Its immutable local submit receipt binds the verified IPA hash/source to the captured EAS job. The exact completed Apple upload links to build `b78e1528-fe42-49d4-b0f8-04d03054eabb`. At `2026-10-20T03:25:51.443Z`, Apple reports `VALID` / `IN_BETA_TESTING`, attached to the existing **Leon** internal group: one adult tester, automatic distribution off. Updated English testing notes were verified. No public group or release was created.

Nearby protocol 2 requires every family device to update together. The actual three-device simulator session passed parent approval, private roles, helper contribution/disconnect, active pause/same-seat recovery, shared terminal, same-approved-room rematch, new-round action and host closure. All task-owned devices/panels/runtimes were cleaned. The temporary LittleIsland incoming exception was removed; all original 34 firewall rules stayed unchanged and the firewall remained enabled.

Physical family installation, touch, audio/VoiceOver, native Files backup operation and enjoyment remain operator checks. Public release is held. Local generation, archive, signature, submission and Apple receipts remain outside Git in the sibling artifact directory above.

Open TestFlight and update **Little Island: Family Games** to **1.2.0 (7)**. Every nearby player must update. See [build7 delivery evidence](evidence/testflight-build7.json); availability does not establish a physical installation.

## Family ease beta — 1.2.0 (8), 21 October 2026

Build 8 is available to the existing Leon internal group (one adult tester). Apple processing is VALID and internal state is IN_BETA_TESTING. It includes the merged favorites, quick replay, Explore activity entries, first Garden job guide and preserved-save recovery improvements. Release source is `2c4626a69ba54f9ca7bafc52761d8f4eb7a0a9b3`; EAS submission `9b599825-9b5e-4a5b-a694-08cd2d0c4fca` finished; Apple build/upload `b4c6c59d-db63-4be7-bd43-d9d2215b46d2` is attached. No new testers or public release. See [build 8 execution and limits](TESTFLIGHT_BUILD8.md) and [delivery receipt](evidence/testflight-build8.json). Physical installation and family acceptance remain operator checks. Temporary signing resources were cleaned.

## Design and family-play polish — 1.3.0 (9), 24 October 2026

Leon asked for the 24 October audit to be implemented and delivered to TestFlight. PR #9 merged as `66c035e36a9d0fdfece9011dd01aefe88decaf3a` (tree equal to the reviewed head `b7a77f5`); scope and acceptance are in [AUDIT_POLISH.md](AUDIT_POLISH.md). A clean release checkout of that merge ran `npm ci`, Expo CNG and CocoaPods, then the full check (261 tests) and Doctor 21/21 before the local Xcode 26.6 archive/export. Existing credentials were reused in a temporary keychain that was removed afterwards; the original keychain search list was restored.

- Signed IPA: 32,645,835 bytes; SHA256 `165677579d3570317f5aa90ed2e98be9794efad71ade90a64f7c26b9850abc73`. Embedded JS matches the archive; strict signature, App Store profile and signed entitlements passed; version 1.3.0 (9), iPhone/iPad, minimum 16.4. All 312 referenced audio files match source bytes.
- EAS submission `a90e2ba4-cfc3-438e-9d21-413d6bf674c2` finished. Apple build `555b871c-d094-4a1f-ab40-c58244353a45` is `VALID` / `IN_BETA_TESTING`, attached to the existing **Leon** internal group (one adult tester, automatic distribution off), with English testing notes verified. An extra empty upload reservation for build 9 has no attached build.

Open TestFlight and update **Little Island: Family Games** to **1.3.0 (9)**. Physical installation, haptics, audio and family acceptance remain operator checks. See [build 9 delivery evidence](evidence/testflight-build9.json).

## Learning games — 1.4.0 (10), 25 October 2026

PR #11 merged as `3ae09363432a3a3430293a252be16a05561c0af4` (tree equal to the reviewed head `3c35129`); scope and acceptance in [LEARNING_WAVE1.md](LEARNING_WAVE1.md). A clean release checkout ran `npm ci`, Expo CNG and CocoaPods, the full check (429 tests) and Doctor 21/21 before the local Xcode 26.6 archive/export. Existing credentials were reused in a temporary keychain that was removed; the original keychain search list was restored.

- Signed IPA: 53,214,652 bytes; SHA256 `7b42985670cad9a428d68de61f0ecc81f01cc1cbc1c5523b434cdf16dee6e8d6`. Embedded JS matches the archive; strict signature, App Store profile and signed entitlements passed; 1.4.0 (10), iPhone/iPad, minimum 16.4. All 1,643 referenced audio files match source bytes.
- EAS submission `a5c72781-d13d-43dd-a0af-7be58e9459a9` finished. Apple build `7b4956fb-9e22-41d7-b1c2-f39c5e544162` is `VALID` / `IN_BETA_TESTING`, attached to the existing **Leon** internal group (one adult tester, automatic distribution off), with English testing notes verified.

Open TestFlight and update **Little Island: Family Games** to **1.4.0 (10)**. Physical installation, audio, CHamoru native review and family acceptance remain operator checks. See [build 10 delivery evidence](evidence/testflight-build10.json).



## Intuitive learning beta — 1.5.0 (11), available 25 October 2026

Leon explicitly requested the next TestFlight build for testing after simulator-host failures blocked the remaining native acceptance. This beta was built from clean PR #13 source `34639ea2d174f75d9212977b15209e5b9bf46019`, not a main merge. Application source remains `d854d90`; subsequent source commits only recorded acceptance. PR #13 stays open while iPad rotation and cold-launch recovery need verification. This delivery does not mark those cases passed.

A fresh release check passed typecheck, lint, 477 tests across 35 files, web export and Expo Doctor 21/21. The local Xcode archive and App Store distribution export used the existing credentials; temporary signing resources were removed and the original keychain search list restored.

- Signed IPA: 44,016,671 bytes; SHA256 `38ff48d5e26e4ba3a30276872a75f1cfc4b99f6d77ab2e67571779c605d1b010`. Embedded JS matches the archive; strict signature, App Store profile, signed entitlements, bundle ID, 1.5.0 (11), minimum 16.4 and iPhone/iPad families verified. All 1,279 referenced audio files match source bytes.
- EAS submission `d66d7df9-17a8-4856-9373-c4dd2dd161de` finished. Completed Apple upload/build `16ee1624-3040-4e0f-8ea3-14e554e824fd` is `VALID` / `IN_BETA_TESTING`, verified at `2026-10-25T10:52:50.371Z`. It is attached to the existing **Leon** internal group: one adult tester, automatic all-build access off. English testing notes were verified. An additional empty upload reservation has no build attached; no duplicate submission was made.

Open TestFlight and update **Little Island: Family Games** to **1.5.0 (11)**. Try the nine learning games without explaining the controls first, then check sound-off during Float or Sink, saved-round continuation after force close, and iPad portrait/landscape. Actual installation, physical audio/VoiceOver and child/family usability remain operator checks. No public distribution was created. See [delivery evidence](evidence/testflight-build11.json) and [acceptance](LEARNING_INTUITIVE.md).

The verified archive/IPA and private receipts remain outside Git in the sibling artifact directory. Only this task's device DerivedData was removed after artifact verification. No task-owned runtime resources remain; held source and release worktrees are preserved.


## Math practice beta — 1.6.0 (12), available 26 October 2026 Guam time

Leon authorized the three math activities and optional practice before new rounds through private TestFlight. Source `aba07b25395ba6bac29990014b5fe48934e9d4b6` is clean application source from stacked PR14, based on open PR13. Neither PR was merged; native simulator interaction remains blocked by host/runner failures. The private beta is explicitly authorized despite that limitation.

Full check passed: typecheck, lint, 520 tests across 40 files and production web export; Doctor 21/21. Browser acceptance covered 18 math configurations/78 answers, all six classic launch guards, card/party/race/Mystery solo launch paths, cancellation, saved Continue, parent settings/notes and offline mixed practice. Final independent code review is clean; CodeRabbit substantive review was skipped on the stacked base/Free plan. Details and remaining dimensions: [math acceptance](MATH_PRACTICE.md).

The local Xcode Release archive and App Store export produced a 57,964,821-byte IPA, SHA256 `c3d98491b8c48ff0fa17f0a27d6ed2448049c72c0ad7dceac24639236bf98bf6`. Strict signing/profile/entitlements, iOS 16.4, both device families, archive/embedded JS and all 2,111 referenced audio files passed verification. Temporary signing credentials, keychain and owned profile were removed.

EAS submission `68a95c10-a2ac-45ab-99f7-0981e50ea000` finished. Apple upload/build `f0a590c3-9919-4ff7-a9fd-7909e2ef7835` is VALID / IN_BETA_TESTING and attached to the existing Leon internal group with one adult tester and automatic all-build access off, verified at 2026-10-25T14:09:28.674Z. English testing notes were verified. Xcode export's separate empty upload reservation has no build; only one actual build 12 was submitted. Build 11 was not resubmitted. No external/public distribution was created. [Structured delivery evidence](evidence/testflight-build12.json).

Update Little Island in TestFlight to **1.6.0 (12)**. Find Shell Math, Number Hop and Quick Practice on the Numbers island. Optional three-question practice starts off; enable it under Settings → For grown-ups → Practice, then play. Help counts; saved games continue normally. Physical installation, audible quality/mute, native keyboard/rotation/recovery, VoiceOver and child usability remain operator checks. PR14 stays held for that acceptance.

Owned browser, preview server and simulator were cleaned; lifecycle session 01a17186-714f-7ee2-994a-bccc0bafba80 reports no active owned resources. The held implementation and immutable release worktrees are retained.


## Learning growth beta —1.7.0(13), available26 October2026 Guam time

Leon authorized harder concepts across all learning games and warmer offline narration through private TestFlight. Clean source `70ed873c8dc3d4b6ae648e7e39b4b020f54fe0e3` on stacked PR15 produced this beta; PR13/14/15 remain held for native/family acceptance. The source passed574 tests/45files, typecheck, lint, web export, Doctor21/21 and CI. Independent reviews resolved the material findings; CodeRabbit explicitly skipped the stacked base/Free plan. [Scenario ledger and limits](LEARNING_GROWTH.md).

The EAS cloud build attempt was rejected by the exhausted free iOS quota; no cloud job or paid upgrade was created. A clean isolated release checkout, Node22.22.3 lockfile installation, Expo CNG and scoped CocoaPods produced the local Xcode26.6 Release archive/export. Existing signing credentials were reused; temporary keychain, private files and owned profile were removed.

The signed IPA is167,588,435 bytes, SHA256 `cc4d34095e3c8adef86aa84655d38896c78cb3caafad533f7e27baf87dc4ffd1`. Embedded JS SHA256 `9b5d893004e8048f4b0f8ef62243332ad7c110041558ac590ea3bea24fae7174` matches the archive. Strict signature, App Store profile/entitlements, exact bundle/version, minimum iOS16.4 and both device families passed. All5535 referenced audio files match source bytes; all decoded successfully. This does not establish physical audibility or comfort.

EAS submission `f84cfc32-1bb6-4f4c-b1cb-62d0f82f4d01` finished. Apple upload/build `69913fa6-43cd-4547-ae02-946b050bf1f9` is VALID/IN_BETA_TESTING, verified at `2026-10-26T02:44:31.012Z`, with English notes and attachment to the existing Leon internal group: one adult tester, automatic all-build access off. The Xcode export created a separate empty upload reservation; there was one actual IPA submission. Builds11/12 were not resubmitted. No new testers, public link or public release. [Structured evidence](evidence/testflight-build13.json).

Update Little Island in TestFlight to **1.7.0(13)**. In each learning game, open **New round & options** and choose a harder skill. The original beginner activities remain available; Show me always counts as helped practice. Compare **Settings → Narration voice → Warm/Calm** and tap Hear this voice. Optional local learners and practice notes are under For grown-ups. Physical installation/update, audio comfort/mute, native interruption/rotation, VoiceOver and child usability remain family checks.

Owned browser/server/simulator resources were cleaned, with no active owned resources in lifecycle session01a17186-714f-7ee2-994a-bccc0bafba80. The exact task device DerivedData was removed; archive/IPA/private receipts and held source/release worktrees are retained.

## Island Arcade beta — 1.8.0 (14), available 28 October 2026 Guam time

Leon asked for island-twist arcade games, older classics, learning inside the games and a clear Level 1–5 path in the learning games, delivered through private TestFlight. Clean source `91685c1b3ebc72bbdb1bb8b421ef227bd4636204` on stacked PR #16 produced this beta. PRs #13–#16 stay held for native and family acceptance.

The source passed the full gate (826 tests across 56 files, typecheck, lint, offline web export), Doctor 21/21 and GitHub CI. Three independent review rounds found three material learning-credit issues, all fixed and re-reviewed with no remaining findings. Before the archive, native Release simulator runs on iOS 18.5 covered every arcade game: map → start → play → pause or result. Those runs used a task-owned iPad mini (5th generation) and iPhone 16 Pro. The simulator build predates the learning-credit fix in 5de5861, which changes only what gets recorded, not what appears on screen; tests cover it.

The archive and export were made locally, as for build 13: a clean release checkout, Node 22.22.3 with the lockfile, Expo CNG, CocoaPods and an Xcode 26.6 Release archive. Existing signing credentials were reused, and the temporary keychain, private files and owned profile were removed afterwards.

The signed IPA is 173,874,018 bytes, SHA256 `cfc6bb09963ce542ab9dfbfd5b84fff25ba02d0a597007fc2020545d546a83aa`. Embedded JS SHA256 `3dba78d1f5b11d247ec060c53afe3a202f4a61c56f73eb7f7fa576e6149ba1c9` matches the archive. The strict signature, App Store profile and entitlements, bundle and version, minimum iOS 16.4 and both device families all passed. All 5,815 referenced audio files in the IPA match the source bytes; 2,906 speech keys per voice.

EAS submission `32108ad8-24f0-4cd4-9d23-a5967de1a2d5` finished after about 24 minutes in Expo's queue. Apple build `165fbf73-3a09-48ea-ae4b-a29c88ab0238` is VALID / IN_BETA_TESTING. It is attached to the existing Leon internal group (one adult tester, automatic all-build access off), with English "What to Test" notes. During attachment, App Store Connect briefly returned 404 for the group; the build attached on retry and the receipt was verified afterwards. As with earlier builds, the empty upload reservation is normal. Receipt: [evidence/testflight-build14.json](evidence/testflight-build14.json).

Update Little Island in TestFlight to **1.8.0 (14)**:
- On Home, open the new **Arcade** island and try any of the nine games. World 1 is gentle, and **Helper** is on the level-start card.
- Treasure chests after a level are optional.
- Classic games now include Coconut Drop, Fishing Nets, Hidden Canoes, Shell Pits and Reef Sweep.
- Learning games show **Level 1 of 5**; tap any stone to choose.

Physical install, touch and multi-touch comfort, A12 smoothness, audio, VoiceOver and Stassie's own choices remain family acceptance.

## Arcade feel beta — 1.9.0 (15), available 28 October 2026 Guam time

Leon played 1.8.0 (14) on his iPhone and found many arcade games sluggish, delayed, unlosable and badly animated. This beta is the feel v2 rebuild from [ARCADE_FEEL.md](ARCADE_FEEL.md): hearts and Game over, Helper off by default, touch-down controls with hold-to-repeat, UI-thread simulation for the fast games, one camera for Lagoon Run, real falling-block mechanics in Canoe Cargo, a "Tap to fly" ready state in Fruit Bat Flight, and 56 levels per arcade game.

The source was clean commit `da6272e2b8018b2a2afaac49659e365debef5ac3` on held PR #16. It passed the full gate (1,108 tests, typecheck, lint, offline export) and Doctor 21/21. Two independent review rounds found two material and three minor issues, all fixed with tests. Native Release simulator recordings of seven real-time games are in `little-island-games-artifacts/island-arcade/native-1.9.0/`.

The archive and export were made locally, the same way as build 14. The signed IPA is 173839993 bytes, SHA256 `be4121f9a0156e272b840336ac4f660b19a878c81fb718fd7c68034b1a0d4d57`. The signature, profile, entitlements, bundle, version and minimum iOS 16.4 all passed. All 5,815 referenced audio files match the source. EAS submission `918caabd-19d5-49a1-9b6c-1a98e13584a4` finished. Apple build `bba3787d-1d2f-4a2f-bf85-549a63db26f4` is VALID / IN_BETA_TESTING and attached to the existing Leon internal group, with English notes. Receipt: [evidence/testflight-build15.json](evidence/testflight-build15.json).

Update Little Island in TestFlight to **1.9.0 (15)** and replay the arcade games. Helper now starts off. Your earlier stars are kept.

Not verified: physical feel and performance, multi-touch on glass, audio and haptics, and VoiceOver.

## Arcade feel v3 beta — 1.9.1 (16), available 29 October 2026 Guam time

On 1.9.0 Leon found Flight laggy, the runner's limbs nonsensical, and Canoe Cargo scrolling on pull-down without tap-to-rotate. Release profiling, a Skia prototype and a genre audit led to the v3 plan in [ARCADE_FEEL_V3.md](ARCADE_FEEL_V3.md). This build includes:
- the 120 Hz opt-in (`CADisableMinimumFrameDurationOnPhone`);
- pose interpolation;
- UI-thread gesture input;
- compact HUD publication;
- non-scrolling arenas;
- mobile-Tetris touch controls with Hold;
- Reef colour retention;
- a rebuilt Lagoon Run runner with streaming scenery and per-shell pickups;
- a new Flight bat rig;
- art and feedback polish for five games.

Source: clean commit `fcf405197aeb034c73eee25e3a4fb2efa13518b0` on held PR #16.
- Full gate: 1,148 tests; Doctor 21/21.
- Independent review: one material finding (a motionless iOS tap couldn't rotate Cargo), fixed and verified natively.
- Native Release simulator recordings are in `island-arcade/native-1.9.1/`.

Delivery:
- The IPA is 173,878,916 bytes, SHA256 `3eab7c818a84447b81c2ebe53ed53b233be5e562347bc9a3e5dec023c985c625`.
- The signature, profile, entitlements and version all passed, and all 5,815 referenced audio files match the source.
- EAS submission finished after about 30 minutes in Expo's queue.
- Apple build `e27f631e-f3ed-4e5e-8a4d-2cb776c05cb6` is VALID / IN_BETA_TESTING in the Leon internal group, with notes.

Receipt: [evidence/testflight-build16.json](evidence/testflight-build16.json).

Not verified: physical 120 Hz smoothness, real-glass gestures, iPad A12 performance, audio and haptics, VoiceOver.

## Arcade feel fixes beta — 1.9.2 (17), available 29 October 2026 Guam time

On 1.9.1 Leon reported three problems: Flight froze on each jump, Canoe Cargo wouldn't rotate a piece until it had been moved, and Lagoon Run needed Subway-style variety. He also asked for clearer icons. Root causes and fixes are in [ARCADE_FEEL_V3.md](ARCADE_FEEL_V3.md#192-17-leons-191-feedback). This build includes:
- preloaded sound players (no more expo-audio `replace()` on every tap, which was the jump freeze);
- Cargo taps keyed to a touch-down token, so the first tap rotates each new piece;
- Lagoon Run v4: obstacles to jump, roll under and dodge, ramps and boardwalks, moving canoes, crabs and rolling coconuts, four power-ups (Shell Magnet, Kite Glide, Spring Sandals, Turtle Shield), and difficulty that rises through W6;
- one GameIcon system across Home, the shelves and the Arcade lobby, plus a new app mark.

Source: clean commit `2cb8d99a4f2a0c775d7fe66516188d16bba1e23b` on held PR #16.
- Full gate: 1,165 tests; Doctor 21/21.
- Independent review: two rounds; all material findings fixed.

Delivery:
- The IPA is 173,921,794 bytes, SHA256 `ebc3f083e1cf7b9c1b5e3a3fc4e39303677885d9461bcdbe4c3a921e057238ea`.
- The signature, profile, entitlements and version all passed, and all 5,815 referenced audio files match the source.
- EAS submission finished in about 5 minutes.
- Apple build `bee35993-9a4f-4072-984b-9b8f297353a8` is VALID / IN_BETA_TESTING in the Leon internal group, with notes.

Receipt: [evidence/testflight-build17.json](evidence/testflight-build17.json).

Not verified: that the flap freeze is gone on a physical iPhone (the simulator never showed it), real-glass gestures, iPad A12 performance, audio and haptics, VoiceOver.

## Arcade art and depth beta — 1.9.3 (18), available 29 October 2026 Guam time

On 1.9.2 Leon reported four problems:
- Lagoon Run ramps were unreadable, rolling under a fence looked like passing through it, and the animation wasn't clean.
- Poko the Canoe Cargo captain looked wrong.
- A purple shape flashed across Flight on each flap.
- He asked for an audit of everything.

Root causes and fixes are in [ARCADE_FEEL_V3.md](ARCADE_FEEL_V3.md#193-18-leons-192-feedback). This build includes:
- depth-ordered Lagoon Run, so obstacles nearer than the runner draw over him;
- solid wooden ramps;
- canoes lying along the lane, with full-length collision;
- a cleaner runner;
- a rebuilt bat wing rig;
- a redrawn Poko and mascot pass;
- an art audit of the other seven games and the shared arcade screens.

Source: clean commit `9925677644b774876efee47d270a381d625ef9c2` on held PR #16.
- Full gate: 1,198 tests; Doctor 21/21.
- Independent review: three minor findings, all fixed.

Delivery:
- The IPA is 173,940,609 bytes, SHA256 `c539291f2796a47c9fbeeb366d1c09abe384123e47006b9f6e390824a5139054`.
- The signature, profile, entitlements and version all passed, and all 5,815 referenced audio files match the source.
- EAS submission finished in about 5 minutes.
- Apple build `8e1c3d92-990a-45df-b4d9-2d26a6c7dda0` is VALID / IN_BETA_TESTING in the Leon internal group, with notes.

Receipt: [evidence/testflight-build18.json](evidence/testflight-build18.json).

Not verified: physical 120 Hz smoothness (simulator frame readings were taken under heavy host load), real-glass gestures, iPad A12 performance, audio and haptics, VoiceOver.

## Little Island 2.0 — 2.0.0 (19), available 30 October 2026 Guam time

Stassie asked for unlockable skins ("like a Fortnite locker") and something like Toca Boca. Leon asked for one cohesive character used across every game, badges by subject, an audit of every game, all-ages fun and a premium feel. Plan and record: [ISLANDER_2.md](ISLANDER_2.md); reward spec: [ISLANDER_REWARDS.md](ISLANDER_REWARDS.md).

This build includes:
- **Every child's own Islander**, made with "Make your islander" and styled in **My Locker** (front and back preview, locked items show how to earn them).
- **The Islander in the games:** the Lagoon Run runner, a reacting companion in learning games, captain on Canoe Cargo, results-screen reactions, and "You" in board games.
- **Island Home:** a decoratable room and beach, drag friends to sit, and a badge wall.
- **24 badges** across Math, Reading, Science & Thinking, CHamoru, Arcade and Classic. Each unlocks wardrobe items or room things; help counts, and nothing rewards speed.
- **Audit fixes:**
  - arcade chests persist;
  - Palm held-fire fixed;
  - Reef rounds saved;
  - Picnic Mystery has a gentle mode;
  - Number Island and Island Dash have options;
  - board result fixes;
  - learner rename and remove.

Source: clean commit `535276250837dc8069e04f6812d8fc770c9dcb5e` on PR #16 (held). Full gate 1,440 tests; Doctor 21/21. Two independent review rounds; all material findings fixed. Lead native walkthroughs on the simulator.

Delivery:
- The IPA is 174,073,925 bytes, SHA256 `ee88e2925c842ce73af52323b3d697fb7d33d5c7d50dafa7c9d0dac7a0b8222a`.
- The signature, profile and entitlements all passed, and 5,815 audio files match the source.
- Apple build `98e90544-6d77-4900-99ea-d9428da09624` is VALID / IN_BETA_TESTING in the Leon group, with notes.

Receipt: [evidence/testflight-build19.json](evidence/testflight-build19.json).

Not verified: physical iPhone and iPad feel, VoiceOver end to end, and Stassie's own acceptance.

## Little Island 2.1 — 2.1.0 (20), available 30 October 2026 Guam time

Leon on 2.0: "why can't people choose their gender and like styling", "when the avatar is put on the bed or chair, they get smaller … why does the crab not get smaller?", and he wanted Island Home customizable like Toca Boca.

**Islander:**
- a "Who's your islander? Boy / Girl / Just me" first step: a preset only, anyone can wear anything;
- brows, lashes, freckles and cheeks;
- 6 more hairstyles and more colours;
- 8 more outfits, plus mix-and-match tops and bottoms.

**Island Home:**
- four rooms (My room, Kitchen, Tree house, Beach hut);
- 41 free furniture items at real-world sizes;
- a colour picker;
- several small items per table or shelf, with a chooser;
- a 2× finer grid and 48 items per room;
- characters keep their size when seated.

Badges still unlock the themed showpieces; decorating and styling are free.

Source: clean commit `93febd3fbadfb8cc55aa81a324b334054c38421e` on PR #16 (held). Full gate 1,478 tests; Doctor 21/21. Two independent review rounds; all material findings fixed (single-item surfaces, overlapping stacked touch targets, toolbar over the tray). Lead native walkthrough.

Delivery:
- The IPA is 174,118,715 bytes, SHA256 `99e1be53fb13d5b8da6e53e46cfb78a0b0723dfa1d5e69a6c279f5e85d313399`.
- The signature passed, and 5,815 audio files match the source.
- Apple build `6d60b63d-71ad-46b3-a93a-db3ee69e6613` is VALID / IN_BETA_TESTING in the Leon group, with notes.

Receipt: [evidence/testflight-build20.json](evidence/testflight-build20.json).

Not verified: physical iPhone and iPad feel, VoiceOver end to end, and Stassie's acceptance.

## Little Island 2.2 — 2.2.0 (21), available 31 October 2026 Guam time

Leon's 2.1 feedback: numbered creator steps weren't intuitive; avatars weren't clearly boy or girl; he wanted Toca Boca-quality avatars, Locker and home, and Subway Surfers / Flappy Bird / Crossy Road / premium-learning-app quality, iterating against real references. Record: [ISLANDER_2.md](ISLANDER_2.md#220-21).

This build includes:
- Islander v3 (Toca-like proportions, 14 hairstyles, shoes, a boy/girl build);
- an icon-tab Locker and creator;
- Island Home as a full-screen stage;
- remade Lagoon Run, Fruit Bat Flight and Crab Crossing;
- premium learning chrome.

Source: clean commit `80000a8c15e78a3d7d9a3d080f46b508900fb759` on PR #16 (held). Full gate 1,504 tests; Doctor 21/21. Independent review: one material finding (landscape Island Home) and one minor, both fixed with tests. Lead native walkthrough.

Delivery:
- The IPA is 174,157,767 bytes, SHA256 `0ad656b248832d352c5dc1fb4746e86a981ee0578b95b3905596901d92eb7778`.
- The signature passed, and 5,815 audio files match the source.
- Apple build `004f78ce-6dc7-47ea-8b24-3236117a852a` is VALID / IN_BETA_TESTING in the Leon group, with notes.

Receipt: [evidence/testflight-build21.json](evidence/testflight-build21.json).

Not verified: physical iPhone and iPad feel, VoiceOver end to end, and Stassie's acceptance.

## Little Island 2.3 — 2.3.0 (22), available 31 October 2026 Guam time

Leon's 2.2 feedback: Crab Crossing's angle and zoom made it unplayable; Island Home should zoom and navigate like Toca Boca; Stassie wants to learn coding; and every category needs several games with proper levels from kindergarten to middle school. Record: [ISLANDER_2.md](ISLANDER_2.md#230-22) and [LEARNING_LEVELS.md](LEARNING_LEVELS.md).

This build includes:
- Crossy-style Crab Crossing framing;
- an Island Home dollhouse with pinch, double-tap and two-axis pan;
- a new Coding island (Beep Bot, Turtle Draw, Tide Logic, Code Lab, plus Crab Commands) with a Coding badge track;
- twelve more five-level learning games (three each for Reading, Numbers, Science and Thinking);
- age spans on shelf cards.

Source: clean commit `64ed568e20227a9af630551e6301bc47b8bb4242` on PR #16 (held). Full gate 1,732 tests; Doctor 21/21.
- Independent review round 1 found two material and four minor findings, all fixed with tests.
- Round 2 approved, and its one minor finding was fixed.
- Lead native Release walkthrough.

Delivery:
- The IPA is 175,554,526 bytes, SHA256 `702a4412b9e455c11fb6a163a5005c23ad8ae0c99047bb055848b462b5ac1271`.
- The signature passed, and 5,891 audio files match the source.
- Apple build `5f9afdab-2c8f-4e7f-ad02-7ac0d924345e` is VALID / IN_BETA_TESTING in the Leon group, with notes.

Receipt: [evidence/testflight-build22.json](evidence/testflight-build22.json).

Not verified: physical iPhone and iPad feel, VoiceOver end to end, and Stassie's acceptance.

## Little Island 2.4: 2.4.0 (23), available 31 October 2026 Guam time

Leon's feedback on 2.3 Island Home: legs went through the bed, furniture stuck outside the house, moving things was clunky and only possible in Decorate, and the home should be "good like Toca Boca". Record: [ISLANDER_2.md](ISLANDER_2.md#240-23).

This build includes:
- a Toca-style living world with one Play mode where anything moves, plus Design;
- friends lie in beds and hammocks under blankets and sleep, sit on chairs and take baths;
- a small crab pet;
- tap-to-use lamps, sink, TV, radio and fridge;
- endless food from the fridge and fruit bowl; dropping food on a friend makes them eat or drink;
- held toys travel between rooms;
- drops always land somewhere sensible, and nothing sits outside the walls;
- Find my friends;
- save v3 with lossless migration.

Source: clean commit `eaa336d81ea9da2dcb612b009bcbcff6ede9393c` on PR #16 (held). The full gate passed with 1,813 tests, and Doctor passed 21/21.

Independent review:
- Round 1 found two material findings.
- Round 2 found one remaining migration gap.
- Round 3 approved.

Three lead native Release walkthroughs found native-only issues, and all were fixed and re-verified.

Delivery:
- The IPA is 175,603,979 bytes, SHA256 `4d081ca87b58ba0dbc3fca718cd679617f67227b624a3aefc844a01a64d7dbf0`.
- The signature passed, and 5,891 audio files match the source.
- Apple build `cad31641-b7b6-40d3-9bba-483cef03be02` is VALID / IN_BETA_TESTING in the Leon group, with notes.

Receipt: [evidence/testflight-build23.json](evidence/testflight-build23.json).

Not verified: physical iPhone and iPad feel, VoiceOver end to end, and Stassie's acceptance.

## Little Island 2.5: 2.5.0 (24), available 31 October 2026 Guam time

After a level-by-level audit of every game, Leon asked to fix it all, add a subtle Shimizu Technology credit, and open-source the app. Record: [ISLANDER_2.md](ISLANDER_2.md#250-24).

This build includes:
- every audit finding fixed:
  - Code Lab functions now trace correctly;
  - Pattern Path uses true 3×3 grids;
  - "fox" is taught with four sounds;
  - the little-shell picture is right;
  - help never costs a scored match;
  - AND/OR examples now tell the two apart;
  - fraction wholes are equal;
  - older algebra rounds keep ≤ and get correct hints;
  - storm safety and coral temperature are accurate;
- easier starts, more narration and clearer feedback across coding, reading, maths, science, arcade and board games;
- untimed Island Dash Practice and ready-driven nearby Mystery;
- the credit at the bottom of Home, and About behind the grown-up gate.

Source: clean commit `eb2c103e2fd0944c4a02981f5a3100270e4d1160` on PR #16 (held). Full gate 1,865 tests; Doctor 21/21. The independent review approved the gameplay and save fixes; its two public-export findings are fixed. Lead native walkthrough.

Public source: https://github.com/Shimizu-Technology/little-island (MIT). It is a fresh export from `61fc8db` (the same app code, plus a test-only fix) with no history, docs or family data. All 1,865 tests pass in the public tree.

Delivery:
- The IPA is 195,242,018 bytes, SHA256 `d0803eb88e63118d7dbad06c2a68d8a44ac1313f8d1b3bb40d8d9a0f7682c0f1`.
- The signature passed, and 6,447 audio files match the source.
- Apple build `74f9f702-aa81-4f1f-8090-1798544c8b01` is VALID / IN_BETA_TESTING in the Leon group, with notes.

Receipt: [evidence/testflight-build24.json](evidence/testflight-build24.json).

Not verified: physical iPhone and iPad, VoiceOver end to end, nearby multi-device Mystery, and Stassie's acceptance.

## Little Island 3.0: 3.0.0 (25) family preview, available 3 November 2026 Guam time

The 3.0 family preview: the Island map home, the rebuilt Living Island Home, and the Island Library (family-preview mode; records stay unpromoted until Leon accepts the narration on the device). Scope and checklist: [V3_RELEASE.md](V3_RELEASE.md).

Source: commit `7ddb8f5cd4e0883f1b2d419c9705e45a83ec8aab` on `release/testflight-25` (unmerged). That is `feat/v3` @ `d64b4c89` plus one release-only commit carrying the committed family-preview Library catalog. Full gate in preview mode: 2,243 tests. Doctor 21/21. Lead native simulator QA on iPhone 17 Pro and iPad mini (6th gen), iOS 26.5, plus a comprehensive QA ledger, after fixes 1–4.

Delivery:
- The IPA is 304,982,099 bytes, SHA256 `56a68c4f87711a51d76ac93e917b02974b2fe2d03e3579930f16c5aeb80870a4`.
- The strict signature, App Store profile and beta entitlements all verified.
- All 10,884 referenced audio files match the source (6,447 game clips and 4,437 Library narration clips).
- The first EAS submission (`9b4e9381`) failed with an App Store Connect `SERVER_ERROR`. No build was created; two empty upload reservations were left in AWAITING_UPLOAD. The retry, submission `e8e12ab6-b338-4269-8e03-51d25195f5b6`, finished.
- Apple build `fdfc7e58-020b-4b26-a76a-ff48ef1e4e8e` is VALID / IN_BETA_TESTING in the Leon group (one adult tester, automatic distribution off), with English notes.
- EAS also created an internal "Team (Expo)" group with no testers. It was left unchanged.

Receipt: [evidence/testflight-build25.json](evidence/testflight-build25.json).

Not verified: physical iPhone and iPad, real VoiceOver, airplane mode, mid-gesture interruption, narration listening, Stassie's acceptance, and Library promotion to approved.

## Little Island 3.0: 3.0.0 (26) from main, available 4 November 2026 Guam time

This is the 3.0 family preview built from **`main`** after PR #17 (3.0) and PR #18 (build number) merged. It contains everything in 3.0.0 (25), plus:
- the fixes from the independent final review (F1–F4): learner-scoped lab awards, dispensed food committing its previewed drop, a fail-closed Library shipping approval, and hidden destinations that no longer leak titles;
- Dynamic Type caps on Library buttons, tiles and cards.

Source: `5dab3bb1a1ddcd505469572d83f74db42d62a5fb` on `release/testflight-26`. That is `main` @ `3a4c7230` plus one release-only commit carrying the committed family-preview Library catalog. Preview gate: 2,257 tests. Doctor 21/21. CI passed on `main`.

Delivery:
- The IPA is 304,984,434 bytes, SHA256 `51d3e96b2a10b0eff7f7d4326b56441ee0191a7664802a276e3c00b467ca7004`.
- The strict signature, App Store profile and beta entitlements all verified.
- All 10,884 referenced audio files match the source.
- EAS submission `9f90d28d-3b66-4824-ae34-2d2858d23bce` finished on the first attempt. One empty upload reservation remains in AWAITING_UPLOAD; no extra build exists.
- Apple build `94ef795e-2884-476f-9250-206583df9e81` is VALID / IN_BETA_TESTING in the Leon group, with English notes.

Receipt: [evidence/testflight-build26.json](evidence/testflight-build26.json).

Not verified: physical iPhone and iPad, real VoiceOver, airplane mode, mid-gesture interruption, narration listening, Stassie's acceptance, and Library promotion to approved.

## Little Island 3.0: 3.0.0 (27) from main, available 6 November 2026 Guam time

This build adds separate learner progress (PR #20) and six Expo SDK 57 patches (PR #21). Each learner has their own paused games, Continue, Favorites and records. School saves completed levels and earned stars per learner. A grown-up step assigns older work with no known owner.

Source: `1e01b324f12ff54c27114a32eb1fdf54dc071b31` on `release/testflight-27`. That is `main` @ `8fe293e9` plus one release-only commit carrying the committed family-preview Library catalog. Preview gate: 2,300 tests. Doctor 21/21. CI passed on `main`.

Native simulator QA on iPhone 17 Pro: a save produced by the real 3.0.0 (26) engines upgraded with its original preserved, each learner kept their own paused rounds, and the grown-up step's assign and "Not needed" paths survived a relaunch.

Delivery:
- The IPA is 305,001,525 bytes, SHA256 `6fd9f2c68965f24a3d218937f0f988ff64c60e2b939242443a0f3cdd408f0435`.
- All 10,884 referenced audio files match the source.
- EAS submission `a3575c6f-6d68-4c6c-8dc5-26900a3d6854` finished. One empty upload reservation remains in AWAITING_UPLOAD; no extra build exists.
- Apple build `e666d2c4-17a0-45b1-8b45-daf2daf743ee` is VALID / IN_BETA_TESTING in the Leon group, with English notes.

Receipt: [evidence/testflight-build27.json](evidence/testflight-build27.json).

Not verified: physical iPhone and iPad, real VoiceOver, airplane mode, mid-gesture interruption, narration listening, Stassie's acceptance, and Library promotion to approved.

## Little Island 3.0: 3.0.0 (28) from main, available 6 November 2026 Guam time

This build adds the redrawn Islander hair and outfits (PR #22): all 14 hairstyles, real garment shapes, ten new outfits, Girls / Boys / Everyone sections with nothing locked by section, and a pinned creator preview. It includes everything in 3.0.0 (27).

Source: `a2a9aa2a6737c4a86bb2d5bc2c6c440098bba471` on `release/testflight-28`. That is `main` @ `9da44e80` plus one release-only commit carrying the committed family-preview Library catalog. Preview gate: 2,366 tests. Doctor 21/21. CI passed on `main`.

Native simulator QA on iPhone 17 Pro and iPad mini: upgrade from a version-2 save with reward grants and an exact recovery copy, creator and Locker, locked items at the largest text, a Home drag into bed, the island and Lagoon Run.

Delivery:
- The IPA is 305,052,298 bytes, SHA256 `24c8b381bbd148a5823a2048be3871578db8422b7bb884a2ce481bb0003d4ab9`.
- All 10,884 referenced audio files match the source.
- EAS submission `54e216e7-d9e3-446f-afbb-b545c707f9ea` finished. One empty upload reservation remains in AWAITING_UPLOAD; no extra build exists.
- Apple build `cfad0b36-361b-4bbd-8137-53a1ba0cd673` is VALID / IN_BETA_TESTING in the Leon group, with English notes.

Receipt: [evidence/testflight-build28.json](evidence/testflight-build28.json).

Not verified: physical iPhone and iPad, real VoiceOver, airplane mode, mid-gesture interruption, narration listening, Stassie's acceptance, and Library promotion to approved.
