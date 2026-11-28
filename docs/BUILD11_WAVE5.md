# Build 11 Wave 5: Home and groceries

Base: `ec830954` on `program/4.0`, including Waves 1–4. Executor: implementation agent. Draft PR only; no merge, public deployment, or store release.

Little Island is an offline family game collection. Home lets a child dress and move family characters, keep a room, and play with food. The relevant contract comes from `PRD.md`, `QA.md`, the Home scene engine, and the Wave 2 fridge and Wave 3 Places implementations. Historical project context in Brain Dump's 2026-11-26 portfolio audit identifies family TestFlight use; it does not establish the current delivered build. This task changes source only.

The change uses the existing version 4 item, container, cooked-food, and Undo representations. The Market is a shopping destination in Places; its four groceries live in a normal Kitchen Carry Basket, so leaving or reopening the Market preserves them without introducing a second inventory schema. Unpacking fills only free fridge slots and leaves overflow in the basket. The permanent pedal bin is room scenery, with an edible-only target; furniture and characters cannot be discarded. Stove drops light the burner in the accepted drop transaction, and an authored standing chef socket supports every Islander.

Motion confirms two actions: approaching the bin crossfades its lid over 120 ms; moving between rooms follows the existing eased camera/door veil. Reduced motion makes the lid switch immediate. Existing steam, sizzle and sparkles confirm cooking. Closet uses a windowed tile list and crop-specific thumbnail signatures; appearance changes flow through a stable character renderer. These code changes do not establish physical iPhone frame rates.

Required affected-flow acceptance:

| Case | Expected result | Agent evidence/status |
| --- | --- | --- |
| W5-01 | Repeated rapid feeding and interrupted native presentation recover without Undo; later input works | Automated hook regression passed, including lost commit acknowledgement |
| W5-02 | Dropped/zero/cancelled touches and a pan interruption return orphaned avatars to supported positions | Automated hook regression passed |
| W5-03 | Pantry food dropped in pan lights stove, cooks, and shows sizzle/steam; Islander can stand at stove; Undo works | Engine regression passed; visual QA pending |
| W5-04 | Pedal bin opens only for edible drops; discard and relaunch Undo restore exact item; permanent objects refused | Engine regression passed; visual QA pending |
| W5-05 | Ladder and doorway tap/drag move characters and held items, while existing arrows/Friends/Whole House remain usable | Engine regression passed; visual QA pending |
| W5-06 | Market shelves add by tap/drag, basket stops at four, put-back and Undo work, Carry Home preserves groceries, fridge stops at eight | Engine regression passed; visual QA pending |
| W5-07 | Closet fits phone/tablet/landscape and updates the live look without remounting the renderer | Visual and rendering regression QA pending |

Automated validation and final browser evidence are recorded below as they complete. Native gesture interruption, audible iPhone sizzle, physical 60 fps, and independent family-device acceptance remain separate operator checks under `QA.md`.

Assets: the approved market JPEG was converted to optimized WebP. Built-in imagegen performed background extraction on each approved bin JPEG, with prompts to preserve the design, contours, watercolor texture, proportions and orientation and remove only the white studio backdrop with antialiased alpha. The resulting transparent images were converted to WebP under `assets/home/props/`. No new food word lists or save-bank edits are required.
