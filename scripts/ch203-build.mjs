// CH2-03: раскладка по словам озвучки → public/ch2-03/props.json (клипы, оверлеи, звук, длина).
// Вход: public/ch2-03/words.json + voice-map.json (scripts/ch203-voice.mjs) и public/ch2-03/board.mjs (раскладка: коды кадров, привязки к словам, графика, тексты — НЕ в репозитории, лежит на Диске).
// Привязка = фраза из слов озвучки (как их слышит whisper, без акцентов и знаков, цифры — цифрами) внутри главы; "@start" / "@end" — начало / конец главы; dt — сдвиг, с.
// Использование: node scripts/ch203-build.mjs   → props.json + timeline.txt
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const DIR = "public/ch2-03";
const words = JSON.parse(fs.readFileSync(`${DIR}/words.json`, "utf8"));
const vmap = JSON.parse(fs.readFileSync(`${DIR}/voice-map.json`, "utf8"));
const board = (await import(pathToFileURL(`${process.cwd()}/${DIR}/board.mjs`).href + `?t=${Date.now()}`)).default;
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ]/g, "");
const byCh = vmap.chapters.map((_, i) => words.map((w, k) => ({ ...w, k })).filter((w) => w.ch === i));
const warn = [];
const cursor = {};

const find = (ch, a, from = 0, nth = 1) => {
  const W = byCh[ch];
  const toks = a.split(" ").map(norm).filter(Boolean);
  let hit = 0;
  for (let i = from; i <= W.length - toks.length; i++) {
    if (toks.every((t, k) => W[i + k].n === t)) {
      hit++;
      if (hit === nth) return i;
    }
  }
  return -1;
};
const at = (ch, a, dt = 0, { track = false, nth = 1 } = {}) => {
  const C = vmap.chapters[ch];
  if (a === "@start") return { t: C.start + dt, i: 0 };
  if (a === "@end") return { t: C.end + dt, i: byCh[ch].length };
  let i = find(ch, a, track ? cursor[ch] ?? 0 : 0, nth);
  if (i < 0 && track) i = find(ch, a, 0, nth);
  if (i < 0) {
    warn.push(`⚠ не найдено «${a}» в гл. ${ch}`);
    return { t: null, i: cursor[ch] ?? 0 };
  }
  if (track) cursor[ch] = i;
  return { t: byCh[ch][i].s + dt, i };
};

// ── клипы ──
const ORIGINS = ["50% 50%", "30% 45%", "70% 55%", "55% 70%", "40% 30%"];
const GRADE = { "P02.jpg": "archivo", "P03.jpg": "archivo", "P07.jpg": "archivo", "P01.jpg": "hoy", "P06.jpg": "hoy", "P08.jpg": "hoy", "S01.jpg": "hoy" };
const VIDSEC = { "V07.mp4": 6.0 };
let oi = 0;
const seen = {};
let shots = board.shots.map((s) => {
  const r = at(s.ch, s.a ?? "@start", s.dt ?? 0, { track: true });
  return { ...s, t: r.t };
});
// без привязки (t = null) — предыдущая + 3 с
shots.forEach((s, i) => {
  if (s.t === null) s.t = (shots[i - 1]?.t ?? 0) + 3;
});
shots.sort((a, b) => a.t - b.t);
const clips = [];
const labels = [];
shots.forEach((s, i) => {
  const t = +s.t.toFixed(3);
  const next = shots[i + 1]?.t ?? vmap.total + board.tail;
  const cf = s.cf ?? (t < 31 ? 0.12 : 0.28);
  if (s.black) return void clips.push({ at: t, black: true, crossfadeSec: s.cf ?? 0.15 });
  if (s.gfx) return void clips.push({ at: t, gfx: s.gfx, crossfadeSec: cf });
  const src = s.src;
  const c = { at: t, src, crossfadeSec: cf };
  c.grade = s.g ?? GRADE[src] ?? "recreacion";
  const n = (seen[src] = (seen[src] ?? 0) + 1);
  const prevSame = shots[i - 1] && shots[i - 1].src === src;
  c.motion = n > 1 || prevSame ? { scale: [1.14, 1.22], origin: ORIGINS[(oi += 2) % 5] } : { scale: [1.0, 1.07], origin: ORIGINS[(oi += 1) % 5] };
  if (/\.mp4$/.test(src)) {
    // 720p и возможный знак генератора справа внизу: наезд ≥ 110 % от левого верхнего угла
    c.motion = { scale: [1.1, 1.16], origin: "0% 0%" };
    c.videoSec = VIDSEC[src] ?? 7.9;
    if (s.ss) c.startFromSec = s.ss;
    if (s.rate) c.rate = s.rate;
  }
  if (s.m) c.motion = { scale: s.m, origin: s.o ?? c.motion.origin };
  else if (s.o) c.motion.origin = s.o;
  if (s.pos) c.pos = s.pos;
  if (s.shake) c.shake = s.shake;
  if (s.fit) c.fit = s.fit;
  if (s.vs) c.videoSec = s.vs;
  clips.push(c);
  const dur = next - t;
  if (/\.mp4$/.test(src) && c.videoSec && dur > c.videoSec / (c.rate ?? 1) + 0.2) warn.push(`⚠ клип ${src} на ${t.toFixed(1)} с длиннее файла (${dur.toFixed(1)} > ${c.videoSec}) — будет стоп-кадр`);
  if (s.label) labels.push({ at: t + 0.2, until: next - 0.1, el: { k: "label", text: s.label, source: s.source } });
});

// ── оверлеи ──
const overlays = [...labels];
for (const o of board.overlays) {
  const a = at(o.ch, o.a ?? "@start", o.dt ?? 0, { nth: o.nth ?? 1 });
  if (a.t === null) continue;
  let until = a.t + (o.dur ?? 3);
  if (o.toA) {
    const b = at(o.toCh ?? o.ch, o.toA, o.toDt ?? 0, { nth: o.toNth ?? 1 });
    if (b.t !== null) until = b.t;
  }
  const el = o.strikeDt !== undefined ? { ...o.el, strikeAtSec: +(a.t + o.strikeDt).toFixed(3) } : o.el;
  overlays.push({ at: +a.t.toFixed(3), until: +until.toFixed(3), el });
}
// G5: сквозной счётчик по ключам (глава, привязка, день)
if (board.counter) {
  const C = board.counter;
  const keys = C.keys.map(([ch, a, day, dt = 0]) => [+at(ch, a, dt).t.toFixed(3), day]);
  const from = at(C.fromCh, C.fromA ?? "@start", C.fromDt ?? 0).t;
  const to = at(C.toCh, C.toA ?? "@end", C.toDt ?? 0).t;
  // hide: [[ch, a, dt, ch2, a2, dt2], …] — интервалы, когда плашка скрыта (например, гл. 1575)
  const hideRanges = (C.hide ?? []).map(([c1, a1, d1, c2, a2, d2]) => [+at(c1, a1, d1 ?? 0).t.toFixed(3), +at(c2, a2, d2 ?? 0).t.toFixed(3)]);
  overlays.push({ at: +from.toFixed(3), until: +to.toFixed(3), el: { k: "counter", keys, total: C.total, meters: C.meters, dayLabel: C.dayLabel, sub: C.sub, subSec: C.subSec ?? 3, hideRanges } });
}
overlays.sort((a, b) => a.at - b.at);

// ── звук ──
const sfx = [];
for (const s of board.sfx) {
  const t = s.at !== undefined ? s.at : at(s.ch, s.a ?? "@start", s.dt ?? 0, { nth: s.nth ?? 1 }).t;
  if (t === null) continue;
  sfx.push({ src: s.src, at: +t.toFixed(3), volumeDb: s.vol ?? -12, durSec: s.dur, fadeSec: s.fade ?? 0.4 });
}
sfx.sort((a, b) => a.at - b.at);

// ── музыка: план для scripts/ch203-music.py (сегменты, усиление, «провалы» перед ключевыми фактами) ──
const musicPlan = board.music
  ? (() => {
      const T = (ch, a, dt = 0) => at(ch, a, dt).t;
      const M = board.music;
      return {
        relDb: M.relDb,
        duckDb: M.duckDb,
        segs: M.segs.map((g) => ({ src: g.src, from: +T(g.fromCh, g.fromA, g.fromDt).toFixed(3), to: +T(g.toCh, g.toA, g.toDt).toFixed(3), fadeIn: g.in, fadeOut: g.out, gains: (g.gains ?? []).map((x) => [+T(x[0], x[1], x[2]).toFixed(3), +T(x[3], x[4], x[5]).toFixed(3), x[6]]) })),
        dips: M.dips.map((d) => [+T(d[0], d[1], d[2]).toFixed(3), +(T(d[0], d[1], d[2]) + d[3]).toFixed(3)]),
      };
    })()
  : null;
const totalSec = +(vmap.total + board.tail).toFixed(2);
const draft = process.argv.includes("--draft");
let props = { folder: "ch2-03", voice: "vo.mp3", clips, overlays, sfx, totalSec };
if (draft) {
  // черновик: лёгкие прокси (public/ch2-03-draft: кадры ≤ 1280 px в jpg, клипы 960×540), без зерна-наложения
  const fix = (o) => (Array.isArray(o) ? o.map(fix) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, (k === "bg" || k === "src") && typeof v === "string" ? v.replace(/\.(webp|png)$/i, ".jpg") : fix(v)])) : o);
  props = { ...fix(props), folder: "ch2-03-draft", draft: true };
}
const final = process.argv.includes("--final");
if (final) {
  // финал 1920×1080: все кадры (кроме P01, P08, S01 ≥ 1920) и клипы апскейлены скриптом tools/cloud/steps/upscale_final.sh в public/ch2-03-final; кадры там — PNG
  const KEEP = /^(P01|P08|S01)\./;
  const toPng = (v) => (typeof v === "string" && /\.(webp|png|jpg|jpeg)$/i.test(v) && !KEEP.test(v) ? v.replace(/\.(webp|png|jpg|jpeg)$/i, ".png") : v);
  const fixF = (o) => (Array.isArray(o) ? o.map(fixF) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === "bg" || k === "src" ? toPng(v) : fixF(v)])) : o);
  props = { ...fixF(props), folder: "ch2-03-final" };
  if (musicPlan) props = { ...props, music: { src: "music-bed.mp3", volumeDb: 0, duck: [] }, musicPlan };
}
fs.writeFileSync(`${DIR}/props${final ? "-final" : draft ? "-draft" : ""}.json`, JSON.stringify(props));

// ── отчёт: длины планов ──
const tl = [];
clips.forEach((c, i) => {
  const d = (clips[i + 1]?.at ?? totalSec) - c.at;
  tl.push(`${c.at.toFixed(2).padStart(7)}  ${d.toFixed(2).padStart(5)}  ${c.src ?? (c.gfx ? (c.gfx.spec ? "gfx:" + c.gfx.spec.kind : "gfx:" + c.gfx.g) : "black")}`);
});
fs.writeFileSync(`${DIR}/timeline.txt`, tl.join("\n"));
const lens = clips.map((c, i) => (clips[i + 1]?.at ?? totalSec) - c.at);
console.log(`клипов ${clips.length}, оверлеев ${overlays.length}, sfx ${sfx.length}; длина ${totalSec} с (${Math.floor(totalSec / 60)}:${String(Math.round(totalSec % 60)).padStart(2, "0")})`);
console.log(`планы: средний ${(lens.reduce((a, b) => a + b, 0) / lens.length).toFixed(1)} с, самый длинный ${Math.max(...lens).toFixed(1)} с, короче 1,2 с: ${lens.filter((x) => x < 1.2).length}`);
if (warn.length) console.log(warn.join("\n"));
