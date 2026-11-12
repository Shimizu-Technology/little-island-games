import { Asset } from "expo-asset";
import type { PictureTransport } from "./index";

export const pictureTransport: PictureTransport = {
  async read(load) {
    const response = await fetch(Asset.fromModule(load()).uri);
    if (!response.ok) throw new Error(`Picture asset returned ${response.status}.`);
    return response.text();
  },
};
