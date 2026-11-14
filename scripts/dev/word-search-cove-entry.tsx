/** Native QA only: install fixture content into the real Router/Cove/Store journey.
 * No shipping entry imports this module, and no admission or family gate is bypassed. */
import React from 'react';
import { SearchPicturesContext } from '../../src/puzzles/words/picture-context';
import { createSearchPictures } from '../../src/puzzles/words/pictures';
import { pictureTransport } from '../../src/content/pictures/transport';
import { searchPictureEntries, searchPictureAssets } from '../../tests/fixtures/word-search/pictures.generated';
import { challengeEntries } from '../../src/challenge/catalog';
import { registerSaveContent } from '../../src/state/challenge';
import { catalogManifest } from '../../src/state/catalogManifest';
import { fixtureRegistration } from '../../tests/fixtures/word-search/registration';
const pictures = createSearchPictures(searchPictureEntries, searchPictureAssets, pictureTransport);
Object.assign(challengeEntries.find(entry => entry.game === 'word-search')!, { ...fixtureRegistration, render: (...args: Parameters<typeof fixtureRegistration.render>) => <SearchPicturesContext.Provider value={pictures}>{fixtureRegistration.render(...args)}</SearchPicturesContext.Provider> });
registerSaveContent(fixtureRegistration.catalog, catalogManifest(fixtureRegistration.catalog));
// Install after the fixture registration, before the normal application hydrates its Store.
require('expo-router/entry');
