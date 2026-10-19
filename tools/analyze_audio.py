# Analyse des WAV rendus : crête, RMS, écrêtage, trous de silence, équilibre spectral, largeur stéréo.
import sys, wave, json, glob, os
import numpy as np
def load(p):
    w = wave.open(p); n = w.getnframes(); sr = w.getframerate()
    a = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, 2).astype(np.float64) / 32768; return a, sr
def db(x): return 20 * np.log10(max(x, 1e-9))
res = {}
files = sys.argv[1:] or sorted(glob.glob('/workspace/neon-quebec/audio-demo/wav/*.wav'))
for p in files:
    a, sr = load(p); m = a.mean(1); s = (a[:, 0] - a[:, 1]) / 2
    a2 = a[int(sr * 1.0):]  # on ignore la première seconde (démarrage)
    peak = np.abs(a).max(); rms = np.sqrt((a2 ** 2).mean())
    win = int(sr * 0.05); nw = len(a2) // win
    wr = np.sqrt((a2[:nw * win].reshape(nw, win, 2) ** 2).mean((1, 2)))
    silent = wr < 10 ** (-50 / 20); gap = 0; cur = 0
    for v in silent: cur = cur + 1 if v else 0; gap = max(gap, cur)
    spec = np.abs(np.fft.rfft(m[int(sr):] * np.hanning(len(m) - int(sr)))) ** 2; f = np.fft.rfftfreq(len(m) - int(sr), 1 / sr)
    bands = {'sub<60': (20, 60), 'bas60-250': (60, 250), 'medium250-2k': (250, 2000), 'haut2k-6k': (2000, 6000), 'air>6k': (6000, 20000)}
    tot = spec[(f > 20) & (f < 20000)].sum()
    bal = {k: round(float(10 * np.log10(spec[(f >= lo) & (f < hi)].sum() / tot + 1e-12)), 1) for k, (lo, hi) in bands.items()}
    width = round(float(np.sqrt((s ** 2).mean()) / (np.sqrt((m ** 2).mean()) + 1e-9)), 3)
    clip = int((np.abs(a) > 10 ** (-0.3 / 20)).sum())
    r = dict(peak_dbfs=round(db(peak), 2), rms_dbfs=round(db(rms), 1), crest_db=round(db(peak) - db(rms), 1), clip_samples=clip,
             longest_silence_s=round(gap * 0.05, 2), bands_db=bal, stereo_width=width,
             rms_min_dbfs_50ms=round(db(wr.min()), 1))
    res[os.path.basename(p)] = r
    print(f"{os.path.basename(p):22s} crête {r['peak_dbfs']:6.2f} dBFS  RMS {r['rms_dbfs']:6.1f}  écrêt.>-0.3 dB: {clip:5d}  silence max {r['longest_silence_s']:.2f}s  largeur {width:.2f}  bandes {bal}")
json.dump(res, open('/workspace/neon-quebec/audio-demo/analyse.json', 'w'), indent=1, ensure_ascii=False)
