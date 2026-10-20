# Quality release QA ledger

Scope: comprehensive named release journeys, agent executed on owned fixtures; public release held. Contract QUALITY_RELEASE.md. Baseline9d568b4 / TestFlight1.1.0(6); target1.2.0(7). Fresh browser isolated origin43825,393×852. Phase1 source5708afb plus later word-length-label clarification only; final combined code retest still pending. Native Release build in progress; no physical device/child/VoiceOver/thermal acceptance claimed. Old review failures retained in sibling artifact review2026-10-20.

Fixture ownership: new incognito browser data only; existing LittleIsland QA simulators were Shutdown before reuse, old beta test saves preserved for update. Shared Hafa simulators/services borrowed and unchanged. All new runtimes lifecycle session01a15361-2a1b-7cc3-a118-8482fb1cdecf exactclaimed; phase1 webtab/servercleaned, nativecompile remainsowned whileactive.

| ID | Starting fixture, steps and expected observable/saved outcome | Required agent coverage | Status/evidence |
|---|---|---|---|
| Q01 | FreshHome→filter→game→Home→resume; show factualplayers, correctart, completedactivityPlayagain and liveoriginalresume | webphone/tablet+nativephone | phase1 phone layout/requirements inspected; final pending |
| Q02 | Freshmedium/hardMaze→legalcardinalmoves+hint/undo→rotate; exact7/9columns, reciprocalwalls and savedpath | nativephoneaffectedwidth+tabletcapped470; webcontrast | pending |
| Q03 | FamilyMAMAChallenge→M/A→all4letterswin; newPractice→6missescontinue→hintswin; newChallenge→6misseslossanswer, recordsonce; Help→explicitnewroundPractice; rapidletters/legacy | browserphone+nativephone | phase1web alllisted except rapid/legacy passed:1win1loss0assisted, Practicehintsunchangedrecords. Final combined native/restart pending |
| Q04 | FreshPicnic bothroles→idlewait→firstjob→clue→mischief/meeting→terminal→replay; humanagency, clearfeedback, fair3tricks | nativephone/tablet+web | pending |
| Q05 | Parentcreatesapprovednearby3personroom→join→start→privateactions→out/reconnect→finish→samerematch; retainedapproval/newroles/stalerejection | nativeactualtransport, engineprotocol | pending |
| Q06 | NewDashtraining/3courses→RunJump→land/recover/checkpoint→finish/CPUresult→retry; pause/backgroundrelaunch exactplace, fairtimer/newrecords/legacy | nativephone/tablet orientations + enginecadences | pending |
| Q07 | Freshquick/fullcards→requests/draw/books/wilds→wholematch→result/replay; togetherprivatehandoff/background/restore; readablestepCPU | browser+nativephone | pending |
| Q08 |3peopleSecretWord→allprivatecards→cluecircles→votes/tie/result→rematch; stableconcealment, fairroles/rotatedfirst | browser+native | pending |
| Q09 | Ticmove/hint/reason/undo; Memorymismatch/manualclose/competitivewinner/nopeek; CheckersFriendly/Classic/hint/undo/markers/lession | browserphone+native | phase1webCheckershintB6→A5/undo passed; cell47pt at393. Marker toggle/otherflows final pending |
| Q10 | NewNumbers3difficulties→roll→exactcombinationclose→undo→terminal/replay; oldhard9roundunchanged | browserphone+native/saveboundary | phase1webChallenge12visible→roll2→hint2→close/undo passed. Final coveragepending |
| Q11 |50topics/5labs→map/search/favorite/related/narration+transcript/Stop; wronganswer→recover→finish; Home/restart preservequery/lab/place | browserphone/tablet+native | pending |
| Q12 | NativeReleasecoldlaunchwithoutMetro, allassetsavailable; browsercoldofflinecache | native+browser | pending |
| Q13 | Phone/iPadportrait/landscape,largefont/reducedmotion,labels/focus/controlreachability; no clippedrequiredactions | nativephone/tablet+webkeyboard | pending; physicalmultitouch/VoiceOverhearing explicitlyoperator |
| Q14 | Installoverbuild6→legacyoriginal/activitysavepreserved; newexport/importroundtrip; corrupt/futureimportkeeporiginal | native/webownedfixtures+engineering | pending |
| Q15 | fullcheck/Doctor/nativeRelease/CI/independentfinalcode review, materialfindingsfixed+affectedretests | finalhead | phase1fullcheck152tests+export passed; Doctor21/21. Combinedpending |
| Q16 | exactcommittedsource→signedIPAidentity/hash→upload→AppleVALID/IN_BETA_TESTING→existingLeonadultgroup | actualdeliveryAPI/UI | pending |

Case acceptance stays pending until required dimensions pass; phase1 observations do not establish final combination. Prior147release tests are historical. PhysicalfamilyiPadmodel/OS/touch/audio/fun remainoperator dimensions for internalbeta, no publicapproval.

Build preparation: ExpoCNG generatedignoredios; firstpod attempt failed due globallyinstalledJSON3/CocoaPods incompatibility. Retried with existingJSON<3 scoped only to podprocess; success. First xcodecommand rejected redundant-arch flag; corrected ARCHS=arm64. These were build-tool issues, not app defects. No shared gems/config changed.
