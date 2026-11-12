import type { PictureTransport } from "./index";
// Metro selects transport.native.ts on native platforms and transport.web.ts on web.
export const pictureTransport: PictureTransport = { read: async () => { throw new Error("Pictures need a platform transport."); } };
