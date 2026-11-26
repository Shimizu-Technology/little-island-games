// Original Rail Parade ko'ko' bird, leaf-step, and cozy nest cues. Run with node to regenerate the bundled WAVs.
import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rate = 22_050;
const output = fileURLToPath(new URL('../../assets/arcade/rail-sfx/', import.meta.url));
const sine = cycles => Math.sin(2 * Math.PI * cycles);
const envelope = (t, attack, decay) => Math.min(1, t / attack) * Math.exp(-t * decay);

function marimba(t, hz, decay = 12) {
  if (t < 0) return 0;
  return 0.78 * sine(hz * t) * envelope(t, 0.004, decay)
    + 0.15 * sine(hz * 2 * t) * envelope(t, 0.003, decay * 2.6)
    + 0.07 * sine(hz * 3.98 * t) * envelope(t, 0.002, decay * 5);
}

function peep(t, startHz, riseHz, decay = 26) {
  if (t < 0) return 0;
  // Smooth frequency glide for a warm, rounded chick chirp without harsh transients.
  const phase = startHz * t + riseHz * t * t * 0.5;
  return (0.76 * sine(phase) + 0.18 * sine(phase * 2) + 0.06 * sine(phase * 3))
    * envelope(t, 0.005, decay);
}

const cues = [
  // Crisp soft wood-tap + leaf turn cue (~4.2 KB).
  ['step', 0.095, t => 0.34 * marimba(t, 587.33, 34)
    + 0.16 * sine(320 * t + 720 * t * t) * envelope(t, 0.003, 44)],
  // Cheerful baby ko'ko' double-chirp + sunny marimba sparkle (~9.3 KB).
  ['chirp', 0.21, t => 0.36 * peep(t, 920, 2600, 28)
    + 0.34 * peep(t - 0.072, 1140, 2400, 24)
    + 0.16 * marimba(t - 0.02, 783.99, 14)],
  // Cozy glowing nest arrival chord + celebratory chick trill (~21.2 KB).
  ['nest', 0.48, t => 0.28 * marimba(t, 523.25, 9)
    + 0.26 * marimba(t - 0.055, 659.25, 9.5)
    + 0.28 * marimba(t - 0.11, 783.99, 10)
    + 0.22 * marimba(t - 0.165, 1046.50, 9.5)
    + 0.16 * peep(t - 0.215, 1080, 1900, 22)
    + 0.14 * peep(t - 0.295, 1280, 1700, 18)],
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
    const fade = Math.min(1, (count - 1 - i) / (rate * 0.02)) ** 2;
    const value = sample(i / rate) * fade;
    if (!Number.isFinite(value) || Math.abs(value) >= 1) throw new Error(`${name} clips at sample ${i}`);
    wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  writeFileSync(join(output, `${name}.wav`), wav);
}
