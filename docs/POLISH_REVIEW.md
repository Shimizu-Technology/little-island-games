# Family feedback and source integration

October 19, 2026, baseline0a1e15f / TestFlight1.0.0(4). Leon reports physical use is “pretty good” and supplied phone screenshots of home and a completed Tic-tac-toe round. He explicitly requests review, fixes and merge of PR1. This establishes adult phone installation/use and those visible screens; it does not establish child/iPad/offline/audio/Files/VoiceOver acceptance.

Keep the warm island palette, original illustrations and calm play. The primary task is choosing and playing a game. Phone layouts should spend less space on introductory copy and expose the next action sooner. Preserve 44pt controls, text scaling, all saved game IDs, hints/undo, learning and local recovery. No new services or dependencies are needed.

| Before                                                           | After                                                                                     | Why                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Tall phone hero and full-width cards                             | Compact welcome and illustrated two-column game choices; one column for larger text       | Reach games sooner and retain readable labels              |
| Filters wrap over multiple lines                                 | One native horizontal scroll row with selected state and swipe cue                        | Save vertical space without hiding categories              |
| Tic cells touch the board edge                                   | Measured inset, gaps and larger outer radius                                              | Give every cell an intentional frame                       |
| Large competing headers/status/actions                           | Compact navigation and status, closer replay                                              | Make turn, board and next action the reading order         |
| Word Rescue is hard to recognize as Hangman; rocket stays static | Friendly Hangman naming, rocket visibly assembled by correct letters, clear tried letters | Match the familiar game and make learning progress visible |
| Returning replaces home                                          | Return to the existing home when possible                                                 | Preserve the chosen category and scroll position           |

Interaction decisions: native scrolling supplies momentum; button presses respond immediately through tint/opacity/scale. Rocket parts change with the saved correct-letter progress and stay settled. No looping, delayed-input or required celebration animation; the same still feedback works with reduced motion and sound off.

This pass improves the existing six games. Dots & Boxes is the next bounded candidate for same-device counting/planning; adding its engine and acceptance is separate work.

## Integration acceptance

The previous agent added a blanket merge hold while preparing family release. Leon now requests code integration after review and fixes. The following source-integration cases gate this merge. The first-release matrix in QA.md remains open where unverified; no physical or child case is marked passed by merging.

| ID  | Required journey and expected outcome                                                                            | Coverage                                                              | Status  |
| --- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| P01 | Swipe through every category, select games, return with category/scroll context                                  | Phone/tablet, narrow/large text, keyboard and native swipe            | NOT RUN |
| P02 | Tic legal moves, win/draw, hint/whole-turn undo; all tray edges inset and replay reachable                       | Native phone/tablet, portrait/landscape; browser                      | NOT RUN |
| P03 | Friendly Hangman pack and masked family word; wrong/correct/reveal progress, completion/replay and resume        | Native keyboard, long word, sound off; browser                        | NOT RUN |
| P04 | All six game boards and help/options remain reachable and persist; checkers lessons preserve current round       | Phone landscape/tablet portrait; browser                              | NOT RUN |
| P05 | Terminate during pending computer turn and resume once without duplicate move; update retains build4 save schema | Owned native fixture, recorded exact saved outcome                    | NOT RUN |
| P06 | Export to a confirmed native Files destination, select and restore that file; retain recovery copy               | Owned simulator Files provider and SQLite verification                | NOT RUN |
| P07 | Larger text and keyboard/screen-reader semantics expose filters, help, boards and controls; no clipping          | Native accessibility text and focus where supported; browser keyboard | NOT RUN |

Run the full engineering gate, advisory design scan and independent final-code review. Record exact source/build, actions, saved results, failures/retests and environment limits below. Family hardware airplane-mode/audio, actual VoiceOver speech, Stassie’s usability and unknown iPad model/OS remain separate release checks.
