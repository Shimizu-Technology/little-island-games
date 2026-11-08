import rootJson from '../content/puzzles/root.json';
import { BANK_CAPS, validRoot, type RootIndex } from './bank';
import { bankTransport } from './bankAssets';
import { createBankLoader, type BankLoader } from './loader';

/** The boot directory is the only puzzle data read at launch; each family loads on entry. */
export function catalogRoot(raw: unknown = rootJson): RootIndex {
  if (!validRoot(raw) || JSON.stringify(raw).length > BANK_CAPS.rootBytes) throw new Error('The puzzle boot directory is invalid.');
  return raw;
}
let shared: BankLoader | null = null;
export const bankLoader = () => (shared ??= createBankLoader({ root: catalogRoot(), transport: bankTransport }));
