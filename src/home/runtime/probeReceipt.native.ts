import * as FileSystem from "expo-file-system/legacy";
import type { ReleaseProbe } from "./frameProbe";
/** Only called by /home-lab. Each release has its own file; no learner data. */
export function writeProbe(probe: ReleaseProbe) {
  void FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}release-${probe.at}.json`, JSON.stringify(probe))
    .catch((error: unknown) => console.warn("Lab frame probe could not be written", error));
}
