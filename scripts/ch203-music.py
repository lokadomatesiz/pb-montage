#!/usr/bin/env python3
"""Музыкальная подложка CH2-03: собирает music-bed.mp3 по musicPlan из props-final.json (его строит scripts/ch203-build.mjs --final).

Что делает:
 · каждый трек выравнивается по громкости на (громкость голоса + relDb) LUFS;
 · сегменты ставятся по времени, вход/выход косинусом (кроссфейд = перекрытие выхода и входа);
 · дакинг под голос: когда голос звучит — подложка ниже на duckDb (атака 0,12 с, спад 0,8 с);
 · короткие эффекты (до 6 с) — подложка −4 дБ; перед ключевыми фактами (dips) — тишина.
Использование: python scripts/ch203-music.py --props public/ch2-03/props-final.json --music-dir public/ch2-03/music --vo public/ch2-03/vo.mp3 --out public/ch2-03-final/music-bed.mp3
Подложка идёт в Remotion с volumeDb 0; финальный мастер −14 LUFS / ≤ −1 dBTP делается после рендера (tools/cloud/steps/master_final.sh).
"""
import argparse, json, re, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8")

SR = 44100


def decode(path):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()


def lufs(path):
    r = subprocess.run(["ffmpeg", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    m = re.findall(r"I:\s+(-?[0-9.]+) LUFS", r.stderr)
    return float(m[-1])


def smooth_gain(target_db, sr_block, attack, release):
    """target_db — массив по блокам; односторонний сглаживатель: быстро вниз (атака), медленно вверх (спад)."""
    out = np.zeros_like(target_db)
    g = 0.0
    ka = np.exp(-1.0 / max(1, attack * sr_block))
    kr = np.exp(-1.0 / max(1, release * sr_block))
    for i, t in enumerate(target_db):
        k = ka if t < g else kr
        g = k * g + (1 - k) * t
        out[i] = g
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--props", required=True)
    ap.add_argument("--music-dir", required=True)
    ap.add_argument("--vo", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    props = json.load(open(a.props, encoding="utf-8"))
    plan = props["musicPlan"]
    total = float(props["totalSec"])
    n = int(total * SR)
    vo_lufs = lufs(a.vo)
    target = vo_lufs + plan["relDb"]
    print(f"голос {vo_lufs:.1f} LUFS → подложка до дакинга {target:.1f} LUFS")
    bed = np.zeros((n, 2), dtype=np.float32)
    for sg in plan["segs"]:
        path = f"{a.music_dir}/{sg['src']}"
        x = decode(path)
        x *= 10 ** ((target - lufs(path)) / 20)
        t0, t1 = sg["from"], min(sg["to"], total)
        ln = int((t1 - t0) * SR)
        if len(x) < ln:
            raise SystemExit(f"{sg['src']} короче нужного: {len(x)/SR:.1f} < {ln/SR:.1f} с")
        x = x[:ln]
        t = np.arange(ln) / SR
        env = np.ones(ln)
        fi, fo = sg["fadeIn"], sg["fadeOut"]
        env *= np.where(t < fi, 0.5 - 0.5 * np.cos(np.pi * np.clip(t / fi, 0, 1)), 1.0)
        env *= np.where(t > (t1 - t0) - fo, 0.5 + 0.5 * np.cos(np.pi * np.clip((t - ((t1 - t0) - fo)) / fo, 0, 1)), 1.0)
        for g0, g1, db in sg.get("gains", []):
            ramp = 0.6
            tt = t + t0
            m = np.clip(np.minimum((tt - g0) / ramp, (g1 - tt) / ramp), 0, 1)
            env *= 10 ** (db * m / 20)
        s0 = int(t0 * SR)
        bed[s0 : s0 + ln] += (x * env[:, None]).astype(np.float32)
    # дакинг под голос (блоки по 10 мс)
    vo = decode(a.vo).mean(axis=1)
    blk = SR // 100
    nb = n // blk
    vo = np.pad(vo, (0, max(0, nb * blk - len(vo))))[: nb * blk].reshape(nb, blk)
    rms = 20 * np.log10(np.sqrt((vo**2).mean(axis=1)) + 1e-9)
    speak = np.convolve((rms > -42).astype(float), np.ones(8) / 8, mode="same") > 0.3
    duck = np.where(speak, plan["duckDb"], 0.0)
    # эффекты (короткие)
    tb = np.arange(nb) / 100
    for s in props.get("sfx", []):
        d = s.get("durSec") or 0
        if 0 < d <= 6:
            inside = np.clip(np.minimum((tb - (s["at"] - 0.2)) / 0.25, ((s["at"] + d) - tb) / 0.25), 0, 1)
            duck = duck + (-4.0) * inside
    # провалы перед ключевыми фактами
    for d0, d1 in plan["dips"]:
        inside = np.clip(np.minimum((tb - d0) / 0.12, (d1 - tb) / 0.12), 0, 1)
        duck = np.minimum(duck, -60.0 * inside + duck * (1 - inside))
    duck = smooth_gain(duck, 100, 0.12, 0.8)
    gain = np.repeat(10 ** (duck / 20), blk)
    gain = np.pad(gain, (0, n - len(gain)), constant_values=1.0)
    bed *= gain[:, None].astype(np.float32)
    peak = float(np.abs(bed).max())
    if peak > 0.9:
        bed *= 0.9 / peak
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-i", "-", "-c:a", "libmp3lame", "-b:a", "256k", a.out], stdin=subprocess.PIPE)
    p.communicate(bed.astype(np.float32).tobytes())
    if p.returncode:
        raise SystemExit("ffmpeg failed")
    print(f"готово: {a.out} · пик {20*np.log10(max(peak,1e-9)):.1f} dBFS (до ограничения) · длина {n/SR:.1f} с")


if __name__ == "__main__":
    main()
