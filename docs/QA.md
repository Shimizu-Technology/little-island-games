# Acceptance ledger

Executor: agent for automated/browser/simulator checks; Leon/Stassie for physical-device usability. Comprehensive first-release scope. Record exact source/build and evidence before calling a scenario passed. All begin NOT RUN.

| ID | Required journey | Expected outcome | Status |
| --- | --- | --- | --- |
| A01 | Home, game choice, help, return and new round | Every game reachable; clear controls and preserved progress | NOT RUN |
| A02 | Tic-tac-toe solo/together | Legal moves, win/draw, difficulty, hint, complete decision undo | NOT RUN |
| A03 | Word Rescue pack/parent word | Valid secret handling, hints, reveal/audio, replay | NOT RUN |
| A04 | Memory solo/cooperative/together | Matching/scoring/turns, interrupted mismatch recovery | NOT RUN |
| A05 | Checkers tutorial/solo/together | Correct captures/chains/kings/win/draw; responsive opponent; undo | NOT RUN |
| A06 | Maze explore/undo/hint | Every maze solvable; wall rejection; visible finish | NOT RUN |
| A07 | Number Island roll/select/close | Dice targets, legal sums, counting/addition, clear completion | NOT RUN |
| A08 | Force-close/resume, including AI turn | Exact valid game resumes without duplicate moves | NOT RUN |
| A09 | Native release app cold launch without server | All games/content/audio work offline | NOT RUN |
| A10 | Update installed app with saves | Existing progress/settings preserved | NOT RUN |
| A11 | Parent backup/restore and bad/older saves | Validated restore; errors recoverable without losing original | NOT RUN |
| A12 | iPhone/iPad portrait/landscape | Reachable touch controls, legible boards, no clipped content | NOT RUN |
| A13 | Sound off, larger text, screen-reader labels | Essential instructions remain understandable | NOT RUN |
| A14 | Stassie physical iPad observation | Independently choose/move/help/resume/replay | NOT RUN |
| A15 | Signed family install | Registered-device artifact installable on target device | NOT RUN |

Simulator/browser checks do not establish physical-device or child usability acceptance. Do not conflate automated checks, review, merged source, build success, and family installation.
