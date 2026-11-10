# Island picture dictionary: style guide

These pictures are clues and list pictures for children aged 4 to 9. A seven-year-old should name each one at once at 44 pt in a word list and at 120 pt as a crossword clue. They follow the Island hub and the Library's 120-unit icons (`content/library/art/bicycle.svg`, `telescope.svg`, `heart.svg`), so they sit beside that art without looking pasted in.

## The frame

- `viewBox="0 0 120 120"`, transparent background. The game draws the tile behind it; the Library tile is `#FFF9E6` with rounded corners, and the contact sheets use it.
- The object fills about 80 to 100 units of its longer side, centred, inside a 6-unit margin. Long thin things (a pencil, a snake) lie on a diagonal so they still fill the box.
- One object per picture. A pair is allowed when the word is one thing made of two (shoe laces, not "shoes"). No scenes, no background, no ground line unless the word is a place or a thing defined by where it is (a puddle, a beach, a river).

## Line

- Ink `#254E4B`, 3 units wide, round caps and round joins: the Library icon weight. At 44 pt that is about 1.1 pt, enough to read on any family device.
- 2 units only for small inner detail (whiskers, seeds, stitches, a clock's hands). Nothing thinner.
- Coloured strokes are allowed as shapes in their own right (a rainbow's bands, a rope's twist, steam) and come from the palette. A handle, pole or wire is a coloured stroke laid on a slightly wider ink stroke of the same shape, so it keeps an ink edge of 1.5 to 3.5 units on each side.
- Ink is for outlines, eyes and small dots only. Dark solid parts (tyres, a skunk, glasses frames) use charcoal.
- Every outline closes. Shapes are rounded where the real thing is; corners get round joins anyway.

## Colour

Flat fills from this palette and nothing else. No gradients, filters, opacity tricks, patterns or images.

| Name | Hex | Typical use |
|---|---|---|
| ink | `#254E4B` | outlines, eyes, dark details |
| paper | `#FCFAF4` | white things: eggs, teeth, clouds, paper |
| cream | `#FFF3CC` | pale yellow, bread crumb, bone |
| sand | `#F0CF7C` | sand, straw, light wood |
| gold | `#F0C86D` | yellow-gold, brass, honey |
| yellow | `#F2C94C` | bananas, lemons, the sun |
| orange | `#EE9F4A` | oranges, carrots, foxes |
| coral | `#E09A7E` | the hub's coral; clay, salmon |
| red | `#D64F43` | apples, tomatoes, fire trucks |
| pink | `#F2B8B0` | pigs, tongues, flowers |
| purple | `#A48FC0` | grapes, octopus |
| sky | `#91C5D0` | water, glass, light blue |
| blue | `#5B9ABA` | blue things |
| navy | `#386C9A` | jeans, dark blue |
| sea | `#5E9A9A` | teal, deep water |
| mint | `#B8D3AF` | pale green |
| leaf | `#80A97D` | leaves, grass, frogs |
| forest | `#5E8F5F` | dark green, shading on green |
| wood | `#CB956D` | light brown, wood, bread crust |
| brown | `#996445` | dark brown, bark, chocolate |
| stone | `#B9B4A2` | grey, metal, stone |
| slate | `#8C8A80` | dark grey, shading on grey |
| charcoal | `#3B3A40` | black things: tyres, a skunk |
| skin | `#DDA77F` | hands, feet and faces (lighter) |
| skin deep | `#A86F4C` | hands, feet and faces (deeper) |

- Use the thing's everyday colour, the one a child would colour it: a yellow banana, a red apple, a grey elephant.
- At most four fills besides ink and paper. One darker tone of a colour may sit inside an outline as a shading patch, never as a gradient.
- Body pictures use both skin tones across the set, so no single tone stands for "a body".

## Faces and character

- Animals get round ink dot eyes (radius about 2.8). A small smile only where it helps say "animal" (a frog, a dolphin). Objects never get faces.
- Pose each animal in the view children draw: dogs and horses from the side, owls and frogs from the front, fish swimming left to right.
- Exaggerate the feature that names the thing: the camel's hump, the elephant's trunk, the toucan's beak, the cactus's arms.

## Words with two meanings

Each picture shows one chosen meaning, recorded in `sources.json` (`meaning`, `otherMeaning`). For example BAT is the animal, not the baseball bat; MOUSE is the animal, not the computer mouse; PALM is the tree.

## Island and Guam

Island words are drawn as they look on Guam today: a breadfruit tree's bumpy fruit, a taro leaf and corm, an outrigger canoe with a triangular sail, a water buffalo. No grass skirts, tiki faces, hula, or any other picture of Pacific people as costume. People are not drawn in this set.

## Files

- No `<text>`, `<image>`, `<use>`, gradients, filters, masks, clip paths, ids, titles or comments. Allowed elements: `svg`, `g`, `path`, `circle`, `ellipse`, `rect`, `polygon`.
- Numbers have at most two decimals. One `<g>` carries the ink defaults.
- Each file at most 4,096 bytes; the whole set at most 1 MiB, well inside the plan's 2 to 5 MB for Cove and picture art.
- `scripts/art/pictures/check.mjs` enforces every rule in this file that a machine can check.

## What is drawn by hand, not checked by machine

Whether a picture is the thing it says. That is checked by a fresh blind reviewer naming each picture from a contact sheet, and then by Leon. See `README.md`.
