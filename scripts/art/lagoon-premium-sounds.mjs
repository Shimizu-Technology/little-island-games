// Original Lagoon Run Foley and mallet cues. Run from the repository root.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rate = 22_050;
const dir = 'assets/arcade/lagoon-sfx';
const tau = 2 * Math.PI;
const sine = cycles => Math.sin(tau * cycles);
const envelope = (t, attack, decay) => Math.min(1, t / attack) * Math.exp(-t * decay);
function mallet(t, hz) {
  if (t < 0) return 0;
  return .72 * sine(hz * t) * envelope(t, .004, 13)
    + .18 * sine(hz * 2 * t) * envelope(t, .002, 31)
    + .10 * sine(hz * 3.9 * t) * envelope(t, .001, 72);
}

let seed = 0xf18fa67, air = 0, lowAir = 0;
function snap(t) {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  const noise = (seed >>> 0) / 0x80000000 - 1;
  air += .29 * (noise - air);
  lowAir += .038 * (noise - lowAir);
  const gust = Math.sin(Math.PI * Math.min(1, t / .145)) ** 1.6;
  return (air - lowAir) * gust * .55 + sine(195 * t + 880 * t * t) * envelope(t, .007, 29) * .24;
}

const cues = [
  ['snap', .145, snap],
  ['shell', .22, t => .58 * mallet(t, 1046.5) + .24 * mallet(t - .019, 1568)],
  ['power', .41, t => .32 * mallet(t, 523.25) + .33 * mallet(t - .047, 659.25) + .42 * mallet(t - .092, 783.99) + .18 * mallet(t - .143, 1046.5)],
  ['thump', .19, t => {
    const bend = (1 - Math.exp(-t * 32)) * 2.4;
    return .68 * sine(73 * t + bend) * envelope(t, .005, 25)
      + .21 * sine(178 * t + bend) * envelope(t, .002, 49)
      + .075 * sine(390 * t) * envelope(t, .001, 85);
  }],
];

mkdirSync(dir, { recursive: true });
for (const [name, duration, sample] of cues) {
  const count = Math.round(rate * duration);
  const dataLength = count * 2;
  const wav = Buffer.alloc(44 + dataLength);
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
  wav.writeUInt32LE(dataLength, 40);
  for (let i = 0; i < count; i++) {
    const fade = Math.min(1, (count - 1 - i) / (rate * .024)) ** 2;
    const value = sample(i / rate) * fade;
    if (!Number.isFinite(value) || Math.abs(value) >= 1) throw new Error(`${name} clips at sample ${i}`);
    wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  writeFileSync(join(dir, `${name}.wav`), wav);
}
