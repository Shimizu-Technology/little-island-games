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
