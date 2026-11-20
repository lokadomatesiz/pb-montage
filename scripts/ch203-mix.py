#!/usr/bin/env python3
"""Мастер-звук CH2-03: голос + SFX + музыкальная подложка → master.m4a (−14 LUFS, TP ≤ −1,5 dBTP).
Раскладка и громкости — из props-final.json, как их играет Remotion: volumeDb, длина durSec, вход/выход fadeSec (линейно).
Использование: python scripts/ch203-mix.py [--props public/ch2-03/props-final.json] [--out out/master.m4a] [--from сек --to сек] [--gain дБ]
--from/--to — только фрагмент для проверки; тогда громкость задаётся --gain (из полного мастера), заново не мерится.
"""
import argparse, json, re, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")
SR = 44100


def decode(path):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()


def ff(args, **kw):
    return subprocess.run(["ffmpeg", "-hide_banner", *args], capture_output=True, text=True, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--props", default="public/ch2-03/props-final.json")
    ap.add_argument("--out", default="out/master.m4a")
    ap.add_argument("--from", dest="t0", type=float, default=0.0)
    ap.add_argument("--to", dest="t1", type=float, default=None)
    ap.add_argument("--gain", type=float, default=None)
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--tp", type=float, default=-1.5)
    a = ap.parse_args()
    p = json.load(open(a.props, encoding="utf-8"))
    d = f"public/{p['folder']}"
    total = float(p["totalSec"])
    n = int(total * SR)
    mix = np.zeros((n, 2), dtype=np.float32)

    def put(x, at):
        s = int(round(at * SR))
        if s >= n:
            return
        e = min(n, s + len(x))
        mix[s:e] += x[: e - s]

    put(decode(f"{d}/{p['voice']}"), 0.0)
    if p.get("music"):
        put(decode(f"{d}/{p['music']['src']}") * 10 ** (p["music"]["volumeDb"] / 20), 0.0)
    for s in p["sfx"]:
        x = decode(f"{d}/sfx/{s['src']}")
        dur = s.get("durSec")
        D = dur if dur else 5.0  # Remotion: Sequence без durationInFrames — 150 кадров
        x = x[: int(D * SR)].copy()
        if dur:
            fd = int(round((s.get("fadeSec") if s.get("fadeSec") is not None else 0.5) * 30))  # Remotion считает фейд в кадрах
            fdn = max(1, fd) / 30.0
            t = np.arange(len(x)) / SR
            f = np.minimum(1.0, np.minimum(t / fdn, (D - t) / fdn))
            x *= np.clip(f, 0, 1)[:, None].astype(np.float32)
        x *= 10 ** (s["volumeDb"] / 20)
        put(x, s["at"])
    tmp = a.out.rsplit(".", 1)[0] + "-pre.wav"
    t0 = int(a.t0 * SR)
    t1 = int((a.t1 if a.t1 is not None else total) * SR)
    seg = mix[t0:t1]
    raw = seg.astype("<f4").tobytes()

    def pipe(args):
        return subprocess.run(["ffmpeg", "-hide_banner", "-v", "info", "-nostats", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", *args], input=raw, capture_output=True)

    if a.gain is None:
        r = pipe(["-af", f"loudnorm=I={a.lufs}:TP={a.tp}:LRA=11:print_format=json", "-f", "null", "-"])
        err = r.stderr.decode("utf-8", "replace")
        j = json.loads(err[err.rfind("{"): err.rfind("}") + 1])
        print(f"до мастеринга: {j['input_i']} LUFS, TP {j['input_tp']} dBTP, LRA {j['input_lra']}")
        flt = f"loudnorm=I={a.lufs}:TP={a.tp}:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,alimiter=limit=0.89:level=false"
    else:
        flt = f"volume={a.gain}dB,alimiter=limit=0.89:level=false"
        print(f"фрагмент {a.t0}–{a.t1 if a.t1 is not None else total} с, усиление {a.gain} дБ")
    r = pipe(["-af", flt, "-c:a", "aac", "-b:a", "256k", "-ar", str(SR), "-y", a.out])
    if r.returncode:
        raise SystemExit(r.stderr.decode("utf-8", "replace")[-1500:])
    print("готово:", a.out)


if __name__ == "__main__":
    main()
