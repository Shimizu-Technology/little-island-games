# 3.1 content handoff

`items.json` is the canonical combined author draft. `new-items.json`, `legacy-items.json` and `book-items.json` are authoring snapshots, not additional collections to concatenate at runtime. `new-speech.json`, `legacy-speech.json`, `book-speech.json` and `exhibit-speech.json` record each slice; the combined registration is `scripts/learn/library.json`.

No record is independently reviewed or ready to ship. The schema's author status is `draft`; “drafted” appears in the author identity and scope. Do not turn an author's source checks into factual or family approval. Keep the `.stage` boundary until approved text, warm recordings and reviewed receipts are ready.

`exhibits.json` supplies the three exhibits' keyed labels, control copy, step narration and spoken model limits. Its entries refer to the same exhibit IDs as `items.json`. The current `Exhibit` type has no step/narration fields, so these authoring records are a separate content file. Engineering must consume them through the final production contract and validate the extra speech references; the content worker did not change the schema or validator.

The water script keys match existing `WATER_ACTIONS`: notably `warm` is cloud-drop evaporation back to vapor, not melting. The reef script proposes a branching web from the existing linear food-chain lab; engineering still owns that upgrade. The night-sky script describes chosen model steps and invented star patterns, not today's sky above Guam.

`new-provenance.json` freezes the sole newly taught CHamoru term, Familia, from HåfaGPT entry `family.family`, with its exact source citations, corpus hash and pending native pronunciation review. The source repository was clean at `609a8eb44c5068bf1b539221de078adeb1f20787`. No local cultural story or traditional navigation claim was invented. designated family reviewer must review cultural items.

Original Explore payloads and their older review records remain in `legacy-provenance.json` as historical evidence. They do not approve newly written layers. `src/explore/*` remains untouched. Source URLs are offline credits, not permission to open a child-facing browser.

The existing design lab, search-index generator, asset registry and reader are a prototype for one topic/book. Engineering must wire the production corpus, local SVGs, book credits/logo, all speech and destinations. This content branch does not claim that the old lab can browse these 90 wonders or use the three new exhibit scripts.
