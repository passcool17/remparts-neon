# Spectrogramme (échelle log en fréquence, 30 Hz-16 kHz) avec étiquettes : python3 tools/spectro.py in.wav out.png "titre"
import sys, wave, numpy as np
from PIL import Image, ImageDraw, ImageFont
w = wave.open(sys.argv[1]); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float).reshape(-1, 2).mean(1) / 32768
N, H = 4096, 512; win = np.hanning(N); frames = (len(a) - N) // H
S = np.array([np.abs(np.fft.rfft(a[i * H:i * H + N] * win)) for i in range(frames)]).T
f = np.fft.rfftfreq(N, 1 / sr); Wd, Ht = 1400, 520
logf = np.geomspace(30, 16000, Ht); rows = np.array([np.interp(lf, f, np.arange(len(f))) for lf in logf])
img = np.zeros((Ht, frames))
for r, idx in enumerate(rows): lo = int(idx); hi = min(len(f) - 1, max(lo + 1, int(rows[min(r + 1, Ht - 1)]))); img[Ht - 1 - r] = S[lo:hi + 1].max(0)
db = 20 * np.log10(img / (N / 4) + 1e-9); db = np.clip((db + 90) / 90, 0, 1)
# palette « néon » : noir -> violet -> magenta -> orange -> jaune
pts = np.array([[0, 0, 0], [40, 0, 90], [200, 0, 160], [255, 90, 60], [255, 230, 120], [255, 255, 255]], float)
x = db * (len(pts) - 1); i0 = np.floor(x).astype(int).clip(0, len(pts) - 2); t = (x - i0)[..., None]; rgb = (pts[i0] * (1 - t) + pts[i0 + 1] * t).astype(np.uint8)
im = Image.fromarray(rgb).resize((Wd, Ht), Image.BILINEAR); M = 60; out = Image.new('RGB', (Wd + M + 10, Ht + 60), (12, 12, 20)); out.paste(im, (M, 30)); d = ImageDraw.Draw(out)
try: fnt = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 14)
except Exception: fnt = ImageFont.load_default()
d.text((M, 6), sys.argv[3] if len(sys.argv) > 3 else '', fill=(255, 255, 255), font=fnt)
for hz in [50, 100, 200, 500, 1000, 2000, 5000, 10000]:
    y = 30 + Ht - 1 - int(np.interp(np.log(hz), np.log(logf), np.arange(Ht))); d.line([(M - 5, y), (M, y)], fill=(200, 200, 200)); d.text((4, y - 8), (f'{hz // 1000}k' if hz >= 1000 else str(hz)), fill=(200, 200, 200), font=fnt)
dur = len(a) / sr
for s in range(0, int(dur) + 1, 5): xx = M + int(s / dur * Wd); d.line([(xx, 30 + Ht), (xx, 35 + Ht)], fill=(200, 200, 200)); d.text((xx - 6, 38 + Ht), f'{s}s', fill=(200, 200, 200), font=fnt)
out.save(sys.argv[2])
