# Internal TestFlight build 8

Requested by Leon on 21 October 2026. Release the merged family-ease changes from main3229fe5 as Little Island1.2.0(8), bundlecom.shimizutechnology.littleisland, App Store Connect app6824481437. Existing adult internal groupLeon only; no public release or new testers.

The only runtime configuration change is iOS buildNumber7→8. Application journeys and native simulator acceptance are recorded in FAMILY_EASE.md (application sourcee3af4ff). Execute the full check/Doctor gate, inspect generated Release configuration, bind the signed IPA to the exact clean source and archive JS hash, verify signature/profile/assets, submit that exact IPA, then verify Apple processing and attachment to the existing group. Record source/hash/submission/build identity and actual availability separately. Physical installation, child acceptance, audio and VoiceOver remain operator checks.

Reuse existing EAS-managed signing credentials with a temporary keychain/profile and exact cleanup. Use the proven local archive/export path; do not purchase cloud capacity or rotate shared credentials. Delivery evidence will be added after Apple verification.
