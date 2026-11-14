import { createContext } from 'react';
import type { PictureResolver } from './pictures';
/** No adopted picture bank: keep the dictionary transport outside the app graph. */
export const SearchPicturesContext = createContext<PictureResolver>({ idFor: () => undefined, load: async () => { throw new Error('No adopted Word Search pictures.'); } });
