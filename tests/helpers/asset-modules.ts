/**
 * Vitest setup: Metro turns `require('….webp')` into an asset id; Node would parse the image as JavaScript. Here an
 * illustration resolves to its repository path, so screens render and tests can check which file a picture uses.
 */
import Module from 'node:module';
import { relative } from 'node:path';

const extensions = (Module as unknown as { _extensions: Record<string, (module: { exports: unknown }, file: string) => void> })._extensions;
extensions['.webp'] = (module, file) => { module.exports = relative(process.cwd(), file); };
