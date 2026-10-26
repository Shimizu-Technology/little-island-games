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
