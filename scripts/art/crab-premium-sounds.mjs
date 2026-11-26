// Original Crab Crossing Foley and marimba cues. Run with node to regenerate the bundled WAVs.
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rate = 22_050;
const output = fileURLToPath(new URL('../../assets/arcade/crab-sfx/', import.meta.url));
const sine = cycles => Math.sin(2 * Math.PI * cycles);
const envelope = (t, attack, decay) => Math.min(1, t / attack) * Math.exp(-t * decay);

function marimba(t, hz) {
  if (t < 0) return 0;
  return .8 * sine(hz * t) * envelope(t, .005, 11)
    + .14 * sine(hz * 2 * t) * envelope(t, .004, 32)
    + .06 * sine(hz * 3.98 * t) * envelope(t, .002, 64);
}

let seed = 0xb4c2e17, foam = 0, lowFoam = 0;
function splash(t) {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  const noise = (seed >>> 0) / 0x80000000 - 1;
  foam += .32 * (noise - foam);
  lowFoam += .08 * (noise - lowFoam);
  const plip = Math.max(0, t - .052);
  return .69 * (foam - lowFoam) * envelope(t, .011, 13)
    + .18 * sine(212 * t + 950 * t * t) * envelope(t, .005, 31)
    + .16 * sine(379 * plip + 1550 * plip * plip) * envelope(plip, .006, 34);
}

const cues = [
  ['hop', .135, t => .37 * sine(365 * t + 1050 * t * t) * envelope(t, .003, 27)
    + .17 * marimba(t - .019, 659.25)],
  ['splash', .26, splash],
  ['goal', .43, t => .32 * marimba(t, 523.25) + .30 * marimba(t - .058, 659.25)
    + .34 * marimba(t - .113, 783.99) + .19 * marimba(t - .158, 1046.50)],
];

mkdirSync(output, { recursive: true });
for (const [name, duration, sample] of cues) {
  const count = Math.round(duration * rate);
  const bytes = count * 2;
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF');
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(bytes, 40);
  for (let i = 0; i < count; i++) {
    const fade = Math.min(1, (count - 1 - i) / (rate * .02)) ** 2;
    const value = sample(i / rate) * fade;
    if (!Number.isFinite(value) || Math.abs(value) >= 1) throw new Error(`${name} clips at sample ${i}`);
    wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  writeFileSync(join(output, `${name}.wav`), wav);
}
