"""Island Home landing and delight sounds (H4: HD-03, HD-05, HD-07, HD-08, HC-01).

Original, generated waveforms: no recordings, samples or external assets. Run with
`python3 -I src/home/sounds/generate.py` to rebuild every file byte for byte (the noise
source is a fixed linear congruential generator, so the output is deterministic).
Rule 60 limits: pickup ticks <= 50 ms, landing cues 60-120 ms, action sounds <= 800 ms.
"""
import math, struct, wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).resolve().parent
seed = 20261115
def noise():
    global seed
    seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF
    return seed / 0x3FFFFFFF - 1.0
def length(ms): return int(RATE * ms / 1000)
def decay(t, tau): return math.exp(-t / tau)
def attack(t, ms): return min(1.0, t * 1000 / ms) if ms else 1.0

def lowpass(samples, cutoff):
    a = 1 - math.exp(-2 * math.pi * cutoff / RATE); y = 0.0; out = []
    for s in samples: y += a * (s - y); out.append(y)
    return out
def highpass(samples, cutoff):
    low = lowpass(samples, cutoff)
    return [s - l for s, l in zip(samples, low)]

def modal(ms, partials, click=0.0, click_ms=3.0):
    """Struck object: decaying sine partials (frequency Hz, amplitude, decay seconds)."""
    out = []
    for i in range(length(ms)):
        t = i / RATE
        v = sum(a * math.sin(2 * math.pi * f * t) * decay(t, tau) for f, a, tau in partials)
        if t * 1000 < click_ms: v += click * noise() * (1 - t * 1000 / click_ms)
        out.append(v * attack(t, 1.5))
    return out

def pick():   # a light wooden tick as something leaves the floor
    return modal(40, [(1400, .5, .008), (2650, .2, .004)], click=.25)
def lift():   # a friend is lifted: a small rising "bip"
    out = []; n = length(50); phase = 0.0
    for i in range(n):
        t = i / RATE; f = 700 + 420 * (i / n); phase += 2 * math.pi * f / RATE
        out.append(.42 * math.sin(phase) * math.sin(math.pi * i / n) ** 2)
    return out
def cloth():  # a soft pat: cushions, rugs, beds, friends on their feet
    raw = [noise() for _ in range(length(95))]
    body = lowpass(lowpass(raw, 700), 900)
    return [(2.6 * b + .35 * math.sin(2 * math.pi * 150 * (i / RATE))) * attack(i / RATE, 4) * decay(i / RATE, .026)
            for i, b in enumerate(body)]
def wood():   # a wooden "tock": books, blocks, toys, furniture tops
    return modal(100, [(520, .55, .022), (1180, .3, .012), (2050, .14, .006)], click=.3, click_ms=4)
def shell():  # a shell or cup "clink"
    return modal(120, [(2350, .32, .030), (3720, .22, .022), (5180, .12, .014), (2390, .12, .028)], click=.08)
def splash(ms=260):  # into the bath or a running sink
    raw = [noise() for _ in range(length(ms))]
    band = highpass(lowpass(raw, 2400), 500)
    out = [2.2 * b * attack(i / RATE, 10) * decay(i / RATE, .07) for i, b in enumerate(band)]
    for start in (.06, .12, .17):
        for j in range(length(25)):
            i = int(start * RATE) + j
            if i >= len(out): break
            f = 500 + 400 * j / length(25)
            out[i] += .22 * math.sin(2 * math.pi * f * j / RATE) * math.sin(math.pi * j / length(25))
    return out
def munch():  # two soft bites
    out = [0.0] * length(230)
    for start in (0, .115):
        burst = highpass([noise() for _ in range(length(45))], 900)
        for j, b in enumerate(burst):
            t = j / RATE; out[int(start * RATE) + j] += 1.1 * b * attack(t, 3) * decay(t, .012)
    return out
def burp():   # a small, friendly "brrp", never gross
    out = []; n = length(380); phase = 0.0
    for i in range(n):
        t = i / RATE; f0 = 128 - 34 * (i / n); phase += 2 * math.pi * f0 / RATE
        v = sum(math.sin(k * phase) * math.exp(-((k * f0 - 520) / 260) ** 2) for k in range(1, 14))
        env = math.sin(math.pi * min(1, t / .03) / 2) * (1 - i / n) ** 1.4 * (0.75 + .25 * math.sin(2 * math.pi * 23 * t))
        out.append(.32 * v * env)
    return out
def bubbles():  # bath bubbles: little rising bloops
    out = [0.0] * length(520)
    for k, start in enumerate((0, .1, .19, .3, .41)):
        n = length(55); base = 380 + 40 * (k % 3)
        phase = 0.0
        for j in range(n):
            f = base * (1 + 1.1 * (j / n) ** 1.5); phase += 2 * math.pi * f / RATE
            i = int(start * RATE) + j
            if i < len(out): out[i] += .3 * math.sin(phase) * math.sin(math.pi * j / n)
    return out
def sizzle():  # food cooking in the pan, under 800 ms
    out = []; n = length(700)
    hiss = highpass([noise() for _ in range(n)], 3000)
    for i in range(n):
        t = i / RATE
        crackle = noise() * 2.4 if noise() > .985 else 0.0
        env = min(1, t / .04) * min(1, (n - i) / length(150))
        out.append((.22 * hiss[i] + .35 * crackle) * env)
    return highpass(out, 1500)
def clang():   # a hanging pan, gently
    return modal(320, [(610, .26, .12), (1525, .18, .08), (2840, .1, .05), (4120, .06, .03)], click=.06)
def rustle():  # a sleeping friend stirs under the blanket
    raw = lowpass([noise() for _ in range(length(300))], 1800)
    n = len(raw)
    return [1.4 * r * math.sin(math.pi * i / n) ** 2 for i, r in enumerate(raw)]
def knob():    # the stove's burner turns on: a click and a soft whump
    click = modal(30, [(1900, .3, .004)], click=.2)
    whump = lowpass([noise() for _ in range(length(150))], 380)
    out = click + [0.0] * (length(150) - len(click))
    for i, w in enumerate(whump):
        t = i / RATE; out[i] += 3.2 * w * math.sin(math.pi * min(1, t / .15))
    return out

SOUNDS = {"pick": pick, "lift": lift, "cloth": cloth, "wood": wood, "shell": shell, "splash": splash,
          "munch": munch, "burp": burp, "bubbles": bubbles, "sizzle": sizzle, "clang": clang,
          "rustle": rustle, "knob": knob}

def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = min(1.0, .62 / peak)  # every cue stays soft; nothing clips
    fade = length(3)
    data = []
    for i, s in enumerate(samples):
        edge = min(1.0, (len(samples) - 1 - i) / fade) if fade else 1.0
        data.append(int(max(-1, min(1, s * gain * edge)) * 20000))
    with wave.open(str(OUT / f"{name}.wav"), "w") as f:
        f.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        f.writeframes(struct.pack("<" + "h" * len(data), *data))

if __name__ == "__main__":
    for name, make in SOUNDS.items():
        write(name, make())
        print(f"{name}.wav")
