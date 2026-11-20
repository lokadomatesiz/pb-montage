// CH2-03 «Valdivia 1960»: мастер-озвучка из глав + паузы PACKAGE-v3 §5a, слова из whisper (public/ch2-03/words/*.json).
// Исходники не трогаем: вход — public/ch2-03/vo-raw/*.mp3 (копии из production), выход — public/ch2-03/vo.mp3, words.json (глобальные секунды), voice-map.json.
// Паузы ставятся В СЕРЕДИНУ естественного зазора между словами; если естественный зазор уже длиннее нужного — ничего не добавляется.
// Использование: node scripts/ch203-voice.mjs
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const DIR = "public/ch2-03";
const CH = [
  { n: "vo_00_hook", gapAfter: 0.7, pauses: [{ find: ["63", "dias"], cut: 0, gap: 0.6 }] },
  {
    n: "vo_01_terremoto",
    gapAfter: 0.7,
    pauses: [
      { find: ["entonces", "empieza", "el"], cut: 0, gap: 0.3 },
      { find: ["pero", "ninguna", "de"], cut: 0, gap: 0.5 },
    ],
  },
  {
    n: "vo_02_tacos",
    gapAfter: 0.7,
    pauses: [
      { find: ["y", "aqui", "esta"], cut: 0, gap: 0.6 },
      { find: ["centimetro", "un", "millon"], cut: 1, gap: 0.3, all: true },
    ],
  },
  { n: "vo_03_cuenta", gapAfter: 1.2, pauses: [{ find: ["la", "amenaza", "era"], cut: 0, gap: 0.4 }] },
  { n: "vo_03b_subs", gapAfter: 0.7, pauses: [] },
  {
    n: "vo_04_palas",
    gapAfter: 0.7,
    pauses: [
      { find: ["para", "ganar", "tiempo"], cut: 0, gap: 0.4 },
      { find: ["y", "lo", "mas", "inquietante"], cut: 0, gap: 0.6 },
    ],
  },
  { n: "vo_05_1575", gapAfter: 0.7, pauses: [{ find: ["nueva", "ya", "habia"], cut: 1, gap: 1.0 }] },
  {
    n: "vo_06_julio",
    gapAfter: 0.7,
    pauses: [
      { find: ["se", "hablaba", "mas"], cut: 0, gap: 0.4 },
      { find: ["dos", "meses", "de"], cut: 0, gap: 0.8 },
    ],
  },
  {
    n: "vo_07_hoy",
    gapAfter: 1.0,
    pauses: [
      { find: ["tampoco", "hubo"], cut: 0, gap: 0.5 },
      { find: ["apalear", "un", "centimetro"], cut: 1, gap: 0.6 },
    ],
  },
  { n: "vo_08_question", gapAfter: 0, pauses: [] },
];
const LEAD = 0.25;

const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ]/g, "");
const ff = (a) => spawnSync("ffmpeg", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const dur = (f) => +spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }).stdout;

// реальные тишины (whisper -ml 1 даёт слитные границы слов, по ним паузу не найти)
const silences = (f) => {
  const e = ff(["-hide_banner", "-i", f, "-af", "silencedetect=noise=-36dB:d=0.05", "-f", "null", "-"]).stderr;
  const st = [...e.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Math.max(0, +m[1]));
  const en = [...e.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  return st.map((a, i) => ({ s: a, e: en[i] ?? a + 0.05 }));
};

const readWords = (n) => {
  const j = JSON.parse(fs.readFileSync(`${DIR}/words/${n}.json`, "utf8"));
  return j.transcription
    .map((t) => ({ raw: t.text.trim(), w: norm(t.text), s: t.offsets.from / 1000, e: t.offsets.to / 1000 }))
    .filter((x) => x.w && !/^\[.*\]$/.test(x.raw));
};

const out = [];
let T = LEAD;
const words = [];
const map = [];
const report = [];
fs.mkdirSync(`${DIR}/chap`, { recursive: true });
CH.forEach((c, ci) => {
  const src = `${DIR}/vo-raw/${c.n}.mp3`;
  const D = dur(src);
  const W = readWords(c.n);
  const SIL = silences(src);
  // 1. места пауз
  const cuts = [];
  for (const p of c.pauses) {
    let from = 0;
    let hits = 0;
    for (;;) {
      let idx = -1;
      for (let i = from; i <= W.length - p.find.length; i++) {
        if (p.find.every((x, k) => W[i + k].w === x)) {
          idx = i;
          break;
        }
      }
      if (idx < 0) break;
      const at = idx + p.cut;
      if (at > 0) {
        const guess = (W[at - 1].e + W[at].s) / 2;
        // ближайшая реальная тишина в пределах ±0,45 с от границы слов; нет — режем по границе слов и предупреждаем
        const near = SIL.filter((q) => Math.abs((q.s + q.e) / 2 - guess) <= 0.45).sort((a, b) => Math.abs((a.s + a.e) / 2 - guess) - Math.abs((b.s + b.e) / 2 - guess))[0];
        const t = near ? (near.s + near.e) / 2 : guess;
        const natural = near ? near.e - near.s : 0;
        if (!near) report.push(`⚠ ${c.n}: у «${p.find.join(" ")}» нет тишины рядом — разрез по границе слов ${guess.toFixed(2)} с`);
        cuts.push({ at, t, extra: Math.max(0, p.gap - natural), natural, gap: p.gap, label: p.find.join(" ") });
        hits++;
      }
      from = idx + p.find.length;
      if (!p.all) break;
    }
    if (!hits) report.push(`⚠ ${c.n}: не найдено «${p.find.join(" ")}»`);
  }
  cuts.sort((a, b) => a.t - b.t);
  // 2. сегменты с добавленной тишиной
  const segs = [];
  let cur = 0;
  for (const k of cuts) {
    segs.push({ a: cur, b: k.t, pad: k.extra });
    cur = k.t;
  }
  segs.push({ a: cur, b: D, pad: 0 });
  const parts = segs.map((g, i) => `[0:a]atrim=${g.a.toFixed(3)}:${g.b.toFixed(3)},asetpts=N/SR/TB,aresample=44100,aformat=channel_layouts=mono${g.pad > 0 ? `,apad=pad_dur=${g.pad.toFixed(3)}` : ""}[s${i}]`).join(";");
  const fc = `${parts};${segs.map((_, i) => `[s${i}]`).join("")}concat=n=${segs.length}:v=0:a=1[o]`;
  const o = `${DIR}/chap/${c.n}.wav`;
  const r = ff(["-v", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[o]", "-ar", "44100", "-ac", "1", o]);
  if (r.status !== 0) throw new Error(r.stderr);
  const D2 = dur(o);
  // 3. слова в глобальных секундах: сдвиг на накопленные вставки
  const shift = (t) => t + cuts.filter((k) => k.t <= t).reduce((a, k) => a + k.extra, 0);
  W.forEach((x) => words.push({ w: x.raw, n: x.w, s: +(T + shift(x.s)).toFixed(3), e: +(T + shift(x.e)).toFixed(3), ch: ci }));
  map.push({ n: c.n, start: +T.toFixed(3), end: +(T + D2).toFixed(3), dur: +D2.toFixed(3), raw: +D.toFixed(3), inserted: cuts.map((k) => ({ before: k.label, natural: +k.natural.toFixed(2), added: +k.extra.toFixed(2) })) });
  out.push({ file: o, gap: c.gapAfter });
  T += D2 + c.gapAfter;
  report.push(`${c.n}: ${D.toFixed(1)} → ${D2.toFixed(1)} с (+${(D2 - D).toFixed(2)}), пауз ${cuts.length}`);
});

// 4. склейка с зазорами между главами и тишиной в начале
const inputs = out.flatMap((c) => ["-i", c.file]);
const filt = out.map((c, i) => `[${i}:a]${c.gap > 0 ? `apad=pad_dur=${c.gap}` : "anull"}[g${i}]`);
const cat = `${filt.join(";")};${out.map((_, i) => `[g${i}]`).join("")}concat=n=${out.length}:v=0:a=1,adelay=${Math.round(LEAD * 1000)}:all=1[o]`;
const r = ff(["-v", "error", "-y", ...inputs, "-filter_complex", cat, "-map", "[o]", "-ar", "44100", "-ac", "1", "-b:a", "192k", `${DIR}/vo.mp3`]);
if (r.status !== 0) throw new Error(r.stderr);
const total = dur(`${DIR}/vo.mp3`);
fs.writeFileSync(`${DIR}/words.json`, JSON.stringify(words, null, 0));
fs.writeFileSync(`${DIR}/voice-map.json`, JSON.stringify({ lead: LEAD, total: +total.toFixed(3), chapters: map }, null, 1));
console.log(report.join("\n"));
console.log(`всего ${total.toFixed(1)} с; слов ${words.length}; главы с`, map.map((m) => m.start.toFixed(1)).join(" "));
