import { useCallback, useEffect, useState } from 'react';
import { coveLocal } from './storage';
import { emptyLocal, type LocalAction } from './local';
export function useCoveLocal() {
  const [data, setData] = useState(emptyLocal), [ready, setReady] = useState(false), [error, setError] = useState('');
  const load = useCallback(() => { void coveLocal.read().then(value => { setData(value); setReady(true); setError(''); }).catch(e => setError(String(e.message))); }, []);
  useEffect(() => { const unsubscribe = coveLocal.subscribe(load); load(); return unsubscribe; }, [load]);
  const change = async (action: LocalAction) => {
    if (!ready) return false;
    try { const next = await coveLocal.write(action); setData(next); setError(''); return true; }
    catch { setError('This Cove choice could not be saved. Your earlier choices and puzzles are kept. Please try again.'); return false; }
  };
  const reset = async () => { try { const next = await coveLocal.reset(); setData(next); setReady(true); setError(''); } catch { setError('Fresh Cove choices could not be saved. The original is kept. Please try again.'); } };
  return { data, ready, error, change, load, reset };
}
