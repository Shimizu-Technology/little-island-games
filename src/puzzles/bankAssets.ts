import type { BankTransport } from './loader';
// Metro selects bankAssets.native.ts on native platforms and bankAssets.web.ts on web.
export const bankTransport: BankTransport = { read: async () => { throw new Error('Puzzle assets need a platform transport.'); } };
