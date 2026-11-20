// Раскадровка (scripts/long-board.json) → src/ch2-01.ts: клипы, оверлеи, звуки, музыка длинного. Запуск: node scripts/long-build.mjs
import fs from "node:fs";

const board = JSON.parse(fs.readFileSync("scripts/long-board.json", "utf8"));
const END = 555;
const shots = [];
board.chapters.forEach((ch) => ch.shots.forEach(([t, src, note]) => shots.push({ t, src, note })));

// карточки глав (B2)
const CARDS = {
  31.4: { n: 1, title: "QUINCE DÍAS", date: "5 · II · 1943", bg: "s06.jpg" },
  81.9: { n: 2, title: "LAS CUATRO DE LA TARDE", date: "20 · II · 1943 · 16:00", bg: "S10_2.jpg" },
};
// карточки гл. 3–6 стоят на начале главы (2,4 с); первый кадр главы начинается после них
const CH_START = {
  195.5: { n: 3, title: "CIENTO SESENTA Y SIETE METROS", date: "21 · II · 1943 · 08:00" },
  267.9: { n: 4, title: "DOS PUEBLOS", date: "12 · VI · 1943" },
  349.5: { n: 5, title: "EL HOMBRE QUE LO ANOTÓ TODO", date: "III · 1943" },
  447.8: { n: 6, title: "LA SEÑAL", date: "1952" },
};
const CARD_SEC = 2.4;

const ORIGINS = ["50% 50%", "30% 45%", "70% 55%", "55% 70%", "40% 30%"];
const clips = [];
const seenSrc = {};
let oi = 0;
shots.forEach((s, i) => {
  let t = s.t;
  const src = s.src;
  const prev = shots[i - 1];
  const hook = t < 31.4;
  const cf = hook ? 0.12 : 0.3;
  if (CH_START[t]) {
    const c = CH_START[t];
    const bgShot = src.startsWith("@") ? "A3.jpg" : src;
    clips.push({ at: t, gfx: { g: "card", ...c, bg: /\.(png|jpg)$/.test(bgShot) ? bgShot : "A3.jpg" }, crossfadeSec: 0.3 });
    t += CARD_SEC;
  }
  if (src === "@R1") {
    clips.push({ at: t, gfx: { g: "card", ...CARDS[t], bg: CARDS[t].bg }, crossfadeSec: 0.3 });
    return;
  }
  if (src === "@BLACK") return void clips.push({ at: t, black: true, crossfadeSec: 0.15 });
  if (src === "@G2") {
    const mode = t < 33 ? "region" : t < 270 ? "pari" : t < 290 ? "two" : t < 300 ? "two" : t < 460 ? "vent" : "final";
    const m = s.t === 29.4 ? "region" : s.t === 33.7 ? "region" : s.t === 267.9 ? "pari" : s.t === 285.4 ? "two" : t === 294.2 ? "vent" : "final";
    return void clips.push({ at: t, gfx: { g: "g2", mode: m ?? mode }, crossfadeSec: cf });
  }
  if (src === "@G1") return void clips.push({ at: t, gfx: { g: "g1", towerAtSec: 214.9 - t, growSec: 213.4 - t }, crossfadeSec: cf });
  if (src === "@G3") return void clips.push({ at: t, gfx: { g: "g3" }, crossfadeSec: cf });
  if (src === "@G6") return void clips.push({ at: t, gfx: { g: "g6" }, crossfadeSec: cf });
  if (src === "@MAP") return void clips.push({ at: t, gfx: { g: "map" }, crossfadeSec: cf });
  if (src === "@LIFE") return void clips.push({ at: t, gfx: { g: "life" }, crossfadeSec: cf });
  if (src === "@TABLE")
    return void clips.push({ at: t, gfx: { g: "table", photos: [{ src: "A1.jpg", at: 6 }, { src: "A2.jpg", at: 55 }, { src: "A3.jpg", at: 105 }, { src: "A4.jpg", at: 160 }] }, crossfadeSec: cf });
  if (src === "@R6") {
    const step = t === 27.2 ? 0 : t === 486.9 ? 0 : t === 503.1 ? 1 : 3;
    return void clips.push({ at: t, gfx: { g: "r6", step }, crossfadeSec: step === 0 || t === 27.2 ? cf : 0.15 });
  }

  const c = { at: t, src, crossfadeSec: cf };
  const isA = /^A\d/.test(src);
  c.grade = /^A7/.test(src) ? "hoy" : isA ? "archivo" : "recreacion";
  const again = prev && prev.src === src; // второй кроп того же кадра
  const n = (seenSrc[src] = (seenSrc[src] ?? 0) + 1);
  if (again) c.motion = { scale: [1.16, 1.24], origin: ORIGINS[(oi += 1) % 5] };
  else c.motion = { scale: [1.0, 1.07], origin: ORIGINS[(oi += 1) % 5] };
  if (n > 1 && !again) c.motion = { scale: [1.08, 1.0], origin: ORIGINS[(oi += 2) % 5] }; // повтор через время: отъезд, другой угол

  // особые случаи
  if (src === "A1.jpg") {
    c.motion = { scale: [1.06, 1.1], origin: "50% 50%" };
    c.pos = s.t === 195.5 ? ["50% 94%", "50% 30%"] : t === 199.5 ? ["50% 40%", "50% 20%"] : ["50% 85%", "50% 55%"];
  }
  if (src === "A2.jpg") {
    c.motion = { scale: [1.05, 1.08], origin: "70% 20%" };
    c.pos = ["50% 30%", "50% 30%"];
    if (s.t === 195.5) { c.motion = { scale: [1.0, 1.06], origin: "50% 70%" }; c.pos = ["50% 100%", "50% 62%"]; }
    if (s.t === 231.1) { c.motion = { scale: [1.16, 1.26], origin: "40% 80%" }; c.pos = ["40% 90%", "60% 86%"]; }
  }
  if (src === "A3.jpg" && s.t === 199.5) c.pos = ["50% 35%", "50% 62%"];
  if (src === "A3.jpg") c.motion = { scale: [1.04, 1.12], origin: "50% 55%" };
  if (src === "A4.jpg") {
    c.motion = { scale: t === 281.6 ? [1.04, 1.07] : [1.2, 1.28], origin: t === 281.6 ? "77% 52%" : "70% 55%" };
    c.pos = ["50% 50%", "50% 50%"];
  }
  if (src === "s25_2.jpg" && t === 279.4) c.motion = { scale: [1.0, 1.06], origin: "50% 60%" };
  if (src === "A6.jpg") {
    // портрет: кроп 16:9 с медленным дрейфом снизу вверх вместо размытых полос (B11)
    c.motion = { scale: [1.0, 1.0], origin: "50% 50%" };
    c.pos = ["50% 100%", "50% 8%"];
  }
  if (/^s15/.test(src)) c.motion = { scale: [1.08, 1.12], origin: "0% 0%" }; // знак ✦ генератора в правом нижнем углу (B9)
  if (/^A7/.test(src)) c.motion = { scale: [1.04, 1.1], origin: "50% 60%" };
  if (src === "S11.1.jpg") c.shake = 3;
  if (/\.mp4$/.test(src)) {
    c.videoSec = 8;
    c.motion = { scale: [1.06, 1.1], origin: "0% 0%" }; // знак «Veo» в правом нижнем углу прячется кропом
    if (src === "S13v.1.mp4") c.startFromSec = 0;
    if (src === "S13v.mp4") c.startFromSec = t > 120 ? 2.0 : 0;
    if (src === "S01v.mp4") c.startFromSec = t > 50 ? 3.0 : 0;
    if (src === "S15v.mp4" || src === "S15v.1.mp4") {
      c.rate = 0.62;
      c.videoSec = 2.2;
    }
    if (src === "S3.mp4") {
      c.videoSec = 14.8;
      c.startFromSec = t > 300 ? 6 : 0;
    }
    if (src === "S2.mp4") {
      c.videoSec = 27.3;
      c.bright = 1.9;
      // три окна без пересечения: вспышка 6 с — на начало цитаты (515,6), 20,5 с — на «sigue hablando» (528,9)
      c.startFromSec = t === 510.9 ? 1.3 : t === 518.9 ? 9.7 : 18.4;
    }
    if (src === "N1V.mp4") {
      c.videoSec = 7.9;
      c.motion = { scale: [1.1, 1.14], origin: "0% 0%" }; // знак «Veo» справа внизу прячется кропом
      c.grade = "recreacion";
    }
    if (src === "S01v.2.mp4") {
      c.motion = { scale: [1.06, 1.08], origin: "0% 0%" };
      if (t === 535.9) {
        c.startFromSec = 0;
        c.videoSec = 8;
      }
    }
  }
  if (src === "S01v.2.mp4" && t === 535.9) {
    // хвост: стоп-кадр до конца
  }
  clips.push(c);
});
// порядок по времени (карточки глав вставлены по ходу)
clips.sort((a, b) => a.at - b.at);

// ── оверлеи ──
const ov = [];
const add = (at, until, el) => ov.push({ at, until, el });
add(0, 2.0, { k: "hook", text: "15 DÍAS" });
// B1: часы-дата
add(33.9, 40.5, { k: "clock", date: "5 · II · 1943", place: "MICHOACÁN" });
add(84.2, 95.2, { k: "clock", date: "20 · II · 1943 · 16:00", place: "PARICUTÍN" });
add(135.6, 142.2, { k: "clock", date: "17:00", place: "PARICUTÍN" });
add(166.5, 173.7, { k: "clock", date: "20:00", place: "PARICUTÍN" });
add(173.7, 178.5, { k: "clock", date: "22:00", place: "PARICUTÍN" });
add(178.5, 186.3, { k: "clock", date: "23:00", place: "PARICUTÍN" });
add(197.9, 204.5, { k: "clock", date: "21 · II · 1943 · 08:00", place: "PARICUTÍN" });
add(352.0, 357.5, { k: "clock", date: "III · 1943", place: "PARICUTÍN" });
add(450.3, 453.5, { k: "clock", date: "1952", place: "PARICUTÍN" });
// B3/B5: FOTO REAL на архиве (подряд идущие кропы — одна метка)
const real = [];
clips.forEach((c, i) => {
  if (!c.src || !/^A\d/.test(c.src)) return;
  const end = clips[i + 1]?.at ?? END;
  const last = real[real.length - 1];
  const text = /^A7/.test(c.src) ? "FOTO REAL · HOY" : "FOTO REAL";
  const source = /^A[1-4]\./.test(c.src) ? "Smithsonian Institution Archives" : undefined;
  if (last && last.until >= c.at - 0.01 && last.text === text && last.source === source) last.until = end;
  else real.push({ at: c.at, until: end, text, source });
});
real.forEach((r) => add(r.at + 0.2, r.until - 0.1, { k: "label", text: r.text, source: r.source }));
// B7: счётчик 167 M в хуке (встаёт на «siete» ≈ 15,6 с)
add(14.2, 16.7, { k: "big", text: "167 M", sub: "EN 6 DÍAS", countTo: 167, unit: "M", countFrom: 14.4, countSec: 1.2, top: 560 });
// B4: пометки
add(95.4, 100.6, { k: "circle", cx: 360, cy: 575, rx: 330, ry: 150, text: "UNA DEPRESIÓN", tx: 140, ty: 330 });
add(204.9, 211.0, { k: "circle", cx: 1400, cy: 230, rx: 330, ry: 270 });
add(282.0, 285.4, { k: "circle", cx: 1478, cy: 575, rx: 200, ry: 150 });
// G5: ростомер вздутия
add(110.0, 114.4, { k: "bracket", x: 340, y0: 990, y1: 265, text: "≈ 2,5 M" });
// плашки
add(231.3, 238.0, { k: "plate", text: "¿CUÁNTOS ", hi: "METROS?", x: 96, y: 380 });
add(317.9, 319.8, { k: "plate", text: "NADIE MURIÓ POR ", hi: "LA LAVA", x: 160, y: 380 });
add(435.2, 439.3, { k: "quote", text: "el único registro completo", author: "WILLIAM F. FOSHAG · SOBRE LAS NOTAS DE C. GUTIÉRREZ" });
add(515.6, 522.5, { k: "quote", text: "Hace veinticinco años que el magma intenta llegar a la superficie, pero no se sabe cuándo lo logrará", author: "DENIS LEGRAND · SISMÓLOGO · UNAM" });
add(535.9, END, { k: "final", l1: "¿Tú te irías…", l2: "o te quedarías a mirar?" });
ov.sort((a, b) => a.at - b.at);

// ── звук ──
const sfx = [
  ["sub-boom.wav", 0.0, -10],
  ["field-morning-wind.mp3", 0.1, -20, 7, 1],
  ["ground-rumble.mp3", 0.4, -24, 6, 1],
  ["sub-boom.wav", 15.4, -9],
  ["paper-rustle.mp3", 31.5, -16, 2.2],
  ["ground-rumble.mp3", 42.2, -22, 7, 1],
  ["ground-rumble.mp3", 49.7, -18, 3.2, 0.5],
  ["ground-rumble.mp3", 52.8, -12, 2.3, 0.3],
  ["church-bell-distant.mp3", 55.5, -22, 6, 1],
  ["crowd-murmur.mp3", 59.9, -26, 6, 1],
  ["paper-rustle.mp3", 82.0, -16, 2.2],
  ["candle-room.mp3", 147.9, -26, 9, 1],
  ["twigs-crackle.mp3", 102.9, -16, 5, 0.6],
  ["sub-boom.wav", 108.9, -10],
  ["horse-gallop.mp3", 128.6, -20, 6, 0.8],
  ["crowd-murmur.mp3", 135.6, -24, 6, 1],
  ["thunder-far.mp3", 166.6, -18, 6, 1],
  ["eruption-night.mp3", 173.8, -16, 8, 1],
  ["ground-rumble.mp3", 178.5, -20, 7, 1],
  ["paper-rustle.mp3", 195.6, -16, 2.2],
  ["sub-boom.wav", 209.4, -9],
  ["airplane-dc3-interior.mp3", 251.2, -18, 5.6, 0.8],
  ["paper-rustle.mp3", 268.0, -16, 2.2],
  ["mules-steps-dust.mp3", 279.5, -14, 5, 0.6],
  ["thunder-far.1.mp3", 322.9, -16, 6, 1],
  ["paper-rustle.mp3", 349.6, -16, 2.2],
  ["camera-shutter.mp3", 357.6, -12],
  ["camera-shutter.1.mp3", 361.7, -12],
  ["pen-paper.mp3", 413.9, -14, 12, 1],
  ["paper-rustle.mp3", 425.9, -14, 3, 0.5],
  ["paper-rustle.mp3", 432.3, -14, 3, 0.5],
  ["paper-rustle.mp3", 447.9, -16, 2.2],
  ["field-morning-wind.mp3", 453.5, -20, 10, 1.5],
  ["thunder-far.mp3", 511.0, -18, 7, 1],
  ["thunder-far.1.mp3", 519.0, -20, 7, 1],
].map(([src, at, volumeDb, durSec, fadeSec]) => ({ src, at, volumeDb, durSec, fadeSec }));
const duck = [
  [15.2, 16.4, 0.15],
  [107.0, 108.4, 0.1],
  [108.8, 110.0, 0.2],
  [209.2, 210.2, 0.15],
  [316.9, 319.8, 0.08],
  [447.8, 453.4, 0.35],
].map(([from, to, floor]) => ({ from, to, floor, fadeSec: 0.2 }));

const out = `import type { LongProps } from "./long";

// Сгенерировано scripts/long-build.mjs из scripts/long-board.json (раскадровка v2). Не править руками — править json/скрипт и перезапускать.
export const ch2: LongProps = ${JSON.stringify(
  { folder: "ch2-01", voice: "vo.mp3", music: { src: "music-bed.mp3", volumeDb: -10, duck }, clips, overlays: ov, sfx, totalSec: END },
  null,
  1,
)};
`;
fs.writeFileSync("src/ch2-01.ts", out);
console.log("клипов", clips.length, "оверлеев", ov.length, "sfx", sfx.length);
