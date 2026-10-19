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

Keep this beta limited to Leon's adult tester account. The existing child-account and speech-distribution limitations in PRIVACY.md remain. Physical offline launch/audio, Files backup round trip, accessibility, and the remaining device/mode matrix still need acceptance. The draft implementation PR remains held until its required gates pass.

Current setup: the App Store Connect record and signing are ready. Build, upload, processing, and tester availability have not yet been verified.
