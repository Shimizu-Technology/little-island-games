import { createContext, type RefObject } from 'react';
import type { ScrollView } from 'react-native';
/** School host wiring only, not a game board: reading routes must not reach Lagoon's frame scheduler. */
export const LagoonHintScroll = createContext<{ scroll: RefObject<ScrollView | null>; offset: RefObject<number> } | null>(null);
