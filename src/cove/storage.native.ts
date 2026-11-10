import Storage from 'expo-sqlite/kv-store';
import { localRepository } from './local';
export const coveLocal = localRepository({ get: key => Storage.getItem(key), set: (key, value) => Storage.setItem(key, value) });
