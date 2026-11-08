# Shared Cove grid

Cell input, number-first input, notes, paint strokes, undo/redo and accepted-state feedback use one GridAction per gesture. The page holds scrolling disabled while GridInteraction owns a touch. Selection accompanies a write; it never races a second dispatch.

Edge input: OPEN. G2 owns the adapter-integrated edge renderer and input path for Loop and Bridges. `nearestEdge` is geometry only; GridShell does not expose an edge mode. Required follow-up: edge hit regions, visible preview, one stroke/undo/save, accessible edge actions, and native phone/iPad drag acceptance. No edge adapter may claim CV-05 acceptance from this shell or the geometry test.

On iOS, the hidden text input accepts typed symbols, Backspace and the notes shortcut. Arrows and Command-Z are web-only; native users have selection and undo controls. With a screen reader the entire board fits, and each cell has an explicit accessibility activation callback. Real VoiceOver acceptance remains a device gate.

The Check/help audit retains event totals after its ordered prefix reaches 64 entries. Check, help and reset evidence is never removed; counters saturate at the validated integer ceiling. Undo history remains bounded working memory and does not reset evidence.

Number-first mode uses a visibly named on/off button in the wrapping toolbar. A shrink-wrapped Switch row can collapse its label to zero width on native; the button keeps the choice readable on narrow layouts.
