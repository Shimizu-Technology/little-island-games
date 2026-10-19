# Picnic Island Mystery: implementation and native integration

## Product and rules

Source baseline `ed87a44`, approved release scope in `docs/V2_RELEASE.md`, implemented 2026-10-20. This is the character-based mystery, separate from secret-word Imposter. Original island map, vector characters, four interactive jobs, water sabotage, harmless pranks, public discussion and secret-role voting. No cloud service, public matchmaking, generated answers or chat. Three to eight nearby family players, or one human and three local computer islanders in saved solo practice.

Crew wins by finishing four three-step jobs or voting out the one mischief maker. A wrong task choice resets that job’s current pattern. Mischief can pretend to work without increasing crew progress, prank an adjacent crew member after its cooldown, or turn off the water at the pump after its cooldown. Nearby witnesses receive private clues; an affected player watches from the hammock and cannot move or vote. Mischief wins when only one crew member remains or the water remains unrepaired for 60 host-clock seconds. Sabotage pauses tasks and prevents meeting calls; repairing requires open supply → close valve → connect pipe, with a wrong choice restarting that pattern.

Each player has two meetings at the bell, separated by at least ten seconds. Discussion lasts up to 20 seconds; unanimous readiness opens voting early. Each active player votes once for a living player or skip. A unique highest player vote removes that player and publicly identifies their role. Ties/skip remove nobody. After 25 seconds, missing votes become skip. Movement, tasks and pranks are disabled during meetings. These fixed rules appear in the in-app instructions.

Solo crew/mischief practice uses the same engine and redacted views as humans. Bots navigate actual walkable paths, complete task patterns, repair, make proximity pranks, sabotage and vote from their private witness clues. They cannot inspect other roles. Solo clocks pause on background, parent overlays and leaving practice. A saved round preserves exact roles, positions, tasks, cooldowns, meetings and outcomes.

## Source and exports

- `src/mystery/engine.ts`: serializable `MysterySession`, `createMysterySession`, `validMysterySession`, `applyMysteryIntent`, `tickMystery`, `soloMysteryTick`, `mysteryConnection`, `mysteryView`, `validMysteryView`, public authored map/tasks and bounded bot policy.
- `src/mystery/protocol.ts`: pure `MysteryHost`, typed protocol-1 envelopes and strict recipient snapshot validation; imports no native/UI module.
- `src/mystery/nearby.ts`: lifecycle-owning native controller; parent host identity, guest seat rejoin and per-peer delivery.
- `src/mystery/MysteryScreen.tsx`: `MysteryScreen({state, onSave, width, active, sound, onFeedback?})`. `state` is the saved solo `MysterySession | null`. `onSave(next, previous)` must atomically compare previous identity/revision before replacing the solo save. Screen creation intentionally changes the round ID. Shared Store/routes/backup integration remain parent-owned.
- `modules/island-nearby`: authored local Expo module, independently committed early as `5f4c023`. No generated application `ios/` files edited.

Parent integration should use `src/mystery/engine` for validation/types and `src/mystery` for UI. Register the `island-mystery` route/catalog and a separate solo save envelope. Do not serialize the nearby controller, private room PIN or guest seat secret into backups. Set `active=false` on parent route blur/overlay: input and private role/clues hide, a host room closes safely, and a guest retains an in-memory rejoin credential. Unmount disposes all advertising/browsing/session resources. Muting suppresses optional feedback; the slice introduces no new audio resources.

## Native module discovery and required config

Expo SDK 57 / RN 0.86 documentation was checked before implementation. Current local-module discovery searches `./modules` by default. This module includes its own package metadata, `expo-module.config.json`, Apple class, podspec and optional JS bridge. `expo-modules-autolinking resolve --platform apple` discovers pod `IslandNearby` and class `IslandNearbyModule` from this worktree. That is discovery evidence, not compilation or transport acceptance.

Parent must add to app config `ios.infoPlist`:

```json
{
  "NSLocalNetworkUsageDescription": "Little Island connects to parent-approved family devices nearby so you can play a private island mystery together.",
  "NSBonjourServices": ["_li-mystery._tcp"]
}
```

Then run normal prebuild and pod installation, and compile a fresh installed native build. No package dependency is needed with the default local-module path. Native code cannot run in Expo Go. Android explicitly offers solo only; web explicitly offers solo only. There is no fake network fallback.

Reviewed official documentation: [Expo local modules](https://docs.expo.dev/modules/get-started/), [Expo module API/queues/events](https://docs.expo.dev/modules/module-api/), [Expo autolinking](https://docs.expo.dev/modules/autolinking/), [MCSession](https://developer.apple.com/documentation/multipeerconnectivity/mcsession), [encrypted session initializer](<https://developer.apple.com/documentation/multipeerconnectivity/mcsession/init(peer:securityidentity:encryptionpreference:)>), [invitation acceptance](<https://developer.apple.com/documentation/multipeerconnectivity/mcnearbyserviceadvertiserdelegate/advertiser(_:didreceiveinvitationfrompeer:withcontext:invitationhandler:)>), [Bonjour declarations](https://developer.apple.com/documentation/bundleresources/information-property-list/nsbonjourservices).

## Transport and authority boundaries

A parent gate precedes creating the room. Foundation generates a fresh UUID room identifier, six-digit PIN and opaque seat credentials. Discovery advertises room UUID/protocol only. The PIN goes in the invitation context and is checked before the parent sees an approval request; it is not advertised. `MCSession` requires encryption. Pending approval expires after 22 seconds; invitation attempts are bounded to twelve per minute and seven guests. Only short reliable text payloads up to 16 KiB are accepted; streams/resources are rejected. Native peer handles derive from actual `MCPeerID` objects, not any JSON actor field.

The host owns full roles and state; guests never receive it. The bridge targets individual native peers. Every guest gets only their own role, clues and cooldown plus public players/jobs/events and their own vote/readiness status. No other role, vote selection, secret, bot policy, or full engine object is serialized. The client rejects raw full state or additional hidden fields in player snapshots.

Host protocol validation checks version, room, exact message keys, bounded payload, monotonically increasing client sequence, typed intent and a per-peer message rate. A client cannot claim an actor, advance the host clock, submit a snapshot or start a game. Seat IDs are assigned by the host and bound to the actual connected peer. New players cannot enter an already-started round. A disconnected seat can rebind only after a new native PIN/approval handshake and possession of its host-issued opaque credential; a currently connected seat cannot be taken over. Duplicate names receive a visible distinguishing suffix.

The host is trusted: an adult host device necessarily holds secret roles in memory. This is a private family room, not adversarial internet matchmaking. Nearby peers can see device display names and public positions; no network stack can promise secrecy from a compromised host or device. The child-facing UI does not surface credentials or allow arbitrary data sharing.

## Interruption and permission behavior

A guest disconnect freezes host timers and all gameplay, including sabotage, while preserving that seat’s role and state. The guest can search again for the same room and enter its PIN; parent approval plus the in-memory credential resumes the same seat. Leaving the screen entirely discards the credential. If a guest intentionally leaves permanently, the parent must end the room and create a new one rather than silently reassigning a secret role.

Host background/leave closes advertising and the encrypted session. Guests see host loss and must join a new parent room; there is no unsafe host migration. Native background closure is registered independently of the JS clock. Native discovery/advertising errors and join timeout explain Local Network permission and Wi-Fi/Bluetooth prerequisites. Settings denial/refusal still requires actual native QA; no simulator screenshot or unit test establishes that behavior.

## Verification ledger

Agent-executed TypeScript rules/protocol tests cover movement/walls, all task patterns and task victory, fake-task nonprogress, sabotage location/cooldown/repair/deadline, proximity/cooldown/witness pranks and victory, readiness/votes/duplicate votes/ties/deadlines, disconnected pause/exact role recovery, every station path, 25 complete bot-driven rounds with session validation each tick, redacted views, malformed saves, forged actor/clock/replay/room data, recipient secrets and approved-seat takeover rejection. Initial fixture failures were corrected: test-only position helpers had accidentally overwritten player IDs with station IDs. No runtime failure was hidden by that fixture correction.

Required integration cases remain **not run by this slice**: installed Swift compilation; two-device actual discovery/PIN rejection/approval/connection/reliable messages; three-device start and full multiplayer round; distinct role visibility; wrong-peer/old-sequence rejection over native transport; guest background and approved same-seat rejoin; host background/loss/leave; Local Network refusal; phone/tablet portrait/landscape/large text; actual task/movement/map control usability; saved solo resume, update and backup round trip; offline cold launch. Parent owns these under V06/V08/V09/V10/V11. Two devices prove transport but do not satisfy the three-player round requirement. Physical iPad performance/touch/VoiceOver and family usability remain operator acceptance.

No server, browser tab, simulator, emulator or container was started by this implementation slice.

Final slice verification: Node 22, `npm run typecheck`, `npm run lint`, and `npx vitest run tests/mystery.test.ts` passed (18 tests). Impeccable advisory scan returned `[]`. Native review prompted a separate `d7a73c8` fix: names are checked against the MC peer 63-byte UTF-8 limit and Unicode controls before Objective-C initialization, and retry/approval expiry callbacks carry matching attempt tokens. Host approval controls remain reachable during a paused live round so approved guests can actually rejoin; private clues conceal together with the role.
