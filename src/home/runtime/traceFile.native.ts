import * as FileSystem from "expo-file-system/legacy";
/** Writes into the app's own Documents folder. There is no network path out of here. */
export function writeTraceFile(name: string, text: string) {
  void FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${name}`, text)
    .catch((error: unknown) => console.warn("Home trace could not be written", error));
}
