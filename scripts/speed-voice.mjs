// Ускорение озвучки (решение автора 29.10): паузы > 0,3 с → 0,28 с, затем rubberband +6 %.
// Исходники не трогаем: вход — vo-draft2.mp3 (копия vo_001_sh1 + вопрос), выход — vo-fast.mp3, words-fast.json, vo-fast-map.json.
// Использование: node scripts/speed-voice.mjs <папка public/ch2-01-sh1>
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const dir = process.argv[2];
const TEMPO = 1.06;
const KEEP = 0.28;
const src = `${dir}/vo-draft2.mp3`;

const sd = spawnSync("ffmpeg", ["-hide_banner", "-i", src, "-af", "silencedetect=noise=-38dB:d=0.3", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const starts = [...sd.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
const ends = [...sd.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
const dur = +/Duration: (\d+):(\d+):([\d.]+)/.exec(sd).slice(1).reduce((a, v, i) => a + (i === 0 ? v * 3600 : i === 1 ? v * 60 : +v), 0);
// паузы внутри речи (не в самом начале и не в самом конце файла)
const pauses = starts.map((s, i) => ({ s, e: ends[i] ?? dur })).filter((p) => p.s > 0.3 && p.e < dur - 0.05 && p.e - p.s > 0.3);
console.log("паузы > 0,3 с:", pauses.map((p) => `${p.s.toFixed(2)}–${p.e.toFixed(2)}`).join("  "));

// сегменты: речь, затем первые 0,28 с паузы
const segs = [];
let cur = 0;
for (const p of pauses) {
  segs.push([cur, p.s + KEEP]);
  cur = p.e;
}
segs.push([cur, dur]);
const parts = segs.map((g, i) => `[0:a]atrim=${g[0].toFixed(3)}:${g[1].toFixed(3)},asetpts=N/SR/TB[s${i}]`).join(";");
const cc = segs.map((_, i) => `[s${i}]`).join("");
const fc = `${parts};${cc}concat=n=${segs.length}:v=0:a=1,rubberband=tempo=${TEMPO}:pitch=1[o]`;
const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[o]", "-ar", "44100", "-b:a", "192k", `${dir}/vo-fast.mp3`], { encoding: "utf8" });
if (r.status !== 0) throw new Error(r.stderr);

// карта времени: старое → новое
export const map = (t) => {
  let cut = 0;
  for (const p of pauses) {
    if (t >= p.e) cut += p.e - p.s - KEEP;
    else if (t > p.s + KEEP) {
      cut += t - (p.s + KEEP);
      break;
    }
  }
  return (t - cut) / TEMPO;
};
fs.writeFileSync(`${dir}/vo-fast-map.json`, JSON.stringify({ tempo: TEMPO, keep: KEEP, pauses }, null, 1));
const words = JSON.parse(fs.readFileSync(`${dir}/words.json`, "utf8"));
const fast = words.map((w) => ({ ...w, startMs: Math.round(map(w.startMs / 1000) * 1000), endMs: Math.round(map(w.endMs / 1000) * 1000), timestampMs: Math.round(map(w.timestampMs / 1000) * 1000) }));
fs.writeFileSync(`${dir}/words-fast.json`, JSON.stringify(fast, null, 1));
console.log("длина:", dur.toFixed(2), "→", map(dur).toFixed(2), "с; слов", fast.length);
