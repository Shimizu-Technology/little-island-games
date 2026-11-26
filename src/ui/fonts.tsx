import React, { createContext, useContext } from "react";
import { useFonts } from "expo-font";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { Nunito_900Black } from "@expo-google-fonts/nunito/900Black";

const NunitoLoaded = createContext(false);

/** True once Nunito has loaded. Until then (and on any load error) text draws in the system font. */
export const useNunitoLoaded = () => useContext(NunitoLoaded);

/**
 * Loads Nunito 600/700/800/900 without ever holding the screen: children render at once in the system font and
 * switch when the fonts arrive. A failed load leaves the system font, so boot and Recovery never wait on a font.
 */
export function NunitoProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  return <NunitoLoaded.Provider value={loaded}>{children}</NunitoLoaded.Provider>;
}
