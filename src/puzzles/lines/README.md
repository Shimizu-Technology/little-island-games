# Line family (G5): Loop and Pearl Loop

One closed loop, no branches, no crossings. Loop draws along the dots and its numbers count a cell's sides; Pearl Loop draws through cell centres and must pass every pearl (black: turn, then straight on both sides; white: straight, turning just before or after).

- `core.ts`: the lattice (dots or cell centres, edges across then down), pack tuples, visible rule breaks (`brokenClues`) and the solved check.
- `solver.ts`: simplest-first graders over named techniques. Loop: `count`, `loop`, `corner`, `sides`, `what-if`, `chain`. Pearl Loop: `pearl`, `loop`, `what-if`, `chain`. Trials are one level deep and use only the simpler rules, so no board needs a guess. Also the counting search (all non-trial rules between branches) and `planHint`.
- `independent.ts`: a second counter that never draws edges. It colours squares inside or outside, row by row, and accepts a colouring whose border is one loop (connected inside, outside connected to the border, no corner-only touches).
- `adapter.ts`, `teach.ts`, `LineBoard.tsx`: the kit binding, the hint words and mark rules, and the board. Drag along the dots (or cells): the nearest dot is tracked, fast drags are walked one step at a time along a row or column, and sliding back over the edge just drawn takes it back. A drag is one stroke and one undo step. A tap goes to the nearest edge and cycles line, cross, empty.
- `rungs.ts`: both ladders. One rung is one packed bank.

The 10×10 Loop rung is iPad-first. The "no early loop" rule only ever crosses an edge: closing a loop that happens to satisfy every number proves nothing, because a longer loop through unnumbered cells might too (`tests/edges-lines.test.ts` keeps that case).
