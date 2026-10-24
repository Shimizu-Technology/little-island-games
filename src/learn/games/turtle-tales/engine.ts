import { stubEngine } from "../../stub";
// Placeholder: the Turtle Tales worker replaces this file with the real pure engine.
export const engine = stubEngine({
  id: "turtle-tales",
  name: "Turtle Tales",
  island: "reading",
  tagline: "Read a story word by word with your turtle.",
  description: "Read a story word by word with your turtle.",
  help: "Read a story word by word with your turtle.",
  color: "#2E7A5A",
  surface: "#E2F2E9",
  modes: ["solo","together"],
});
