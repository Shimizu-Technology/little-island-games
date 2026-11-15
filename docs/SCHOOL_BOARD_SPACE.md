# Measured School boards

F-frame-2 starts from `program/4.0` at `9d9dbce3` (15 November 2026). Little Island is a private, offline family app. A child should see a board and its next action together; resizing must preserve the plan, answers, rules and saved round. Sources: `docs/PRD.md`, `docs/QA.md`, `docs/CONTRACT_4.0.md`, and the F-frame-2 brief in the external 4.0 artifacts.

`LearnFrame` measures its ScrollView viewport and the board's actual inner width and position. Its budget excludes the pinned header, card inset and bottom padding. At accessibility sizes the existing board reveal puts the board below the pinned bar; entry and rotation re-arm that reveal. The lead-approved 15 November exception also uses this same non-animated reveal in windows shorter than 500 pt. It runs once per window rotation, preserves the round, and leaves the header reachable by scrolling up. Default windows of 500 pt or taller are unchanged. Scrolling itself never changes the budget.

`BoardSpaceProvider` is opt-in. Without it, drawing sizes and plan layouts retain their previous behavior. Challenge's `GridChromeContext`, budget constants and frame are unchanged. School uses the existing shared 44-pt button floor.

A view calls `useBoardGeometry` for its flexible drawing and attaches `onLayout` to that drawing. The enclosing `BoardSpaceContent` measures the entire game. The difference reserves the actual captions, choices, command rows, plan and actions, including changes during play. Layout events are coalesced into one frame before calculating that difference. A minimum takes precedence over fitting: an impossible screen remains scrollable, with controls available.

| View | Flexible part | Reserved with it |
| --- | --- | --- |
| Crab | Beach | Prompt, bounded editable plan, command cards, Go/Clear/Hint |
| Beep | Map | Go, bounded editable plan, commands and supports |
| Håfa Adai | Picnic pictures/rows | Captions, activity, instruction and selected word |
| Reef Race | Path | Player chips, prompt, spinner and race bar |
| ScienceBoard | Scene drawing | Scene caption, goal, choices/dials and Test |
| Shell Math | Workspace drawings | Question, equation, keypad/choices and supports; touchable frames keep their floor |
| Tide Pool | Pool scene | Observation, choices and actions |
| Float/Sink | Water scene | Prediction, shapes and actions |
| Tide Logic | Cargo pictures | Rule blocks, labels, trace and Run |
| Logic Lagoon | Grid cells | Clues, status and values; cells remain at least 44 pt |
| Slip Tide | Water grid | Caption, undo/reset, arrows and help; the existing landscape side arrangement remains, with measured drawing height |
| Treasure Algebra | Sea diagram | Caption, step keys, balance controls and Open chest |
| ProgramEditor | Plan viewport/tools | External map/run actions; plan drop targets and tools remain at least 44 pt |

Arrow plans scroll inside a bounded strip. This changes presentation only: every card remains editable, and the engine's limits and executed-card semantics are unchanged. In block mode the editor owns the flexible allocation while the map stays beside its run controls.

## Acceptance and evidence

Automated cases cover 393×852, 375×667, 744×1133, 1133×744 and 852×393, default and AX5. Synthetic measurements prove the budget and expose floors that cannot fit. The Crab component regression fails against the base view (568 pt required in a 500-pt space) and passes after the port. Provider tests cover filled/cleared plans, first measurement, resize convergence, block-mode handoff, no-provider behavior, unmount cleanup and AX rotation.

Required native acceptance is separate: iPhone 15/iOS 18.5 and iPad mini 6/iOS 26.5, portrait/landscape, default/AX5, with mid-interaction frames and measured bounds. The external slice `REPORT.md` records execution and gaps. No QA-25 row is marked passed by these geometry tests alone. Physical family acceptance and public release are outside this slice.
