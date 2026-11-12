# Home saves from the previous undo cap (R3-F1)

Produced on 12 Nov 2026 by the Home code at `0b5ca92b` (undo cap 20,480 bytes), using its own `useHomeStore` hook and reducer, not hand-written. Starting from a starter home with 100 collected shells in My room's basket: Restore My room, then alternate Find friends between Kitchen and My room.

| File | Find friends | Undo | At `6b2625ce` |
| --- | --- | --- | --- |
| `twenty-steps.json` | 19 | 16,885 bytes, 20 steps | rejected by `validHome`; a backup holding it fails `parseSave` |
| `eleven-steps.json` | 10 | 12,783 bytes, 11 steps | valid, but every later edit is refused because the restore's removal no longer fits today's promise |

The generator is kept with the H3 fix-3 evidence (`little-island-games-artifacts/v4/h3-home/fix3/tools/`). Do not edit these files by hand; regenerate them with the previous head's code instead.
