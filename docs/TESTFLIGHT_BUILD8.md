# Internal TestFlight build 8

Requested by Leon on 21 October 2026. Release the merged family-ease changes from main `3229fe5` as Little Island 1.2.0 (8), bundle com.shimizutechnology.littleisland, App Store Connect app 6824481437. Existing adult internal group Leon only; no public release or new testers.

The only runtime configuration change is iOS buildNumber 7→8. Application journeys and native simulator acceptance are recorded in FAMILY_EASE.md (application source `e3af4ff`). Execute the full check/Doctor gate, inspect generated Release configuration, bind the signed IPA to the exact clean source and archive JS hash, verify signature/profile/assets, submit that exact IPA, then verify Apple processing and attachment to the existing group. Record source/hash/submission/build identity and actual availability separately. Physical installation, child acceptance, audio and VoiceOver remain operator checks.

Reuse existing EAS-managed signing credentials with a temporary keychain/profile and exact cleanup. Use the proven local archive/export path; do not purchase cloud capacity or rotate shared credentials. Delivery evidence will be added after Apple verification.

## Executed build and submission

Release preparation PR 7 merged as `2c4626a69ba54f9ca7bafc52761d8f4eb7a0a9b3` (reviewed head `b1fd8a8`; identical source tree). Full local check passed 220 tests in 18 files, typecheck, lint and web export; Doctor 21/21. CI passed the preparation head and merged source. CodeRabbit was explicitly rate-limited, with completed independent final-code review as the repository's advisory-unavailable fallback; no unresolved material findings.

An isolated clean checkout generated the iOS project under Node 22.22.3 and CocoaPods 1.16.2. Xcode 26.6 archived Release for iPhone/iPad, minimum OS 16.4. Strict signature, App Store provisioning profile and signed entitlements passed. IPA size 30,671,115 bytes; SHA256 `6f3df5860b30ecbe69ff2b71d27fbf4697ac937eee43bcebeab1c4e3e1d2a815`; embedded JS SHA256 `f3984baef481438d325215ea00875e7c7a37b766d49bb9efc6321337902e80c3` matches the source-bound archive. All 200 referenced audio files match source bytes; physical audibility is unverified. Existing certificate 88CUWN8J2G/profile 2STXA6SVLC were reused. Temporary keychain, credentials and owned profile were cleaned; the original keychain search list was restored.

The exact verified IPA was submitted once through EAS job `9b599825-9b5e-4a5b-a694-08cd2d0c4fca`, which finished successfully. Apple upload `b4c6c59d-db63-4be7-bd43-d9d2215b46d2` received version 1.2.0, build 8. At the initial check it was processing without errors/warnings; availability is recorded separately after Apple processing and group verification. Source, archive, IPA, submission and Apple receipts stay in sibling `little-island-games-artifacts/testflight`.

## Verified availability

At 2026-10-20T22:33:05.684Z, Apple build `b4c6c59d-db63-4be7-bd43-d9d2215b46d2` is VALID and IN_BETA_TESTING. The existing internal Leon group has one adult tester and build 8 is attached; automatic distribution remains off. English testing notes were written and verified. Open TestFlight → Little Island: Family Games → Update to 1.2.0 (8). This proves availability to the existing tester account; physical installation is not claimed. See [structured delivery evidence](evidence/testflight-build8.json).

Build/export/submission processes exited. No server, browser tab or simulator was started for this release. Owned lifecycle resources are cleaned; shared resources were preserved. The lifecycle helper's host-wide process snapshot hangs on this Mac, so the unchanged helper was invoked with an exact-owned-PID snapshot wrapper for claims and final status.
