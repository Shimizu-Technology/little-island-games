import { localRepository } from './local';
export const coveLocal = localRepository({ get: async key => localStorage.getItem(key), set: async (key, value) => { localStorage.setItem(key, value); } });
