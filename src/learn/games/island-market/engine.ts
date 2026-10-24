import { stubEngine } from "../../stub";
// Placeholder: the Island Market worker replaces this file with the real pure engine.
export const engine = stubEngine({
  id: "island-market",
  name: "Island Market",
  island: "numbers",
  tagline: "Pack crates of ten and make change with shells.",
  description: "Pack crates of ten and make change with shells.",
  help: "Pack crates of ten and make change with shells.",
  color: "#9A6A1F",
  surface: "#FBEFD3",
  modes: ["solo","together"],
});
