import { createContext, type RefObject } from 'react';
import type { ScrollView } from 'react-native';
/** Host wiring only: importing LearnFrame must not reach Logic Lagoon's frame scheduler. */
export const LagoonHintScroll = createContext<{ scroll: RefObject<ScrollView | null>; offset: RefObject<number> } | null>(null);
