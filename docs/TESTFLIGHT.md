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

## V2 target: 1.1.0 (6), not delivered yet

Leon explicitly authorized the full V2 implementation, reviewed main integration and next internal TestFlight build. [V2_RELEASE.md](V2_RELEASE.md) defines scope; [V2_QA.md](V2_QA.md) records completed journeys and unresolved gates. Local simulator artifact iteration names such as “Native7” still identify 1.1.0 (6), not a TestFlight build 7.

App Store Connect preflight confirmed build 6 is unused and the existing Leon group still has one adult tester, automatic distribution off, and only builds 4/5 attached. Build6 helper copies are prepared outside Git; no V2 signing, submission or availability is claimed. After required integration acceptance, record exact merged main source, archive/IPA hash and identity, submission, Apple processing state and existing-group availability here. Continue using the local archive/export fallback if cloud quota remains exhausted; do not purchase a plan or change shared credentials.
