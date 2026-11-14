// Scoped picture bindings; generated from adopted picture answers.
import type { PictureBinding } from "../../../src/puzzles/words/pictures";
export const searchPictureEntries: PictureBinding[] = [
  {
    "id": "duck",
    "spelling": "DUCK",
    "bytes": 597,
    "sha256": "89a0f2e3158c6d1911b80c2fbab5fa1bac675d476d83c6903f151c954c2905e5"
  },
  {
    "id": "bird",
    "spelling": "BIRD",
    "bytes": 707,
    "sha256": "de15a7e0ea6791b36108130a0eeda9c0858e627d61631200217826fa54990640"
  },
  {
    "id": "bear",
    "spelling": "BEAR",
    "bytes": 777,
    "sha256": "74e00e6facf5ec00d2c3238ce651d1f35037233876ed5c9988ecd7aeed3c833a"
  },
  {
    "id": "crab",
    "spelling": "CRAB",
    "bytes": 585,
    "sha256": "172f0ab71bbde7f0f6bf2a7010d696e0033af9a408cc43c818b460abded0cbb1"
  }
];
export const searchPictureAssets: Record<string, () => number> = {
  "duck": () => require("../../../content/pictures/svg/duck.svg"),
  "bird": () => require("../../../content/pictures/svg/bird.svg"),
  "bear": () => require("../../../content/pictures/svg/bear.svg"),
  "crab": () => require("../../../content/pictures/svg/crab.svg"),
};
