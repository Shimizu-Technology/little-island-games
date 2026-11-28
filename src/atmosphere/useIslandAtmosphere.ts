import { useCallback } from 'react';
import { useStore } from '../state/Store';
import { personFor } from '../personalization/model';
import { hydrateHome } from '../home/model';
import { editHistory, historyAdmits, fittedHistory, restoredHistory, savedHistory } from '../home/useHomeStore';
import { defaultAtmosphere, validAtmosphere, type Atmosphere } from '../home/atmosphere';
export * from './palette';
/** No second preference or migration: the active Islander's durable Home field is the island sky. */
export function useIslandAtmosphere() {
  const store = useStore();
  const owner = store.save.learning?.active ?? 'family';
  const saved = personFor(store.save).home;
  const atmosphere = saved.version === 1 ? defaultAtmosphere : saved.atmosphere ?? defaultAtmosphere;
  const setAtmosphere = useCallback((next: Atmosphere) => {
    if (!store.ready || store.recovery || !validAtmosphere(next)) return;
    const home = hydrateHome(saved);
    if (!home) return;
    const before = fittedHistory(restoredHistory(home));
    const after = editHistory(before, { type: 'atmosphere', atmosphere: next });
    if (after === before || !historyAdmits(after)) return;
    store.personalize({ home: savedHistory(after, home.access) }, { learner: owner, epoch: store.epoch });
  }, [store, saved, owner]);
  return { atmosphere, setAtmosphere };
}
