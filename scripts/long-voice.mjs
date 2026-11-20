// Длинное ch2-01: озвучка +6 % (паузы > 0,3 с → 0,28 с, rubberband), склейка глав, слова.
// Исходники не трогаем: вход — material for chanel 2\vo_*.mp3; выход — public/ch2-01/vo.mp3, words.json, voice-map.json.
// Слова: whisper на этом ПК нет → паузы (silencedetect −38 дБ, 0,12 с) раскладываются по знакам препинания скрипта (DP), внутри отрезка слова — по буквам.
// Использование: node scripts/long-voice.mjs
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const SRC = "../material for chanel 2";
const OUT = "public/ch2-01";
const SCRIPT = "../production/ch2-01-paricutin/script-v0.4.txt";
const TEMPO = 1.06;
const KEEP = 0.28;
const GAP = { default: 0.7, "vo_06_question_001.mp3": 0.5 };
const FILES = [
  ["vo_00_hook_001.mp3", "== vo_00_hook"],
  ["vo_01_temblores_001.mp3", "== vo_01_temblores"],
  ["vo_02_maizal.mp3", "== vo_02_maizal"],
  ["vo_03_montana.mp3", "== vo_03_montana"],
  ["vo_04_pueblos.mp3", "== vo_04_pueblos"],
  ["vo_05_cuaderno.mp3", "== vo_05_cuaderno"],
  ["vo_06_senal.mp3", "== vo_06_senal"],
  ["vo_06_question_001.mp3", "== vo_06_question"],
];
fs.mkdirSync(`${OUT}/chap`, { recursive: true });
const ff = (a) => spawnSync("ffmpeg", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const dur = (f) => +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout;
const silences = (f, d) => {
  const e = ff(["-hide_banner", "-i", f, "-af", `silencedetect=noise=-38dB:d=${d}`, "-f", "null", "-"]).stderr;
  const s = [...e.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const en = [...e.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  return s.map((a, i) => ({ s: a, e: en[i] ?? dur(f) }));
};

// ── тексты глав из скрипта ──
const lines = fs.readFileSync(SCRIPT, "utf8").split(/\r?\n/);
const texts = FILES.map(([, h]) => {
  const i = lines.findIndex((l) => l.startsWith(h));
  let j = i + 1;
  while (j < lines.length && !lines[j].startsWith("==")) j++;
  return lines.slice(i + 1, j).join(" ").replace(/\[[^\]]*\]/g, " ").replace(/\{[^}]*\}/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
});

// ── 1. ускорение каждой главы ──
const chapters = [];
for (const [file] of FILES) {
  const src = `${SRC}/${file}`;
  const out = `${OUT}/chap/${file.replace(/_001/, "")}`;
  const D = dur(src);
  const pauses = silences(src, 0.3).filter((p) => p.s > 0.3 && p.e < D - 0.05);
  const segs = [];
  let cur = 0;
  for (const p of pauses) {
    segs.push([cur, p.s + KEEP]);
    cur = p.e;
  }
  segs.push([cur, D]);
  const parts = segs.map((g, i) => `[0:a]atrim=${g[0].toFixed(3)}:${g[1].toFixed(3)},asetpts=N/SR/TB[s${i}]`).join(";");
  const fc = `${parts};${segs.map((_, i) => `[s${i}]`).join("")}concat=n=${segs.length}:v=0:a=1,rubberband=tempo=${TEMPO}:pitch=1[o]`;
  const r = ff(["-v", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[o]", "-ar", "44100", "-ac", "1", "-b:a", "192k", out]);
  if (r.status !== 0) throw new Error(r.stderr);
  chapters.push({ file, out, before: D, after: dur(out), pauses: pauses.length });
  console.log(file, D.toFixed(1), "→", dur(out).toFixed(1), "с, пауз", pauses.length);
}

// ── 2. склейка: тишина 0,25 с в начале, между главами GAP ──
const starts = [];
let t = 0.25;
const inputs = [];
const filt = [];
chapters.forEach((c, i) => {
  starts.push(t);
  inputs.push("-i", c.out);
  const gap = GAP[c.file] ?? GAP.default;
  filt.push(`[${i}:a]apad=pad_dur=${gap}[g${i}]`);
  t += c.after + gap;
});
const cat = `${filt.join(";")};${chapters.map((_, i) => `[g${i}]`).join("")}concat=n=${chapters.length}:v=0:a=1,adelay=250:all=1[o]`;
let r = ff(["-v", "error", "-y", ...inputs, "-filter_complex", cat, "-map", "[o]", "-ar", "44100", "-ac", "1", "-b:a", "192k", `${OUT}/vo.mp3`]);
if (r.status !== 0) throw new Error(r.stderr);
console.log("всего", dur(`${OUT}/vo.mp3`).toFixed(1), "с; главы с", starts.map((x) => x.toFixed(1)).join(" "));

// ── 3. слова: DP по паузам ──
const words = [];
const phr = [];
chapters.forEach((c, ci) => {
  const W = texts[ci];
  const D = c.after;
  const sil = silences(c.out, 0.12).filter((p) => p.s > 0.05 && p.e < D - 0.03);
  const speech = [];
  let cur = 0;
  for (const p of sil) {
    speech.push([cur, p.s]);
    cur = p.e;
  }
  speech.push([cur, D]);
  const S = speech.reduce((a, g) => a + (g[1] - g[0]), 0);
  const letters = W.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 0.5);
  const cum = [0];
  letters.forEach((l) => cum.push(cum[cum.length - 1] + l));
  const Lt = cum[cum.length - 1];
  const punct = W.map((w) => (/[.?!…:]$/.test(w) ? 2 : /[,;]$/.test(w) ? 1 : 0));
  // позиция i-й паузы на оси «время речи»
  let acc = 0;
  const pos = sil.map((_, i) => {
    acc += speech[i][1] - speech[i][0];
    return acc;
  });
  // DP: пауза j ↔ граница после слова k (k растёт), стоимость = |предсказанное − фактическое| / S·N + штраф без знака
  const n = W.length;
  const m = pos.length;
  const INF = 1e18;
  const cost = Array.from({ length: m + 1 }, () => new Array(n).fill(INF));
  const from = Array.from({ length: m + 1 }, () => new Array(n).fill(-1));
  for (let k = 0; k < n; k++) cost[0][k] = 0;
  for (let j = 1; j <= m; j++) {
    let best = INF;
    let bk = -1;
    for (let k = 0; k < n - 1; k++) {
      if (cost[j - 1][k] < best) {
        best = cost[j - 1][k];
        bk = k;
      }
      // пауза j после слова k, предыдущая — строго до k: берём лучший по prefix
      const pred = (cum[k + 1] / Lt) * S;
      const err = Math.abs(pred - pos[j - 1]) / S * n;
      const pen = punct[k] === 0 ? 3 : punct[k] === 1 ? 0.6 : 0;
      if (best < INF) {
        const v = best + err + pen;
        if (v < cost[j][k]) {
          cost[j][k] = v;
          from[j][k] = bk;
        }
      }
    }
  }
  // восстановление
  let k = 0;
  let bv = INF;
  for (let q = 0; q < n; q++) if (cost[m][q] < bv) { bv = cost[m][q]; k = q; }
  const cut = new Array(m);
  for (let j = m; j >= 1; j--) {
    cut[j - 1] = k;
    k = from[j][k];
  }
  // сегменты слов между паузами
  const bounds = [-1, ...cut, n - 1];
  for (let s = 0; s < speech.length; s++) {
    const a = bounds[s] + 1;
    const b = bounds[s + 1];
    if (b < a) continue;
    const [t0, t1] = speech[s];
    const sum = letters.slice(a, b + 1).reduce((x, y) => x + y, 0);
    let tt = t0;
    for (let i = a; i <= b; i++) {
      const d = ((t1 - t0) * letters[i]) / sum;
      words.push({ text: (words.length ? " " : "") + W[i], startMs: Math.round((starts[ci] + tt) * 1000), endMs: Math.round((starts[ci] + tt + d) * 1000), timestampMs: Math.round((starts[ci] + tt + d / 2) * 1000), confidence: null, ch: ci });
      tt += d;
    }
    phr.push({ ch: ci, from: +(starts[ci] + t0).toFixed(3), to: +(starts[ci] + t1).toFixed(3), words: b - a + 1 });
  }
  console.log("гл.", ci, "слов", n, "пауз", m, "оценка DP", bv.toFixed(1));
});
fs.writeFileSync(`${OUT}/words.json`, JSON.stringify(words, null, 1));
fs.writeFileSync(`${OUT}/voice-map.json`, JSON.stringify({ tempo: TEMPO, keep: KEEP, chapters: chapters.map((c, i) => ({ file: c.file, start: +starts[i].toFixed(3), dur: +c.after.toFixed(3), words: texts[i].length })), phrases: phr }, null, 1));
console.log("слов всего", words.length);
