import { createContext } from 'react';
import { pictureTransport } from '../../content/pictures/transport';
import { createSearchPictures } from './pictures';
import { searchPictureEntries, searchPictureAssets } from './pictures.generated';

export const SearchPicturesContext = createContext(createSearchPictures(searchPictureEntries, searchPictureAssets, pictureTransport));
