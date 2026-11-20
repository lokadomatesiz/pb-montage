import type { ShortProps } from "./Short";

// CH2-01-SH1 · «167 METROS». Пакет: production\ch2-01-sh1-167m\PACKAGE.md. Стиль: VISUAL-CH2.md. Черновик 3 — по правкам Cowork 1–12.
// vo.mp3 = vo_001_sh1 (36,3 с, без ускорения) + 0,22 с + вопрос (обрыв на «mirar»). Слова: whisper → align-dp → snap-to-pauses.
// ИИ-кадры метки не получают; FOTO REAL — только на архиве (год не известен → без года). Кроп ≥ 1,18 от левого низа там, где ✦ справа внизу.
// Читаемые значения счётчика: 10, 60, 167, ≈ 180 (прокрутка ≤ 0,5 с с размытием).

const sh1Old: ShortProps = {
  folder: "ch2-01-sh1",
  voice: "vo.mp3",
  captions: "words.json",
  tailSec: 0.15,
  subtitlePages: {
    "seis días después una montaña de ciento sesenta y siete metros": ["Seis días después,", "Una montaña de", "Ciento sesenta y siete metros."],
    "michoacán mil novecientos cuarenta y tres": ["Michoacán,", "Mil novecientos", "Cuarenta y tres."],
    "y el suelo se levanta dos metros y medio frente a él": ["Y el suelo se levanta", "Dos metros y medio", "Frente a él."],
    "al sexto ciento sesenta y siete": ["Al sexto,", "Ciento sesenta y siete."],
  },
  clips: [
    { src: "v01v.mp4", at: 0, grade: "recreacion", motion: { scale: [1.2, 1.26], origin: "0% 100%" } },
    { src: "A1.jpg", at: 3.5, grade: "archivo", crossfadeSec: 0.3, focus: "50% 40%", motion: { scale: [1.0, 1.08], origin: "50% 40%" } },
    // «Michoacán, mil novecientos cuarenta y tres» → поле с крестьянином (другой дубль), наезд
    { src: "v01.1.jpg", at: 8.7, grade: "recreacion", crossfadeSec: 0.3, motion: { scale: [1.18, 1.28], origin: "0% 100%" } },
    // «Un campesino quema ramas…» → S10 (Real-ESRGAN ×4, кроп 9:16): крестьянин с костром → женщина и ребёнок
    { src: "S10x.jpg", at: 11.9, grade: "recreacion", crossfadeSec: 0.3, pan: [33, 78], motion: { scale: [1.0, 1.04], origin: "50% 50%" } },
    // «…y el suelo se levanta dos metros y medio frente a él» → V12, наезд к бугру
    { src: "v12.jpg", at: 13.85, grade: "recreacion", crossfadeSec: 0.25, motion: { scale: [1.0, 1.12], origin: "30% 80%" } },
    // V15v: окно клипа до ≈ 2,2 с (кольца-артефакты дальше), замедление 0,62; низ затемнён (мелкий столб над крышами)
    { src: "v15v.mp4", at: 17.45, grade: "recreacion", crossfadeSec: 0.3, nightLava: true, rate: 0.62, bottomShade: 0.85, motion: { scale: [1.18, 1.24], origin: "0% 100%" } },
    { src: "A2.jpg", at: 20.75, grade: "archivo", crossfadeSec: 0.3, focus: "64% 50%", motion: { scale: [1.0, 1.08], origin: "64% 55%" } },
    // ростомер на фоне carbon с пеплом (B11)
    { fit: "ash", at: 25.55, grade: "none", crossfadeSec: 0.3 },
    // «Y siguió creciendo nueve años» → A3 (кратер), медленный отъезд
    { src: "A3.jpg", at: 31.6, grade: "archivo", crossfadeSec: 0.3, focus: "64% 50%", motion: { scale: [1.12, 1.0], origin: "64% 45%" } },
    // A6 — листом по ширине (верх на 29 %), головы ниже строки субтитров
    { src: "A6.jpg", at: 34.25, grade: "archivo", crossfadeSec: 0.3, fit: "sheet", top: 557, motion: { scale: [1.0, 1.06], origin: "50% 60%" } },
  ],
  overlays: [
    // 1 · хук: SÁBADO + часы-дата (B1) — с кадра 0, проявление ≤ 4 кадров
    { at: 0, until: 3.4, el: { k: "hook", text: "SÁBADO", fast: true } },
    { at: 0.3, until: 3.4, el: { k: "reloj", date: "20 · II · 1943", place: "MICHOACÁN", typeAtSec: 0.3, top: 420 } },
    // 2 · A1: метка + 167 M (прокрутка 0,5 с, цифра встаёт на «ciento»)
    { at: 3.6, until: 8.6, el: { k: "label", text: "FOTO REAL" } },
    { at: 5.9, until: 8.6, el: { k: "big", text: "167 M", sub: "EN 6 DÍAS", countTo: 167, unit: "M", countFrom: 5.92, countSec: 0.5 } },
    // 4 · вздутие: цифра левее, зазор до шляпы ≥ 100 px
    { at: 14.95, until: 17.4, el: { k: "big", text: "2,5 M", x: 300, top: 250 } },
    // 6 · 10 M → 60 M (архив A2)
    { at: 20.8, until: 25.5, el: { k: "label", text: "FOTO REAL" } },
    { at: 21.95, until: 24.35, el: { k: "big", text: "10 M", sub: "DÍA 2", subSize: 70 } },
    { at: 24.4, until: 25.5, el: { k: "big", text: "60 M", sub: "DÍA 3", subSize: 70 } },
    // 7 · ростомер: цифра и конус растут вместе, башня — на слове «Torre» (29,81 с)
    { at: 26.6, until: 31.55, el: { k: "big", text: "167 M", countTo: 167, unit: "M", countFrom: 26.7, countSec: 0.5 } },
    { at: 26.7, until: 31.55, el: { k: "g1", growFrom: 26.7, growTo: 28.2, towerAt: 29.8, cone: 167, tower: 180 } },
    // 8 · девять лет (A3)
    { at: 31.7, until: 34.2, el: { k: "label", text: "FOTO REAL" } },
    { at: 33.05, until: 34.2, el: { k: "big", text: "9 AÑOS", sub: "1943–1952", subSize: 70 } },
    // 9 · A6
    { at: 34.3, until: 38.7, el: { k: "label", text: "FOTO REAL" } },
  ],
  sfx: [
    { src: "sfx/field-morning-wind.mp3", at: 0.1, volumeDb: -20, durSec: 4.0, fadeSec: 0.8 },
    // суб-удар на «ciento sesenta y siete»: атака на 0,1 с раньше слова, музыка уходит заранее
    { src: "sfx/sub-boom.wav", at: 5.92, volumeDb: -9 },
    { src: "sfx/ground-rumble.mp3", at: 12.2, volumeDb: -20, durSec: 5.5, fadeSec: 0.8 },
    { src: "sfx/sub-boom.wav", at: 14.95, volumeDb: -10 },
    { src: "sfx/eruption-night.mp3", at: 17.5, volumeDb: -16, durSec: 3.5, fadeSec: 0.5 },
    { src: "sfx/tick.wav", at: 21.96, volumeDb: -10 },
    { src: "sfx/tick.wav", at: 24.4, volumeDb: -10 },
    { src: "sfx/sub-boom.wav", at: 26.69, volumeDb: -9 },
    { src: "sfx/vent-hiss.mp3", at: 31.7, volumeDb: -20, durSec: 3.0, fadeSec: 0.6 },
    { src: "sfx/crowd-murmur.mp3", at: 34.3, volumeDb: -26, durSec: 2.4, fadeSec: 0.5 },
  ],
  music: {
    src: "music.mp3",
    volumeDb: -22,
    fadeInSec: 1,
    duck: [
      { from: 5.7, to: 6.5, floor: 0.15, fadeSec: 0.15 },
      { from: 14.75, to: 15.4, floor: 0.3, fadeSec: 0.15 },
      { from: 26.45, to: 27.3, floor: 0.15, fadeSec: 0.15 },
    ],
  },
};

// ── ускорение озвучки (решение автора 29.10): паузы > 0,3 с → 0,28 с, rubberband +6 % ──
// Все тайминги выше записаны по исходной озвучке; карта старое → новое (public/ch2-01-sh1/vo-fast-map.json).
const PAUSES: [number, number][] = [[3.195, 3.572], [8.354, 8.862], [17.203, 17.587], [20.439, 20.847], [31.281, 31.642], [36.217, 36.648]];
const KEEP = 0.28;
const TEMPO = 1.06;
const T = (t: number) => {
  let cut = 0;
  for (const [s, e] of PAUSES) {
    if (t >= e) cut += e - s - KEEP;
    else if (t > s + KEEP) {
      cut += t - (s + KEEP);
      break;
    }
  }
  return +((t - cut) / TEMPO).toFixed(3);
};

const mapEl = (el: ShortProps["overlays"][number]["el"]): ShortProps["overlays"][number]["el"] => {
  if (el.k === "reloj" && el.typeAtSec !== undefined) return { ...el, typeAtSec: T(el.typeAtSec) };
  if (el.k === "big" && el.countFrom !== undefined) return { ...el, countFrom: T(el.countFrom), countSec: (el.countSec ?? 1.4) / TEMPO };
  if (el.k === "g1") return { ...el, growFrom: T(el.growFrom), growTo: T(el.growTo), towerAt: T(el.towerAt) };
  return el;
};

export const sh1: ShortProps = {
  ...sh1Old,
  voice: "vo-fast.mp3",
  captions: "words-fast.json",
  clips: sh1Old.clips.map((c) => ({ ...c, at: T(c.at) })),
  overlays: sh1Old.overlays.map((o) => ({ at: T(o.at), until: T(o.until), el: mapEl(o.el) })),
  sfx: sh1Old.sfx.map((x) => ({ ...x, at: T(x.at) })),
  music: sh1Old.music && { ...sh1Old.music, duck: sh1Old.music.duck?.map((d) => ({ ...d, from: T(d.from), to: T(d.to) })) },
};
