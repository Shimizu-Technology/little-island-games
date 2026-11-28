import { createContext } from 'react';
import type { WordGame } from '../wordgames/session';

export interface GameHallWordContextValue {
  cardWidth: number;
  visibleIds: readonly WordGame[];
  favorites: readonly WordGame[];
  nunitoLoaded: boolean;
  onToggleFavorite: (id: WordGame) => void;
}

export const GameHallWordContext = createContext<GameHallWordContextValue | null>(null);
