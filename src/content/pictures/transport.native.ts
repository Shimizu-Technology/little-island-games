import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import type { PictureTransport } from "./index";

export const pictureTransport: PictureTransport = {
  async read(load) {
    const asset = Asset.fromModule(load());
    await asset.downloadAsync();
    return FileSystem.readAsStringAsync(asset.localUri ?? asset.uri);
  },
};
